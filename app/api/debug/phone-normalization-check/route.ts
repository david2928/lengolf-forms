import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { customerMappingService } from '@/lib/customer-mapping-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get sample of lead feedback with phone numbers
    const { data: feedbackSample } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(phone_number, full_name)
      `)
      .limit(10);

    // Get sample of booking phone numbers  
    const { data: bookingSample } = await refacSupabaseAdmin
      .from('bookings')
      .select('customer_phone_number, customer_name, created_at')
      .not('customer_phone_number', 'is', null)
      .limit(10);

    // Get sample from customers table to see normalized phones
    const { data: customersSample } = await refacSupabaseAdmin
      .from('customers')
      .select('contact_number, normalized_phone, customer_name')
      .not('contact_number', 'is', null)
      .limit(10);

    // Normalize the phone numbers from leads and bookings
    const leadPhoneAnalysis = feedbackSample?.map(item => {
      const rawPhone = item.processed_leads.phone_number;
      const normalized = customerMappingService.normalizePhoneNumber(rawPhone);
      return {
        customer_name: item.processed_leads.full_name,
        raw_phone: rawPhone,
        normalized_phone: normalized,
        feedback_date: item.created_at
      };
    }) || [];

    const bookingPhoneAnalysis = bookingSample?.map(item => {
      const rawPhone = item.customer_phone_number;
      const normalized = customerMappingService.normalizePhoneNumber(rawPhone);
      return {
        customer_name: item.customer_name,
        raw_phone: rawPhone,
        normalized_phone: normalized,
        booking_date: item.created_at
      };
    }) || [];

    // Try to find matches using normalized phone numbers
    let potentialMatches = 0;
    const matchingAnalysis = [];

    for (const lead of leadPhoneAnalysis) {
      if (!lead.normalized_phone) continue;
      
      // Look for bookings with same normalized phone
      const bookingMatches = bookingPhoneAnalysis.filter(booking => 
        booking.normalized_phone === lead.normalized_phone
      );

      if (bookingMatches.length > 0) {
        potentialMatches++;
        matchingAnalysis.push({
          lead: lead,
          matching_bookings: bookingMatches,
          match_count: bookingMatches.length
        });
      }
    }

    // Check if the lead phones exist in customers table (normalized)
    let customerTableMatches = 0;
    for (const lead of leadPhoneAnalysis) {
      if (!lead.normalized_phone) continue;
      
      const { data: customerMatch } = await refacSupabaseAdmin
        .from('customers')
        .select('id, customer_name, contact_number, normalized_phone')
        .eq('normalized_phone', lead.normalized_phone)
        .single();
        
      if (customerMatch) {
        customerTableMatches++;
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        samples: {
          leads_with_phones: leadPhoneAnalysis,
          bookings_with_phones: bookingPhoneAnalysis.slice(0, 5), // limit for readability
          customers_normalized: customersSample?.slice(0, 5)
        },
        phone_matching_analysis: {
          total_leads_checked: leadPhoneAnalysis.length,
          total_bookings_checked: bookingPhoneAnalysis.length,
          potential_raw_matches: potentialMatches,
          customer_table_matches: customerTableMatches,
          matching_pairs: matchingAnalysis
        },
        normalization_examples: leadPhoneAnalysis.slice(0, 3).map(lead => ({
          raw_phone: lead.raw_phone,
          normalized: lead.normalized_phone,
          normalization_rules: {
            "step1": "Remove non-digits",
            "step2": "Remove +66 country code",
            "step3": "Remove leading 0",
            "step4": "Take last 9 digits"
          }
        })),
        recommendation: potentialMatches > 0 ? 
          "Found potential matches! Need to use normalized phone numbers for comparison." :
          "No matches found with normalized phones. May need to check data quality or expand search."
      }
    });

  } catch (error: any) {
    console.error('Phone normalization debug error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}