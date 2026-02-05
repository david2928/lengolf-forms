// API endpoint for scanning conversations to find potential opportunities
// GET: Returns conversations that could be opportunities but haven't been flagged yet

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { PotentialOpportunity } from '@/types/chat-opportunities';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const daysThreshold = parseInt(searchParams.get('daysThreshold') || '3', 10);
    const maxAgeDays = parseInt(searchParams.get('maxAgeDays') || '30', 10);

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Use the database function to find potential opportunities
    const { data, error } = await refacSupabaseAdmin.rpc('find_chat_opportunities', {
      p_days_threshold: daysThreshold,
      p_max_age_days: maxAgeDays,
    });

    if (error) {
      console.error('Error scanning for opportunities:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    const potentialOpportunities: PotentialOpportunity[] = (data || []).map((opp: any) => ({
      conversation_id: opp.conversation_id,
      channel_type: opp.channel_type,
      channel_user_id: opp.channel_user_id,
      last_message_at: opp.last_message_at,
      last_message_text: opp.last_message_text,
      last_message_by: opp.last_message_by,
      customer_id: opp.customer_id,
      customer_name: opp.customer_name,
      customer_phone: opp.customer_phone,
      customer_email: opp.customer_email,
      days_since_last_message: opp.days_since_last_message,
      has_inquiry_keywords: opp.has_inquiry_keywords,
      inquiry_keywords: opp.inquiry_keywords || [],
      suggested_opportunity_type: opp.suggested_opportunity_type,
    }));

    return NextResponse.json({
      success: true,
      potentialOpportunities,
      count: potentialOpportunities.length,
    });
  } catch (error) {
    console.error('Error in GET /api/chat-opportunities/scan:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
