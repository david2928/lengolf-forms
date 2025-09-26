import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { uploadSentImage } from '@/lib/line/storage-handler';

/**
 * Upload file for Meta platform messaging
 * POST /api/meta/upload-file
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const platformUserId = formData.get('platformUserId') as string;
    const platform = formData.get('platform') as string;

    if (!file || !conversationId || !platformUserId || !platform) {
      return NextResponse.json({
        success: false,
        error: 'file, conversationId, platformUserId, and platform are required'
      }, { status: 400 });
    }

    // Upload file to Supabase storage (reuse LINE's upload logic)
    const uploadResult = await uploadSentImage(file, conversationId);
    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to upload file: ${uploadResult.error}`
      }, { status: 500 });
    }

    // Now send the image to Meta using the uploaded URL
    const imageUrl = uploadResult.url!;
    const baseUrl = request.url.split('/api/')[0]; // Extract base URL from request
    const response = await fetch(`${baseUrl}/api/meta/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        platformUserId,
        platform,
        messageType: 'image',
        imageUrl
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to send to Meta: ${result.error}`
      }, { status: response.status });
    }

    // Return the message for UI display
    return NextResponse.json({
      success: true,
      message: result.message,
      fileUrl: imageUrl,
      fileName: uploadResult.processedFile?.name || file.name,
      fileSize: uploadResult.processedFile?.size || file.size,
      fileType: uploadResult.processedFile?.type || file.type
    });

  } catch (error) {
    console.error('Error uploading file to Meta:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}