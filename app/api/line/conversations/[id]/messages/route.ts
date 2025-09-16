import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadSentImage, uploadCuratedImage, isValidFileType } from '@/lib/line/storage-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Send a message in a conversation
 * POST /api/line/conversations/[id]/messages
 * Supports text, image, and file messages
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Check if this is a form data request (file upload) or JSON
    const contentType = request.headers.get('content-type') || '';
    let messageData: any;
    let uploadedFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const messageType = formData.get('type') as string;
      const senderName = formData.get('senderName') as string || 'Admin';
      const curatedImageId = formData.get('curatedImageId') as string;

      if (file && !isValidFileType(file)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid file type. Only images and PDFs are allowed.'
        }, { status: 400 });
      }

      messageData = {
        type: messageType || (file ? 'image' : 'text'),
        senderName,
        curatedImageId
      };
      uploadedFile = file;
    } else {
      // Handle regular JSON request
      messageData = await request.json();
    }

    const {
      message,
      type = 'text',
      senderName = 'Admin',
      curatedImageId
    } = messageData;

    // Validate based on message type
    if (type === 'text' && (!message || !message.trim())) {
      return NextResponse.json({
        success: false,
        error: 'Message text is required for text messages'
      }, { status: 400 });
    }

    if ((type === 'image' || type === 'file') && !uploadedFile && !curatedImageId) {
      return NextResponse.json({
        success: false,
        error: 'File or curated image ID is required for file messages'
      }, { status: 400 });
    }

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select('line_user_id')
      .eq('id', conversationId)
      .single();

    if (conversationError) {
      console.error('Error fetching conversation:', conversationError);
      throw conversationError;
    }

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Handle file upload or get curated image URL
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (type === 'image' || type === 'file') {
      if (uploadedFile) {
        // Upload new file
        const uploadResult = await uploadSentImage(uploadedFile, conversationId);
        if (!uploadResult.success) {
          return NextResponse.json({
            success: false,
            error: `Failed to upload file: ${uploadResult.error}`
          }, { status: 500 });
        }

        fileUrl = uploadResult.url!;
        fileName = uploadedFile.name;
        fileSize = uploadedFile.size;
        fileType = uploadedFile.type;
      } else if (curatedImageId) {
        // Get curated image
        const { data: curatedImage, error: curatedError } = await supabase
          .from('line_curated_images')
          .select('*')
          .eq('id', curatedImageId)
          .single();

        if (curatedError || !curatedImage) {
          return NextResponse.json({
            success: false,
            error: 'Curated image not found'
          }, { status: 404 });
        }

        fileUrl = curatedImage.file_url;
        fileName = curatedImage.name;
        fileType = 'image/jpeg'; // Assume JPEG for curated images

        // Increment usage count
        await supabase
          .from('line_curated_images')
          .update({ usage_count: curatedImage.usage_count + 1 })
          .eq('id', curatedImageId);
      }
    }

    // Prepare LINE API message based on type
    let lineMessage: any;
    let displayText: string;

    switch (type) {
      case 'text':
        lineMessage = {
          type: 'text',
          text: message
        };
        displayText = message;
        break;

      case 'image':
        if (!fileUrl) {
          throw new Error('No image URL available');
        }
        lineMessage = {
          type: 'image',
          originalContentUrl: fileUrl,
          previewImageUrl: fileUrl
        };
        displayText = `📷 ${fileName || 'Image'}`;
        break;

      case 'file':
        // LINE doesn't have a direct file message type, so we'll send as text with download link
        lineMessage = {
          type: 'text',
          text: `📄 File: ${fileName || 'Document'}\nDownload: ${fileUrl}`
        };
        displayText = `📄 ${fileName || 'File'}`;
        break;

      default:
        throw new Error(`Unsupported message type: ${type}`);
    }

    // Send message via LINE API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: conversation.line_user_id,
        messages: [lineMessage]
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);

      return NextResponse.json({
        success: false,
        error: 'Failed to send message via LINE API',
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store message in our database
    const { data: storedMessage, error: messageError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        line_user_id: conversation.line_user_id,
        message_type: type,
        message_text: displayText,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        sender_type: 'admin',
        sender_name: senderName,
        timestamp: Date.now(),
        is_read: true // Admin messages are already "read" by admin
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing message:', messageError);
      throw messageError;
    }

    // Update conversation with last message info
    const { error: updateError } = await supabase
      .from('line_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: displayText,
        last_message_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: storedMessage.id,
        text: storedMessage.message_text,
        type: storedMessage.message_type,
        fileUrl: storedMessage.file_url,
        fileName: storedMessage.file_name,
        fileSize: storedMessage.file_size,
        fileType: storedMessage.file_type,
        senderType: storedMessage.sender_type,
        senderName: storedMessage.sender_name,
        timestamp: storedMessage.timestamp,
        createdAt: storedMessage.created_at,
        isRead: storedMessage.is_read
      }
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}