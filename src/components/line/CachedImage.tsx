'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { imageCache } from '@/lib/image-cache';

interface CachedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Cached image component that uses aggressive caching for chat images
 */
export function CachedImage({
  src,
  alt,
  width,
  height,
  className = '',
  onClick,
  onLoad,
  onError,
  loading = 'lazy',
  placeholder,
  blurDataURL
}: CachedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Get cached image URL
        const cachedUrl = await imageCache.getImage(src);

        if (mounted) {
          setImageSrc(cachedUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load cached image:', error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
          setImageSrc(src); // Fallback to original URL
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gray-100 rounded ${className}`}
          style={{ width, height }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
}