import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = refacSupabaseAdmin;

    // Get leads that already have feedback first
    const { data: feedbackLeadIds, error: feedbackError } = await supabase
      .from('lead_feedback')
      .select('lead_id');

    if (feedbackError) {
      console.error('Error fetching feedback lead IDs:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback data' },
        { status: 500 }
      );
    }

    // Get B2C leads from April 28th onwards only, excluding yandex emails
    const april28th = new Date('2025-04-28T00:00:00.000Z');

    const { data: allLeads, error } = await supabase
      .from('processed_leads')
      .select(`
        id,
        full_name,
        phone_number,
        email,
        meta_submitted_at,
        form_type,
        group_size,
        preferred_time,
        planned_visit,
        additional_inquiries
      `)
      .eq('lead_type', 'b2c')
      .eq('is_likely_spam', false)
      .gte('meta_submitted_at', april28th.toISOString())
      .not('email', 'like', '%yandex%')
      .order('meta_submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Get leads that require follow-up (have feedback but need follow-up)
    const { data: followUpNeeded, error: followUpError } = await supabase
      .from('lead_feedback')
      .select('lead_id')
      .eq('requires_followup', true);

    if (followUpError) {
      console.error('Error fetching follow-up leads:', followUpError);
      return NextResponse.json(
        { error: 'Failed to fetch follow-up data' },
        { status: 500 }
      );
    }

    // Filter leads: include those without feedback OR those requiring follow-up
    const feedbackLeadIdSet = new Set(feedbackLeadIds?.map(f => f.lead_id) || []);
    const followUpLeadIdSet = new Set(followUpNeeded?.map(f => f.lead_id) || []);
    
    const filteredLeads = (allLeads || []).filter(lead => {
      const hasNoFeedback = !feedbackLeadIdSet.has(lead.id);
      const needsFollowUp = followUpLeadIdSet.has(lead.id);
      return hasNoFeedback || needsFollowUp;
    });

    // Add display name with phone and follow-up status for easier identification
    const leadsWithDisplayName = filteredLeads.map(lead => ({
      ...lead,
      display_name: `${lead.full_name} (${lead.phone_number})`,
      needs_followup: followUpLeadIdSet.has(lead.id)
    }));

    return NextResponse.json({
      success: true,
      data: leadsWithDisplayName,
      count: leadsWithDisplayName.length
    });

  } catch (error) {
    console.error('Unfeedback API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}