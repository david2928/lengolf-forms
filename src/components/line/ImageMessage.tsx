import Image from 'next/image';
import { useState } from 'react';
import { Download, Eye, X } from 'lucide-react';

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
      <div className={`relative group max-w-sm ${className}`}>
        {/* Main image display */}
        <div className="relative overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={imageUrl}
            alt={altText || fileName || 'Image'}
            width={300}
            height={200}
            className="object-cover w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onError={handleImageError}
            unoptimized={true}
            onClick={() => setShowFullSize(true)}
          />

          {/* Overlay controls */}
          {showControls && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFullSize(true)}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  title="View full size"
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  title="Download image"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image info */}
        {(fileName || fileSize) && (
          <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
            {fileName && <span className="truncate">{fileName}</span>}
            {fileSize && <span className="ml-2">{formatFileSize(fileSize)}</span>}
          </div>
        )}
      </div>

      {/* Full size modal */}
      {showFullSize && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setShowFullSize(false)}>
          <div className="relative max-w-screen-lg max-h-screen-lg">
            {/* Close button */}
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            {/* Full size image */}
            <Image
              src={imageUrl}
              alt={altText || fileName || 'Image'}
              width={800}
              height={600}
              className="object-contain max-w-full max-h-full"
              onError={handleImageError}
              unoptimized={true}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>

            {/* Image info overlay */}
            {(fileName || fileSize) && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm">
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
      <Image
        src={imageUrl}
        alt="Image"
        width={24}
        height={24}
        className="object-cover rounded border border-gray-200"
        onError={() => setImageError(true)}
        unoptimized={true}
      />
      <span className="ml-2 text-sm text-gray-600">Image</span>
    </div>
  );
}