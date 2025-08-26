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
    // Get sample of leads with feedback and analyze phone patterns
    const { data: leadSample } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(phone_number, full_name, meta_submitted_at)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get sample of bookings and analyze phone patterns
    const { data: bookingSample } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, phone_number, name, created_at')
      .not('phone_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

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

    // Analyze phone number patterns
    const leadPhonePatterns = leadSample?.map(lead => ({
      customer_name: lead.processed_leads.full_name,
      raw_phone: lead.processed_leads.phone_number,
      normalized: normalizePhone(lead.processed_leads.phone_number),
      feedback_date: lead.created_at,
      lead_submitted: lead.processed_leads.meta_submitted_at
    })) || [];

    const bookingPhonePatterns = bookingSample?.map(booking => ({
      customer_name: booking.name,
      raw_phone: booking.phone_number,
      normalized: normalizePhone(booking.phone_number),
      booking_date: booking.created_at
    })) || [];

    // Check for potential matches by various methods
    const potentialMatches = [];
    
    // Method 1: Exact normalized phone match
    leadPhonePatterns.forEach(lead => {
      if (!lead.normalized) return;
      
      const phoneMatches = bookingPhonePatterns.filter(booking => 
        booking.normalized === lead.normalized
      );
      
      if (phoneMatches.length > 0) {
        potentialMatches.push({
          method: 'exact_phone_match',
          lead: lead,
          matching_bookings: phoneMatches
        });
      }
    });

    // Method 2: Fuzzy name matching (for leads without phone matches)
    const phoneMatchedLeadNames = potentialMatches.map(m => m.lead.customer_name.toLowerCase());
    const unmatchedLeads = leadPhonePatterns.filter(lead => 
      !phoneMatchedLeadNames.includes(lead.customer_name.toLowerCase())
    );

    unmatchedLeads.forEach(lead => {
      const nameMatches = bookingPhonePatterns.filter(booking => {
        const leadName = lead.customer_name.toLowerCase().trim();
        const bookingName = booking.customer_name.toLowerCase().trim();
        
        // Simple fuzzy matching - check if names contain each other or share significant parts
        const nameContains = leadName.includes(bookingName) || bookingName.includes(leadName);
        const nameWords = leadName.split(' ').filter(w => w.length > 2);
        const bookingWords = bookingName.split(' ').filter(w => w.length > 2);
        const sharedWords = nameWords.some(w => bookingWords.some(bw => bw.includes(w) || w.includes(bw)));
        
        return nameContains || sharedWords;
      });

      if (nameMatches.length > 0) {
        potentialMatches.push({
          method: 'fuzzy_name_match',
          lead: lead,
          matching_bookings: nameMatches
        });
      }
    });

    // Check date ranges to see if timing makes sense
    const dateAnalysis = potentialMatches.map(match => {
      const feedbackDate = new Date(match.lead.feedback_date);
      const leadSubmittedDate = new Date(match.lead.lead_submitted);
      
      const bookingAnalysis = match.matching_bookings.map(booking => {
        const bookingDate = new Date(booking.booking_date);
        return {
          booking_date: booking.booking_date,
          days_from_lead_submitted: Math.round((bookingDate.getTime() - leadSubmittedDate.getTime()) / (1000 * 60 * 60 * 24)),
          days_from_feedback: Math.round((bookingDate.getTime() - feedbackDate.getTime()) / (1000 * 60 * 60 * 24)),
          valid_conversion: bookingDate >= feedbackDate
        };
      });

      return {
        method: match.method,
        lead_customer: match.lead.customer_name,
        lead_phone: match.lead.raw_phone,
        feedback_date: match.lead.feedback_date,
        bookings_analysis: bookingAnalysis,
        valid_conversions: bookingAnalysis.filter(b => b.valid_conversion).length
      };
    });

    // Summary statistics
    const totalValidConversions = dateAnalysis.reduce((sum, analysis) => 
      sum + analysis.valid_conversions, 0
    );

    const phoneFormatAnalysis = {
      lead_phone_formats: [...new Set(leadPhonePatterns.map(l => {
        if (!l.raw_phone) return 'null';
        if (l.raw_phone.startsWith('+66')) return '+66_format';
        if (l.raw_phone.startsWith('66')) return '66_format';
        if (l.raw_phone.startsWith('0')) return '0_format';
        return 'other_format';
      }))],
      booking_phone_formats: [...new Set(bookingPhonePatterns.map(b => {
        if (!b.raw_phone) return 'null';
        if (b.raw_phone.startsWith('+66')) return '+66_format';
        if (b.raw_phone.startsWith('66')) return '66_format';
        if (b.raw_phone.startsWith('0')) return '0_format';
        return 'other_format';
      }))]
    };

    return NextResponse.json({
      success: true,
      investigation_summary: {
        leads_analyzed: leadPhonePatterns.length,
        bookings_analyzed: bookingPhonePatterns.length,
        exact_phone_matches: potentialMatches.filter(m => m.method === 'exact_phone_match').length,
        fuzzy_name_matches: potentialMatches.filter(m => m.method === 'fuzzy_name_match').length,
        total_valid_conversions: totalValidConversions,
        conversion_rate_in_sample: leadPhonePatterns.length > 0 ? 
          Math.round((totalValidConversions / leadPhonePatterns.length) * 100 * 10) / 10 : 0
      },
      phone_format_analysis: phoneFormatAnalysis,
      sample_lead_phones: leadPhonePatterns.slice(0, 5),
      sample_booking_phones: bookingPhonePatterns.slice(0, 5),
      detailed_matches: dateAnalysis,
      recommendations: [
        totalValidConversions < 3 ? "Very low conversion rate - investigate data quality" : "Conversion rate seems reasonable",
        phoneFormatAnalysis.lead_phone_formats.length > 2 ? "Multiple phone formats detected - normalization crucial" : "Phone formats are consistent",
        potentialMatches.filter(m => m.method === 'fuzzy_name_match').length > 0 ? "Found name-based matches - consider name matching as backup" : "No name-based matches found"
      ]
    });

  } catch (error: any) {
    console.error('Lead conversion deep dive error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}