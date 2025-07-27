/**
 * Tests for StaffScheduleBlock Component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { StaffScheduleBlock, StaffScheduleBlockSkeleton } from '../StaffScheduleBlock'
import { STAFF_COLOR_PALETTE } from '@/lib/staff-colors'

// Mock window.innerWidth for responsive tests
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

describe('StaffScheduleBlock', () => {
  const mockSchedule = {
    id: 'test-1',
    staffId: 1,
    staffName: 'John Doe',
    startTime: '10:00',
    endTime: '14:00',
    date: '2024-01-15',
    location: 'Main Office',
    notes: 'Regular shift',
    gridPosition: {
      dayIndex: 0,
      startRow: 0,
      endRow: 4,
      rowSpan: 4
    },
    duration: 4,
    isRecurring: false,
    originalSchedule: {} as any
  }

  const mockStaffColor = {
    staffId: 1,
    staffName: 'John Doe',
    color: STAFF_COLOR_PALETTE[0] // Blue color
  }

  const defaultProps = {
    schedule: mockSchedule,
    staffColor: mockStaffColor,
    gridPosition: mockSchedule.gridPosition,
    duration: mockSchedule.duration,
    className: 'test-block'
  }

  beforeEach(() => {
    mockInnerWidth(1024) // Default to desktop
  })

  it('should render staff name in the tab', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByTitle('John Doe')).toBeInTheDocument()
  })

  it('should display time range correctly', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(screen.getByText('10am - 2pm')).toBeInTheDocument()
  })

  it('should show duration for longer shifts', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(screen.getByText('4 hours')).toBeInTheDocument()
  })

  it('should display location when available and space permits', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(screen.getByText('📍 Main Office')).toBeInTheDocument()
    expect(screen.getByTitle('Main Office')).toBeInTheDocument()
  })

  it('should show recurring indicator when schedule is recurring', () => {
    const recurringProps = {
      ...defaultProps,
      schedule: {
        ...mockSchedule,
        isRecurring: true
      }
    }
    
    render(<StaffScheduleBlock {...recurringProps} />)
    
    expect(screen.getByTitle('Recurring schedule')).toBeInTheDocument()
    expect(screen.getByLabelText('This is a recurring schedule')).toBeInTheDocument()
  })

  it('should not show recurring indicator for non-recurring schedules', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(screen.queryByTitle('Recurring schedule')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<StaffScheduleBlock {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('staff-schedule-block')
    expect(container.firstChild).toHaveClass('test-block')
  })

  it('should have proper accessibility attributes', () => {
    render(<StaffScheduleBlock {...defaultProps} />)
    
    const block = screen.getByRole('gridcell')
    expect(block).toHaveAttribute('aria-label', 'John Doe scheduled from 10:00 to 14:00 at Main Office')
    expect(block).toHaveAttribute('tabIndex', '0')
  })

  it('should include recurring info in aria-label when applicable', () => {
    const recurringProps = {
      ...defaultProps,
      schedule: {
        ...mockSchedule,
        isRecurring: true
      }
    }
    
    render(<StaffScheduleBlock {...recurringProps} />)
    
    const block = screen.getByRole('gridcell')
    expect(block).toHaveAttribute('aria-label', expect.stringContaining('(recurring)'))
  })

  it('should handle schedule without location', () => {
    const noLocationProps = {
      ...defaultProps,
      schedule: {
        ...mockSchedule,
        location: undefined
      }
    }
    
    render(<StaffScheduleBlock {...noLocationProps} />)
    
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument()
    
    const block = screen.getByRole('gridcell')
    expect(block).toHaveAttribute('aria-label', 'John Doe scheduled from 10:00 to 14:00')
  })

  it('should adapt to mobile screen size', () => {
    mockInnerWidth(500) // Mobile width
    
    render(<StaffScheduleBlock {...defaultProps} />)
    
    // Should still render the component
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByRole('gridcell')).toBeInTheDocument()
  })

  it('should handle short duration blocks', () => {
    const shortProps = {
      ...defaultProps,
      schedule: {
        ...mockSchedule,
        startTime: '10:00',
        endTime: '11:00'
      },
      duration: 1,
      gridPosition: {
        ...mockSchedule.gridPosition,
        rowSpan: 1
      }
    }
    
    render(<StaffScheduleBlock {...shortProps} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('10am - 11am')).toBeInTheDocument()
  })

  it('should handle resize events', () => {
    const { rerender } = render(<StaffScheduleBlock {...defaultProps} />)
    
    // Simulate window resize
    mockInnerWidth(500)
    fireEvent(window, new Event('resize'))
    
    // Re-render to trigger useEffect
    rerender(<StaffScheduleBlock {...defaultProps} />)
    
    // Component should still be rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})

describe('StaffScheduleBlockSkeleton', () => {
  const defaultProps = {
    gridPosition: { rowSpan: 4 },
    className: 'skeleton-test'
  }

  it('should render skeleton with correct structure', () => {
    render(<StaffScheduleBlockSkeleton {...defaultProps} />)
    
    const skeleton = screen.getByRole('gridcell')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading schedule block')
    expect(skeleton).toHaveClass('staff-schedule-block-skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('should apply custom className', () => {
    const { container } = render(<StaffScheduleBlockSkeleton {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('staff-schedule-block-skeleton')
    expect(container.firstChild).toHaveClass('skeleton-test')
  })

  it('should adjust height based on rowSpan', () => {
    const { container } = render(
      <StaffScheduleBlockSkeleton gridPosition={{ rowSpan: 2 }} />
    )
    
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ minHeight: '116px' }) // 60 * 2 - 4 = 116
  })

  it('should have minimum height for small rowSpan', () => {
    const { container } = render(
      <StaffScheduleBlockSkeleton gridPosition={{ rowSpan: 1 }} />
    )
    
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveStyle({ minHeight: '56px' }) // 60 * 1 - 4 = 56, but min is 48
  })
})