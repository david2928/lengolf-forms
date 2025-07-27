/**
 * Integration test for Schedule Visualization in Admin Page
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScheduleVisualizationContainer } from '../ScheduleVisualizationContainer'
import { STAFF_COLOR_PALETTE } from '@/lib/staff-colors'

// Mock the child components to avoid complex rendering
jest.mock('../TimelineGrid', () => ({
  TimelineGrid: () => <div data-testid="timeline-grid">Timeline Grid Rendered</div>,
  TimelineGridSkeleton: () => <div data-testid="timeline-grid-skeleton">Loading Timeline</div>
}))

describe('Schedule Visualization Integration', () => {
  const mockOverviewData = {
    week_period: {
      start_date: '2024-01-15',
      end_date: '2024-01-21'
    },
    kpis: {
      total_staff: 4,
      scheduled_shifts: 8,
      staff_scheduled: 4,
      coverage_percentage: 85,
      conflicts_count: 0
    },
    schedule_grid: {
      '2024-01-15': [
        {
          schedule_id: '1',
          staff_id: 1,
          staff_name: 'John Doe',
          start_time: '10:00',
          end_time: '14:00',
          location: 'Main Office'
        }
      ],
      '2024-01-16': [
        {
          schedule_id: '2',
          staff_id: 2,
          staff_name: 'Jane Smith',
          start_time: '12:00',
          end_time: '16:00',
          location: 'Branch Office'
        }
      ]
    },
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
        notes: null
      },
      {
        schedule_id: '2',
        staff_id: 2,
        staff_name: 'Jane Smith',
        schedule_date: '2024-01-16',
        start_time: '12:00',
        end_time: '16:00',
        location: 'Branch Office',
        notes: null
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
    },
    {
      staffId: 3,
      staffName: 'Bob Wilson',
      color: STAFF_COLOR_PALETTE[2]
    },
    {
      staffId: 4,
      staffName: 'Alice Johnson',
      color: STAFF_COLOR_PALETTE[3]
    }
  ]

  it('should integrate properly with admin page data structure', () => {
    render(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should render the main container
    expect(screen.getByText('Schedule Overview')).toBeInTheDocument()
    expect(screen.getByText('View Only')).toBeInTheDocument()
    
    // Should render the timeline grid
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
    expect(screen.getByText('Timeline Grid Rendered')).toBeInTheDocument()
  })

  it('should show loading state when admin page is loading', () => {
    render(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={true}
      />
    )

    // Should show loading skeleton
    expect(screen.getByTestId('timeline-grid-skeleton')).toBeInTheDocument()
    expect(screen.getByText('Loading Timeline')).toBeInTheDocument()
  })

  it('should handle real-time data updates from admin grid', () => {
    const { rerender } = render(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Initial render
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()

    // Simulate data update (like when admin adds/edits a schedule)
    const updatedData = {
      ...mockOverviewData,
      raw_schedules: [
        ...mockOverviewData.raw_schedules,
        {
          schedule_id: '3',
          staff_id: 3,
          staff_name: 'Bob Wilson',
          schedule_date: '2024-01-17',
          start_time: '14:00',
          end_time: '18:00',
          location: 'Remote',
          notes: 'New shift added'
        }
      ]
    }

    rerender(
      <ScheduleVisualizationContainer
        scheduleData={updatedData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should still render properly with updated data
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
  })

  it('should maintain consistent styling with admin page', () => {
    const { container } = render(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should use consistent admin page styling
    const mainContainer = container.querySelector('.bg-white.rounded-lg.border.border-slate-200')
    expect(mainContainer).toBeInTheDocument()
    
    // Should have consistent padding
    expect(mainContainer).toHaveClass('p-3', 'sm:p-4')
  })

  it('should work with empty schedule data from admin', () => {
    const emptyData = {
      ...mockOverviewData,
      raw_schedules: [],
      schedule_grid: {}
    }

    render(
      <ScheduleVisualizationContainer
        scheduleData={emptyData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should still render the visualization container
    expect(screen.getByText('Schedule Overview')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
  })

  it('should handle week navigation from admin page', () => {
    const { rerender } = render(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Initial week
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()

    // Simulate week navigation (admin page changes weekStart)
    rerender(
      <ScheduleVisualizationContainer
        scheduleData={mockOverviewData}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-22" // Next week
        loading={false}
      />
    )

    // Should still render with new week
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument()
  })
})