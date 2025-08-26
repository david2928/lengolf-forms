import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get leads with feedback (limit for testing)
    const { data: leadConversions } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(phone_number, meta_submitted_at, full_name)
      `)
      .limit(50);

    // Get all bookings 
    const { data: bookingsData } = await refacSupabaseAdmin
      .from('bookings')
      .select('phone_number, created_at, name, id')
      .not('phone_number', 'is', null);

    // Normalize phone numbers
    const normalizePhone = (phone: string): string | null => {
      if (!phone || phone.trim() === '') return null;
      let normalized = phone.replace(/[^0-9]/g, '');
      if (normalized.length >= 11 && normalized.startsWith('66')) {
        normalized = normalized.substring(2);
      }
      if (normalized.length === 10 && normalized.startsWith('0')) {
        normalized = normalized.substring(1);
      }
      return normalized.slice(-9);
    };

    // Create phone lookup
    const bookingsByNormalizedPhone = new Map();
    bookingsData?.forEach(booking => {
      const normalizedPhone = normalizePhone(booking.phone_number);
      if (normalizedPhone) {
        if (!bookingsByNormalizedPhone.has(normalizedPhone)) {
          bookingsByNormalizedPhone.set(normalizedPhone, []);
        }
        bookingsByNormalizedPhone.get(normalizedPhone).push(booking);
      }
    });

    // Test both matching methods
    const matchingResults = [];
    let phoneMatches = 0;
    let nameMatches = 0;
    let totalMatches = 0;

    leadConversions?.forEach((leadFeedback: any) => {
      const leadPhone = leadFeedback.processed_leads?.phone_number;
      const leadName = leadFeedback.processed_leads?.full_name;
      const feedbackDate = new Date(leadFeedback.created_at);
      
      let hasConversion = false;
      let matchMethod = 'none';
      let matchDetails = [];

      // Method 1: Phone number matching
      if (leadPhone) {
        const normalizedLeadPhone = normalizePhone(leadPhone);
        if (normalizedLeadPhone) {
          const matchingBookings = bookingsByNormalizedPhone.get(normalizedLeadPhone) || [];
          const phoneBookingsAfterFeedback = matchingBookings.filter((booking: any) => 
            new Date(booking.created_at) >= feedbackDate
          );
          if (phoneBookingsAfterFeedback.length > 0) {
            hasConversion = true;
            matchMethod = 'phone';
            phoneMatches++;
            matchDetails = phoneBookingsAfterFeedback.map(b => ({
              method: 'phone',
              booking_id: b.id,
              booking_name: b.name,
              booking_date: b.created_at
            }));
          }
        }
      }
      
      // Method 2: Name matching (if no phone match found)
      if (!hasConversion && leadName && bookingsData) {
        const nameBookingMatches = bookingsData.filter((booking: any) => {
          if (!booking.name || new Date(booking.created_at) < feedbackDate) return false;
          
          const leadNameLower = leadName.toLowerCase().trim();
          const bookingNameLower = booking.name.toLowerCase().trim();
          
          // Check if names contain each other
          if (leadNameLower.includes(bookingNameLower) || bookingNameLower.includes(leadNameLower)) {
            return true;
          }
          
          // Check for shared words (longer than 2 characters)
          const leadWords = leadNameLower.split(' ').filter(w => w.length > 2);
          const bookingWords = bookingNameLower.split(' ').filter(w => w.length > 2);
          const hasSharedWords = leadWords.some(lw => 
            bookingWords.some(bw => bw.includes(lw) || lw.includes(bw))
          );
          
          return hasSharedWords;
        });
        
        if (nameBookingMatches.length > 0) {
          hasConversion = true;
          matchMethod = 'name';
          nameMatches++;
          matchDetails = nameBookingMatches.map(b => ({
            method: 'name',
            booking_id: b.id,
            booking_name: b.name,
            booking_date: b.created_at
          }));
        }
      }

      if (hasConversion) {
        totalMatches++;
        matchingResults.push({
          lead_id: leadFeedback.id,
          lead_name: leadName,
          lead_phone: leadPhone,
          feedback_date: leadFeedback.created_at,
          match_method: matchMethod,
          matches: matchDetails
        });
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        leads_tested: leadConversions?.length || 0,
        total_bookings: bookingsData?.length || 0,
        phone_matches: phoneMatches,
        name_matches: nameMatches,
        total_conversions: totalMatches,
        conversion_rate: leadConversions?.length ? 
          Math.round((totalMatches / leadConversions.length) * 100 * 10) / 10 : 0
      },
      matching_results: matchingResults,
      sample_unmatched_leads: leadConversions?.slice(0, 5).map((lead: any) => ({
        name: lead.processed_leads.full_name,
        phone: lead.processed_leads.phone_number,
        normalized_phone: normalizePhone(lead.processed_leads.phone_number),
        feedback_date: lead.created_at
      })) || []
    });

  } catch (error: any) {
    console.error('Hybrid matching test error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}