/**
 * Client-side image compression utility
 * Only works in browser environment
 */

export interface ImageCompressionOptions {
  maxWidth?: number; // Default 1200
  maxHeight?: number; // Default 1200
  quality?: number; // Default 0.8 (80% quality)
  maxSizeBytes?: number; // Default 1MB
}

/**
 * Compress an image file to reduce size and dimensions
 * Client-side only - uses Canvas API
 */
export async function compressImage(
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
    console.log(`File size ${(file.size / 1024).toFixed(0)}KB is under limit, no compression needed`);
    return file;
  }

  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      console.log(`Original dimensions: ${width}x${height}`);

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        console.log(`Resized dimensions: ${Math.round(width)}x${Math.round(height)}`);
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
            console.log(`Compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            resolve(compressedFile);
          } else {
            console.warn('Compression failed, using original file');
            resolve(file); // Fallback to original if compression fails
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      console.warn('Image load failed, using original file');
      resolve(file); // Fallback to original if load fails
    };

    img.src = URL.createObjectURL(file);
  });
}