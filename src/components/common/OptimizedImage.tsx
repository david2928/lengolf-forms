'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src?: string | null
  alt: string
  width: number
  height: number
  fallbackText?: string
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

// Generate a simple blur data URL for placeholder
const generateBlurDataURL = (width: number, height: number): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Create a simple gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

// Generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate a consistent color based on name
const getInitialsColor = (name: string): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallbackText,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Memoize the blur data URL generation
  const defaultBlurDataURL = useMemo(() => {
    if (blurDataURL) return blurDataURL
    if (typeof window !== 'undefined') {
      return generateBlurDataURL(width, height)
    }
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
  }, [blurDataURL, width, height])

  // Memoize initials and color
  const initials = useMemo(() => {
    return fallbackText ? getInitials(fallbackText) : alt.charAt(0).toUpperCase()
  }, [fallbackText, alt])

  const initialsColor = useMemo(() => {
    return getInitialsColor(fallbackText || alt)
  }, [fallbackText, alt])

  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setIsLoading(false)
  }, [])

  // If no src or image failed to load, show initials fallback
  if (!src || imageError) {
    return (
      <div
        className={`flex items-center justify-center text-white font-semibold ${className}`}
        style={{
          width,
          height,
          backgroundColor: initialsColor,
          fontSize: Math.min(width, height) * 0.4
        }}
        role="img"
        aria-label={alt}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ backgroundColor: '#f3f4f6' }}
        >
          <div className="text-gray-400 text-xs">Loading...</div>
        </div>
      )}
      
      {/* Optimized image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        className={`object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        sizes={`${width}px`}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

// Specialized component for staff profile photos
interface StaffProfileImageProps {
  src?: string | null
  staffName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  priority?: boolean
}

const sizeMap = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
  xl: { width: 96, height: 96 }
}

export function StaffProfileImage({
  src,
  staffName,
  size = 'md',
  className = '',
  priority = false
}: StaffProfileImageProps) {
  const { width, height } = sizeMap[size]
  
  return (
    <OptimizedImage
      src={src}
      alt={`${staffName} profile photo`}
      width={width}
      height={height}
      fallbackText={staffName}
      className={`rounded-full ${className}`}
      priority={priority}
      quality={85}
      placeholder="blur"
    />
  )
}