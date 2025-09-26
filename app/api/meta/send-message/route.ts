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
      replyToMessageId
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
        .in('id', curatedImageIds);

      if (imagesError) {
        return NextResponse.json(
          { error: 'Failed to fetch curated images' },
          { status: 500 }
        );
      }

      sourceImageUrls = curatedImages?.map((img: any) => img.file_url) || [];
      console.log(`Retrieved ${sourceImageUrls.length} curated image URLs`);

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

    console.log(`Sending ${messageType} message to ${platform} user: ${platformUserId}`);
    if (message) console.log(`Message: ${message}`);
    if (sourceImageUrls.length) console.log(`Images: ${sourceImageUrls.length} images`);

    // Prepare API request based on platform
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
          // WhatsApp template message
          requestBody = {
            messaging_product: 'whatsapp',
            to: platformUserId,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' }
            }
          };
        } else if (mediaIds.length > 0) {
          // WhatsApp image message - send first image using media ID
          requestBody = {
            messaging_product: 'whatsapp',
            to: platformUserId,
            type: 'image',
            image: {
              id: mediaIds[0], // Use media ID instead of link
              caption: message || '' // Optional caption
            }
          };
        } else {
          // Regular WhatsApp text message
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
        if (mediaIds.length > 0) {
          // Facebook/Instagram image message - send first image using attachment ID
          const messageObj: any = {
            attachment: {
              type: 'image',
              payload: {
                attachment_id: mediaIds[0] // Use attachment ID instead of URL
              }
            }
          };

          // NOTE: reply_to removed - Facebook doesn't support it yet
          // We handle replies visually in our UI only

          requestBody = {
            messaging_type: 'RESPONSE',
            recipient: { id: platformUserId },
            message: messageObj
          };
        } else {
          // Facebook/Instagram text message
          const messageObj: any = { text: message };

          // NOTE: reply_to removed - Facebook doesn't support it yet
          // We handle replies visually in our UI only

          requestBody = {
            messaging_type: 'RESPONSE',
            recipient: { id: platformUserId },
            message: messageObj
          };
        }
        break;
    }

    // Log what we're sending to Facebook for debugging
    console.log('📤 Sending to Facebook API:', {
      url: apiUrl,
      payload: JSON.stringify(requestBody, null, 2)
    });

    // Send message via Meta API
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
      if (response.status === 401) {
        errorMessage = 'Meta API authentication failed - check your access token';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request - user may not be reachable or message format invalid';
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Meta message sent successfully:', result);

    // Extract message ID based on platform
    let messageId: string;
    if (platform === 'whatsapp') {
      // WhatsApp returns: { messages: [{ id: "wamid.xxx" }] }
      messageId = result.messages?.[0]?.id || `staff_${Date.now()}`;
    } else {
      // Facebook/Instagram returns: { message_id: "mid.xxx", recipient_id: "xxx" }
      messageId = result.message_id || result.id || `staff_${Date.now()}`;
    }

    console.log(`${platform} returned message ID:`, messageId);

    // Declare variables outside try block for later use
    let conversationId: string = '';
    let staffName: string = 'Admin'; // Use consistent "Admin" label like LINE
    let databaseMessageId: string = messageId; // Default to messageId if database storage fails

    // Store the sent message in our database
    try {
      // Ensure conversation exists
      conversationId = await ensureMetaConversationExists(platformUserId, platform);

      // Staff name already set above, no need to reassign

      // Store the message and get the database UUID
      databaseMessageId = await storeMetaMessage(
        conversationId,
        platformUserId,
        messageId, // Use the correctly extracted message ID
        message || (sourceImageUrls.length > 0 ? `Image message (${sourceImageUrls.length} image${sourceImageUrls.length > 1 ? 's' : ''})` : 'Message'),
        messageType,
        'business',
        staffName,
        platform,
        `sent_${Date.now()}`, // webhook event ID for sent messages
        sourceImageUrls.length > 0 ? sourceImageUrls.map(url => ({ url, type: 'image' })) : undefined, // store original image URLs for UI
        replyToMessageId // store reply for our UI (even though not sent to Facebook)
      );

      console.log('Sent message stored in database');

    } catch (dbError) {
      console.error('Failed to store sent message in database:', dbError);
      // Don't fail the API call if database storage fails
    }

    // Create a message object for the UI (similar to LINE API response format)
    const messageForUI = {
      id: databaseMessageId, // Use the database UUID for internal identification
      platformMessageId: messageId, // Include the Facebook message ID for replies
      text: message || (sourceImageUrls.length > 0 ? `📷 Image sent` : 'Message sent'),
      type: messageType,
      senderType: 'admin',
      senderName: staffName,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      conversationId: conversationId,
      platform: platform,
      // Include image URLs for UI display - use the first image URL like LINE does
      ...(sourceImageUrls.length > 0 && {
        imageUrl: sourceImageUrls[0], // For single image display compatibility with LINE
        fileUrl: sourceImageUrls[0],   // Alternative property name used in some components
        fileName: `image_${Date.now()}.jpg`, // Provide a filename
        fileType: 'image'
      })
    };

    return NextResponse.json({
      success: true,
      message: messageForUI, // Return the actual message object instead of success text
      messageId: messageId,
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