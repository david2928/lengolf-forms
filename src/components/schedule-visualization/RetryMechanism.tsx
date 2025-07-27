'use client'

import React, { useState, useCallback } from 'react'
import { VisualizationError } from '@/types/schedule-visualization'

interface RetryMechanismProps {
  error: VisualizationError
  onRetry: () => Promise<void> | void
  maxRetries?: number
  currentRetries?: number
  className?: string
  variant?: 'button' | 'banner' | 'inline'
}

/**
 * Retry mechanism component for failed operations
 * Provides user-friendly retry interface with exponential backoff
 */
export function RetryMechanism({
  error,
  onRetry,
  maxRetries = 3,
  currentRetries = 0,
  className = '',
  variant = 'button'
}: RetryMechanismProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(currentRetries)

  const canRetry = error.recoverable && retryAttempt < maxRetries
  const remainingRetries = maxRetries - retryAttempt

  const handleRetry = useCallback(async () => {
    if (!canRetry || isRetrying) return

    setIsRetrying(true)
    setRetryAttempt(prev => prev + 1)

    try {
      await onRetry()
      // Reset on success
      setRetryAttempt(0)
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }, [canRetry, isRetrying, onRetry])

  const getRetryMessage = () => {
    if (!error.recoverable) {
      return 'This error cannot be automatically resolved.'
    }
    
    if (retryAttempt >= maxRetries) {
      return 'Maximum retry attempts reached. Please refresh the page.'
    }
    
    return `${remainingRetries} attempt${remainingRetries !== 1 ? 's' : ''} remaining`
  }

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return (
          <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'render':
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'validation':
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (variant === 'banner') {
    return (
      <div className={`retry-mechanism-banner ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getErrorIcon()}
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {error.message}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {getRetryMessage()}
              </p>
              {canRetry && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRetrying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`retry-mechanism-inline flex items-center space-x-2 text-sm ${className}`}>
        {getErrorIcon()}
        <span className="text-gray-700">{error.message}</span>
        {canRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-blue-600 hover:text-blue-800 underline font-medium disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        <span className="text-gray-500 text-xs">({getRetryMessage()})</span>
      </div>
    )
  }

  // Button variant (default)
  return (
    <div className={`retry-mechanism-button ${className}`}>
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          {getErrorIcon()}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {error.message}
          </h4>
          <p className="text-xs text-gray-500">
            {getRetryMessage()}
          </p>
        </div>

        {canRetry ? (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again ({remainingRetries} left)
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Simple retry button component
 */
export function RetryButton({
  onRetry,
  isRetrying = false,
  disabled = false,
  className = '',
  children = 'Try Again'
}: {
  onRetry: () => void
  isRetrying?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled || isRetrying}
      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isRetrying ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Retrying...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {children}
        </>
      )}
    </button>
  )
}

export default RetryMechanism