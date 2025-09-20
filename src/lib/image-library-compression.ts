/**
 * Image compression service specifically optimized for curated image library
 * More aggressive compression than regular chat images for storage efficiency
 */

export interface LibraryImageCompressionOptions {
  maxWidth?: number; // Default 800
  maxHeight?: number; // Default 800
  quality?: number; // Default 0.85 (85% quality)
  maxSizeBytes?: number; // Default 200KB
  forceJpeg?: boolean; // Default true - convert PNG to JPEG for better compression
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    compressed: { width: number; height: number };
  };
}

/**
 * Compress an image for the curated library with aggressive optimization
 */
export async function compressLibraryImage(
  file: File,
  options: LibraryImageCompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.85,
    maxSizeBytes = 200 * 1024, // 200KB
    forceJpeg = true
  } = options;

  // Only compress images
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      const originalDimensions = { width: img.width, height: img.height };

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const compressedDimensions = { width, height };

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Use high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format
      const outputType = forceJpeg || file.type === 'image/jpeg' ? 'image/jpeg' : file.type;

      // Start with the specified quality
      let currentQuality = quality;

      const tryCompression = (compressionQuality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed - blob is null'));
              return;
            }

            // If the compressed size is still too large and we can reduce quality further
            if (blob.size > maxSizeBytes && compressionQuality > 0.3) {
              // Reduce quality by 10% and try again
              tryCompression(compressionQuality - 0.1);
              return;
            }

            const compressedFile = new File([blob], getCompressedFileName(file.name, outputType), {
              type: outputType,
              lastModified: Date.now(),
            });

            const compressedSize = compressedFile.size;
            const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

            resolve({
              compressedFile,
              originalSize,
              compressedSize,
              compressionRatio,
              dimensions: {
                original: originalDimensions,
                compressed: compressedDimensions
              }
            });
          },
          outputType,
          compressionQuality
        );
      };

      tryCompression(currentQuality);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get the appropriate filename for the compressed image
 */
function getCompressedFileName(originalName: string, outputType: string): string {
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

  switch (outputType) {
    case 'image/jpeg':
      return `${nameWithoutExt}.jpg`;
    case 'image/png':
      return `${nameWithoutExt}.png`;
    case 'image/webp':
      return `${nameWithoutExt}.webp`;
    default:
      return `${nameWithoutExt}.jpg`;
  }
}

/**
 * Validate if file is suitable for the image library
 */
export function validateLibraryImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    };
  }

  // Check file size (max 10MB before compression)
  const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBeforeCompression) {
    return {
      valid: false,
      error: 'Image must be smaller than 10MB'
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = bytes / Math.pow(k, i);

  // Show 1 decimal place for MB and above, whole numbers for KB and below
  if (i >= 2) {
    return `${size.toFixed(1)}${sizes[i]}`;
  } else {
    return `${Math.round(size)}${sizes[i]}`;
  }
}

/**
 * Get compression savings information for display
 */
export function getCompressionSavings(originalSize: number, compressedSize: number): {
  saved: string;
  percentage: number;
  description: string;
} {
  const savedBytes = originalSize - compressedSize;
  const percentage = Math.round((savedBytes / originalSize) * 100);

  let description = '';
  if (percentage >= 70) {
    description = 'Excellent compression';
  } else if (percentage >= 50) {
    description = 'Good compression';
  } else if (percentage >= 30) {
    description = 'Moderate compression';
  } else {
    description = 'Minimal compression';
  }

  return {
    saved: formatFileSize(savedBytes),
    percentage,
    description
  };
}