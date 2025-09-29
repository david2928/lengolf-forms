import { NextRequest, NextResponse } from "next/server";
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    // Mark all messages in this Meta conversation as read
    const { error: messagesError } = await refacSupabaseAdmin
      .from('meta_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    if (messagesError) {
      console.error('Error marking Meta messages as read:', messagesError);
      return NextResponse.json({
        success: false,
        error: messagesError.message
      }, { status: 500 });
    }

    // Reset unread count for Meta conversation
    const { error: conversationError } = await refacSupabaseAdmin
      .from('meta_conversations')
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating Meta conversation unread count:', conversationError);
      return NextResponse.json({
        success: false,
        error: conversationError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Meta conversation marked as read'
    });

  } catch (error) {
    console.error('Error in Meta mark-read API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}