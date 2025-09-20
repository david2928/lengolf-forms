import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteImage } from '@/lib/line/storage-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get a specific curated image
 * GET /api/line/curated-images/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: image, error } = await supabase
      .from('line_curated_images')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Image not found'
        }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      image
    });

  } catch (error) {
    console.error('Failed to fetch curated image:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update a curated image's metadata
 * PUT /api/line/curated-images/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, tags } = body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Name is required and must be a non-empty string'
      }, { status: 400 });
    }

    if (description !== null && description !== undefined && typeof description !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Description must be a string or null'
      }, { status: 400 });
    }

    if (category !== null && category !== undefined && typeof category !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Category must be a string or null'
      }, { status: 400 });
    }

    if (tags && !Array.isArray(tags)) {
      return NextResponse.json({
        success: false,
        error: 'Tags must be an array'
      }, { status: 400 });
    }

    // Validate tags array
    if (tags && tags.some((tag: any) => typeof tag !== 'string')) {
      return NextResponse.json({
        success: false,
        error: 'All tags must be strings'
      }, { status: 400 });
    }

    // Check if image exists
    const { data: existingImage, error: checkError } = await supabase
      .from('line_curated_images')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Image not found'
        }, { status: 404 });
      }
      throw checkError;
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (category !== undefined) {
      updateData.category = category?.trim() || null;
    }

    if (tags !== undefined) {
      updateData.tags = tags.filter((tag: string) => tag.trim()).map((tag: string) => tag.trim());
    }

    // Update the image
    const { data: updatedImage, error: updateError } = await supabase
      .from('line_curated_images')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      image: updatedImage
    });

  } catch (error) {
    console.error('Failed to update curated image:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Delete a curated image
 * DELETE /api/line/curated-images/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get image details for file cleanup
    const { data: image, error: fetchError } = await supabase
      .from('line_curated_images')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Image not found'
        }, { status: 404 });
      }
      throw fetchError;
    }

    // Delete from database first
    const { error: deleteError } = await supabase
      .from('line_curated_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Extract file path from URL for storage cleanup
    try {
      const url = new URL(image.file_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'line-messages');

      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');

        // Attempt to delete file from storage (non-blocking)
        deleteImage(filePath).catch(error => {
          console.warn('Failed to delete image file from storage:', error);
          // Don't fail the API call if storage cleanup fails
        });
      }
    } catch (urlError) {
      console.warn('Failed to parse image URL for storage cleanup:', urlError);
      // Continue - don't fail the API call
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete curated image:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}