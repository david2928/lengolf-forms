'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Timer, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useTimeClockIntegration } from '@/hooks/useTimeClockIntegration'

interface TimeClockModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: {
    schedule_id: string
    staff_name: string
    schedule_date: string
    start_time: string
    end_time: string
    location: string | null
  } | null
  className?: string
}

export function TimeClockModal({ 
  isOpen, 
  onClose, 
  schedule,
  className = '' 
}: TimeClockModalProps) {
  const [pin, setPin] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Use time clock integration hook
  const {
    isLoading,
    error,
    success,
    currentStatus,
    clockInOut,
    resetState,
    validatePinFormat
  } = useTimeClockIntegration({
    scheduleId: schedule?.schedule_id,
    onSuccess: (response) => {
      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)
    },
    onError: (errorMessage) => {
      console.error('Time clock integration error:', errorMessage)
    }
  })

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin('')
      resetState()
      // Focus first input after a short delay
      setTimeout(() => {
        pinInputRefs.current[0]?.focus()
      }, 100)
    }
  }, [isOpen, resetState])

  if (!isOpen || !schedule) return null

  // Handle PIN input
  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newPin = pin.split('')
    newPin[index] = value
    const updatedPin = newPin.join('').slice(0, 6) // Ensure max 6 digits
    
    setPin(updatedPin)
    resetState() // Clear error when user types
    
    // Auto-focus next input
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter' && pin.length === 6) {
      handleClockInOut()
    }
  }

  // Handle clock in/out using the hook
  const handleClockInOut = async () => {
    await clockInOut(pin)
  }

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4
        ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}
        ${className}
      `}
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          w-full max-w-sm bg-white rounded-2xl shadow-xl transform transition-transform duration-200
          ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Timer className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Time Clock
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Shift Info */}
          <div className="text-center space-y-1">
            <h3 className="font-medium text-slate-900">{schedule.staff_name}</h3>
            <p className="text-sm text-slate-600">
              {new Date(schedule.schedule_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            <p className="text-sm text-slate-600">
              {schedule.start_time} - {schedule.end_time}
            </p>
          </div>

          {/* PIN Input */}
          <div className="space-y-4">
            <div className="text-center">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Enter your 6-digit PIN
              </label>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => pinInputRefs.current[index] = el}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[index] || ''}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleClockInOut}
              disabled={pin.length !== 6 || isLoading}
              className={`
                w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2
                ${pin.length === 6 && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>
                    {currentStatus === 'clock_in' ? 'Clocking In...' : 
                     currentStatus === 'clock_out' ? 'Clocking Out...' : 
                     'Processing...'}
                  </span>
                </>
              ) : (
                <>
                  <Timer className="h-5 w-5" />
                  <span>Clock In/Out</span>
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Your PIN will determine whether to clock in or out based on your current status
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}