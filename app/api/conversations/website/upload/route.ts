import { NextRequest, NextResponse } from "next/server";
import { refacSupabase } from '@/lib/refac-supabase';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

/**
 * Upload file for website conversations
 * POST /api/conversations/website/upload
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!refacSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    // Check if this is a form data request (file upload)
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Expected multipart/form-data content type'
      }, { status: 400 });
    }

    // Handle file upload
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const sessionId = formData.get('sessionId') as string;
    const senderName = formData.get('senderName') as string || 'Admin';

    if (!file || !conversationId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: file, conversationId, sessionId'
      }, { status: 400 });
    }

    // Validate file type (only images for now)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Only image files are supported for website conversations'
      }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `website-chat/${fileName}`;

    console.log('Uploading file to storage:', { fileName, size: file.size, type: file.type });

    const { data: uploadData, error: uploadError } = await refacSupabase.storage
      .from('line-assets') // Using existing bucket
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({
        success: false,
        error: 'Failed to upload file'
      }, { status: 500 });
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = refacSupabase.storage
      .from('line-assets')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;
    console.log('File uploaded successfully:', imageUrl);

    // Insert message into web_chat_messages with image
    const { data: message, error: messageError } = await refacSupabase
      .from('web_chat_messages')
      .insert({
        conversation_id: conversationId,
        session_id: sessionId,
        message_text: file.name, // Store filename as message text
        message_type: 'image',
        image_url: imageUrl,
        sender_type: 'staff',
        sender_name: senderName,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
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
        last_message_text: '📷 Image',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        text: message.message_text,
        type: 'image',
        imageUrl: message.image_url,
        senderType: 'admin',
        senderName: message.sender_name,
        createdAt: message.created_at,
        conversationId: conversationId
      }
    });

  } catch (error) {
    console.error('Error in website upload API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}