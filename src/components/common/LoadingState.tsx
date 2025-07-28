'use client'

import React from 'react'

interface LoadingStateProps {
  message?: string
  className?: string
  variant?: 'spinner' | 'skeleton' | 'pulse'
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ 
  message = 'Loading...', 
  className = '', 
  variant = 'spinner',
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-center">
          <svg
            className={`animate-spin mx-auto ${sizeClasses[size]} text-blue-600`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {message && (
            <p className="mt-2 text-sm text-gray-500">{message}</p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="text-center">
            <div className={`bg-gray-300 rounded-full ${sizeClasses[size]} mx-auto`} />
            {message && (
              <div className="mt-2 h-4 bg-gray-300 rounded w-24 mx-auto" />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Skeleton variant
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3 p-4">
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
        <div className="h-4 bg-gray-300 rounded w-5/6" />
      </div>
    </div>
  )
}

// Specialized loading states
export function ScheduleLoadingState({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-4 p-4">
        {/* Date picker skeleton */}
        <div className="flex space-x-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1">
              <div className="h-12 bg-gray-300 rounded-lg" />
            </div>
          ))}
        </div>
        
        {/* Schedule cards skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-300 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function StaffSelectionLoadingState({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="grid grid-cols-2 gap-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto" />
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminDashboardLoadingState({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-6 p-6">
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-300 rounded-lg" />
          ))}
        </div>
        
        {/* Schedule grid skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading overlay for forms
export function LoadingOverlay({ 
  isLoading, 
  message = 'Saving...', 
  children 
}: { 
  isLoading: boolean
  message?: string
  children: React.ReactNode 
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <svg
              className="animate-spin h-6 w-6 text-blue-600 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}