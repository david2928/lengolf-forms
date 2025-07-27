'use client'

import React, { useState, useEffect } from 'react'

interface OfflineIndicatorProps {
  className?: string
  onRetry?: () => void
  showRetryButton?: boolean
}

/**
 * Offline indicator component for schedule visualization
 * Shows when the user is offline and provides retry functionality
 */
export function OfflineIndicator({
  className = '',
  onRetry,
  showRetryButton = true
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        // Auto-retry when coming back online
        setTimeout(() => {
          if (onRetry) {
            onRetry()
          }
        }, 1000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    // Set initial state only on client
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onRetry, wasOffline])

  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {!isOnline ? (
        // Offline state
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                You&apos;re offline
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                Schedule data may not be up to date. Check your internet connection.
              </p>
              {showRetryButton && onRetry && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-sm font-medium text-orange-800 hover:text-orange-900 underline"
                  >
                    Try to reconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Back online state
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                You&apos;re back online
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Connection restored. Schedule data will be updated automatically.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setWasOffline(false)}
                className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    // Set initial state only on client
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline, clearWasOffline: () => setWasOffline(false) }
}

/**
 * Compact offline indicator for smaller spaces
 */
export function CompactOfflineIndicator({
  className = ''
}: {
  className?: string
}) {
  const { isOnline } = useOnlineStatus()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || isOnline) {
    return null
  }

  return (
    <div className={`compact-offline-indicator ${className}`}>
      <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Offline</span>
      </div>
    </div>
  )
}

export default OfflineIndicator