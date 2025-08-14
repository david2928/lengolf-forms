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
      .order('meta_submitted_at', { ascending: true });

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

    // Get leads that have been opened
    const { data: openedLeads, error: openedError } = await supabase
      .from('lead_opens')
      .select('lead_id, opened_at, speed_to_lead_seconds') as { 
        data: Array<{ lead_id: string; opened_at: string; speed_to_lead_seconds: number }> | null; 
        error: any 
      };

    if (openedError) {
      console.error('Error fetching opened leads:', openedError);
      return NextResponse.json(
        { error: 'Failed to fetch opened leads data' },
        { status: 500 }
      );
    }

    // Filter leads: include those without feedback OR those requiring follow-up
    const feedbackLeadIdSet = new Set(feedbackLeadIds?.map((f: any) => f.lead_id) || []);
    const followUpLeadIdSet = new Set(followUpNeeded?.map((f: any) => f.lead_id) || []);
    const openedLeadMap = new Map(openedLeads?.map((o: any) => [o.lead_id, o]) || []);
    
    const filteredLeads = (allLeads || []).filter((lead: any) => {
      const hasNoFeedback = !feedbackLeadIdSet.has(lead.id);
      const needsFollowUp = followUpLeadIdSet.has(lead.id);
      return hasNoFeedback || needsFollowUp;
    });

    // Helper function to calculate waiting time
    const calculateWaitingTime = (submittedAt: string, isOpened: boolean): number => {
      if (isOpened) return 0;
      const now = new Date();
      const submitted = new Date(submittedAt);
      const diffMs = now.getTime() - submitted.getTime();
      return Math.floor(diffMs / (1000 * 60)); // Return minutes
    };

    // Helper function to format speed to lead
    const formatSpeedToLead = (seconds: number): string => {
      const hours = seconds / 3600;
      if (hours < 1) {
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
      } else if (hours < 24) {
        return `${hours.toFixed(1)}h`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return `${days}d ${remainingHours}h`;
      }
    };

    // Process leads with concealment logic
    const leadsWithDisplayName = filteredLeads.map((lead: any) => {
      const isFollowUp = followUpLeadIdSet.has(lead.id);
      const openData = openedLeadMap.get(lead.id);
      const isOpened = !!openData;
      const waitingMinutes = calculateWaitingTime(lead.meta_submitted_at, isOpened);

      // For follow-up leads, always show full details (no concealment)
      if (isFollowUp) {
        return {
          id: lead.id,
          full_name: lead.full_name,
          phone_number: lead.phone_number,
          email: lead.email,
          meta_submitted_at: lead.meta_submitted_at,
          display_name: `${lead.full_name} (${lead.phone_number})`,
          needs_followup: true,
          is_opened: true, // Follow-ups are always "opened"
          is_followup: true,
          source: lead.form_type || 'Unknown',
          group_size: lead.group_size,
          preferred_time: lead.preferred_time,
          planned_visit: lead.planned_visit,
          additional_inquiries: lead.additional_inquiries,
          time_waiting_minutes: 0 // Follow-ups don't count as waiting
        };
      }

      // For new leads, show full details only if opened
      if (isOpened) {
        return {
          id: lead.id,
          full_name: lead.full_name,
          phone_number: lead.phone_number,
          email: lead.email,
          meta_submitted_at: lead.meta_submitted_at,
          display_name: `${lead.full_name} (${lead.phone_number})`,
          needs_followup: false,
          is_opened: true,
          is_followup: false,
          source: lead.form_type || 'Unknown',
          group_size: lead.group_size,
          preferred_time: lead.preferred_time,
          planned_visit: lead.planned_visit,
          additional_inquiries: lead.additional_inquiries,
          time_waiting_minutes: waitingMinutes,
          speed_to_lead_formatted: formatSpeedToLead(openData.speed_to_lead_seconds)
        };
      }

      // For concealed leads, only show basic info
      return {
        id: lead.id,
        meta_submitted_at: lead.meta_submitted_at,
        needs_followup: false,
        is_opened: false,
        is_followup: false,
        source: lead.form_type || 'Unknown',
        time_waiting_minutes: waitingMinutes
        // All personal details are concealed
      };
    });

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