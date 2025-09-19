import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  processedFile?: {
    name: string;
    size: number;
    type: string;
  };
}

export interface ImageDownloadOptions {
  maxSizeBytes?: number; // Default 2MB
  maxWidth?: number; // Default 1024
  maxHeight?: number; // Default 1024
}

export interface ImageCompressionOptions {
  maxWidth?: number; // Default 1200
  maxHeight?: number; // Default 1200
  quality?: number; // Default 0.8 (80% quality)
  maxSizeBytes?: number; // Default 1MB
}

/**
 * Compress an image file to reduce size and dimensions
 */
async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeBytes = 1024 * 1024 // 1MB
  } = options;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => resolve(file); // Fallback to original if load fails
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Download an image from LINE servers and store it in Supabase Storage
 */
export async function downloadLineImageToStorage(
  messageId: string,
  conversationId: string,
  options: ImageDownloadOptions = {}
): Promise<ImageUploadResult> {
  const { maxSizeBytes = 2 * 1024 * 1024, maxWidth = 1024, maxHeight = 1024 } = options;

  try {
    // Download image from LINE API
    const lineResponse = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!lineResponse.ok) {
      throw new Error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText}`);
    }

    const contentType = lineResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await lineResponse.arrayBuffer();

    // Check file size
    if (imageBuffer.byteLength > maxSizeBytes) {
      console.log(`Image ${messageId} is ${imageBuffer.byteLength} bytes, resizing...`);
      // TODO: Add image resizing logic here if needed
      // For now, we'll accept images up to the limit
    }

    // Generate file path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = getExtensionFromContentType(contentType);
    const filePath = `received/${year}/${month}/${conversationId}/${messageId}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('line-messages')
      .upload(filePath, imageBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('line-messages')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Error downloading LINE image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload an image to the curated images folder
 */
export async function uploadCuratedImage(
  file: File,
  imageId: string
): Promise<ImageUploadResult> {
  try {
    const extension = getExtensionFromFile(file);
    const filePath = `curated/${imageId}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('line-messages')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('line-messages')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Error uploading curated image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload an image sent by admin
 */
export async function uploadSentImage(
  file: File,
  conversationId: string,
  compressionOptions?: ImageCompressionOptions
): Promise<ImageUploadResult> {
  try {
    console.log(`Uploading file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // File is already processed on client-side before reaching here
    let processedFile = file;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime();
    const extension = getExtensionFromFile(processedFile);
    const filePath = `sent/${year}/${month}/${conversationId}/${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('line-messages')
      .upload(filePath, processedFile, {
        contentType: processedFile.type,
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('line-messages')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      processedFile: {
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type
      }
    };

  } catch (error) {
    console.error('Error uploading sent image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a signed URL for private access to images
 */
export async function getSignedImageUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('line-messages')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Delete an image from storage
 */
export async function deleteImage(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('line-messages')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'jpg'; // Default fallback
  }
}

/**
 * Get file extension from File object
 */
function getExtensionFromFile(file: File): string {
  const name = file.name.toLowerCase();
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) {
    return getExtensionFromContentType(file.type);
  }
  return name.substring(lastDot + 1);
}

/**
 * Validate if file is an allowed image type
 */
export function isValidImageFile(file: File): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  return allowedTypes.includes(file.type.toLowerCase());
}

/**
 * Validate if file is an allowed file type (images + PDFs)
 */
export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  return allowedTypes.includes(file.type.toLowerCase());
}