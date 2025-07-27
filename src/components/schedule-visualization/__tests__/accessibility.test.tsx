/**
 * Accessibility tests for Schedule Visualization components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { TimelineGrid } from '../TimelineGrid'
import { StaffScheduleBlock } from '../StaffScheduleBlock'
import { TimelineHeader } from '../TimelineHeader'
import { mockScheduleData, mockStaffAssignments } from '@/lib/__mocks__/schedule-visualization-data'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock the performance monitoring
jest.mock('@/lib/visualization-performance', () => ({
  visualizationPerformance: {
    startTiming: jest.fn(() => jest.fn())
  },
  throttle: jest.fn((fn) => fn)
}))

// Mock the accessibility utilities
jest.mock('@/lib/schedule-accessibility', () => ({
  generateScheduleBlockAriaLabel: jest.fn((schedule) => 
    `${schedule.staffName} scheduled from ${schedule.startTime} to ${schedule.endTime}`
  ),
  generateGridCellAriaLabel: jest.fn((dayIndex, hourIndex) => 
    `Grid cell day ${dayIndex} hour ${hourIndex}`
  ),
  generateTimeSlotAriaLabel: jest.fn((hour) => `${hour} AM time slot`),
  getAccessibleTextColor: jest.fn(() => '#ffffff'),
  hasAccessibleContrast: jest.fn(() => true),
  prefersReducedMotion: jest.fn(() => false),
  createLiveRegionAnnouncement: jest.fn(() => 'Test announcement')
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

describe('Schedule Visualization Accessibility', () => {
  const defaultProps = {
    weekStart: '2024-01-15',
    businessHours: { start: 10, end: 23 },
    scheduleBlocks: mockScheduleData,
    staffAssignments: mockStaffAssignments
  }

  describe('TimelineGrid Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<TimelineGrid {...defaultProps} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels and roles', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      // Check main grid has proper role and label
      const grid = screen.getByRole('grid')
      expect(grid).toHaveAttribute('aria-label', 'Weekly staff schedule timeline')
      expect(grid).toHaveAttribute('aria-describedby', 'grid-instructions')
    })

    it('should have keyboard navigation instructions', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      const instructions = screen.getByText(/Use Tab to enter the schedule grid/)
      expect(instructions).toBeInTheDocument()
      expect(instructions).toHaveClass('sr-only')
    })

    it('should have live region for announcements', () => {
      render(<TimelineGrid {...defaultProps} />)
      
      const liveRegion = document.querySelector('[aria-live=\"polite\"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
      expect(liveRegion).toHaveClass('sr-only')
    })

    it('should be focusable and have focus styles', async () => {
      const user = userEvent.setup()
      render(<TimelineGrid {...defaultProps} />)
      
      const grid = screen.getByRole('grid')
      expect(grid).toHaveAttribute('tabIndex', '0')
      
      await user.tab()
      expect(grid).toHaveFocus()
    })\n\n    it('should have proper grid cell labels', () => {\n      render(<TimelineGrid {...defaultProps} />)\n      \n      const gridCells = screen.getAllByRole('gridcell')\n      expect(gridCells.length).toBeGreaterThan(0)\n      \n      // Check that cells have aria-labels\n      gridCells.forEach(cell => {\n        expect(cell).toHaveAttribute('aria-label')\n      })\n    })\n  })\n\n  describe('StaffScheduleBlock Accessibility', () => {\n    const blockProps = {\n      schedule: mockScheduleData[0],\n      staffColor: mockStaffAssignments[0],\n      gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 },\n      duration: 2\n    }\n\n    it('should have no accessibility violations', async () => {\n      const { container } = render(<StaffScheduleBlock {...blockProps} />)\n      const results = await axe(container)\n      expect(results).toHaveNoViolations()\n    })\n\n    it('should have proper ARIA labels and roles', () => {\n      render(<StaffScheduleBlock {...blockProps} />)\n      \n      const block = screen.getByRole('button')\n      expect(block).toHaveAttribute('aria-label')\n      expect(block).toHaveAttribute('aria-describedby')\n    })\n\n    it('should be keyboard accessible', async () => {\n      const user = userEvent.setup()\n      const onFocus = jest.fn()\n      const onKeyDown = jest.fn()\n      \n      render(\n        <StaffScheduleBlock \n          {...blockProps} \n          onFocus={onFocus}\n          onKeyDown={onKeyDown}\n        />\n      )\n      \n      const block = screen.getByRole('button')\n      \n      await user.tab()\n      expect(block).toHaveFocus()\n      expect(onFocus).toHaveBeenCalled()\n      \n      await user.keyboard('{Enter}')\n      expect(onKeyDown).toHaveBeenCalled()\n    })\n\n    it('should have accessible text colors', () => {\n      render(<StaffScheduleBlock {...blockProps} />)\n      \n      const staffNameTab = document.querySelector('.staff-name-tab')\n      expect(staffNameTab).toBeInTheDocument()\n      \n      // Should use accessible text color from mock\n      expect(staffNameTab).toHaveStyle({ color: '#ffffff' })\n    })\n\n    it('should have hidden details for screen readers', () => {\n      render(<StaffScheduleBlock {...blockProps} />)\n      \n      const details = document.getElementById(`schedule-block-details-${blockProps.schedule.id}`)\n      expect(details).toBeInTheDocument()\n      expect(details).toHaveClass('sr-only')\n      expect(details).toHaveTextContent(/Duration/)\n    })\n\n    it('should handle focus states properly', () => {\n      const { rerender } = render(<StaffScheduleBlock {...blockProps} isFocused={false} />)\n      \n      const block = screen.getByRole('button')\n      expect(block).not.toHaveClass('ring-2')\n      \n      rerender(<StaffScheduleBlock {...blockProps} isFocused={true} />)\n      expect(block).toHaveClass('ring-2')\n    })\n\n    it('should hide decorative elements from screen readers', () => {\n      const recurringSchedule = {\n        ...blockProps.schedule,\n        isRecurring: true\n      }\n      \n      render(\n        <StaffScheduleBlock \n          {...blockProps} \n          schedule={recurringSchedule}\n        />\n      )\n      \n      const staffNameTab = document.querySelector('.staff-name-tab')\n      const recurringIcon = document.querySelector('[title=\"Recurring schedule\"]')\n      \n      expect(staffNameTab).toHaveAttribute('aria-hidden', 'true')\n      expect(recurringIcon).toHaveAttribute('aria-hidden', 'true')\n    })\n  })\n\n  describe('TimelineHeader Accessibility', () => {\n    const headerProps = {\n      weekStart: '2024-01-15',\n      businessHours: { start: 10, end: 23 }\n    }\n\n    it('should have no accessibility violations', async () => {\n      const { container } = render(<TimelineHeader {...headerProps} />)\n      const results = await axe(container)\n      expect(results).toHaveNoViolations()\n    })\n\n    it('should have proper column headers', () => {\n      render(<TimelineHeader {...headerProps} />)\n      \n      const columnHeaders = screen.getAllByRole('columnheader')\n      expect(columnHeaders.length).toBe(7) // 7 days\n      \n      columnHeaders.forEach(header => {\n        expect(header).toHaveAttribute('aria-label')\n        expect(header).toHaveAttribute('id')\n      })\n    })\n\n    it('should use semantic time elements', () => {\n      render(<TimelineHeader {...headerProps} />)\n      \n      const timeElements = document.querySelectorAll('time')\n      expect(timeElements.length).toBeGreaterThan(0)\n      \n      timeElements.forEach(timeEl => {\n        expect(timeEl).toHaveAttribute('dateTime')\n      })\n    })\n\n    it('should have proper abbreviations for day names', () => {\n      render(<TimelineHeader {...headerProps} />)\n      \n      const abbreviations = document.querySelectorAll('abbr')\n      expect(abbreviations.length).toBe(7) // 7 days\n      \n      abbreviations.forEach(abbr => {\n        expect(abbr).toHaveAttribute('title')\n        expect(abbr).toHaveAttribute('aria-label')\n      })\n    })\n  })\n\n  describe('Keyboard Navigation', () => {\n    it('should support arrow key navigation', async () => {\n      const user = userEvent.setup()\n      render(<TimelineGrid {...defaultProps} />)\n      \n      const grid = screen.getByRole('grid')\n      await user.click(grid)\n      \n      // Test arrow key navigation\n      await user.keyboard('{ArrowRight}')\n      await user.keyboard('{ArrowDown}')\n      await user.keyboard('{ArrowLeft}')\n      await user.keyboard('{ArrowUp}')\n      \n      // Should not throw errors\n      expect(grid).toBeInTheDocument()\n    })\n\n    it('should support Enter and Space for selection', async () => {\n      const user = userEvent.setup()\n      render(<TimelineGrid {...defaultProps} />)\n      \n      const grid = screen.getByRole('grid')\n      await user.click(grid)\n      \n      await user.keyboard('{Enter}')\n      await user.keyboard(' ')\n      \n      // Should not throw errors\n      expect(grid).toBeInTheDocument()\n    })\n\n    it('should support Escape to exit navigation', async () => {\n      const user = userEvent.setup()\n      render(<TimelineGrid {...defaultProps} />)\n      \n      const grid = screen.getByRole('grid')\n      await user.click(grid)\n      \n      await user.keyboard('{Escape}')\n      \n      // Should not throw errors\n      expect(grid).toBeInTheDocument()\n    })\n  })\n\n  describe('Screen Reader Support', () => {\n    it('should provide meaningful labels for all interactive elements', () => {\n      render(<TimelineGrid {...defaultProps} />)\n      \n      // Check that all buttons have labels\n      const buttons = screen.getAllByRole('button')\n      buttons.forEach(button => {\n        expect(button).toHaveAttribute('aria-label')\n      })\n      \n      // Check that all grid cells have labels\n      const gridCells = screen.getAllByRole('gridcell')\n      gridCells.forEach(cell => {\n        expect(cell).toHaveAttribute('aria-label')\n      })\n    })\n\n    it('should have proper heading structure', () => {\n      render(<TimelineGrid {...defaultProps} />)\n      \n      // Should have column and row headers\n      const columnHeaders = screen.getAllByRole('columnheader')\n      const rowHeaders = screen.getAllByRole('rowheader')\n      \n      expect(columnHeaders.length).toBeGreaterThan(0)\n      expect(rowHeaders.length).toBeGreaterThan(0)\n    })\n\n    it('should provide context through aria-describedby', () => {\n      render(<TimelineGrid {...defaultProps} />)\n      \n      const grid = screen.getByRole('grid')\n      expect(grid).toHaveAttribute('aria-describedby', 'grid-instructions')\n      \n      const instructions = document.getElementById('grid-instructions')\n      expect(instructions).toBeInTheDocument()\n    })\n  })\n\n  describe('High Contrast Mode', () => {\n    it('should maintain visibility in high contrast mode', () => {\n      // Mock high contrast mode\n      Object.defineProperty(window, 'matchMedia', {\n        writable: true,\n        value: jest.fn().mockImplementation(query => ({\n          matches: query === '(prefers-contrast: high)',\n          media: query,\n          onchange: null,\n          addListener: jest.fn(),\n          removeListener: jest.fn(),\n          addEventListener: jest.fn(),\n          removeEventListener: jest.fn(),\n          dispatchEvent: jest.fn(),\n        })),\n      })\n      \n      render(<TimelineGrid {...defaultProps} />)\n      \n      // Should render without errors in high contrast mode\n      const grid = screen.getByRole('grid')\n      expect(grid).toBeInTheDocument()\n    })\n  })\n\n  describe('Reduced Motion', () => {\n    it('should respect reduced motion preferences', () => {\n      // Mock reduced motion preference\n      Object.defineProperty(window, 'matchMedia', {\n        writable: true,\n        value: jest.fn().mockImplementation(query => ({\n          matches: query === '(prefers-reduced-motion: reduce)',\n          media: query,\n          onchange: null,\n          addListener: jest.fn(),\n          removeListener: jest.fn(),\n          addEventListener: jest.fn(),\n          removeEventListener: jest.fn(),\n          dispatchEvent: jest.fn(),\n        })),\n      })\n      \n      const blockProps = {\n        schedule: mockScheduleData[0],\n        staffColor: mockStaffAssignments[0],\n        gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 },\n        duration: 2\n      }\n      \n      render(<StaffScheduleBlock {...blockProps} />)\n      \n      const block = screen.getByRole('button')\n      expect(block).toHaveClass('transition-none')\n    })\n  })\n})"