'use client'

import React from 'react'
import { ScheduleError, ScheduleErrorCodes, getErrorMessage } from '@/types/errors'

interface ErrorDisplayProps {
  error: ScheduleError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  variant?: 'inline' | 'card' | 'banner'
  showRetry?: boolean
  showDismiss?: boolean
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
  variant = 'inline',
  showRetry = true,
  showDismiss = true
}: ErrorDisplayProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' 
    ? error 
    : getErrorMessage(error, true)

  const isNetworkError = typeof error === 'object' && 
    (error.code === ScheduleErrorCodes.NETWORK_ERROR || error.code === ScheduleErrorCodes.TIMEOUT_ERROR)

  const isServerError = typeof error === 'object' && 
    (error.code === ScheduleErrorCodes.SERVER_ERROR || error.code === ScheduleErrorCodes.DATABASE_ERROR)

  const getErrorIcon = () => {
    if (isNetworkError) {
      return (
        <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    
    if (isServerError) {
      return (
        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
    
    return (
      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const getErrorColor = () => {
    if (isNetworkError) return 'orange'
    if (isServerError) return 'red'
    return 'yellow'
  }

  const color = getErrorColor()

  if (variant === 'banner') {
    return (
      <div className={`rounded-md bg-${color}-50 p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {getErrorIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium text-${color}-800`}>
              {errorMessage}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5 flex space-x-1">
              {showRetry && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`inline-flex rounded-md bg-${color}-50 p-1.5 text-${color}-500 hover:bg-${color}-100 focus:outline-none focus:ring-2 focus:ring-${color}-600 focus:ring-offset-2 focus:ring-offset-${color}-50`}
                >
                  <span className="sr-only">Retry</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              {showDismiss && onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`inline-flex rounded-md bg-${color}-50 p-1.5 text-${color}-500 hover:bg-${color}-100 focus:outline-none focus:ring-2 focus:ring-${color}-600 focus:ring-offset-2 focus:ring-offset-${color}-50`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border border-${color}-200 bg-${color}-50 p-4 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getErrorIcon()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium text-${color}-800`}>
              Error
            </h3>
            <p className={`mt-1 text-sm text-${color}-700`}>
              {errorMessage}
            </p>
            {(showRetry && onRetry) || (showDismiss && onDismiss) ? (
              <div className="mt-3 flex space-x-2">
                {showRetry && onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className={`text-sm font-medium text-${color}-800 hover:text-${color}-900 underline`}
                  >
                    Try again
                  </button>
                )}
                {showDismiss && onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className={`text-sm font-medium text-${color}-600 hover:text-${color}-700 underline`}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  // Inline variant
  return (
    <div className={`flex items-center space-x-2 text-sm text-${color}-700 ${className}`}>
      {getErrorIcon()}
      <span>{errorMessage}</span>
      {showRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`text-${color}-800 hover:text-${color}-900 underline font-medium`}
        >
          Retry
        </button>
      )}
    </div>
  )
}

// Specialized error displays
export function NetworkErrorDisplay({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <ErrorDisplay
      error="Connection problem. Please check your internet and try again."
      onRetry={onRetry}
      variant="card"
      className={className}
      showDismiss={false}
    />
  )
}

export function ServerErrorDisplay({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <ErrorDisplay
      error="Server is having issues. Please try again in a moment."
      onRetry={onRetry}
      variant="card"
      className={className}
      showDismiss={false}
    />
  )
}

export function ValidationErrorDisplay({ errors, className }: { errors: string[]; className?: string }) {
  if (errors.length === 0) return null
  
  return (
    <div className={`rounded-md bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}