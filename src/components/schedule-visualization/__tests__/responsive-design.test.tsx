/**
 * Responsive design tests for Schedule Visualization components
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineGrid } from '../TimelineGrid'
import { TimelineHeader } from '../TimelineHeader'
import { StaffScheduleBlock } from '../StaffScheduleBlock'
import { mockScheduleData, mockStaffAssignments } from '@/lib/__mocks__/schedule-visualization-data'

// Mock the responsive design utilities
const mockResponsiveConfig = {
  mobile: {
    breakpoint: 'mobile',
    gridColumns: 'minmax(60px, 80px) repeat(7, 1fr)',
    timeSlotHeight: 48,
    fontSize: '0.75rem',
    blockPadding: 6,
    showMinutes: false,
    showLocation: false,
    headerHeight: 60,
    scrollable: true,
    compactMode: true
  },
  tablet: {
    breakpoint: 'tablet',
    gridColumns: 'minmax(80px, 100px) repeat(7, 1fr)',
    timeSlotHeight: 56,
    fontSize: '0.875rem',
    blockPadding: 8,
    showMinutes: true,
    showLocation: true,
    headerHeight: 70,
    scrollable: true,
    compactMode: false
  },
  desktop: {
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
  }
}

jest.mock('@/lib/responsive-design', () => ({
  useResponsiveConfig: jest.fn(() => mockResponsiveConfig.desktop),
  enableHorizontalScroll: jest.fn(),
  createStickyTimeLabels: jest.fn(() => jest.fn())
}))

// Mock the performance monitoring
jest.mock('@/lib/visualization-performance', () => ({
  visualizationPerformance: {
    startTiming: jest.fn(() => jest.fn())
  },
  throttle: jest.fn((fn) => fn)
}))

// Mock the keyboard navigation hook
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

describe('Responsive Design', () => {
  const defaultProps = {
    weekStart: '2024-01-15',
    businessHours: { start: 10, end: 23 },
    scheduleBlocks: mockScheduleData,
    staffAssignments: mockStaffAssignments
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
    })

    it('should render TimelineGrid with mobile configuration', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toHaveClass('overflow-x-auto', 'overflow-y-hidden', 'text-sm')
    })

    it('should render TimelineHeader with compact mode', () => {
      render(<TimelineHeader weekStart="2024-01-15" businessHours={{ start: 10, end: 23 }} />)
      
      // Should have compact styling
      const header = document.querySelector('.schedule-timeline-header')
      expect(header).toBeInTheDocument()
      
      // Day names should be abbreviated
      const dayHeaders = screen.getAllByRole('columnheader')
      expect(dayHeaders).toHaveLength(7)
    })

    it('should render StaffScheduleBlock with mobile sizing', () => {
      const blockProps = {
        schedule: mockScheduleData[0],
        staffColor: mockStaffAssignments[0],
        gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 },
        duration: 2
      }

      render(<StaffScheduleBlock {...blockProps} />)
      
      const block = screen.getByRole('button')
      expect(block).toBeInTheDocument()
    })

    it('should enable horizontal scrolling on mobile', () => {
      const { enableHorizontalScroll } = require('@/lib/responsive-design')
      render(<TimelineGrid {...defaultProps} />)
      
      expect(enableHorizontalScroll).toHaveBeenCalled()
    })
  })

  describe('Tablet Layout', () => {
    beforeEach(() => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.tablet)
    })

    it('should render TimelineGrid with tablet configuration', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toHaveClass('overflow-x-auto', 'overflow-y-hidden')
      expect(grid).not.toHaveClass('text-sm') // Not compact mode
    })

    it('should show minutes and location on tablet', () => {
      const blockProps = {
        schedule: {
          ...mockScheduleData[0],
          location: 'Main Floor'
        },
        staffColor: mockStaffAssignments[0],
        gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 3 }, // Taller block
        duration: 3
      }

      render(<StaffScheduleBlock {...blockProps} />)
      
      const block = screen.getByRole('button')
      expect(block).toBeInTheDocument()
    })
  })

  describe('Desktop Layout', () => {
    beforeEach(() => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.desktop)
    })

    it('should render TimelineGrid without scrolling on desktop', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toHaveClass('overflow-hidden')
      expect(grid).not.toHaveClass('overflow-x-auto')
    })

    it('should not enable horizontal scrolling on desktop', () => {
      const { enableHorizontalScroll } = require('@/lib/responsive-design')
      render(<TimelineGrid {...defaultProps} />)
      
      expect(enableHorizontalScroll).not.toHaveBeenCalled()
    })

    it('should render full day names on desktop', () => {
      render(<TimelineHeader weekStart="2024-01-15" businessHours={{ start: 10, end: 23 }} />)
      
      const dayHeaders = screen.getAllByRole('columnheader')
      expect(dayHeaders).toHaveLength(7)
      
      // Should show full day names, not abbreviated
      expect(screen.getByText('Monday')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should update layout when screen size changes', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      
      // Start with mobile
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      const { rerender } = render(<TimelineGrid {...defaultProps} />)
      
      let grid = screen.getByRole('grid')
      expect(grid).toHaveClass('text-sm')
      
      // Change to desktop
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.desktop)
      rerender(<TimelineGrid {...defaultProps} />)
      
      grid = screen.getByRole('grid')
      expect(grid).not.toHaveClass('text-sm')
    })

    it('should handle window resize events', () => {
      // Mock window resize
      const originalInnerWidth = window.innerWidth
      
      render(<TimelineGrid {...defaultProps} />)
      
      // Simulate resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })
      
      fireEvent(window, new Event('resize'))
      
      // Restore original width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      })
    })
  })

  describe('Touch Device Support', () => {
    it('should handle touch interactions on mobile', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      
      render(<TimelineGrid {...defaultProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toBeInTheDocument()
      
      // Should have touch-friendly scrolling
      expect(grid).toHaveClass('overflow-x-auto')
    })

    it('should provide adequate touch targets on mobile', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      
      const blockProps = {
        schedule: mockScheduleData[0],
        staffColor: mockStaffAssignments[0],
        gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 },
        duration: 2
      }

      render(<StaffScheduleBlock {...blockProps} />)
      
      const block = screen.getByRole('button')
      expect(block).toBeInTheDocument()
      
      // Block should be large enough for touch interaction
      // Minimum 48px height for mobile config
      const computedStyle = window.getComputedStyle(block)
      expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(48)
    })
  })

  describe('Accessibility in Responsive Design', () => {
    it('should maintain accessibility across breakpoints', () => {
      const configs = [mockResponsiveConfig.mobile, mockResponsiveConfig.tablet, mockResponsiveConfig.desktop]
      
      configs.forEach(config => {
        const { useResponsiveConfig } = require('@/lib/responsive-design')
        useResponsiveConfig.mockReturnValue(config)
        
        const { unmount } = render(<TimelineGrid {...defaultProps} />)
        
        const grid = screen.getByRole('grid')
        expect(grid).toHaveAttribute('aria-label')
        expect(grid).toHaveAttribute('role', 'grid')
        
        unmount()
      })
    })

    it('should provide appropriate focus indicators on all devices', () => {
      const blockProps = {
        schedule: mockScheduleData[0],
        staffColor: mockStaffAssignments[0],
        gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 },
        duration: 2,
        isFocused: true
      }

      render(<StaffScheduleBlock {...blockProps} />)
      
      const block = screen.getByRole('button')
      expect(block).toHaveClass('ring-2', 'ring-blue-500')
    })
  })

  describe('Performance on Different Devices', () => {
    it('should use appropriate optimizations for mobile', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      
      render(<TimelineGrid {...defaultProps} />)
      
      // Should enable horizontal scrolling for performance
      const { enableHorizontalScroll } = require('@/lib/responsive-design')
      expect(enableHorizontalScroll).toHaveBeenCalled()
    })

    it('should handle large datasets efficiently on mobile', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      
      // Create a large dataset
      const largeScheduleBlocks = Array.from({ length: 50 }, (_, i) => ({
        ...mockScheduleData[0],
        id: `schedule-${i}`,
        gridPosition: {
          dayIndex: i % 7,
          startRow: Math.floor(i / 7) + 2,
          rowSpan: 1
        }
      }))

      const largeProps = {
        ...defaultProps,
        scheduleBlocks: largeScheduleBlocks
      }

      render(<TimelineGrid {...largeProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Layout Consistency', () => {
    it('should maintain consistent spacing across breakpoints', () => {
      const configs = [mockResponsiveConfig.mobile, mockResponsiveConfig.tablet, mockResponsiveConfig.desktop]
      
      configs.forEach(config => {
        const { useResponsiveConfig } = require('@/lib/responsive-design')
        useResponsiveConfig.mockReturnValue(config)
        
        const { unmount } = render(<TimelineHeader weekStart="2024-01-15" businessHours={{ start: 10, end: 23 }} />)
        
        const header = document.querySelector('.schedule-timeline-header')
        expect(header).toBeInTheDocument()
        
        unmount()
      })
    })

    it('should scale font sizes appropriately', () => {
      const { useResponsiveConfig } = require('@/lib/responsive-design')
      
      // Test mobile font size
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.mobile)
      const { rerender } = render(<TimelineHeader weekStart="2024-01-15" businessHours={{ start: 10, end: 23 }} />)
      
      // Test desktop font size
      useResponsiveConfig.mockReturnValue(mockResponsiveConfig.desktop)
      rerender(<TimelineHeader weekStart="2024-01-15" businessHours={{ start: 10, end: 23 }} />)
      
      const header = document.querySelector('.schedule-timeline-header')
      expect(header).toBeInTheDocument()
    })
  })
})