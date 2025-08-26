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
    // Get all leads with feedback (all time)
    const { data: leadConversions } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(phone_number, meta_submitted_at, full_name)
      `);

    // Get all bookings with phone numbers
    const { data: bookingsData } = await refacSupabaseAdmin
      .from('bookings')
      .select('phone_number, created_at, name, id')
      .not('phone_number', 'is', null);

    // Normalize phone numbers for proper matching
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

    // Create detailed analysis
    const conversions = [];
    const nonConversions = [];
    
    if (leadConversions && bookingsData) {
      // Create normalized booking phone lookup
      const bookingsByNormalizedPhone = new Map();
      bookingsData.forEach(booking => {
        const normalizedPhone = normalizePhone(booking.phone_number);
        if (normalizedPhone) {
          if (!bookingsByNormalizedPhone.has(normalizedPhone)) {
            bookingsByNormalizedPhone.set(normalizedPhone, []);
          }
          bookingsByNormalizedPhone.get(normalizedPhone).push({
            booking_id: booking.id,
            created_at: booking.created_at,
            name: booking.name,
            raw_phone: booking.phone_number
          });
        }
      });

      // Check each lead for conversions
      leadConversions.forEach((leadFeedback: any) => {
        const leadPhone = leadFeedback.processed_leads?.phone_number;
        const feedbackDate = new Date(leadFeedback.created_at);
        
        if (!leadPhone) {
          nonConversions.push({
            lead_id: leadFeedback.id,
            customer_name: leadFeedback.processed_leads?.full_name,
            reason: "No phone number in lead",
            feedback_date: leadFeedback.created_at
          });
          return;
        }
        
        const normalizedLeadPhone = normalizePhone(leadPhone);
        if (!normalizedLeadPhone) {
          nonConversions.push({
            lead_id: leadFeedback.id,
            customer_name: leadFeedback.processed_leads?.full_name,
            raw_phone: leadPhone,
            reason: "Could not normalize phone number",
            feedback_date: leadFeedback.created_at
          });
          return;
        }
        
        const matchingBookings = bookingsByNormalizedPhone.get(normalizedLeadPhone) || [];
        
        const bookingsAfterFeedback = matchingBookings.filter((booking: any) => 
          new Date(booking.created_at) >= feedbackDate
        );
        
        if (bookingsAfterFeedback.length > 0) {
          conversions.push({
            lead_id: leadFeedback.id,
            customer_name: leadFeedback.processed_leads?.full_name,
            lead_phone_raw: leadPhone,
            lead_phone_normalized: normalizedLeadPhone,
            feedback_date: leadFeedback.created_at,
            bookings_after_feedback: bookingsAfterFeedback.map(b => ({
              booking_id: b.booking_id,
              booking_date: b.created_at,
              customer_name: b.name,
              booking_phone_raw: b.raw_phone,
              days_from_feedback: Math.round((new Date(b.created_at).getTime() - feedbackDate.getTime()) / (1000 * 60 * 60 * 24))
            }))
          });
        } else if (matchingBookings.length > 0) {
          nonConversions.push({
            lead_id: leadFeedback.id,
            customer_name: leadFeedback.processed_leads?.full_name,
            lead_phone_raw: leadPhone,
            lead_phone_normalized: normalizedLeadPhone,
            reason: "Had bookings but all were BEFORE feedback date",
            feedback_date: leadFeedback.created_at,
            bookings_before_feedback: matchingBookings.length
          });
        } else {
          nonConversions.push({
            lead_id: leadFeedback.id,
            customer_name: leadFeedback.processed_leads?.full_name,
            lead_phone_raw: leadPhone,
            lead_phone_normalized: normalizedLeadPhone,
            reason: "No matching phone number in bookings",
            feedback_date: leadFeedback.created_at
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_leads_with_feedback: leadConversions?.length || 0,
        total_bookings_with_phones: bookingsData?.length || 0,
        successful_conversions: conversions.length,
        conversion_rate: leadConversions?.length ? 
          Math.round((conversions.length / leadConversions.length) * 100 * 10) / 10 : 0,
        non_conversions: nonConversions.length
      },
      successful_conversions: conversions,
      sample_non_conversions: nonConversions.slice(0, 10), // Just first 10 for brevity
      phone_normalization_examples: [
        { raw: "+66946642645", normalized: normalizePhone("+66946642645") },
        { raw: "0942187020", normalized: normalizePhone("0942187020") },
        { raw: "66811368129", normalized: normalizePhone("66811368129") }
      ]
    });

  } catch (error: any) {
    console.error('Lead sales breakdown error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}