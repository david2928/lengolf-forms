import { NextRequest, NextResponse } from 'next/server';
import { checkStorageBucket, validatePhotoData } from '@/lib/photo-storage';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/test-photo - Test photo storage functionality
 * Development/testing endpoint
 */
export async function GET() {
  try {
    console.log('Testing photo storage functionality...');
    
    // Check if storage bucket exists and is accessible
    const bucketStatus = await checkStorageBucket();
    
    return NextResponse.json({
      success: true,
      message: 'Photo storage test completed',
      bucket_status: bucketStatus,
      config: {
        bucket_name: 'time-clock-photos',
        max_file_size_mb: 5,
        allowed_formats: ['image/jpeg', 'image/png', 'image/webp'],
        retention_days: 30
      }
    });
  } catch (error) {
    console.error('Error in photo storage test:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Photo storage test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/time-clock/test-photo - Test photo validation
 * Development/testing endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photo_data } = body;
    
    if (!photo_data) {
      return NextResponse.json(
        { error: 'photo_data is required for testing' },
        { status: 400 }
      );
    }
    
    // Test photo validation
    const validation = validatePhotoData(photo_data);
    
    return NextResponse.json({
      success: true,
      message: 'Photo validation test completed',
      validation_result: validation,
      photo_info: {
        starts_with_data_url: photo_data.startsWith('data:image/'),
        estimated_size_kb: Math.round(photo_data.length * 0.75 / 1024), // Rough base64 size estimate
        format_detected: photo_data.match(/^data:image\/([^;]+)/)?.[1] || 'unknown'
      }
    });
  } catch (error) {
    console.error('Error in photo validation test:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Photo validation test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 