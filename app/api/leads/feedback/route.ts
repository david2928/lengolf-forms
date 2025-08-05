import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

interface FeedbackData {
  lead_id: string;
  call_date: string;
  was_reachable: boolean;
  response_type?: 'very_interested' | 'interested_need_time' | 'not_interested' | 'no_clear_answer';
  visit_timeline?: 'within_1_week' | 'within_month' | 'no_plan';
  requires_followup: boolean;
  booking_submitted: boolean;
  comments?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: FeedbackData = await request.json();
    
    // Validate required fields
    if (!body.lead_id || !body.call_date || typeof body.was_reachable !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = refacSupabaseAdmin;

    // Check if feedback already exists for this lead (for follow-ups)
    const { data: existingFeedback } = await supabase
      .from('lead_feedback')
      .select('id, requires_followup')
      .eq('lead_id', body.lead_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let data, error;

    if (existingFeedback && existingFeedback.requires_followup) {
      // Update existing feedback record for follow-up leads
      const { data: updateData, error: updateError } = await supabase
        .from('lead_feedback')
        .update({
          call_date: body.call_date,
          was_reachable: body.was_reachable,
          response_type: body.response_type || null,
          visit_timeline: body.visit_timeline || null,
          requires_followup: body.requires_followup,
          booking_submitted: body.booking_submitted,
          comments: body.comments || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)
        .select()
        .single();
      
      data = updateData;
      error = updateError;
    } else {
      // Check for same-date duplicates for new leads
      const { data: sameDateFeedback } = await supabase
        .from('lead_feedback')
        .select('id')
        .eq('lead_id', body.lead_id)
        .eq('call_date', body.call_date)
        .single();

      if (sameDateFeedback) {
        return NextResponse.json(
          { error: 'Feedback already exists for this lead on this date' },
          { status: 409 }
        );
      }

      // Insert new feedback
      const { data: insertData, error: insertError } = await supabase
        .from('lead_feedback')
        .insert({
          lead_id: body.lead_id,
          call_date: body.call_date,
          was_reachable: body.was_reachable,
          response_type: body.response_type || null,
          visit_timeline: body.visit_timeline || null,
          requires_followup: body.requires_followup,
          booking_submitted: body.booking_submitted,
          comments: body.comments || null
        })
        .select()
        .single();
      
      data = insertData;
      error = insertError;
    }

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Send LINE notification if follow-up is required
    if (body.requires_followup) {
      // Get lead details for notification
      const { data: lead } = await supabase
        .from('processed_leads')
        .select('full_name, phone_number')
        .eq('id', body.lead_id)
        .single();

      if (lead) {
        // Send LINE notification (optional - you can implement this later)
        console.log(`Follow-up required for ${lead.full_name} (${lead.phone_number})`);
      }
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Feedback API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');

    const supabase = refacSupabaseAdmin;

    let query = supabase
      .from('lead_feedback')
      .select('*')
      .order('call_date', { ascending: false });

    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Feedback GET API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}