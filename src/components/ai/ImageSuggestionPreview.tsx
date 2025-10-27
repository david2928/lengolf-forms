'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ImageIcon, Send, Info } from 'lucide-react';

interface ImageSuggestion {
  imageId: string;
  imageUrl: string;
  title: string;
  description: string;
  reason: string;
  similarityScore?: number;
}

interface ImageSuggestionPreviewProps {
  images: ImageSuggestion[];
  onSendImage: (imageId: string) => void;
  onSendWithText: (imageId: string, text: string) => void;
  suggestedText?: string;
}

export const ImageSuggestionPreview: React.FC<ImageSuggestionPreviewProps> = ({
  images,
  onSendImage,
  onSendWithText,
  suggestedText
}) => {
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(null);
  const [showDetails, setShowDetails] = React.useState<string | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 p-3">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-2">
        <ImageIcon className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium text-gray-700">
          AI suggests {images.length} {images.length === 1 ? 'image' : 'images'}
        </span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-2">
        {images.map((image) => (
          <div
            key={image.imageId}
            className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
              selectedImageId === image.imageId
                ? 'border-purple-500 shadow-lg'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => setSelectedImageId(
              selectedImageId === image.imageId ? null : image.imageId
            )}
          >
            {/* Image Thumbnail */}
            <div className="relative aspect-video bg-gray-100">
              <Image
                src={image.imageUrl}
                alt={image.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />

              {/* Similarity Score Badge */}
              {image.similarityScore && (
                <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {(image.similarityScore * 100).toFixed(0)}%
                </div>
              )}
            </div>

            {/* Image Info */}
            <div className="p-2 bg-white">
              <p className="text-xs font-medium text-gray-700 truncate">
                {image.title}
              </p>

              {/* Info Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === image.imageId ? null : image.imageId);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center mt-1"
              >
                <Info className="h-3 w-3 mr-1" />
                Why suggested?
              </button>
            </div>

            {/* Selection Indicator */}
            {selectedImageId === image.imageId && (
              <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center">
                <div className="bg-purple-500 text-white rounded-full p-2">
                  <Send className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Details Panel */}
      {showDetails && images.find(img => img.imageId === showDetails) && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 text-sm">
          <p className="font-medium text-gray-700 mb-1">
            {images.find(img => img.imageId === showDetails)?.title}
          </p>
          <p className="text-gray-600 mb-2">
            {images.find(img => img.imageId === showDetails)?.description}
          </p>
          <p className="text-xs text-purple-600 italic">
            {images.find(img => img.imageId === showDetails)?.reason}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {selectedImageId && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSendImage(selectedImageId)}
            className="flex-1"
          >
            <Send className="h-3 w-3 mr-1" />
            Send image only
          </Button>

          {suggestedText && (
            <Button
              size="sm"
              onClick={() => onSendWithText(selectedImageId, suggestedText)}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-3 w-3 mr-1" />
              Send text + image
            </Button>
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-2 text-center">
        Click an image to select, then choose how to send
      </p>
    </div>
  );
};
