// API endpoint for listing and creating chat opportunities
// GET: List opportunities with optional filtering
// POST: Create a new opportunity

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type {
  ChatOpportunityWithConversation,
  CreateOpportunityRequest,
  GetOpportunitiesParams,
} from '@/types/chat-opportunities';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params: GetOpportunitiesParams = {
      status: searchParams.get('status') as GetOpportunitiesParams['status'] || undefined,
      priority: searchParams.get('priority') as GetOpportunitiesParams['priority'] || undefined,
      opportunityType: searchParams.get('opportunityType') as GetOpportunitiesParams['opportunityType'] || undefined,
      channelType: searchParams.get('channelType') as GetOpportunitiesParams['channelType'] || undefined,
      offset: parseInt(searchParams.get('offset') || '0', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    };

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Check for conversationId filter (direct lookup)
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Direct lookup by conversation ID
      const { data, error } = await refacSupabaseAdmin
        .from('chat_opportunities')
        .select('*')
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Error fetching opportunity by conversation:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        opportunities: data || [],
        total: data?.length || 0,
      });
    }

    // Use the database function to get opportunities
    // Convert 'all' to null for the database function (null means no filter)
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const typeParam = searchParams.get('opportunityType');
    const channelParam = searchParams.get('channelType');

    const { data, error } = await refacSupabaseAdmin.rpc('get_chat_opportunities', {
      p_status: statusParam && statusParam !== 'all' ? statusParam : null,
      p_priority: priorityParam && priorityParam !== 'all' ? priorityParam : null,
      p_opportunity_type: typeParam && typeParam !== 'all' ? typeParam : null,
      p_channel_type: channelParam && channelParam !== 'all' ? channelParam : null,
      p_offset: params.offset || 0,
      p_limit: params.limit || 20,
    });

    if (error) {
      console.error('Error fetching opportunities:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // Get total count for pagination
    const { data: countData } = await refacSupabaseAdmin.rpc('count_chat_opportunities');

    // Transform the data to include convenience fields
    const opportunities: ChatOpportunityWithConversation[] = (data || []).map((opp: any) => ({
      ...opp,
      // Ensure all fields are present
      confidence_score: opp.confidence_score ? parseFloat(opp.confidence_score) : null,
    }));

    return NextResponse.json({
      success: true,
      opportunities,
      total: countData?.reduce((sum: number, item: { count: number }) => sum + item.count, 0) || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/chat-opportunities:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOpportunityRequest = await request.json();

    // Validate required fields
    if (!body.conversation_id || !body.channel_type || !body.opportunity_type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversation_id, channel_type, opportunity_type',
      }, { status: 400 });
    }

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Create the opportunity
    const { data: opportunity, error: createError } = await refacSupabaseAdmin
      .from('chat_opportunities')
      .insert({
        conversation_id: body.conversation_id,
        channel_type: body.channel_type,
        opportunity_type: body.opportunity_type,
        priority: body.priority || 'medium',
        confidence_score: body.confidence_score || null,
        analysis_summary: body.analysis_summary || null,
        suggested_action: body.suggested_action || null,
        suggested_message: body.suggested_message || null,
        customer_name: body.customer_name || null,
        customer_phone: body.customer_phone || null,
        customer_email: body.customer_email || null,
        analyzed_at: body.analysis_summary ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (createError) {
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'An opportunity already exists for this conversation',
        }, { status: 409 });
      }

      console.error('Error creating opportunity:', createError);
      return NextResponse.json({
        success: false,
        error: createError.message,
      }, { status: 500 });
    }

    // Create audit log entry
    await refacSupabaseAdmin
      .from('chat_opportunity_logs')
      .insert({
        opportunity_id: opportunity.id,
        action: 'created',
        actor: 'system',
        new_status: 'pending',
        details: {
          opportunity_type: body.opportunity_type,
          priority: body.priority || 'medium',
          source: 'api',
        },
      });

    return NextResponse.json({
      success: true,
      opportunity,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat-opportunities:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
