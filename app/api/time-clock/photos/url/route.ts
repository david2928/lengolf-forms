import { NextRequest, NextResponse } from 'next/server';
import { getTimeClockPhotoUrl } from '@/lib/photo-storage';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

/**
 * GET /api/time-clock/photos/url - Get signed URL for a time clock photo
 * Requires authentication (session or dev token)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get photo path from query parameters
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');

    if (!photoPath) {
      return NextResponse.json(
        { error: 'Photo path is required' },
        { status: 400 }
      );
    }

    // Generate signed URL for the photo
    const photoUrl = await getTimeClockPhotoUrl(photoPath);
    
    if (!photoUrl) {
      return NextResponse.json(
        { error: 'Failed to generate photo URL' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      url: photoUrl
    });

  } catch (error) {
    console.error('Error in GET /api/time-clock/photos/url:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}