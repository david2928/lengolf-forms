import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import { ScheduleVisualizationContainer } from '../ScheduleVisualizationContainer'
import { ScheduleVisualizationErrorBoundary } from '../ScheduleVisualizationErrorBoundary'
import { RetryMechanism } from '../RetryMechanism'
import { OfflineIndicator, useOnlineStatus } from '../OfflineIndicator'
import { useScheduleVisualizationError } from '@/hooks/useScheduleVisualizationError'
import { VisualizationError } from '@/types/schedule-visualization'

// Mock dependencies
jest.mock('@/lib/schedule-visualization-utils', () => ({
  processScheduleData: jest.fn(),
  validateScheduleData: jest.fn()
}))

jest.mock('@/lib/staff-colors', () => ({
  generateStaffColorAssignments: jest.fn(() => [])
}))

jest.mock('../TimelineGrid', () => ({
  TimelineGrid: ({ scheduleBlocks }: any) => (
    <div data-testid="timeline-grid">
      Timeline Grid with {scheduleBlocks?.length || 0} blocks
    </div>
  ),
  TimelineGridSkeleton: () => <div data-testid="timeline-skeleton">Loading skeleton</div>
}))

jest.mock('../OfflineIndicator', () => ({
  OfflineIndicator: ({ onRetry }: any) => (
    <div data-testid="offline-indicator">
      <button onClick={onRetry}>Retry Connection</button>
    </div>
  ),
  useOnlineStatus: jest.fn(() => ({ isOnline: true, wasOffline: false }))
}))

const mockProcessScheduleData = require('@/lib/schedule-visualization-utils').processScheduleData
const mockValidateScheduleData = require('@/lib/schedule-visualization-utils').validateScheduleData
const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<typeof useOnlineStatus>

