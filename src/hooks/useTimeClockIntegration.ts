import { useState, useCallback } from 'react'
import { TimeClockPunchRequest, TimeClockPunchResponse, TIME_CLOCK_ERROR_CODES } from '@/types/staff'

interface TimeClockState {
  isLoading: boolean
  error: string | null
  success: string | null
  currentStatus: 'clock_in' | 'clock_out' | null
}

interface UseTimeClockIntegrationProps {
  scheduleId?: string
  onSuccess?: (response: TimeClockPunchResponse) => void
  onError?: (error: string) => void
}

export function useTimeClockIntegration({
  scheduleId,
  onSuccess,
  onError
}: UseTimeClockIntegrationProps = {}) {
  const [state, setState] = useState<TimeClockState>({
    isLoading: false,
    error: null,
    success: null,
    currentStatus: null
  })

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      currentStatus: null
    })
  }, [])

  const verifyPin = useCallback(async (pin: string) => {
    try {
      const response = await fetch(`/api/time-clock/status/${pin}`)
      const data = await response.json()
      
      if (!data.success) {
        const errorMessage = data.is_locked 
          ? `Account is locked. ${data.message}`
          : data.message || 'Invalid PIN'
        
        throw new Error(errorMessage)
      }
      
      return {
        staffId: data.staff_id,
        staffName: data.staff_name,
        currentlyClockedIn: data.currently_clocked_in,
        isLocked: data.is_locked,
        lockExpiresAt: data.lock_expires_at
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to verify PIN')
    }
  }, [])

  const clockInOut = useCallback(async (pin: string) => {
    if (pin.length !== 6) {
      const error = 'Please enter a complete 6-digit PIN'
      setState(prev => ({ ...prev, error }))
      onError?.(error)
      return null
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      success: null 
    }))

    try {
      // First verify PIN and get current status
      const pinVerification = await verifyPin(pin)
      
      // Determine action based on current status
      const action = pinVerification.currentlyClockedIn ? 'clock_out' : 'clock_in'
      
      setState(prev => ({ ...prev, currentStatus: action }))

      // Prepare request data
      const requestData: TimeClockPunchRequest & { schedule_id?: string } = {
        pin: pin,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screen: {
            width: window.screen.width,
            height: window.screen.height
          },
          timestamp: new Date().toISOString(),
          // source: 'staff_schedule' // Remove this as it's not in the interface
        }
      }

      // Add schedule ID if provided
      if (scheduleId) {
        requestData.schedule_id = scheduleId
      }

      // Choose endpoint based on whether we have a schedule
      const endpoint = scheduleId 
        ? '/api/staff-schedule/time-clock'
        : '/api/time-clock/punch'

      // Submit clock in/out
      const punchResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const punchData: TimeClockPunchResponse = await punchResponse.json()

      if (punchData.success) {
        const actionText = action === 'clock_in' ? 'clocked in' : 'clocked out'
        const successMessage = `Successfully ${actionText} for ${pinVerification.staffName}!`
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          success: successMessage,
          currentStatus: null
        }))
        
        onSuccess?.(punchData)
        return punchData
      } else {
        const errorMessage = punchData.message || 'Failed to record time entry'
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: errorMessage
        }))
        
        onError?.(errorMessage)
        return null
      }
    } catch (error) {
      console.error('Time clock error:', error)
      
      let errorMessage = 'Network error. Please check your connection and try again.'
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('locked')) {
          errorMessage = error.message
        } else if (error.message.includes('Invalid PIN')) {
          errorMessage = 'Invalid PIN. Please try again.'
        } else if (error.message.includes('Too early') || error.message.includes('Too late')) {
          errorMessage = error.message
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }))
      
      onError?.(errorMessage)
      return null
    }
  }, [scheduleId, verifyPin, onSuccess, onError])

  const validatePinFormat = useCallback((pin: string): { valid: boolean; error?: string } => {
    if (!pin) {
      return { valid: false, error: 'PIN is required' }
    }
    
    if (pin.length !== 6) {
      return { valid: false, error: 'PIN must be exactly 6 digits' }
    }
    
    if (!/^\d+$/.test(pin)) {
      return { valid: false, error: 'PIN must contain only digits' }
    }
    
    return { valid: true }
  }, [])

  const getErrorType = useCallback((error: string): keyof typeof TIME_CLOCK_ERROR_CODES | null => {
    if (error.includes('Invalid PIN') || error.includes('PIN not recognized')) {
      return 'INVALID_PIN'
    }
    if (error.includes('locked') || error.includes('Account is locked')) {
      return 'ACCOUNT_LOCKED'
    }
    if (error.includes('Network error') || error.includes('connection')) {
      return 'NETWORK_ERROR'
    }
    if (error.includes('Database error') || error.includes('System error')) {
      return 'DATABASE_ERROR'
    }
    return null
  }, [])

  return {
    ...state,
    clockInOut,
    resetState,
    validatePinFormat,
    getErrorType,
    verifyPin
  }
}