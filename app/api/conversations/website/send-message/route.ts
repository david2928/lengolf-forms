import { NextRequest, NextResponse } from "next/server";
import { refacSupabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, sessionId, messageText, senderType = 'staff', senderName = 'Admin' } = await request.json();

    if (!refacSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    if (!conversationId || !sessionId || !messageText) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId, sessionId, messageText'
      }, { status: 400 });
    }

    // Insert message into web_chat_messages
    const { data: message, error: messageError } = await refacSupabase
      .from('web_chat_messages')
      .insert({
        conversation_id: conversationId,
        session_id: sessionId,
        message_text: messageText,
        sender_type: senderType,
        sender_name: senderName,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending website message:', messageError);
      return NextResponse.json({
        success: false,
        error: messageError.message
      }, { status: 500 });
    }

    // Update conversation with last message info
    const { error: conversationError } = await refacSupabase
      .from('web_chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: messageText,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // Don't fail the request if conversation update fails
    }

    return NextResponse.json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error('Error in website send message API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}