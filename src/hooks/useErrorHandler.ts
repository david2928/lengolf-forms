'use client'

import { useState, useCallback } from 'react'
import { ScheduleError, ScheduleErrorCodes, createScheduleError, getErrorMessage } from '@/types/errors'

interface ErrorState {
  error: ScheduleError | null
  isRetrying: boolean
  retryCount: number
  lastRetryAt: Date | null
}

interface UseErrorHandlerOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: ScheduleError) => void
  onRetry?: (retryCount: number) => void
  onMaxRetriesReached?: (error: ScheduleError) => void
}

interface UseErrorHandlerReturn {
  error: ScheduleError | null
  isRetrying: boolean
  retryCount: number
  hasError: boolean
  canRetry: boolean
  setError: (error: ScheduleError | string | null) => void
  clearError: () => void
  retry: (retryFn: () => Promise<void> | void) => Promise<void>
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
  getErrorMessage: (userFriendly?: boolean) => string | null
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    onMaxRetriesReached
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryAt: null
  })

  const setError = useCallback((error: ScheduleError | string | null) => {
    if (!error) {
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastRetryAt: null
      })
      return
    }

    const scheduleError = typeof error === 'string' 
      ? createScheduleError(ScheduleErrorCodes.UNKNOWN_ERROR, { message: error })
      : error

    setErrorState(prev => ({
      ...prev,
      error: scheduleError,
      isRetrying: false
    }))

    if (onError) {
      onError(scheduleError)
    }
  }, [onError])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryAt: null
    })
  }, [])

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!errorState.error || errorState.retryCount >= maxRetries) {
      if (errorState.error && onMaxRetriesReached) {
        onMaxRetriesReached(errorState.error)
      }
      return
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }))

    if (onRetry) {
      onRetry(errorState.retryCount + 1)
    }

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (errorState.retryCount + 1)))
      }

      await retryFn()
      
      // Success - clear error
      clearError()
    } catch (error: any) {
      const scheduleError = error instanceof Error && 'code' in error && 'timestamp' in error && 'message' in error
        ? error as ScheduleError
        : createScheduleError(ScheduleErrorCodes.UNKNOWN_ERROR, { originalError: error })

      setErrorState(prev => ({
        error: scheduleError,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        lastRetryAt: new Date()
      }))

      if (onError) {
        onError(scheduleError)
      }
    }
  }, [errorState, maxRetries, retryDelay, onRetry, onMaxRetriesReached, onError, clearError])

  const handleAsyncError = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      clearError()
      return await asyncFn()
    } catch (error: any) {
      const scheduleError = error instanceof Error && 'code' in error && 'timestamp' in error && 'message' in error
        ? error as ScheduleError
        : createScheduleError(ScheduleErrorCodes.UNKNOWN_ERROR, { originalError: error })
      
      setError(scheduleError)
      return null
    }
  }, [setError, clearError])

  const getErrorMessageText = useCallback((userFriendly = true): string | null => {
    if (!errorState.error) return null
    return getErrorMessage(errorState.error, userFriendly)
  }, [errorState.error])

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    hasError: errorState.error !== null,
    canRetry: errorState.error !== null && errorState.retryCount < maxRetries,
    setError,
    clearError,
    retry,
    handleAsyncError,
    getErrorMessage: getErrorMessageText
  }
}

// Specialized error handlers for common scenarios
export function useNetworkErrorHandler() {
  return useErrorHandler({
    maxRetries: 3,
    retryDelay: 2000,
    onError: (error) => {
      if (error.code === ScheduleErrorCodes.NETWORK_ERROR) {
        console.warn('Network error detected:', error)
      }
    }
  })
}

export function useValidationErrorHandler() {
  return useErrorHandler({
    maxRetries: 0, // Don't retry validation errors
    onError: (error) => {
      console.warn('Validation error:', error)
    }
  })
}

export function useServerErrorHandler() {
  return useErrorHandler({
    maxRetries: 2,
    retryDelay: 3000,
    onError: (error) => {
      if ([ScheduleErrorCodes.SERVER_ERROR, ScheduleErrorCodes.DATABASE_ERROR].includes(error.code)) {
        console.error('Server error detected:', error)
      }
    }
  })
}