import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Download, Eye, X } from 'lucide-react';
import { CachedImage } from './CachedImage';

interface ImageMessageProps {
  imageUrl: string;
  fileName?: string;
  fileSize?: number;
  altText?: string;
  className?: string;
  showControls?: boolean;
}

/**
 * Component to display image messages in LINE chat
 * Supports zoom, download, and fallback display
 */
export function ImageMessage({
  imageUrl,
  fileName,
  fileSize,
  altText,
  className = "",
  showControls = true
}: ImageMessageProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  const handleImageError = () => {
    console.error('Image failed to load:', imageUrl);
    setImageError(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';

    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(1)}MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(0)}KB`;
    } else {
      return `${bytes}B`;
    }
  };

  if (imageError) {
    return (
      <div className={`inline-flex items-center justify-center w-48 h-32 bg-gray-100 border border-gray-300 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-sm">Image unavailable</div>
          {fileName && <div className="text-xs mt-1">{fileName}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group max-w-[200px] ${className}`}>
        {/* Main image display - smaller like LINE OA */}
        <div
          className="relative overflow-hidden rounded-lg border border-gray-200 cursor-pointer"
          onClick={() => setShowFullSize(true)}
        >
          <CachedImage
            src={imageUrl}
            alt={altText || fileName || 'Image'}
            width={200}
            height={120}
            className="object-cover w-full h-auto hover:opacity-90 transition-opacity"
            onError={handleImageError}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />

          {/* Overlay controls */}
          {showControls && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  title="Download image"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image info removed - now shown externally */}
      </div>

      {/* Full size modal */}
      {showFullSize && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 overflow-auto" onClick={() => setShowFullSize(false)}>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            {/* Full size image container */}
            <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto">
              <CachedImage
                src={imageUrl}
                alt={altText || fileName || 'Image'}
                width={1200}
                height={800}
                className="object-contain w-auto h-auto max-w-full max-h-full"
                onError={handleImageError}
                onClick={(e) => e?.stopPropagation()}
              />
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10"
              title="Download image"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>

            {/* Image info overlay */}
            {(fileName || fileSize) && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm z-10">
                {fileName && <div>{fileName}</div>}
                {fileSize && <div className="text-xs text-gray-300">{formatFileSize(fileSize)}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Simplified image message for inline display (e.g., in conversation list)
 */
export function ImageMessageInline({ imageUrl, className = "" }: { imageUrl: string; className?: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className={`inline-flex items-center text-gray-500 ${className}`}>
        <span className="text-sm">🖼️ Image</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <CachedImage
        src={imageUrl}
        alt="Image"
        width={24}
        height={24}
        className="object-cover rounded border border-gray-200"
        onError={() => setImageError(true)}
        loading="lazy"
      />
      <span className="ml-2 text-sm text-gray-600">Image</span>
    </div>
  );
}