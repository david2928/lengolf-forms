'use client'

import React, { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorDisplay } from './ErrorDisplay'
import { ScheduleError } from '@/types/errors'

interface ErrorHandlingWrapperProps {
  children: ReactNode
  error?: ScheduleError | string | null
  isLoading?: boolean
  onRetry?: () => void
  onClearError?: () => void
  fallbackComponent?: ReactNode
  showErrorBoundary?: boolean
  className?: string
}

export function ErrorHandlingWrapper({
  children,
  error,
  isLoading = false,
  onRetry,
  onClearError,
  fallbackComponent,
  showErrorBoundary = true,
  className = ''
}: ErrorHandlingWrapperProps) {
  const content = (
    <div className={className}>
      {error ? (
        <ErrorDisplay
          error={error}
          onRetry={onRetry}
          onDismiss={onClearError}
          variant="card"
          showRetry={Boolean(onRetry)}
          showDismiss={Boolean(onClearError)}
        />
      ) : isLoading ? (
        fallbackComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )
      ) : (
        children
      )}
    </div>
  )

  if (showErrorBoundary) {
    return (
      <ErrorBoundary>
        {content}
      </ErrorBoundary>
    )
  }

  return content
}

// Specialized wrapper for schedule components
export function ScheduleErrorWrapper({
  children,
  error,
  isLoading,
  onRetry,
  className = ''
}: {
  children: ReactNode
  error?: ScheduleError | string | null
  isLoading?: boolean
  onRetry?: () => void
  className?: string
}) {
  return (
    <ErrorHandlingWrapper
      error={error}
      isLoading={isLoading}
      onRetry={onRetry}
      className={className}
      fallbackComponent={
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading schedule...</p>
        </div>
      }
    >
      {children}
    </ErrorHandlingWrapper>
  )
}

// Network-specific error wrapper
export function NetworkErrorWrapper({
  children,
  error,
  isLoading,
  onRetry,
  className = ''
}: {
  children: ReactNode
  error?: ScheduleError | string | null
  isLoading?: boolean
  onRetry?: () => void
  className?: string
}) {
  return (
    <ErrorHandlingWrapper
      error={error}
      isLoading={isLoading}
      onRetry={onRetry}
      className={className}
      fallbackComponent={
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
          <div className="animate-pulse flex space-x-2 mb-4">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
          </div>
          <p className="text-slate-600">Connecting...</p>
        </div>
      }
    >
      {children}
    </ErrorHandlingWrapper>
  )
}