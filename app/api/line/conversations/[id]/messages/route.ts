import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadSentImage, uploadCuratedImage, isValidFileType } from '@/lib/line/storage-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Handle batch image sending - send multiple curated images at once
 */
async function handleBatchImages(conversationId: string, imageIds: string[], senderName: string) {
  try {
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Image IDs array is required for batch images'
      }, { status: 400 });
    }

    // Limit to 5 images (LINE API limit)
    const limitedImageIds = imageIds.slice(0, 5);

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select('line_user_id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Get all curated images
    const { data: curatedImages, error: curatedError } = await supabase
      .from('line_curated_images')
      .select('*')
      .in('id', limitedImageIds);

    if (curatedError || !curatedImages || curatedImages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid curated images found'
      }, { status: 404 });
    }

    // Build LINE API messages array
    const lineMessages = curatedImages.map(image => ({
      type: 'image',
      originalContentUrl: image.file_url,
      previewImageUrl: image.file_url
    }));

    // Send all images via LINE API in one call
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: conversation.line_user_id,
        messages: lineMessages
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to send images via LINE API',
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store all messages in database
    const messagesToInsert = curatedImages.map(image => ({
      conversation_id: conversationId,
      line_user_id: conversation.line_user_id,
      message_type: 'image',
      message_text: 'You sent a photo',
      file_url: image.file_url,
      file_name: image.name,
      file_type: 'image/jpeg',
      sender_type: 'admin',
      sender_name: senderName,
      timestamp: Date.now(),
      is_read: true
    }));

    const { data: storedMessages, error: messageError } = await supabase
      .from('line_messages')
      .insert(messagesToInsert)
      .select();

    if (messageError) {
      console.error('Error storing messages:', messageError);
      throw messageError;
    }

    // Update usage count for all sent images
    for (const image of curatedImages) {
      await supabase
        .from('line_curated_images')
        .update({ usage_count: image.usage_count + 1 })
        .eq('id', image.id);
    }

    // Update conversation with last message info
    await supabase
      .from('line_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: `You sent ${curatedImages.length} photo${curatedImages.length > 1 ? 's' : ''}`,
        last_message_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // Format messages for frontend
    const formattedMessages = storedMessages?.map(msg => ({
      id: msg.id,
      text: msg.message_text,
      type: msg.message_type,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: null,
      fileType: msg.file_type,
      senderType: msg.sender_type,
      senderName: msg.sender_name,
      timestamp: msg.timestamp,
      createdAt: msg.created_at,
      isRead: msg.is_read
    })) || [];

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: curatedImages.length
    });

  } catch (error) {
    console.error('Failed to send batch images:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
    console.log('API: Received request for conversation:', conversationId);

    // Check if this is a form data request (file upload) or JSON
    const contentType = request.headers.get('content-type') || '';
    console.log('API: Content type:', contentType);
    let messageData: any;
    let uploadedFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      console.log('API: Processing FormData...');
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const messageType = formData.get('type') as string;
      const senderName = formData.get('senderName') as string || 'Admin';
      const curatedImageId = formData.get('curatedImageId') as string;

      console.log('API: FormData contents:', {
        file: file ? { name: file.name, size: file.size, type: file.type } : null,
        messageType,
        senderName,
        curatedImageId
      });

      if (file && !isValidFileType(file)) {
        console.log('API: Invalid file type:', file.type);
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
      curatedImageId,
      curatedImageIds,
      repliedToMessageId
    } = messageData;

    // Handle batch images separately
    if (type === 'batch_images') {
      return await handleBatchImages(conversationId, curatedImageIds, senderName);
    }

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

    // Get conversation details with user info
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select(`
        line_user_id,
        line_users!inner (
          display_name,
          picture_url
        )
      `)
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
        fileName = uploadResult.processedFile?.name || uploadedFile.name;
        fileSize = uploadResult.processedFile?.size || uploadedFile.size;
        fileType = uploadResult.processedFile?.type || uploadedFile.type;
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

    // Handle reply logic - fetch replied-to message and its quote token
    let repliedToMessage: any = null;
    let replyQuoteToken: string | null = null;
    let replyPreviewText: string | null = null;
    let replyPreviewType: string | null = null;

    if (repliedToMessageId) {
      const { data: originalMessage, error: replyError } = await supabase
        .from('line_messages')
        .select('id, message_text, message_type, quote_token, sender_name, file_name')
        .eq('id', repliedToMessageId)
        .single();

      if (replyError) {
        console.error('Error fetching replied-to message:', replyError);
        return NextResponse.json({
          success: false,
          error: 'Replied-to message not found'
        }, { status: 404 });
      }

      if (originalMessage) {
        repliedToMessage = originalMessage;
        replyQuoteToken = originalMessage.quote_token;

        // Generate preview data
        replyPreviewType = originalMessage.message_type;
        switch (originalMessage.message_type) {
          case 'image':
            replyPreviewText = '📷 Photo';
            break;
          case 'sticker':
            replyPreviewText = '🎨 Sticker';
            break;
          case 'file':
            replyPreviewText = `📄 ${originalMessage.file_name || 'File'}`;
            break;
          default:
            replyPreviewText = originalMessage.message_text?.substring(0, 50) || 'Message';
            if (originalMessage.message_text && originalMessage.message_text.length > 50) {
              replyPreviewText += '...';
            }
        }
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
        // Add quote token for native LINE reply if this is a reply
        if (replyQuoteToken) {
          lineMessage.quoteToken = replyQuoteToken;
          console.log('Adding quote token to message:', replyQuoteToken);
        }
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
        displayText = 'You sent a photo';
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

    // LINE Push API returns 200 OK with empty body - quote tokens are only available in Reply API responses
    // We'll store our own quote token when this message is received back via webhook
    let responseQuoteToken: string | null = null;

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
        is_read: true, // Admin messages are already "read" by admin
        quote_token: responseQuoteToken,
        replied_to_message_id: repliedToMessageId,
        reply_preview_text: replyPreviewText,
        reply_preview_type: replyPreviewType,
        reply_sender_name: repliedToMessage?.sender_name || (repliedToMessage?.sender_type === 'admin' ? 'LENGOLF' : (conversation as any).line_users?.display_name),
        reply_sender_type: repliedToMessage?.sender_type,
        reply_sender_picture_url: repliedToMessage?.sender_type === 'admin' ? '/favicon.svg' : (conversation as any).line_users?.picture_url
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
        isRead: storedMessage.is_read,
        repliedToMessageId: storedMessage.replied_to_message_id,
        replyPreviewText: storedMessage.reply_preview_text,
        replyPreviewType: storedMessage.reply_preview_type,
        replySenderName: storedMessage.reply_sender_name,
        replySenderType: storedMessage.reply_sender_type,
        replySenderPictureUrl: storedMessage.reply_sender_picture_url,
        repliedToMessage: repliedToMessage ? {
          id: repliedToMessage.id,
          text: repliedToMessage.message_text,
          type: repliedToMessage.message_type,
          senderName: repliedToMessage.sender_name,
          senderType: repliedToMessage.sender_type
        } : undefined
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