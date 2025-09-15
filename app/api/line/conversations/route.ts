import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get all LINE conversations
 * GET /api/line/conversations
 */
export async function GET() {
  try {
    // Get unique conversations - one per LINE user (most recent)
    const { data: conversations, error } = await supabase
      .rpc('get_unique_line_conversations', { limit_count: 50 });

    if (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }

    // Format the response
    const formattedConversations = conversations?.map(conv => ({
      id: conv.id,
      lineUserId: conv.line_user_id,
      customerId: conv.customer_id,
      lastMessageAt: conv.last_message_at,
      lastMessageText: conv.last_message_text,
      lastMessageBy: conv.last_message_by,
      unreadCount: conv.unread_count,
      isActive: conv.is_active,
      assignedTo: conv.assigned_to,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      user: {
        displayName: conv.line_users?.display_name,
        pictureUrl: conv.line_users?.picture_url
      },
      customer: conv.customers ? {
        id: conv.customers.id,
        name: conv.customers.customer_name,
        phone: conv.customers.contact_number,
        email: conv.customers.email
      } : null
    })) || [];

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      count: formattedConversations.length
    });

  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create a new conversation (if needed) or update existing one
 * POST /api/line/conversations
 */
export async function POST(request: NextRequest) {
  try {
    const { lineUserId, customerId, assignedTo } = await request.json();

    if (!lineUserId) {
      return NextResponse.json({
        success: false,
        error: 'lineUserId is required'
      }, { status: 400 });
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('line_conversations')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (existing) {
      // Update existing conversation
      const { data, error } = await supabase
        .from('line_conversations')
        .update({
          customer_id: customerId,
          assigned_to: assignedTo,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        conversation: data
      });
    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('line_conversations')
        .insert({
          line_user_id: lineUserId,
          customer_id: customerId,
          assigned_to: assignedTo,
          is_active: true,
          unread_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        conversation: data
      });
    }

  } catch (error) {
    console.error('Failed to create/update conversation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}