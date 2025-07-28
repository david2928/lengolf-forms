'use client'

import { useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { ScheduleError, ScheduleErrorCodes } from '@/types/errors'

interface RetryButtonProps {
  onRetry: () => Promise<void> | void
  error?: ScheduleError | string | null
  disabled?: boolean
  className?: string
  variant?: 'button' | 'link' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  children?: React.ReactNode
}

export function RetryButton({
  onRetry,
  error,
  disabled = false,
  className = '',
  variant = 'button',
  size = 'md',
  showIcon = true,
  children
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (disabled || isRetrying) return

    try {
      setIsRetrying(true)
      await onRetry()
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const getIcon = () => {
    if (!showIcon) return null

    if (isRetrying) {
      return <RefreshCw className="animate-spin" />
    }

    // Show different icons based on error type
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case ScheduleErrorCodes.NETWORK_ERROR:
        case ScheduleErrorCodes.TIMEOUT_ERROR:
          return <WifiOff />
        default:
          return <RefreshCw />
      }
    }

    return <RefreshCw />
  }

  const getButtonText = () => {
    if (children) return children

    if (isRetrying) return 'Retrying...'

    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case ScheduleErrorCodes.NETWORK_ERROR:
          return 'Reconnect'
        case ScheduleErrorCodes.TIMEOUT_ERROR:
          return 'Try Again'
        case ScheduleErrorCodes.SERVER_ERROR:
          return 'Retry'
        default:
          return 'Retry'
      }
    }

    return 'Retry'
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'lg':
        return 'h-6 w-6'
      default:
        return 'h-5 w-5'
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleRetry}
        disabled={disabled || isRetrying}
        className={`
          inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          ${className}
        `}
      >
        {showIcon && (
          <span className={getIconSize()}>
            {getIcon()}
          </span>
        )}
        <span>{getButtonText()}</span>
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRetry}
        disabled={disabled || isRetrying}
        className={`
          p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          touch-target tap-highlight no-select
          ${className}
        `}
        aria-label="Retry"
      >
        <span className={getIconSize()}>
          {getIcon()}
        </span>
      </button>
    )
  }

  // Default button variant
  return (
    <button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      className={`
        inline-flex items-center justify-center space-x-2 rounded-lg
        bg-blue-600 text-white hover:bg-blue-700 
        disabled:opacity-50 disabled:cursor-not-allowed 
        transition-colors touch-target tap-highlight no-select
        ${getSizeClasses()}
        ${className}
      `}
    >
      {showIcon && (
        <span className={getIconSize()}>
          {getIcon()}
        </span>
      )}
      <span>{getButtonText()}</span>
    </button>
  )
}

// Specialized retry buttons for common scenarios
export function NetworkRetryButton({ onRetry, className = '' }: { onRetry: () => Promise<void> | void; className?: string }) {
  return (
    <RetryButton
      onRetry={onRetry}
      error={{ code: ScheduleErrorCodes.NETWORK_ERROR } as ScheduleError}
      className={className}
      variant="button"
    />
  )
}

export function ServerRetryButton({ onRetry, className = '' }: { onRetry: () => Promise<void> | void; className?: string }) {
  return (
    <RetryButton
      onRetry={onRetry}
      error={{ code: ScheduleErrorCodes.SERVER_ERROR } as ScheduleError}
      className={className}
      variant="button"
    />
  )
}