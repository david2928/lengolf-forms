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

    // Enhanced validation
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Image file is required'
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Name is required and must be a non-empty string'
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: 'Only JPEG, PNG, GIF, and WebP images are allowed'
      }, { status: 400 });
    }

    // Validate file size (max 10MB for library images before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'Image must be smaller than 10MB'
      }, { status: 400 });
    }

    // Validate name length
    if (name.trim().length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Name must be 100 characters or less'
      }, { status: 400 });
    }

    // Validate description length
    if (description && description.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Description must be 500 characters or less'
      }, { status: 400 });
    }

    // Validate category length
    if (category && category.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Category must be 50 characters or less'
      }, { status: 400 });
    }

    // Import the upload function
    const { uploadCuratedImage } = await import('@/lib/line/storage-handler');

    // Generate unique ID for the image
    const imageId = crypto.randomUUID();

    // Upload the image (file should already be compressed on client side)
    const uploadResult = await uploadCuratedImage(file, imageId);
    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to upload image: ${uploadResult.error}`
      }, { status: 500 });
    }

    // Parse and validate tags
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = tags.split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
          .slice(0, 10); // Limit to 10 tags

        // Validate individual tag length
        const invalidTags = parsedTags.filter(tag => tag.length > 30);
        if (invalidTags.length > 0) {
          return NextResponse.json({
            success: false,
            error: 'Each tag must be 30 characters or less'
          }, { status: 400 });
        }
      } catch (e) {
        parsedTags = [];
      }
    }

    // Check for duplicate names (optional - you might want unique names)
    const { data: existingImage } = await supabase
      .from('line_curated_images')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingImage) {
      return NextResponse.json({
        success: false,
        error: 'An image with this name already exists'
      }, { status: 400 });
    }

    // Store image metadata in database
    const { data: image, error: dbError } = await supabase
      .from('line_curated_images')
      .insert({
        id: imageId,
        name: name.trim(),
        description: description?.trim() || null,
        file_url: uploadResult.url!,
        tags: parsedTags,
        category: category?.trim() || null,
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