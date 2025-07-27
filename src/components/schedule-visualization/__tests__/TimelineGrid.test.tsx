/**
 * Tests for TimelineGrid Component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineGrid, TimelineGridSkeleton } from '../TimelineGrid'
import { ProcessedScheduleBlock } from '@/types/schedule-visualization'
import { STAFF_COLOR_PALETTE } from '@/lib/staff-colors'

describe('TimelineGrid', () => {
  const mockScheduleBlocks: ProcessedScheduleBlock[] = [
    {
      id: 'schedule-1',
      staffId: 1,
      staffName: 'John Doe',
      startTime: '10:00',
      endTime: '14:00',
      date: '2024-01-15',
      location: 'Main Office',
      gridPosition: {
        dayIndex: 0, // Monday
        startRow: 0,
        endRow: 4,
        rowSpan: 4
      },
      duration: 4,
      isRecurring: false,
      originalSchedule: {} as any
    },
    {
      id: 'schedule-2',
      staffId: 2,
      staffName: 'Jane Smith',
      startTime: '12:00',
      endTime: '16:00',
      date: '2024-01-16',
      location: 'Branch Office',
      gridPosition: {
        dayIndex: 1, // Tuesday
        startRow: 2,
        endRow: 6,
        rowSpan: 4
      },
      duration: 4,
      isRecurring: true,
      originalSchedule: {} as any
    }
  ]

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
    },
    {
      staffId: 3,
      staffName: 'Bob Wilson',
      color: STAFF_COLOR_PALETTE[2]
    }
  ]

  const defaultProps = {
    weekStart: '2024-01-15',
    businessHours: { start: 10, end: 23 },
    scheduleBlocks: mockScheduleBlocks,
    staffAssignments: mockStaffAssignments,
    onBlockHover: jest.fn(),
    className: 'test-grid'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render timeline header', () => {
    render(<TimelineGrid {...defaultProps} />)
    
    // Check that day headers are rendered
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    
    // Check that time header is rendered
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('should render time labels', () => {
    render(<TimelineGrid {...defaultProps} />)
    
    // Check that time labels are rendered
    expect(screen.getAllByText('10am')).toHaveLength(2) // One in header, one in time labels
    expect(screen.getAllByText('11am')).toHaveLength(2)
    expect(screen.getAllByText('12pm')).toHaveLength(2)
    expect(screen.getAllByText('11pm')).toHaveLength(2)
  })

  it('should render schedule blocks', () => {
    render(<TimelineGrid {...defaultProps} />)
    
    // Check that staff names are rendered in schedule blocks
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    
    // Check that time ranges are rendered
    expect(screen.getByText('10am - 2pm')).toBeInTheDocument()
    expect(screen.getByText('12pm - 4pm')).toBeInTheDocument()
  })

  it('should have proper grid structure', () => {
    const { container } = render(<TimelineGrid {...defaultProps} />)
    
    const grid = container.querySelector('.timeline-grid')
    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'minmax(80px, 100px) repeat(7, 1fr)',
      gridTemplateRows: 'auto repeat(14, 60px)'
    })
  })

  it('should apply custom className', () => {
    const { container } = render(<TimelineGrid {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('timeline-grid-container')
    expect(container.firstChild).toHaveClass('test-grid')
  })

  it('should have proper accessibility attributes', () => {
    render(<TimelineGrid {...defaultProps} />)
    
    const grid = screen.getByRole('grid')
    expect(grid).toHaveAttribute('aria-label', 'Weekly staff schedule timeline')
    
    // Check for screen reader day headers
    expect(screen.getByRole('columnheader', { name: 'Monday' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tuesday' })).toBeInTheDocument()
  })

  it('should handle block hover events', () => {
    const onBlockHover = jest.fn()
    render(<TimelineGrid {...defaultProps} onBlockHover={onBlockHover} />)
    
    const johnBlock = screen.getByText('John Doe').closest('.schedule-block-container')
    expect(johnBlock).toBeInTheDocument()
    
    if (johnBlock) {
      fireEvent.mouseEnter(johnBlock)
      expect(onBlockHover).toHaveBeenCalledWith(mockScheduleBlocks[0])
      
      fireEvent.mouseLeave(johnBlock)
      expect(onBlockHover).toHaveBeenCalledWith(null)
    }
  })

  it('should render grid legend', () => {
    render(<TimelineGrid {...defaultProps} />)
    
    expect(screen.getByText('Available time slot')).toBeInTheDocument()
    expect(screen.getByText('Scheduled shift')).toBeInTheDocument()
    expect(screen.getByText('Business hours: 10am - 11pm')).toBeInTheDocument()
  })

  it('should handle empty schedule blocks', () => {
    const emptyProps = {
      ...defaultProps,
      scheduleBlocks: []
    }
    
    render(<TimelineGrid {...emptyProps} />)
    
    // Should still render the grid structure
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getAllByText('10am')).toHaveLength(2) // One in header, one in time labels
    expect(screen.getByText('Mon')).toBeInTheDocument()
    
    // Should not render any schedule blocks
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('should handle overlapping schedules', () => {
    const overlappingSchedules: ProcessedScheduleBlock[] = [
      {
        ...mockScheduleBlocks[0],
        id: 'overlap-1'
      },
      {
        ...mockScheduleBlocks[0],
        id: 'overlap-2',
        staffId: 3,
        staffName: 'Bob Wilson'
      }
    ]
    
    const overlappingProps = {
      ...defaultProps,
      scheduleBlocks: overlappingSchedules,
      staffAssignments: [
        ...mockStaffAssignments,
        {
          staffId: 3,
          staffName: 'Bob Wilson',
          color: STAFF_COLOR_PALETTE[2]
        }
      ]
    }
    
    render(<TimelineGrid {...overlappingProps} />)
    
    // Both staff members should be rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  it('should render empty grid cells', () => {
    const { container } = render(<TimelineGrid {...defaultProps} />)
    
    // Should have 7 days * 14 hours = 98 empty grid cells
    const emptyCells = container.querySelectorAll('.grid-cell')
    expect(emptyCells).toHaveLength(98)
  })

  it('should handle different business hours', () => {
    const customHoursProps = {
      ...defaultProps,
      businessHours: { start: 9, end: 17 }
    }
    
    render(<TimelineGrid {...customHoursProps} />)
    
    expect(screen.getByText('Business hours: 9am - 17pm')).toBeInTheDocument()
  })
})

describe('TimelineGridSkeleton', () => {
  const defaultProps = {
    weekStart: '2024-01-15',
    businessHours: { start: 10, end: 23 },
    className: 'skeleton-test'
  }

  it('should render skeleton structure', () => {
    const { container } = render(<TimelineGridSkeleton {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('timeline-grid-skeleton')
    expect(container.firstChild).toHaveClass('skeleton-test')
  })

  it('should render header skeleton', () => {
    const { container } = render(<TimelineGridSkeleton {...defaultProps} />)
    
    // Should have 8 header skeleton items (1 time + 7 days)
    const headerSkeletons = container.querySelectorAll('.grid.grid-cols-8 > div')
    expect(headerSkeletons).toHaveLength(8)
    
    headerSkeletons.forEach(skeleton => {
      expect(skeleton).toHaveClass('animate-pulse')
    })
  })

  it('should render grid skeleton with proper structure', () => {
    const { container } = render(<TimelineGridSkeleton {...defaultProps} />)
    
    const gridSkeleton = container.querySelector('[style*="grid-template-columns"]')
    expect(gridSkeleton).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'minmax(80px, 100px) repeat(7, 1fr)',
      gridTemplateRows: 'auto repeat(14, 60px)'
    })
  })

  it('should render time label skeletons', () => {
    const { container } = render(<TimelineGridSkeleton {...defaultProps} />)
    
    // Should have 14 time label skeletons
    const timeLabelSkeletons = container.querySelectorAll('[style*="grid-column: 1"]')
    expect(timeLabelSkeletons).toHaveLength(14)
    
    timeLabelSkeletons.forEach(skeleton => {
      expect(skeleton).toHaveClass('animate-pulse')
    })
  })

  it('should render random schedule block skeletons', () => {
    const { container } = render(<TimelineGridSkeleton {...defaultProps} />)
    
    // Should have 8 random schedule block skeletons
    const blockSkeletons = container.querySelectorAll('[style*="z-index: 10"]')
    expect(blockSkeletons).toHaveLength(8)
    
    blockSkeletons.forEach(skeleton => {
      expect(skeleton).toHaveClass('animate-pulse')
    })
  })
})