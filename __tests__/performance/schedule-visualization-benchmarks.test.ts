/**
 * Performance benchmark tests for schedule visualization
 */

import { render, screen, cleanup } from '@testing-library/react'
import { performance } from 'perf_hooks'
import { ScheduleVisualizationContainer } from '@/components/schedule-visualization/ScheduleVisualizationContainer'
import { TimelineGrid } from '@/components/schedule-visualization/TimelineGrid'
import { StaffScheduleBlock } from '@/components/schedule-visualization/StaffScheduleBlock'
import { mockStaffAssignments } from '@/lib/__mocks__/schedule-visualization-data'

// Mock responsive design
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

// Generate test data of various sizes
function generateScheduleData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `perf-schedule-${i}`,
    staffId: `staff-${i % 20}`, // 20 different staff members
    staffName: `Staff Member ${i % 20}`,
    startTime: `${10 + (i % 12)}:00`,
    endTime: `${12 + (i % 12)}:00`,
    duration: 2 + (i % 4),
    location: `Location ${i % 10}`,
    isRecurring: i % 3 === 0,
    gridPosition: {
      dayIndex: i % 7,
      startRow: 2 + (i % 12),
      rowSpan: 2 + (i % 3)
    }
  }))
}

function generateStaffAssignments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    staffId: `staff-${i}`,
    staffName: `Staff Member ${i}`,
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      hex: '#3b82f6'
    }
  }))
}

// Performance measurement utilities
function measureRenderTime<T>(renderFn: () => T): { result: T; renderTime: number } {
  const startTime = performance.now()
  const result = renderFn()
  const endTime = performance.now()
  
  return {
    result,
    renderTime: endTime - startTime
  }
}

function measureMemoryUsage(): number {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    // @ts-ignore - performance.memory is not in TypeScript types
    return window.performance.memory.usedJSHeapSize
  }
  return 0
}

