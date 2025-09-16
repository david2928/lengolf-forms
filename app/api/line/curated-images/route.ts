import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get all curated images
 * GET /api/line/curated-images
 */
export async function GET() {
  try {
    const { data: images, error } = await supabase
      .from('line_curated_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching curated images:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      images: images || []
    });

  } catch (error) {
    console.error('Failed to fetch curated images:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create a new curated image
 * POST /api/line/curated-images
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const category = formData.get('category') as string || null;
    const tags = formData.get('tags') as string;

    if (!file || !name) {
      return NextResponse.json({
        success: false,
        error: 'File and name are required'
      }, { status: 400 });
    }

    // Import the upload function
    const { uploadCuratedImage } = await import('@/lib/line/storage-handler');

    // Generate unique ID for the image
    const imageId = crypto.randomUUID();

    // Upload the image
    const uploadResult = await uploadCuratedImage(file, imageId);
    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to upload image: ${uploadResult.error}`
      }, { status: 500 });
    }

    // Parse tags
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      } catch (e) {
        parsedTags = [];
      }
    }

    // Store image metadata in database
    const { data: image, error: dbError } = await supabase
      .from('line_curated_images')
      .insert({
        id: imageId,
        name,
        description,
        file_url: uploadResult.url!,
        tags: parsedTags,
        category,
        usage_count: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing image metadata:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      image
    });

  } catch (error) {
    console.error('Failed to create curated image:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}