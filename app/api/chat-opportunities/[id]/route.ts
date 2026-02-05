// API endpoint for single opportunity operations
// GET: Get opportunity by ID with full details
// PATCH: Update opportunity status/details

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { UpdateOpportunityRequest, OpportunityStatus } from '@/types/chat-opportunities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Get opportunity with conversation details
    const { data: opportunity, error } = await refacSupabaseAdmin
      .from('chat_opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Opportunity not found',
        }, { status: 404 });
      }
      console.error('Error fetching opportunity:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // Get conversation details
    const { data: conversation } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('*')
      .eq('id', opportunity.conversation_id)
      .single();

    // Get opportunity logs
    const { data: logs } = await refacSupabaseAdmin
      .from('chat_opportunity_logs')
      .select('*')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      opportunity: {
        ...opportunity,
        conversation,
        logs: logs || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/chat-opportunities/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateOpportunityRequest = await request.json();

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Get current opportunity state for audit logging
    const { data: currentOpportunity, error: fetchError } = await refacSupabaseAdmin
      .from('chat_opportunities')
      .select('status, priority')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Opportunity not found',
        }, { status: 404 });
      }
      throw fetchError;
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    const logDetails: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updates.status = body.status;
      logDetails.previous_status = currentOpportunity.status;
      logDetails.new_status = body.status;

      // Set contacted_at if transitioning to contacted or beyond
      if (body.status !== 'pending' && !currentOpportunity.contacted_at) {
        updates.contacted_at = new Date().toISOString();
        if (body.contacted_by) {
          updates.contacted_by = body.contacted_by;
        }
      }
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
      logDetails.priority_change = { from: currentOpportunity.priority, to: body.priority };
    }

    if (body.outcome !== undefined) {
      updates.outcome = body.outcome;
      logDetails.outcome = body.outcome;
    }

    if (body.outcome_notes !== undefined) {
      updates.outcome_notes = body.outcome_notes;
      logDetails.outcome_notes = body.outcome_notes;
    }

    if (body.contacted_by !== undefined) {
      updates.contacted_by = body.contacted_by;
      logDetails.contacted_by = body.contacted_by;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update',
      }, { status: 400 });
    }

    // Update the opportunity
    const { data: updatedOpportunity, error: updateError } = await refacSupabaseAdmin
      .from('chat_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating opportunity:', updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message,
      }, { status: 500 });
    }

    // Determine log action based on what was updated
    let logAction = 'status_changed';
    if (body.outcome_notes && !body.status) {
      logAction = 'note_added';
    }

    // Create audit log entry
    await refacSupabaseAdmin
      .from('chat_opportunity_logs')
      .insert({
        opportunity_id: id,
        action: logAction,
        actor: body.contacted_by || 'unknown',
        previous_status: currentOpportunity.status,
        new_status: body.status || currentOpportunity.status,
        details: logDetails,
      });

    return NextResponse.json({
      success: true,
      opportunity: updatedOpportunity,
    });
  } catch (error) {
    console.error('Error in PATCH /api/chat-opportunities/[id]:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
