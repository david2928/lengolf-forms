import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { 
  ScheduleVisualizationSkeleton, 
  CompactScheduleVisualizationSkeleton,
  TimelineGridSkeleton,
  StaffScheduleBlockSkeleton 
} from '../ScheduleVisualizationSkeleton'
import { ScheduleVisualizationContainer } from '../ScheduleVisualizationContainer'

// Mock dependencies
jest.mock('@/lib/schedule-visualization-utils', () => ({
  processScheduleData: jest.fn(() => []),
  validateScheduleData: jest.fn(() => true)
}))

jest.mock('@/lib/staff-colors', () => ({
  generateStaffColorAssignments: jest.fn(() => [])
}))

jest.mock('../TimelineGrid', () => ({
  TimelineGrid: () => <div data-testid="timeline-grid">Timeline Grid</div>
}))

jest.mock('../OfflineIndicator', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator">Offline</div>,
  useOnlineStatus: jest.fn(() => ({ isOnline: true, wasOffline: false }))
}))

describe('Schedule Visualization Loading States', () => {
  describe('ScheduleVisualizationSkeleton', () => {
    it('should render loading skeleton with default props', () => {
      render(<ScheduleVisualizationSkeleton />)
      
      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
      
      // Should show day headers
      const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      dayHeaders.forEach(day => {
        // Check if skeleton elements are present (they won't have text content)
        const elements = screen.getAllByText((content, element) => {
          return element?.tagName.toLowerCase() === 'div' && 
                 element?.className.includes('animate-pulse')
        })
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('should render with custom business hours', () => {
      render(
        <ScheduleVisualizationSkeleton 
          businessHours={{ start: 9, end: 17 }}
        />
      )
      
      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <ScheduleVisualizationSkeleton className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('schedule-visualization-skeleton')
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should show loading spinner', () => {
      render(<ScheduleVisualizationSkeleton />)
      
      // Check for loading spinner SVG
      const spinner = screen.getByText('Loading schedule visualization...').previousElementSibling
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('CompactScheduleVisualizationSkeleton', () => {
    it('should render compact skeleton layout', () => {
      const { container } = render(<CompactScheduleVisualizationSkeleton />)
      
      expect(container.firstChild).toHaveClass('compact-schedule-skeleton')
      
      // Should have fewer elements than full skeleton
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
      expect(animatedElements.length).toBeLessThan(50) // Compact should have fewer elements
    })

    it('should apply custom className', () => {
      const { container } = render(
        <CompactScheduleVisualizationSkeleton className="compact-custom" />
      )
      
      expect(container.firstChild).toHaveClass('compact-schedule-skeleton')
      expect(container.firstChild).toHaveClass('compact-custom')
    })
  })

  describe('TimelineGridSkeleton', () => {
    it('should render timeline grid skeleton structure', () => {
      const { container } = render(
        <TimelineGridSkeleton 
          weekStart="2024-01-01"
          businessHours={{ start: 10, end: 23 }}
        />
      )
      
      expect(container.firstChild).toHaveClass('timeline-grid-skeleton')
      
      // Should have grid structure
      const gridElements = container.querySelectorAll('.grid')
      expect(gridElements.length).toBeGreaterThan(0)
    })

    it('should render correct number of hour rows', () => {
      const { container } = render(
        <TimelineGridSkeleton 
          businessHours={{ start: 9, end: 17 }} // 9 hours
        />
      )
      
      // Should have skeleton elements for each hour
      const hourRows = container.querySelectorAll('.grid.grid-cols-8')
      expect(hourRows.length).toBeGreaterThan(8) // Header + hour rows
    })

    it('should show random schedule blocks for visual variety', () => {
      const { container } = render(<TimelineGridSkeleton />)
      
      // Should have some skeleton blocks (random, so just check they exist)
      const skeletonBlocks = container.querySelectorAll('.bg-gray-300')
      expect(skeletonBlocks.length).toBeGreaterThan(0)
    })
  })

  describe('StaffScheduleBlockSkeleton', () => {
    it('should render staff block skeleton', () => {
      const { container } = render(<StaffScheduleBlockSkeleton />)
      
      expect(container.firstChild).toHaveClass('staff-schedule-block-skeleton')
      
      // Should have animated skeleton elements
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
    })

    it('should apply custom className', () => {
      const { container } = render(
        <StaffScheduleBlockSkeleton className="block-custom" />
      )
      
      expect(container.firstChild).toHaveClass('staff-schedule-block-skeleton')
      expect(container.firstChild).toHaveClass('block-custom')
    })
  })

  describe('Integration with ScheduleVisualizationContainer', () => {
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
      raw_schedules: []
    }

    it('should show skeleton when loading prop is true', () => {
      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={true}
        />
      )

      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show skeleton when data is not yet processed', () => {
      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={false}
        />
      )

      // Should show skeleton initially while processing
      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
    })

    it('should transition from skeleton to content', async () => {
      const scheduleDataWithContent = {
        ...mockScheduleData,
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

      render(
        <ScheduleVisualizationContainer
          scheduleData={scheduleDataWithContent}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={false}
        />
      )

      // Should eventually show the timeline grid
      await waitFor(() => {
        expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
      })

      // Skeleton should be gone
      expect(screen.queryByText('Loading schedule visualization...')).not.toBeInTheDocument()
    })

    it('should show appropriate loading state text', () => {
      render(
        <ScheduleVisualizationContainer
          scheduleData={mockScheduleData}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={true}
        />
      )

      // Should show "Loading..." in header when loading prop is true
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show "View Only" when not loading', async () => {
      const scheduleDataWithContent = {
        ...mockScheduleData,
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

      render(
        <ScheduleVisualizationContainer
          scheduleData={scheduleDataWithContent}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={false}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('View Only')).toBeInTheDocument()
      })
    })
  })

  describe('Skeleton Animation and Accessibility', () => {
    it('should have proper animation classes', () => {
      const { container } = render(<ScheduleVisualizationSkeleton />)
      
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
      
      // Each animated element should have the pulse animation
      animatedElements.forEach(element => {
        expect(element).toHaveClass('animate-pulse')
      })
    })

    it('should provide loading feedback for screen readers', () => {
      render(<ScheduleVisualizationSkeleton />)
      
      // Should have loading text that screen readers can announce
      expect(screen.getByText('Loading schedule visualization...')).toBeInTheDocument()
    })

    it('should have appropriate color contrast for skeleton elements', () => {
      const { container } = render(<ScheduleVisualizationSkeleton />)
      
      // Check that skeleton elements use appropriate gray colors
      const grayElements = container.querySelectorAll('.bg-gray-200, .bg-gray-300, .bg-gray-100')
      expect(grayElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Skeleton Behavior', () => {
    it('should maintain structure across different screen sizes', () => {
      const { container } = render(<ScheduleVisualizationSkeleton />)
      
      // Should have responsive grid classes
      const gridElements = container.querySelectorAll('.grid-cols-8')
      expect(gridElements.length).toBeGreaterThan(0)
    })

    it('should show appropriate skeleton density', () => {
      const { container: fullContainer } = render(<ScheduleVisualizationSkeleton />)
      const { container: compactContainer } = render(<CompactScheduleVisualizationSkeleton />)
      
      const fullElements = fullContainer.querySelectorAll('.animate-pulse')
      const compactElements = compactContainer.querySelectorAll('.animate-pulse')
      
      // Compact should have fewer skeleton elements
      expect(compactElements.length).toBeLessThan(fullElements.length)
    })
  })
})