describe('Schedule Visualization Error Handling', () => {
  const mockScheduleData = {
    week_period: {
      start_date: '2024-01-01',
      end_date: '2024-01-07'
    },
    kpis: {
      total_staff: 5,
      scheduled_shifts: 10,
      staff_scheduled: 5,
      coverage_percentage: 80,
      conflicts_count: 0
    },
    schedule_grid: {},
    conflicts: [],
    raw_schedules: [
      {
        id: 1,
        staff_id: 1,
        staff_name: 'John Doe',
        start_time: '10:00',
        end_time: '14:00',
        schedule_date: '2024-01-01'
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateScheduleData.mockReturnValue(true)
    mockProcessScheduleData.mockReturnValue([])
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: false })
  })

  describe('ScheduleVisualizationContainer Error Handling', () => {
    it('should show loading skeleton when loading', () => {
      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={true}
        />
      )

      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
    })

    it('should handle data processing errors gracefully', async () => {
      mockProcessScheduleData.mockImplementation(() => {
        throw new Error('Data processing failed')
      })

      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Failed to load schedule visualization/)).toBeInTheDocument()
      })
    })

    it('should show retry mechanism for recoverable errors', async () => {
      mockProcessScheduleData.mockImplementation(() => {
        throw new Error('Temporary error')
      })

      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Try Again/)).toBeInTheDocument()
      })
    })

    it('should handle empty schedule data', async () => {
      const emptyScheduleData = {
        ...mockScheduleData,
        raw_schedules: []
      }

      render(
        <ScheduleVisualizationContainer
          scheduleData={emptyScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/No schedule data available/)).toBeInTheDocument()
      })
    })

    it('should handle invalid schedule data', async () => {
      mockValidateScheduleData.mockReturnValue(false)

      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/All schedule data is invalid/)).toBeInTheDocument()
      })
    })

    it('should show offline indicator when offline', () => {
      mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: true })

      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
        />
      )

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
    })
  })

  describe('ScheduleVisualizationErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    it('should catch and display errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ScheduleVisualizationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ScheduleVisualizationErrorBoundary>
      )

      expect(screen.getByText('Schedule Visualization Error')).toBeInTheDocument()
      expect(screen.getByText(/Try Again/)).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should allow retry after error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      let shouldThrow = true

      const { rerender } = render(
        <ScheduleVisualizationErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ScheduleVisualizationErrorBoundary>
      )

      expect(screen.getByText('Schedule Visualization Error')).toBeInTheDocument()

      // Simulate retry
      shouldThrow = false
      const retryButton = screen.getByText(/Try Again/)
      
      await act(async () => {
        fireEvent.click(retryButton)
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      rerender(
        <ScheduleVisualizationErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ScheduleVisualizationErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should show error details in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ScheduleVisualizationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ScheduleVisualizationErrorBoundary>
      )

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })

    it('should limit retry attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ScheduleVisualizationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ScheduleVisualizationErrorBoundary>
      )

      // Click retry multiple times
      for (let i = 0; i < 4; i++) {
        const retryButton = screen.queryByText(/Try Again/)
        if (retryButton) {
          await act(async () => {
            fireEvent.click(retryButton)
            await new Promise(resolve => setTimeout(resolve, 100))
          })
        }
      }

      // Should show refresh page option after max retries
      await waitFor(() => {
        expect(screen.getByText('Refresh Page')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('RetryMechanism', () => {
    const mockError: VisualizationError = {
      type: 'network',
      message: 'Network connection failed',
      recoverable: true
    }

    it('should display error message and retry button', () => {
      const onRetry = jest.fn()

      render(
        <RetryMechanism
          error={mockError}
          onRetry={onRetry}
          variant="button"
        />
      )

      expect(screen.getByText('Network connection failed')).toBeInTheDocument()
      expect(screen.getByText(/Try Again/)).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined)

      render(
        <RetryMechanism
          error={mockError}
          onRetry={onRetry}
          variant="button"
        />
      )

      const retryButton = screen.getByText(/Try Again/)
      
      await act(async () => {
        fireEvent.click(retryButton)
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should show loading state during retry', async () => {
      const onRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <RetryMechanism
          error={mockError}
          onRetry={onRetry}
          variant="button"
        />
      )

      const retryButton = screen.getByText(/Try Again/)
      
      act(() => {
        fireEvent.click(retryButton)
      })

      expect(screen.getByText('Retrying...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument()
      })
    })

    it('should not show retry button for non-recoverable errors', () => {
      const nonRecoverableError: VisualizationError = {
        type: 'validation',
        message: 'Invalid data format',
        recoverable: false
      }

      render(
        <RetryMechanism
          error={nonRecoverableError}
          onRetry={jest.fn()}
          variant="button"
        />
      )

      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
    })

    it('should display different variants correctly', () => {
      const onRetry = jest.fn()

      const { rerender } = render(
        <RetryMechanism
          error={mockError}
          onRetry={onRetry}
          variant="banner"
        />
      )

      expect(screen.getByText('Network connection failed')).toBeInTheDocument()

      rerender(
        <RetryMechanism
          error={mockError}
          onRetry={onRetry}
          variant="inline"
        />
      )

      expect(screen.getByText('Network connection failed')).toBeInTheDocument()
    })
  })

  describe('useScheduleVisualizationError Hook', () => {
    const TestComponent = () => {
      const { error, setError, retry, clearError, canRetry } = useScheduleVisualizationError({
        maxRetries: 2
      })

      return (
        <div>
          {error && <div data-testid="error">{error.message}</div>}
          <button onClick={() => setError('Test error')}>Set Error</button>
          <button onClick={clearError}>Clear Error</button>
          <button 
            onClick={() => retry(() => Promise.resolve())} 
            disabled={!canRetry}
          >
            Retry
          </button>
          <div data-testid="can-retry">{canRetry.toString()}</div>
        </div>
      )
    }

    it('should manage error state correctly', async () => {
      render(<TestComponent />)

      // Set error
      fireEvent.click(screen.getByText('Set Error'))
      expect(screen.getByTestId('error')).toHaveTextContent('Test error')
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true')

      // Clear error
      fireEvent.click(screen.getByText('Clear Error'))
      expect(screen.queryByTestId('error')).not.toBeInTheDocument()
      expect(screen.getByTestId('can-retry')).toHaveTextContent('false')
    })

    it('should handle retry attempts', async () => {
      render(<TestComponent />)

      // Set error
      fireEvent.click(screen.getByText('Set Error'))
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true')

      // Retry should clear error on success
      await act(async () => {
        fireEvent.click(screen.getByText('Retry'))
      })

      expect(screen.queryByTestId('error')).not.toBeInTheDocument()
    })
  })
})

describe('Error Handling Integration', () => {
  it('should handle complete error recovery flow', async () => {
    let shouldFail = true
    
    mockProcessScheduleData.mockImplementation(() => {
      if (shouldFail) {
        throw new Error('Temporary failure')
      }
      return [{ id: 1, staffName: 'Test' }]
    })

    const { rerender } = render(
      <ScheduleVisualizationContainer
        scheduleData={{
          week_period: { start_date: '2024-01-01', end_date: '2024-01-07' },
          kpis: { total_staff: 1, scheduled_shifts: 1, staff_scheduled: 1, coverage_percentage: 100, conflicts_count: 0 },
          schedule_grid: {},
          conflicts: [],
          raw_schedules: [{ id: 1, staff_id: 1, staff_name: 'Test', start_time: '10:00', end_time: '14:00', schedule_date: '2024-01-01' }]
        }}
        staffAssignments={[]}
        weekStart="2024-01-01"
      />
    )

    // Should show error initially
    await waitFor(() => {
      expect(screen.getByText(/Failed to load schedule visualization/)).toBeInTheDocument()
    })

    // Fix the error condition
    shouldFail = false

    // Click retry
    const retryButton = screen.getByText(/Try Again/)
    await act(async () => {
      fireEvent.click(retryButton)
    })

    // Should show success state
    await waitFor(() => {
      expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
    })
  })
})