describe('Schedule Visualization Performance Benchmarks', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Rendering Performance', () => {
    it('should render small dataset (10 schedules) quickly', () => {
      const scheduleData = generateScheduleData(10)
      const staffAssignments = generateStaffAssignments(5)

      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100)
      
      // Should render all schedules
      const scheduleBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(scheduleBlocks).toHaveLength(scheduleData.length)
    })

    it('should render medium dataset (50 schedules) efficiently', () => {
      const scheduleData = generateScheduleData(50)
      const staffAssignments = generateStaffAssignments(10)

      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should render in less than 300ms
      expect(renderTime).toBeLessThan(300)
      
      const scheduleBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(scheduleBlocks).toHaveLength(scheduleData.length)
    })

    it('should render large dataset (100 schedules) within acceptable time', () => {
      const scheduleData = generateScheduleData(100)
      const staffAssignments = generateStaffAssignments(20)

      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should render in less than 500ms
      expect(renderTime).toBeLessThan(500)
      
      const scheduleBlocks = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('scheduled')
      )
      expect(scheduleBlocks).toHaveLength(scheduleData.length)
    })

    it('should handle very large dataset (500 schedules) gracefully', () => {
      const scheduleData = generateScheduleData(500)
      const staffAssignments = generateStaffAssignments(50)

      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should render in less than 2 seconds
      expect(renderTime).toBeLessThan(2000)
      
      // Should render without crashing
      const grid = screen.getByRole('grid')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Re-render Performance', () => {
    it('should handle prop updates efficiently', () => {
      const initialData = generateScheduleData(50)
      const staffAssignments = generateStaffAssignments(10)

      const { rerender } = render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: initialData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )

      // Update with new data
      const updatedData = generateScheduleData(55)
      
      const { renderTime } = measureRenderTime(() => {
        rerender(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: updatedData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Re-render should be faster than initial render
      expect(renderTime).toBeLessThan(200)
    })

    it('should optimize re-renders with React.memo', () => {
      const scheduleData = generateScheduleData(30)
      const staffAssignments = generateStaffAssignments(10)

      const { rerender } = render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: scheduleData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )

      // Re-render with same props (should be optimized)
      const { renderTime } = measureRenderTime(() => {
        rerender(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should be very fast due to memoization
      expect(renderTime).toBeLessThan(50)
    })
  })

  describe('Memory Usage', () => {
    it('should not cause memory leaks with large datasets', () => {
      const initialMemory = measureMemoryUsage()
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const scheduleData = generateScheduleData(100)
        const staffAssignments = generateStaffAssignments(20)

        const { unmount } = render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: scheduleData }}
            staffAssignments={staffAssignments}
            weekStart="2024-01-15"
            loading={false}
          />
        )

        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = measureMemoryUsage()
      
      // Memory usage should not increase significantly
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100
        
        // Should not increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50)
      }
    })
  })

  describe('Component-Level Performance', () => {
    it('should render TimelineGrid efficiently', () => {
      const scheduleData = generateScheduleData(50)
      const staffAssignments = generateStaffAssignments(10)

      const { renderTime } = measureRenderTime(() => {
        return render(
          <TimelineGrid
            weekStart="2024-01-15"
            businessHours={{ start: 10, end: 23 }}
            scheduleBlocks={scheduleData}
            staffAssignments={staffAssignments}
          />
        )
      })

      expect(renderTime).toBeLessThan(200)
    })

    it('should render individual StaffScheduleBlock quickly', () => {
      const schedule = generateScheduleData(1)[0]
      const staffColor = generateStaffAssignments(1)[0]

      const { renderTime } = measureRenderTime(() => {
        return render(
          <StaffScheduleBlock
            schedule={schedule}
            staffColor={staffColor}
            gridPosition={schedule.gridPosition}
            duration={schedule.duration}
          />
        )
      })

      // Individual block should render very quickly
      expect(renderTime).toBeLessThan(10)
    })

    it('should handle rapid prop changes efficiently', () => {
      const schedule = generateScheduleData(1)[0]
      const staffColor = generateStaffAssignments(1)[0]

      const { rerender } = render(
        <StaffScheduleBlock
          schedule={schedule}
          staffColor={staffColor}
          gridPosition={schedule.gridPosition}
          duration={schedule.duration}
        />
      )

      // Measure multiple rapid updates
      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        const updatedSchedule = {
          ...schedule,
          startTime: `${10 + (i % 12)}:00`,
          endTime: `${12 + (i % 12)}:00`
        }

        rerender(
          <StaffScheduleBlock
            schedule={updatedSchedule}
            staffColor={staffColor}
            gridPosition={schedule.gridPosition}
            duration={schedule.duration}
          />
        )
      }

      const totalTime = performance.now() - startTime
      const averageTime = totalTime / 100

      // Each update should be very fast
      expect(averageTime).toBeLessThan(5)
    })
  })

  describe('Data Processing Performance', () => {
    it('should process large datasets quickly', () => {
      const largeDataset = generateScheduleData(1000)
      
      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: largeDataset }}
            staffAssignments={generateStaffAssignments(50)}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should process and render in reasonable time
      expect(renderTime).toBeLessThan(3000)
    })

    it('should handle data validation efficiently', () => {
      // Mix of valid and invalid data
      const mixedData = [
        ...generateScheduleData(100),
        { id: 'invalid-1' }, // Missing fields
        { id: 'invalid-2', startTime: 'invalid' }, // Invalid time
        null,
        undefined
      ]

      const { renderTime } = measureRenderTime(() => {
        return render(
          <ScheduleVisualizationContainer
            scheduleData={{ raw_schedules: mixedData }}
            staffAssignments={generateStaffAssignments(20)}
            weekStart="2024-01-15"
            loading={false}
          />
        )
      })

      // Should handle validation without significant performance impact
      expect(renderTime).toBeLessThan(400)
    })
  })

  describe('Responsive Performance', () => {
    it('should adapt to screen size changes quickly', () => {
      const scheduleData = generateScheduleData(50)
      const staffAssignments = generateStaffAssignments(10)

      render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: scheduleData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )

      // Simulate screen size changes
      const { renderTime } = measureRenderTime(() => {
        // Trigger resize events
        for (let i = 0; i < 10; i++) {
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 320 + (i * 100)
          })
          
          window.dispatchEvent(new Event('resize'))
        }
      })

      // Should handle resize events efficiently
      expect(renderTime).toBeLessThan(100)
    })
  })
})

describe('Performance Regression Tests', () => {
  // These tests help catch performance regressions
  const PERFORMANCE_BASELINES = {
    smallDataset: 100, // ms
    mediumDataset: 300, // ms
    largeDataset: 500, // ms
    reRender: 200, // ms
    individualBlock: 10 // ms
  }

  it('should not regress on small dataset performance', () => {
    const scheduleData = generateScheduleData(10)
    const staffAssignments = generateStaffAssignments(5)

    const { renderTime } = measureRenderTime(() => {
      return render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: scheduleData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )
    })

    expect(renderTime).toBeLessThan(PERFORMANCE_BASELINES.smallDataset)
  })

  it('should not regress on medium dataset performance', () => {
    const scheduleData = generateScheduleData(50)
    const staffAssignments = generateStaffAssignments(10)

    const { renderTime } = measureRenderTime(() => {
      return render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: scheduleData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )
    })

    expect(renderTime).toBeLessThan(PERFORMANCE_BASELINES.mediumDataset)
  })

  it('should not regress on large dataset performance', () => {
    const scheduleData = generateScheduleData(100)
    const staffAssignments = generateStaffAssignments(20)

    const { renderTime } = measureRenderTime(() => {
      return render(
        <ScheduleVisualizationContainer
          scheduleData={{ raw_schedules: scheduleData }}
          staffAssignments={staffAssignments}
          weekStart="2024-01-15"
          loading={false}
        />
      )
    })

    expect(renderTime).toBeLessThan(PERFORMANCE_BASELINES.largeDataset)
  })
})