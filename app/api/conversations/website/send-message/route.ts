import { NextRequest, NextResponse } from "next/server";
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    const {
      conversationId,
      sessionId,
      messageText,
      senderType = 'staff',
      senderName = 'Admin',
      messageType = 'text',
      curatedImageIds // Support for curated images like Meta API
    } = await request.json();

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    if (!conversationId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId, sessionId'
      }, { status: 400 });
    }

    // For text messages, messageText is required
    if (messageType === 'text' && !messageText) {
      return NextResponse.json({
        success: false,
        error: 'messageText is required for text messages'
      }, { status: 400 });
    }

    // For image messages, curatedImageIds is required
    if (messageType === 'image' && !curatedImageIds?.length) {
      return NextResponse.json({
        success: false,
        error: 'curatedImageIds is required for image messages'
      }, { status: 400 });
    }

    // Handle curated images - fetch from database
    let messagesToSend = [];
    if (messageType === 'image' && curatedImageIds?.length) {
      const { data: curatedImages, error: imagesError } = await refacSupabaseAdmin
        .from('line_curated_images')
        .select('*')
        .in('id', curatedImageIds);

      if (imagesError || !curatedImages || curatedImages.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch curated images'
        }, { status: 500 });
      }

      // Create a message for each curated image
      messagesToSend = curatedImages.map((image: any) => ({
        conversation_id: conversationId,
        session_id: sessionId,
        message_text: image.name || 'Curated Image',
        message_type: 'image',
        image_url: image.file_url,
        sender_type: senderType,
        sender_name: senderName,
        created_at: new Date().toISOString()
      }));
    } else {
      // Single text message
      messagesToSend = [{
        conversation_id: conversationId,
        session_id: sessionId,
        message_text: messageText,
        message_type: messageType,
        sender_type: senderType,
        sender_name: senderName,
        created_at: new Date().toISOString()
      }];
    }

    // Insert messages into web_chat_messages
    const { data: insertedMessages, error: messageError } = await refacSupabaseAdmin
      .from('web_chat_messages')
      .insert(messagesToSend)
      .select();

    if (messageError) {
      console.error('Error sending website message:', messageError);
      return NextResponse.json({
        success: false,
        error: messageError.message
      }, { status: 500 });
    }

    // Update conversation with last message info
    const lastMessage = messagesToSend[messagesToSend.length - 1];
    const lastMessageText = messageType === 'image'
      ? (messagesToSend.length === 1 ? '📷 Image' : `📷 ${messagesToSend.length} Images`)
      : lastMessage.message_text;

    const { error: conversationError } = await refacSupabaseAdmin
      .from('web_chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: lastMessageText,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // Don't fail the request if conversation update fails
    }

    return NextResponse.json({
      success: true,
      messages: insertedMessages,
      count: insertedMessages?.length || 0
    });

  } catch (error) {
    console.error('Error in website send message API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}