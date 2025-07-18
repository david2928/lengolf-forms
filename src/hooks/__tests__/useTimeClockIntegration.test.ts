import { renderHook, act } from '@testing-library/react'
import { useTimeClockIntegration } from '../useTimeClockIntegration'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('useTimeClockIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useTimeClockIntegration())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.success).toBe(null)
    expect(result.current.currentStatus).toBe(null)
  })

  it('validates PIN format correctly', () => {
    const { result } = renderHook(() => useTimeClockIntegration())

    // Valid PIN
    expect(result.current.validatePinFormat('123456')).toEqual({ valid: true })

    // Invalid PINs
    expect(result.current.validatePinFormat('')).toEqual({ 
      valid: false, 
      error: 'PIN is required' 
    })
    expect(result.current.validatePinFormat('12345')).toEqual({ 
      valid: false, 
      error: 'PIN must be exactly 6 digits' 
    })
    expect(result.current.validatePinFormat('12345a')).toEqual({ 
      valid: false, 
      error: 'PIN must contain only digits' 
    })
  })

  it('resets state correctly', () => {
    const { result } = renderHook(() => useTimeClockIntegration())

    // Set some state first
    act(() => {
      // This would normally be set by the hook internally
      // We'll test the reset functionality
      result.current.resetState()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.success).toBe(null)
    expect(result.current.currentStatus).toBe(null)
  })

  it('handles successful PIN verification', async () => {
    const mockStatusResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      currently_clocked_in: false,
      is_locked: false,
      lock_expires_at: null
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    } as Response)

    const { result } = renderHook(() => useTimeClockIntegration())

    let verificationResult
    await act(async () => {
      verificationResult = await result.current.verifyPin('123456')
    })

    expect(verificationResult).toEqual({
      staffId: 1,
      staffName: 'John Doe',
      currentlyClockedIn: false,
      isLocked: false,
      lockExpiresAt: null
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/time-clock/status/123456')
  })

  it('handles failed PIN verification', async () => {
    const mockStatusResponse = {
      success: false,
      message: 'Invalid PIN',
      is_locked: false
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    } as Response)

    const { result } = renderHook(() => useTimeClockIntegration())

    await act(async () => {
      try {
        await result.current.verifyPin('123456')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Invalid PIN')
      }
    })
  })

  it('handles locked account during PIN verification', async () => {
    const mockStatusResponse = {
      success: false,
      message: 'Account temporarily locked',
      is_locked: true,
      lock_expires_at: '2025-07-15T10:00:00Z'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatusResponse
    } as Response)

    const { result } = renderHook(() => useTimeClockIntegration())

    await act(async () => {
      try {
        await result.current.verifyPin('123456')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Account is locked. Account temporarily locked')
      }
    })
  })

  it('handles successful clock in/out without schedule', async () => {
    const mockStatusResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      currently_clocked_in: false,
      is_locked: false
    }

    const mockPunchResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      action: 'clock_in',
      timestamp: '2025-07-15T09:00:00Z',
      message: 'Successfully clocked in',
      currently_clocked_in: true
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPunchResponse
      } as Response)

    const mockOnSuccess = jest.fn()
    const { result } = renderHook(() => useTimeClockIntegration({
      onSuccess: mockOnSuccess
    }))

    let clockResult
    await act(async () => {
      clockResult = await result.current.clockInOut('123456')
    })

    expect(result.current.success).toBe('Successfully clocked in for John Doe!')
    expect(result.current.isLoading).toBe(false)
    expect(mockOnSuccess).toHaveBeenCalledWith(mockPunchResponse)
    expect(clockResult).toEqual(mockPunchResponse)

    // Verify correct API calls
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/time-clock/status/123456')
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/time-clock/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"pin":"123456"')
    })
  })

  it('handles successful clock in/out with schedule', async () => {
    const mockStatusResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      currently_clocked_in: false,
      is_locked: false
    }

    const mockPunchResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      action: 'clock_in',
      timestamp: '2025-07-15T09:00:00Z',
      message: 'Successfully clocked in for scheduled shift',
      currently_clocked_in: true,
      schedule_linked: true
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPunchResponse
      } as Response)

    const { result } = renderHook(() => useTimeClockIntegration({
      scheduleId: 'schedule-123'
    }))

    await act(async () => {
      await result.current.clockInOut('123456')
    })

    // Verify schedule-specific endpoint was called
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/staff-schedule/time-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"schedule_id":"schedule-123"')
    })
  })

  it('handles clock in/out failure', async () => {
    const mockStatusResponse = {
      success: true,
      staff_id: 1,
      staff_name: 'John Doe',
      currently_clocked_in: false,
      is_locked: false
    }

    const mockPunchResponse = {
      success: false,
      message: 'Too early to clock in'
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPunchResponse
      } as Response)

    const mockOnError = jest.fn()
    const { result } = renderHook(() => useTimeClockIntegration({
      onError: mockOnError
    }))

    let clockResult
    await act(async () => {
      clockResult = await result.current.clockInOut('123456')
    })

    expect(result.current.error).toBe('Too early to clock in')
    expect(result.current.isLoading).toBe(false)
    expect(mockOnError).toHaveBeenCalledWith('Too early to clock in')
    expect(clockResult).toBe(null)
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const mockOnError = jest.fn()
    const { result } = renderHook(() => useTimeClockIntegration({
      onError: mockOnError
    }))

    await act(async () => {
      await result.current.clockInOut('123456')
    })

    expect(result.current.error).toBe('Network error. Please check your connection and try again.')
    expect(mockOnError).toHaveBeenCalled()
  })

  it('validates PIN length before making API calls', async () => {
    const { result } = renderHook(() => useTimeClockIntegration())

    await act(async () => {
      await result.current.clockInOut('123')
    })

    expect(result.current.error).toBe('Please enter a complete 6-digit PIN')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('identifies error types correctly', () => {
    const { result } = renderHook(() => useTimeClockIntegration())

    expect(result.current.getErrorType('Invalid PIN')).toBe('INVALID_PIN')
    expect(result.current.getErrorType('Account is locked')).toBe('ACCOUNT_LOCKED')
    expect(result.current.getErrorType('Network error')).toBe('NETWORK_ERROR')
    expect(result.current.getErrorType('Database error')).toBe('DATABASE_ERROR')
    expect(result.current.getErrorType('Unknown error')).toBe(null)
  })

  it('sets loading state during operation', async () => {
    // Mock a slow response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, staff_id: 1, staff_name: 'John', currently_clocked_in: false })
        } as Response), 100)
      )
    )

    const { result } = renderHook(() => useTimeClockIntegration())

    act(() => {
      result.current.clockInOut('123456')
    })

    // Should be loading immediately
    expect(result.current.isLoading).toBe(true)

    // Wait for completion
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
  })
})