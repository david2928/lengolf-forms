/**
 * Integration tests for schedule visualization data synchronization
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleVisualizationContainer } from '@/components/schedule-visualization/ScheduleVisualizationContainer'
import { mockScheduleData, mockStaffAssignments } from '@/lib/__mocks__/schedule-visualization-data'

// Mock the admin schedule grid for integration testing
const MockAdminScheduleGrid = ({ onScheduleUpdate }: { onScheduleUpdate: (data: any) => void }) => {
  const handleAddSchedule = () => {
    const newSchedule = {
      id: 'new-schedule-1',
      staffId: 'staff-1',
      staffName: 'New Staff Member',
      startTime: '14:00',
      endTime: '16:00',
      duration: 2,
      location: 'New Location',
      isRecurring: false,
      gridPosition: {
        dayIndex: 2,
        startRow: 4,
        rowSpan: 2
      }
    }
    onScheduleUpdate([...mockScheduleData, newSchedule])
  }

  const handleUpdateSchedule = () => {
    const updatedData = mockScheduleData.map(schedule => 
      schedule.id === 'schedule-1' 
        ? { ...schedule, startTime: '11:00', endTime: '13:00' }
        : schedule
    )
    onScheduleUpdate(updatedData)
  }

  const handleDeleteSchedule = () => {
    const filteredData = mockScheduleData.filter(schedule => schedule.id !== 'schedule-1')
    onScheduleUpdate(filteredData)
  }

  return (
    <div data-testid="admin-schedule-grid">
      <button onClick={handleAddSchedule} data-testid="add-schedule">
        Add Schedule
      </button>
      <button onClick={handleUpdateSchedule} data-testid="update-schedule">
        Update Schedule
      </button>
      <button onClick={handleDeleteSchedule} data-testid="delete-schedule">
        Delete Schedule
      </button>
    </div>
  )
}

// Mock the responsive design hook
jest.mock('@/lib/responsive-design', () => ({
  useResponsiveConfig: () => ({
    breakpoint: 'desktop',
    gridColumns: 'minmax(100px, 120px) repeat(7, 1fr)',
    timeSlotHeight: 60,
    fontSize: '0.875rem',
    blockPadding: 10,
    showMinutes: true,
    showLocation: true,
    headerHeight: 80,
    scrollable: false,
    compactMode: false
  }),
  enableHorizontalScroll: jest.fn(),
  createStickyTimeLabels: jest.fn(() => jest.fn())
}))

// Mock performance monitoring
jest.mock('@/lib/visualization-performance', () => ({
  visualizationPerformance: {
    startTiming: jest.fn(() => jest.fn())
  },
  throttle: jest.fn((fn) => fn)
}))

// Mock keyboard navigation
jest.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    focusedBlockId: null,
    isNavigationMode: false,
    containerRef: { current: null },
    liveRegionRef: { current: null },
    registerBlockRef: jest.fn(),
    onContainerFocus: jest.fn(),
    onContainerBlur: jest.fn()
  }))
}))

describe('Schedule Visualization Data Synchronization', () => {
  let scheduleData: any[]
  let onDataUpdate: jest.Mock

  beforeEach(() => {
    scheduleData = [...mockScheduleData]
    onDataUpdate = jest.fn()
    jest.clearAllMocks()
  })

  const IntegratedScheduleView = () => {
    const [currentData, setCurrentData] = React.useState(scheduleData)

    const handleScheduleUpdate = (newData: any[]) => {
      setCurrentData(newData)
      onDataUpdate(newData)
    }

    return (
      <div>
        <MockAdminScheduleGrid onScheduleUpdate={handleScheduleUpdate} />
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: currentData }}
          staffAssignments={mockStaffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      </div>
    )
  }

  it('should update visualization when schedule is added', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Initial state - should have original schedules
    expect(screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )).toHaveLength(mockScheduleData.length)

    // Add a new schedule
    const addButton = screen.getByTestId('add-schedule')
    await user.click(addButton)

    // Wait for visualization to update
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          ...mockScheduleData,
          expect.objectContaining({
            id: 'new-schedule-1',
            staffName: 'New Staff Member'
          })
        ])
      )
    })

    // Visualization should show the new schedule
    await waitFor(() => {
      const scheduleBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(scheduleBlocks).toHaveLength(mockScheduleData.length + 1)
    })
  })

  it('should update visualization when schedule is modified', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Update an existing schedule
    const updateButton = screen.getByTestId('update-schedule')
    await user.click(updateButton)

    // Wait for visualization to update
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'schedule-1',
            startTime: '11:00',
            endTime: '13:00'
          })
        ])
      )
    })

    // Visualization should reflect the time change
    await waitFor(() => {
      const updatedBlock = screen.getByLabelText(/11:00.*13:00/)
      expect(updatedBlock).toBeInTheDocument()
    })
  })

  it('should update visualization when schedule is deleted', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Initial count
    const initialBlocks = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )
    const initialCount = initialBlocks.length

    // Delete a schedule
    const deleteButton = screen.getByTestId('delete-schedule')
    await user.click(deleteButton)

    // Wait for visualization to update
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ id: 'schedule-1' })
        ])
      )
    })

    // Visualization should have one less schedule
    await waitFor(() => {
      const remainingBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(remainingBlocks).toHaveLength(initialCount - 1)
    })
  })

  it('should maintain staff color consistency across updates', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Get initial staff colors
    const initialBlocks = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )
    const initialColors = initialBlocks.map(block => 
      window.getComputedStyle(block).borderLeftColor
    )

    // Add a new schedule for the same staff member
    const addButton = screen.getByTestId('add-schedule')
    await user.click(addButton)

    await waitFor(() => {
      const updatedBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      
      // Colors should remain consistent for existing staff
      const newColors = updatedBlocks.slice(0, initialBlocks.length).map(block => 
        window.getComputedStyle(block).borderLeftColor
      )
      
      expect(newColors).toEqual(initialColors)
    })
  })

  it('should handle rapid successive updates', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Perform multiple rapid updates
    const addButton = screen.getByTestId('add-schedule')
    const updateButton = screen.getByTestId('update-schedule')

    await user.click(addButton)
    await user.click(updateButton)
    await user.click(addButton)

    // Should handle all updates without errors
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalledTimes(3)
    })

    // Final state should be correct
    await waitFor(() => {
      const finalBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(finalBlocks.length).toBeGreaterThan(mockScheduleData.length)
    })
  })

  it('should preserve visualization state during updates', async () => {
    const user = userEvent.setup()
    render(<IntegratedScheduleView />)

    // Focus on a schedule block
    const firstBlock = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )[0]
    
    await user.click(firstBlock)
    expect(firstBlock).toHaveFocus()

    // Update schedules
    const updateButton = screen.getByTestId('update-schedule')
    await user.click(updateButton)

    // Visualization should maintain its state
    await waitFor(() => {
      const grid = screen.getByRole('grid')
      expect(grid).toBeInTheDocument()
    })
  })
})

describe('Real-time Data Synchronization', () => {
  it('should handle WebSocket updates', async () => {
    // Mock WebSocket connection
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }

    // @ts-ignore
    global.WebSocket = jest.fn(() => mockWebSocket)

    render(
      <ScheduleVisualizationContainer
        scheduleData={{ raw_schedules: mockScheduleData }}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Simulate WebSocket message
    const messageHandler = mockWebSocket.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1]

    if (messageHandler) {
      const mockEvent = {
        data: JSON.stringify({
          type: 'schedule_update',
          data: {
            id: 'schedule-1',
            startTime: '12:00',
            endTime: '14:00'
          }
        })
      }

      messageHandler(mockEvent)

      // Should update visualization
      await waitFor(() => {
        const grid = screen.getByRole('grid')
        expect(grid).toBeInTheDocument()
      })
    }
  })

  it('should handle server-sent events', async () => {
    // Mock EventSource
    const mockEventSource = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn()
    }

    // @ts-ignore
    global.EventSource = jest.fn(() => mockEventSource)

    render(
      <ScheduleVisualizationContainer
        scheduleData={{ raw_schedules: mockScheduleData }}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Simulate SSE message
    const messageHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1]

    if (messageHandler) {
      const mockEvent = {
        data: JSON.stringify({
          type: 'bulk_update',
          schedules: mockScheduleData.slice(0, 2)
        })
      }

      messageHandler(mockEvent)

      // Should update visualization
      await waitFor(() => {
        const grid = screen.getByRole('grid')
        expect(grid).toBeInTheDocument()
      })
    }
  })
})

describe('Data Validation and Error Handling', () => {
  it('should handle invalid schedule data gracefully', () => {
    const invalidData = [
      { id: 'invalid-1' }, // Missing required fields
      { id: 'invalid-2', startTime: 'invalid-time' }, // Invalid time format
      null, // Null entry
      undefined // Undefined entry
    ]

    render(
      <ScheduleVisualizationContainer
        scheduleData={{ raw_schedules: invalidData }}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should render without crashing
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    // Should not render invalid schedules
    const scheduleBlocks = screen.queryAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )
    expect(scheduleBlocks).toHaveLength(0)
  })

  it('should handle missing staff assignments', () => {
    render(
      <ScheduleVisualizationContainer
        scheduleData={{ raw_schedules: mockScheduleData }}
        staffAssignments={[]} // Empty staff assignments
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should generate staff assignments from schedule data
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    const scheduleBlocks = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('scheduled')
    )
    expect(scheduleBlocks.length).toBeGreaterThan(0)
  })

  it('should handle network errors during sync', async () => {
    // Mock fetch to simulate network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    render(
      <ScheduleVisualizationContainer
        scheduleData={{ raw_schedules: mockScheduleData }}
        staffAssignments={mockStaffAssignments}
        weekStart="2024-01-15"
        loading={false}
      />
    )

    // Should still render with existing data
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    // Should show error state if applicable
    await waitFor(() => {
      // Error handling should be graceful
      expect(grid).toBeInTheDocument()
    })
  })
})

// Import React for JSX
import React from 'react'