'use client'

import { useState, useCallback, useRef } from 'react'
import { VisualizationError } from '@/types/schedule-visualization'

interface UseScheduleVisualizationErrorOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: VisualizationError) => void
  onRetry?: (retryCount: number) => void
  onMaxRetriesReached?: (error: VisualizationError) => void
}

interface UseScheduleVisualizationErrorReturn {
  error: VisualizationError | null
  isRetrying: boolean
  retryCount: number
  hasError: boolean
  canRetry: boolean
  setError: (error: VisualizationError | string | null) => void
  clearError: () => void
  retry: (retryFn: () => Promise<void> | void) => Promise<void>
  handleAsyncError: <T>(asyncFn: () => Promise<T>, context?: string) => Promise<T | null>
}

/**
 * Specialized error handling hook for schedule visualization
 * Provides retry mechanisms and error categorization
 */
export function useScheduleVisualizationError(
  options: UseScheduleVisualizationErrorOptions = {}
): UseScheduleVisualizationErrorReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    onMaxRetriesReached
  } = options

  const [error, setErrorState] = useState<VisualizationError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  const setError = useCallback((error: VisualizationError | string | null) => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    if (!error) {
      setErrorState(null)
      setIsRetrying(false)
      setRetryCount(0)
      return
    }

    const visualizationError: VisualizationError = typeof error === 'string' 
      ? {
          type: 'data',
          message: error,
          recoverable: true
        }
      : error

    setErrorState(visualizationError)
    setIsRetrying(false)

    if (onError) {
      onError(visualizationError)
    }
  }, [onError])

  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    setErrorState(null)
    setIsRetrying(false)
    setRetryCount(0)
  }, [])

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!error || retryCount >= maxRetries || !error.recoverable) {
      if (error && retryCount >= maxRetries && onMaxRetriesReached) {
        onMaxRetriesReached(error)
      }
      return
    }

    setIsRetrying(true)

    if (onRetry) {
      onRetry(retryCount + 1)
    }

    try {
      // Add exponential backoff delay
      const delay = retryDelay * Math.pow(2, retryCount)
      
      await new Promise(resolve => {
        retryTimeoutRef.current = setTimeout(resolve, delay)
      })

      await retryFn()
      
      // Success - clear error
      clearError()
    } catch (retryError: any) {
      console.error('Retry failed:', retryError)
      
      const newRetryCount = retryCount + 1
      setRetryCount(newRetryCount)
      setIsRetrying(false)

      // Update error with retry information
      const updatedError: VisualizationError = {
        ...error,
        details: {
          ...error.details,
          retryCount: newRetryCount,
          lastRetryError: retryError.message
        }
      }
      
      setErrorState(updatedError)

      if (newRetryCount >= maxRetries && onMaxRetriesReached) {
        onMaxRetriesReached(updatedError)
      }
    }
  }, [error, retryCount, maxRetries, retryDelay, onRetry, onMaxRetriesReached, clearError])

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>, 
    context?: string
  ): Promise<T | null> => {
    try {
      clearError()
      return await asyncFn()
    } catch (error: any) {
      console.error(`Schedule visualization error${context ? ` (${context})` : ''}:`, error)
      
      // Categorize the error
      let errorType: VisualizationError['type'] = 'data'
      let recoverable = true
      
      if (error.name === 'TypeError' || error.message?.includes('render')) {
        errorType = 'render'
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorType = 'network'
      } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
        errorType = 'validation'
        recoverable = false // Don't retry validation errors
      }

      const visualizationError: VisualizationError = {
        type: errorType,
        message: getErrorMessage(error, errorType),
        details: {
          originalError: error.message,
          context,
          timestamp: new Date().toISOString()
        },
        recoverable
      }
      
      setError(visualizationError)
      return null
    }
  }, [setError, clearError])

  return {
    error,
    isRetrying,
    retryCount,
    hasError: error !== null,
    canRetry: error !== null && error.recoverable && retryCount < maxRetries,
    setError,
    clearError,
    retry,
    handleAsyncError
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(error: any, type: VisualizationError['type']): string {
  switch (type) {
    case 'network':
      return 'Unable to load schedule data. Please check your internet connection.'
    case 'render':
      return 'There was a problem displaying the schedule visualization.'
    case 'validation':
      return 'The schedule data contains invalid information.'
    case 'data':
    default:
      if (error.message?.includes('timeout')) {
        return 'Request timed out. The server may be busy.'
      }
      if (error.message?.includes('404')) {
        return 'Schedule data not found.'
      }
      if (error.message?.includes('500')) {
        return 'Server error occurred while loading schedule data.'
      }
      return 'Failed to load schedule visualization.'
  }
}

/**
 * Hook for handling data loading errors specifically
 */
export function useScheduleDataError() {
  return useScheduleVisualizationError({
    maxRetries: 3,
    retryDelay: 2000,
    onError: (error) => {
      console.warn('Schedule data error:', error)
    }
  })
}

/**
 * Hook for handling rendering errors specifically
 */
export function useScheduleRenderError() {
  return useScheduleVisualizationError({
    maxRetries: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Schedule render error:', error)
    }
  })
}

export default useScheduleVisualizationError