import { NextRequest, NextResponse } from "next/server";
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { action, channelType } = body;

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    if (!conversationId || !action || !channelType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: conversationId, action, channelType'
      }, { status: 400 });
    }

    // Determine which table to update based on channel type
    let tableName: string;
    switch (channelType) {
      case 'line':
        tableName = 'line_conversations';
        break;
      case 'website':
        tableName = 'web_chat_conversations';
        break;
      case 'facebook':
      case 'instagram':
      case 'whatsapp':
        tableName = 'meta_conversations';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported channel type: ${channelType}`
        }, { status: 400 });
    }

    let updateData: any = {};
    const now = new Date().toISOString();

    // Handle different actions
    switch (action) {
      case 'markUnread':
        updateData = {
          marked_unread_at: now,
          unread_count: 1 // Set to 1 to indicate manually marked as unread
        };
        break;

      case 'follow':
        updateData = {
          is_following: true,
          follow_up_at: now
        };
        break;

      case 'unfollow':
        updateData = {
          is_following: false,
          follow_up_at: null
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported action: ${action}`
        }, { status: 400 });
    }

    // First check if the conversation exists
    const { data: existingConvs, error: checkError } = await refacSupabaseAdmin
      .from(tableName)
      .select('id')
      .eq('id', conversationId);

    if (checkError) {
      console.error(`Error checking conversation in ${tableName} for ID ${conversationId}:`, checkError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${checkError.message}`
      }, { status: 500 });
    }

    if (!existingConvs || existingConvs.length === 0) {
      console.error(`Conversation not found in ${tableName} for ID ${conversationId}`);
      return NextResponse.json({
        success: false,
        error: `Conversation not found in ${tableName}. Please refresh the page and try again.`
      }, { status: 404 });
    }

    // Update the conversation in the appropriate table
    const { data, error } = await refacSupabaseAdmin
      .from(tableName)
      .update(updateData)
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) {
      console.error(`Error updating conversation status in ${tableName}:`, error);
      return NextResponse.json({
        success: false,
        error: `Failed to update conversation: ${error.message}`
      }, { status: 500 });
    }

    // Get the updated conversation from the unified view for consistency
    const { data: unifiedData, error: unifiedError } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (unifiedError) {
      console.error('Error fetching updated unified conversation:', unifiedError);
      // Still return success since the update worked
      return NextResponse.json({
        success: true,
        conversation: data,
        message: `Conversation ${action} successful`
      });
    }

    return NextResponse.json({
      success: true,
      conversation: unifiedData,
      message: `Conversation ${action} successful`
    });

  } catch (error) {
    console.error('Error in conversation status update API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}