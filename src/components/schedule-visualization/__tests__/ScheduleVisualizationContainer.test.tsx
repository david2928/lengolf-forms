/**
 * Tests for ScheduleVisualizationContainer Component
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ScheduleVisualizationContainer, ScheduleVisualizationError } from '../ScheduleVisualizationContainer'
import { STAFF_COLOR_PALETTE } from '@/lib/staff-colors'

// Mock the child components
jest.mock('../TimelineGrid', () => ({
  TimelineGrid: ({ scheduleBlocks, staffAssignments }: any) => (
    <div data-testid="timeline-grid">
      <div data-testid="schedule-blocks-count">{scheduleBlocks.length}</div>
      <div data-testid="staff-assignments-count">{staffAssignments.length}</div>
    </div>
  ),
  TimelineGridSkeleton: () => <div data-testid="timeline-grid-skeleton">Loading...</div>
}))

describe('ScheduleVisualizationContainer', () => {
  const mockScheduleData = {
    week_period: {
      start_date: '2024-01-15',
      end_date: '2024-01-21'
    },
    kpis: {
      total_staff: 2,
      scheduled_shifts: 2,
      staff_scheduled: 2,
      coverage_percentage: 100,
      conflicts_count: 0
    },
    schedule_grid: {},
    conflicts: [],
    raw_schedules: [
      {
        schedule_id: '1',
        staff_id: 1,
        staff_name: 'John Doe',
        schedule_date: '2024-01-15',
        start_time: '10:00',
        end_time: '14:00',
        location: 'Main Office',
        notes: 'Regular shift'
      },
      {
        schedule_id: '2',
        staff_id: 2,
        staff_name: 'Jane Smith',
        schedule_date: '2024-01-16',
        start_time: '12:00',
        end_time: '16:00',
        location: 'Branch Office',
        notes: 'Afternoon shift'
      }
    ]
  }

  const mockStaffAssignments = [
    {
      staffId: 1,
      staffName: 'John Doe',
      color: STAFF_COLOR_PALETTE[0]
    },
    {
      staffId: 2,
      staffName: 'Jane Smith',
      color: STAFF_COLOR_PALETTE[1]
    }
  ]

  const defaultProps = {
    scheduleData: mockScheduleData,
    staffAssignments: mockStaffAssignments,
    weekStart: '2024-01-15',
    loading: false,
    className: 'test-container'
  }

  it('should render loading state when loading is true', () => {
    render(<ScheduleVisualizationContainer {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Schedule Overview')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-grid-skeleton')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render main visualization with processed data', async () => {
    render(<ScheduleVisualizationContainer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Overview')).toBeInTheDocument()
      expect(screen.getByText('View Only')).toBeInTheDocument()
      expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
    })

    // Should process 2 schedule blocks
    expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('2')
    expect(screen.getByTestId('staff-assignments-count')).toHaveTextContent('2')
  })

  it('should apply custom className', () => {
    const { container } = render(<ScheduleVisualizationContainer {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('schedule-visualization-container')
    expect(container.firstChild).toHaveClass('test-container')
  })

  it('should handle empty schedule data', async () => {
    const emptyProps = {
      ...defaultProps,
      scheduleData: {
        ...mockScheduleData,
        raw_schedules: []
      }
    }
    
    render(<ScheduleVisualizationContainer {...emptyProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('0')
    })
  })

  it('should filter out invalid schedule data', async () => {
    const invalidDataProps = {
      ...defaultProps,
      scheduleData: {
        ...mockScheduleData,
        raw_schedules: [
          ...mockScheduleData.raw_schedules,
          {
            // Invalid schedule - missing required fields
            schedule_id: '3',
            staff_id: 3,
            // Missing staff_name, start_time, end_time, schedule_date
          }
        ]
      }
    }
    
    render(<ScheduleVisualizationContainer {...invalidDataProps} />)
    
    await waitFor(() => {
      // Should still process only the 2 valid schedules
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('2')
    })
  })

  it('should generate staff assignments when not provided', async () => {
    const noStaffProps = {
      ...defaultProps,
      staffAssignments: []
    }
    
    render(<ScheduleVisualizationContainer {...noStaffProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
      // Should generate assignments for 2 unique staff members
      expect(screen.getByTestId('staff-assignments-count')).toHaveTextContent('2')
    })
  })

  it('should handle null schedule data', () => {
    const nullDataProps = {
      ...defaultProps,
      scheduleData: null as any
    }
    
    render(<ScheduleVisualizationContainer {...nullDataProps} />)
    
    expect(screen.getByTestId('timeline-grid-skeleton')).toBeInTheDocument()
  })

  it('should handle malformed schedule data gracefully', async () => {
    // Mock console.error and console.warn to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    const malformedProps = {
      ...defaultProps,
      scheduleData: {
        ...mockScheduleData,
        raw_schedules: [
          // Mix of valid and invalid data
          mockScheduleData.raw_schedules[0], // Valid
          { invalid: 'data' }, // Invalid
          null, // Invalid
          undefined // Invalid
        ].filter(Boolean) // Remove null/undefined to avoid array issues
      }
    }
    
    render(<ScheduleVisualizationContainer {...malformedProps} />)
    
    await waitFor(() => {
      // Should still render the timeline grid with valid data only
      expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('1')
    })
    
    consoleSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('should handle schedules outside business hours', async () => {
    const outsideHoursProps = {
      ...defaultProps,
      scheduleData: {
        ...mockScheduleData,
        raw_schedules: [
          {
            schedule_id: '1',
            staff_id: 1,
            staff_name: 'John Doe',
            schedule_date: '2024-01-15',
            start_time: '08:00', // Before business hours (10am)
            end_time: '12:00',
            location: 'Main Office',
            notes: 'Early shift'
          },
          {
            schedule_id: '2',
            staff_id: 2,
            staff_name: 'Jane Smith',
            schedule_date: '2024-01-16',
            start_time: '10:00', // Within business hours
            end_time: '14:00',
            location: 'Branch Office',
            notes: 'Regular shift'
          }
        ]
      }
    }
    
    render(<ScheduleVisualizationContainer {...outsideHoursProps} />)
    
    await waitFor(() => {
      // Should filter out the schedule outside business hours
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('1')
    })
  })

  it('should update when schedule data changes', async () => {
    const { rerender } = render(<ScheduleVisualizationContainer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('2')
    })
    
    // Update with different data
    const updatedProps = {
      ...defaultProps,
      scheduleData: {
        ...mockScheduleData,
        raw_schedules: [mockScheduleData.raw_schedules[0]] // Only one schedule
      }
    }
    
    rerender(<ScheduleVisualizationContainer {...updatedProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-blocks-count')).toHaveTextContent('1')
    })
  })
})

describe('ScheduleVisualizationError', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error')
    }
    return <div>No error</div>
  }

  it('should render children when no error occurs', () => {
    render(
      <ScheduleVisualizationError>
        <ThrowError shouldThrow={false} />
      </ScheduleVisualizationError>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should render error state when error occurs', () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    render(
      <ScheduleVisualizationError>
        <ThrowError shouldThrow={true} />
      </ScheduleVisualizationError>
    )
    
    expect(screen.getByText('Schedule Overview')).toBeInTheDocument()
    expect(screen.getByText('Failed to load schedule visualization')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('should render custom fallback when provided', () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const customFallback = <div>Custom error fallback</div>
    
    render(
      <ScheduleVisualizationError fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ScheduleVisualizationError>
    )
    
    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('should reset error state when retry is clicked', () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const { rerender } = render(
      <ScheduleVisualizationError>
        <ThrowError shouldThrow={true} />
      </ScheduleVisualizationError>
    )
    
    expect(screen.getByText('Failed to load schedule visualization')).toBeInTheDocument()
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i })
    retryButton.click()
    
    // Re-render with no error
    rerender(
      <ScheduleVisualizationError>
        <ThrowError shouldThrow={false} />
      </ScheduleVisualizationError>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })
})