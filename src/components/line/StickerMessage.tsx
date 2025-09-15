import Image from 'next/image';
import { useState } from 'react';

interface StickerMessageProps {
  packageId: string;
  stickerId: string;
  keywords?: string[];
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Component to display LINE stickers
 *
 * LINE stickers are served from LINE's CDN using a predictable URL pattern:
 * https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png
 *
 * For animated stickers, they may use:
 * https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker_animation@2x.png
 */
export function StickerMessage({ packageId, stickerId, keywords = [], className = "", size = "large" }: StickerMessageProps) {
  const [imageError, setImageError] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);

  // Generate sticker URLs - try static first, then animated
  const staticStickerUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
  const animatedStickerUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker_animation@2x.png`;
  const fallbackStickerUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`;

  // Use animated URL if we know it's animated, otherwise use static
  const stickerUrl = isAnimated ? animatedStickerUrl : staticStickerUrl;

  const handleImageError = () => {
    if (!isAnimated && !imageError) {
      // Try animated version first
      setIsAnimated(true);
    } else if (isAnimated && !imageError) {
      // Try fallback static URL
      setIsAnimated(false);
      setImageError(true);
    } else {
      // All attempts failed, show placeholder
      setImageError(true);
    }
  };

  // Generate alt text from keywords or use default
  const altText = keywords.length > 0
    ? `LINE sticker: ${keywords.join(', ')}`
    : `LINE sticker ${stickerId}`;

  // Define sizes based on the size prop
  const sizeClasses = {
    small: {
      container: "w-6 h-6",
      image: "w-6 h-6",
      width: 24,
      height: 24,
      fallbackText: "text-xs",
      fallbackEmoji: "text-sm"
    },
    medium: {
      container: "w-12 h-12",
      image: "w-12 h-12",
      width: 48,
      height: 48,
      fallbackText: "text-sm",
      fallbackEmoji: "text-lg"
    },
    large: {
      container: "w-20 h-20",
      image: "w-20 h-20",
      width: 80,
      height: 80,
      fallbackText: "text-base",
      fallbackEmoji: "text-2xl"
    }
  };

  const currentSize = sizeClasses[size];

  if (imageError) {
    return (
      <div className={`inline-flex items-center justify-center ${currentSize.container} bg-yellow-100 border border-yellow-300 rounded-lg ${className}`}>
        <div className="text-center">
          <div className={currentSize.fallbackEmoji}>🎭</div>
          {size === 'large' && (
            <div className={`${currentSize.fallbackText} text-gray-600 mt-1`}>
              {keywords[0] || 'Sticker'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src={stickerUrl}
        alt={altText}
        width={currentSize.width}
        height={currentSize.height}
        className={`${currentSize.image} object-contain`}
        onError={handleImageError}
        unoptimized={true} // Allow external images
      />
    </div>
  );
}

/**
 * Alternative sticker URLs to try if the main ones fail:
 *
 * Official LINE sticker shop URLs:
 * - https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png
 * - https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/iPhone/sticker.png
 * - https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/iPhone/sticker@2x.png
 *
 * For animated stickers:
 * - https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker_animation@2x.png
 * - https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/iPhone/sticker_animation@2x.png
 */