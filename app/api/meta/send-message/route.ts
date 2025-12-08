import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { storeMetaMessage, ensureMetaConversationExists } from '@/lib/meta/webhook-handler';

interface SendMetaMessageRequest {
  platformUserId: string;
  message?: string; // Optional when sending images
  platform: 'facebook' | 'instagram' | 'whatsapp';
  messageType?: 'text' | 'template' | 'image';
  templateName?: string; // For WhatsApp templates
  imageUrl?: string; // For image messages
  curatedImageIds?: string[]; // For sending multiple curated images
  replyToMessageId?: string; // For replies - platform message ID
  staffEmail?: string | null; // For SLA tracking
}

/**
 * Send message to Meta platform user (Facebook, Instagram, WhatsApp)
 * POST /api/meta/send-message
 * Follows the same authentication pattern as LINE send-message
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const {
      platformUserId,
      message,
      platform,
      messageType = 'text',
      templateName,
      imageUrl,
      curatedImageIds,
      replyToMessageId,
      staffEmail = null
    }: SendMetaMessageRequest = await request.json();

    // Validate input
    if (!platformUserId || !platform) {
      return NextResponse.json(
        { error: 'platformUserId and platform are required' },
        { status: 400 }
      );
    }

    // For text/template messages, message is required
    if ((messageType === 'text' || messageType === 'template') && !message) {
      return NextResponse.json(
        { error: 'message is required for text/template messages' },
        { status: 400 }
      );
    }

    // For image messages, imageUrl or curatedImageIds is required
    if (messageType === 'image' && !imageUrl && !curatedImageIds?.length) {
      return NextResponse.json(
        { error: 'imageUrl or curatedImageIds is required for image messages' },
        { status: 400 }
      );
    }

    if (!['facebook', 'instagram', 'whatsapp'].includes(platform)) {
      return NextResponse.json(
        { error: 'platform must be facebook, instagram, or whatsapp' },
        { status: 400 }
      );
    }

    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!pageAccessToken) {
      console.error('META_PAGE_ACCESS_TOKEN not configured');
      return NextResponse.json(
        { error: 'Meta messaging not configured' },
        { status: 500 }
      );
    }

    // Handle curated images - download and upload to Meta
    let mediaIds: string[] = [];
    let sourceImageUrls: string[] = []; // Keep original URLs for UI
    if (curatedImageIds?.length) {
      const { data: curatedImages, error: imagesError } = await refacSupabaseAdmin
        .from('line_curated_images')
        .select('file_url')
        .in('id', curatedImageIds)
        .order('id'); // Maintain consistent ordering

      if (imagesError) {
        return NextResponse.json(
          { error: 'Failed to fetch curated images' },
          { status: 500 }
        );
      }

      sourceImageUrls = curatedImages?.map((img: any) => img.file_url) || [];

      // Upload images to Meta and get media IDs
      for (const sourceUrl of sourceImageUrls) {
        try {
          const mediaId = await uploadImageToMeta(sourceUrl, pageAccessToken, platform);
          if (mediaId) {
            mediaIds.push(mediaId); // Store media ID for Meta API
          }
        } catch (uploadError) {
          console.error('Failed to upload image to Meta:', uploadError);
          // Continue with other images
        }
      }
    } else if (imageUrl) {
      // Single image upload
      sourceImageUrls = [imageUrl];
      try {
        const mediaId = await uploadImageToMeta(imageUrl, pageAccessToken, platform);
        if (mediaId) {
          mediaIds = [mediaId];
        }
      } catch (uploadError) {
        console.error('Failed to upload image to Meta:', uploadError);
      }
    }


    // For multiple images, send each as a separate message
    const sentMessages: any[] = [];
    const messageIds: string[] = [];

    // If we have multiple images, send each separately
    if (mediaIds.length > 1) {
      for (let i = 0; i < mediaIds.length; i++) {
        const mediaId = mediaIds[i];
        const sourceUrl = sourceImageUrls[i];

        let apiUrl: string;
        let requestBody: any;

        switch (platform) {
          case 'whatsapp':
            const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
            if (!phoneNumberId) {
              console.error('WhatsApp phone number ID not configured');
              continue;
            }

            apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
            requestBody = {
              messaging_product: 'whatsapp',
              to: platformUserId,
              type: 'image',
              image: {
                id: mediaId,
                caption: i === 0 && message ? message : '' // Only first image gets caption
              }
            };
            break;

          case 'facebook':
          case 'instagram':
            apiUrl = 'https://graph.facebook.com/v20.0/me/messages';
            requestBody = {
              messaging_type: 'RESPONSE',
              recipient: { id: platformUserId },
              message: {
                attachment: {
                  type: 'image',
                  payload: {
                    attachment_id: mediaId
                  }
                }
              }
            };
            break;
        }

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pageAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const result = await response.json();
            const msgId = platform === 'whatsapp'
              ? result.messages?.[0]?.id
              : result.message_id || result.id;

            if (msgId) {
              messageIds.push(msgId);
              sentMessages.push({ mediaId, sourceUrl, messageId: msgId });
            }
          } else {
            const errorText = await response.text();
            console.error(`Failed to send image ${i + 1}:`, errorText);

            // Check if this is a messaging window error
            try {
              const errorData = JSON.parse(errorText);
              const fbError = errorData?.error;

              // Detect messaging window errors
              if ((fbError?.code === 10 && (fbError.error_subcode === 2018278 || fbError.error_subcode === 2534022)) ||
                  fbError?.code === 131056 ||
                  fbError?.message?.includes('outside of allowed window')) {
                // Stop trying to send more images if we hit the messaging window limit
                console.log('❌ Messaging window expired - stopping image send');

                // Return a user-friendly error immediately
                return NextResponse.json({
                  error: 'Message cannot be sent - the 24-hour messaging window has expired',
                  details: 'You can only message users who have contacted you within the last 24 hours on Facebook/Instagram',
                  errorType: 'messaging_window_expired',
                  fbError: fbError
                }, { status: 400 });
              }
            } catch (parseError) {
              // Continue if we can't parse the error
            }
          }

          // Small delay between messages to avoid rate limiting
          if (i < mediaIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error sending image ${i + 1}:`, error);
        }
      }

      // If no images were successfully sent, return error
      if (messageIds.length === 0) {
        return NextResponse.json(
          { error: 'Failed to send any images' },
          { status: 500 }
        );
      }
    } else {
      // Single message (text or single image)
      let apiUrl: string;
      let requestBody: any;

      switch (platform) {
        case 'whatsapp':
          const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
          if (!phoneNumberId) {
            return NextResponse.json(
              { error: 'WhatsApp phone number ID not configured' },
              { status: 500 }
            );
          }

          apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

          if (messageType === 'template' && templateName) {
            requestBody = {
              messaging_product: 'whatsapp',
              to: platformUserId,
              type: 'template',
              template: {
                name: templateName,
                language: { code: 'en' }
              }
            };
          } else if (mediaIds.length === 1) {
            requestBody = {
              messaging_product: 'whatsapp',
              to: platformUserId,
              type: 'image',
              image: {
                id: mediaIds[0],
                caption: message || ''
              }
            };
          } else {
            requestBody = {
              messaging_product: 'whatsapp',
              to: platformUserId,
              type: 'text',
              text: { body: message }
            };
          }
          break;

        case 'facebook':
        case 'instagram':
          apiUrl = 'https://graph.facebook.com/v20.0/me/messages';
          if (mediaIds.length === 1) {
            requestBody = {
              messaging_type: 'RESPONSE',
              recipient: { id: platformUserId },
              message: {
                attachment: {
                  type: 'image',
                  payload: {
                    attachment_id: mediaIds[0]
                  }
                }
              }
            };
          } else {
            requestBody = {
              messaging_type: 'RESPONSE',
              recipient: { id: platformUserId },
              message: { text: message }
            };
          }
          break;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Meta API error: ${response.status} ${response.statusText} - ${errorText}`);

        let errorMessage = 'Failed to send message';
        let parsedError: any = null;

        try {
          parsedError = JSON.parse(errorText);
        } catch (e) {
          parsedError = { error: { message: errorText } };
        }

        if (response.status === 401) {
          errorMessage = 'Meta API authentication failed - check your access token';
        } else if (response.status === 400) {
          const fbError = parsedError?.error;
          if (fbError?.code === 10 && (fbError.error_subcode === 2018278 || fbError.error_subcode === 2534022)) {
            errorMessage = 'sent outside of allowed window';
          } else if (fbError?.message?.includes('outside of allowed window') ||
                     fbError?.message?.includes('24 hour messaging window') ||
                     fbError?.message?.includes('messaging window has expired')) {
            errorMessage = 'sent outside of allowed window';
          } else if (fbError?.code === 131056) {
            errorMessage = 'sent outside of allowed window';
          } else {
            errorMessage = 'Invalid request - user may not be reachable or message format invalid';
          }
        }

        return NextResponse.json(
          { error: errorMessage, details: errorText, fbError: parsedError?.error },
          { status: response.status }
        );
      }

      const result = await response.json();
      const messageId = platform === 'whatsapp'
        ? result.messages?.[0]?.id || `staff_${Date.now()}`
        : result.message_id || result.id || `staff_${Date.now()}`;

      messageIds.push(messageId);
    }

    // Now store all messages in the database
    let conversationId: string = '';
    const staffName: string = 'Admin';
    const databaseMessageIds: string[] = [];

    try {
      conversationId = await ensureMetaConversationExists(platformUserId, platform);

      // Store each message with a small delay to ensure realtime processes them in order
      for (let i = 0; i < messageIds.length; i++) {
        const msgId = messageIds[i];
        const sourceUrl = sourceImageUrls[i];

        const attachmentsForStorage = sourceUrl ? [{
          type: 'image' as const,
          payload: { url: sourceUrl }
        }] : undefined;

        const dbMsgId = await storeMetaMessage(
          conversationId,
          platformUserId,
          msgId,
          i === 0 && message ? message : '📷 Image',
          'image',
          'business',
          staffName,
          platform,
          `sent_${Date.now()}_${i}`,
          attachmentsForStorage,
          i === 0 ? replyToMessageId : undefined, // Only first message has reply
          staffEmail || null // SLA tracking
        );

        databaseMessageIds.push(dbMsgId);

        // Small delay between inserts to ensure realtime can process them sequentially
        if (i < messageIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (dbError) {
      console.error('Failed to store sent messages in database:', dbError);
    }

    // Create response messages for the UI
    const messagesForUI = databaseMessageIds.map((dbId, i) => ({
      id: dbId,
      platformMessageId: messageIds[i],
      text: i === 0 && message ? message : '📷 Image',
      type: messageType || 'image',
      senderType: 'admin',
      senderName: staffName,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      conversationId: conversationId,
      platform: platform,
      imageUrl: sourceImageUrls[i],
      fileUrl: sourceImageUrls[i],
      fileName: `image_${Date.now()}_${i}.jpg`,
      fileType: 'image'
    }));

    return NextResponse.json({
      success: true,
      messages: messagesForUI, // Return array of messages
      message: messagesForUI[0], // Keep backward compatibility with single message
      messageId: messageIds[0],
      messageIds: messageIds, // Return all message IDs
      platform
    });

  } catch (error) {
    console.error('Error sending Meta message:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to get available WhatsApp message templates
 * Useful for frontend to show available templates
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (platform === 'whatsapp') {
      // In a real implementation, you'd fetch these from Meta API
      // For now, return some common template examples
      return NextResponse.json({
        success: true,
        templates: [
          {
            name: 'hello_world',
            language: 'en',
            description: 'Standard greeting template'
          },
          {
            name: 'appointment_reminder',
            language: 'en',
            description: 'Appointment reminder template'
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      templates: []
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * Upload image to Meta and return media ID
 */
async function uploadImageToMeta(
  imageUrl: string,
  pageAccessToken: string,
  platform: 'facebook' | 'instagram' | 'whatsapp'
): Promise<string | null> {
  try {
    // Step 1: Download image from source URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // Step 2: Upload to Meta
    let uploadUrl: string;
    if (platform === 'whatsapp') {
      const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
      uploadUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/media`;
    } else {
      // Facebook/Instagram
      uploadUrl = 'https://graph.facebook.com/v18.0/me/message_attachments';
    }

    const formData = new FormData();
    formData.append('file', imageBlob, 'image.jpg');

    if (platform === 'whatsapp') {
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'image');
    } else {
      formData.append('message', JSON.stringify({
        attachment: {
          type: 'image',
          payload: {
            is_reusable: true
          }
        }
      }));
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageAccessToken}`,
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Meta upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    if (platform === 'whatsapp') {
      return uploadResult.id; // WhatsApp returns direct media ID
    } else {
      return uploadResult.attachment_id; // Facebook/Instagram returns attachment ID
    }

  } catch (error) {
    console.error('Error uploading image to Meta:', error);
    return null;
  }
}