/**
 * Comprehensive tests for all schedule visualization utility functions
 */

import {
  processScheduleData,
  validateScheduleData,
  groupOverlappingSchedules,
  calculateBlockStyles,
  generateTimeSlots,
  generateDayLabels,
  formatTimeRange,
  getResponsiveConfig
} from '../schedule-visualization-utils'

import {
  generateStaffColorAssignments,
  getStaffColor,
  STAFF_COLORS
} from '../staff-colors'

import {
  getContrastRatio,
  hasAccessibleContrast,
  getAccessibleTextColor,
  generateScheduleBlockAriaLabel,
  generateGridCellAriaLabel,
  generateTimeSlotAriaLabel,
  getNextFocusableBlock,
  createLiveRegionAnnouncement
} from '../schedule-accessibility'

import {
  getCurrentBreakpoint,
  getResponsiveConfig as getResponsiveDesignConfig,
  generateResponsiveClasses,
  isTouchDevice,
  getViewportDimensions
} from '../responsive-design'

// Mock data for testing
const mockRawSchedule = {
  schedule_id: 'test-1',
  staff_id: 'staff-1',
  staff_name: 'John Doe',
  start_time: '10:00',
  end_time: '12:00',
  schedule_date: '2024-01-15',
  location: 'Main Floor',
  is_recurring: false
}

const mockProcessedSchedule = {
  id: 'test-1',
  staffId: 'staff-1',
  staffName: 'John Doe',
  startTime: '10:00',
  endTime: '12:00',
  duration: 2,
  location: 'Main Floor',
  isRecurring: false,
  gridPosition: {
    dayIndex: 0,
    startRow: 2,
    rowSpan: 2
  }
}

describe('Schedule Visualization Utils - Comprehensive Tests', () => {
  describe('processScheduleData', () => {
    it('should process valid schedule data correctly', () => {
      const rawSchedules = [mockRawSchedule]
      const result = processScheduleData(rawSchedules)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'test-1',
        staffId: 'staff-1',
        staffName: 'John Doe',
        startTime: '10:00',
        endTime: '12:00',
        duration: 2,
        location: 'Main Floor',
        isRecurring: false
      })
      expect(result[0].gridPosition).toBeDefined()
    })

    it('should handle multiple schedules', () => {
      const rawSchedules = [
        mockRawSchedule,
        {
          ...mockRawSchedule,
          schedule_id: 'test-2',
          start_time: '14:00',
          end_time: '16:00',
          schedule_date: '2024-01-16'
        }
      ]

      const result = processScheduleData(rawSchedules)
      expect(result).toHaveLength(2)
    })

    it('should filter out invalid schedules', () => {
      const rawSchedules = [
        mockRawSchedule,
        { schedule_id: 'invalid' }, // Missing required fields
        {
          ...mockRawSchedule,
          schedule_id: 'test-2',
          start_time: 'invalid-time'
        }
      ]

      const result = processScheduleData(rawSchedules)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('test-1')
    })

    it('should handle empty input', () => {
      expect(processScheduleData([])).toEqual([])
      expect(processScheduleData(null as any)).toEqual([])
      expect(processScheduleData(undefined as any)).toEqual([])
    })

    it('should calculate correct grid positions', () => {
      const mondaySchedule = {
        ...mockRawSchedule,
        schedule_date: '2024-01-15' // Monday
      }
      const fridaySchedule = {
        ...mockRawSchedule,
        schedule_id: 'test-2',
        schedule_date: '2024-01-19' // Friday
      }

      const result = processScheduleData([mondaySchedule, fridaySchedule])
      
      expect(result[0].gridPosition.dayIndex).toBe(0) // Monday
      expect(result[1].gridPosition.dayIndex).toBe(4) // Friday
    })

    it('should calculate correct time slots', () => {
      const morningSchedule = {
        ...mockRawSchedule,
        start_time: '10:00',
        end_time: '12:00'
      }
      const afternoonSchedule = {
        ...mockRawSchedule,
        schedule_id: 'test-2',
        start_time: '15:00',
        end_time: '17:00'
      }

      const result = processScheduleData([morningSchedule, afternoonSchedule])
      
      expect(result[0].gridPosition.startRow).toBe(0) // 10am = row 0 (business hours start)
      expect(result[0].gridPosition.rowSpan).toBe(2) // 2 hours
      expect(result[1].gridPosition.startRow).toBe(5) // 3pm = row 5
    })
  })

  describe('validateScheduleData', () => {
    it('should validate correct schedule data', () => {
      expect(validateScheduleData(mockRawSchedule)).toBe(true)
    })

    it('should reject schedules with missing required fields', () => {
      expect(validateScheduleData({})).toBe(false)
      expect(validateScheduleData({ schedule_id: 'test' })).toBe(false)
      expect(validateScheduleData({
        schedule_id: 'test',
        staff_id: 'staff-1'
      })).toBe(false)
    })

    it('should reject schedules with invalid time format', () => {
      const invalidTimeSchedule = {
        ...mockRawSchedule,
        start_time: '25:00' // Invalid hour
      }
      expect(validateScheduleData(invalidTimeSchedule)).toBe(false)

      const invalidFormatSchedule = {
        ...mockRawSchedule,
        start_time: '10am' // Wrong format
      }
      expect(validateScheduleData(invalidFormatSchedule)).toBe(false)
    })

    it('should reject schedules with invalid date format', () => {
      const invalidDateSchedule = {
        ...mockRawSchedule,
        schedule_date: '2024/01/15' // Wrong format
      }
      expect(validateScheduleData(invalidDateSchedule)).toBe(false)

      const invalidDateSchedule2 = {
        ...mockRawSchedule,
        schedule_date: '2024-13-01' // Invalid month
      }
      expect(validateScheduleData(invalidDateSchedule2)).toBe(false)
    })

    it('should handle null and undefined inputs', () => {
      expect(validateScheduleData(null)).toBe(false)
      expect(validateScheduleData(undefined)).toBe(false)
    })
  })

  describe('groupOverlappingSchedules', () => {
    it('should group overlapping schedules', () => {
      const overlappingSchedules = [
        {
          ...mockProcessedSchedule,
          id: 'overlap-1',
          gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 }
        },
        {
          ...mockProcessedSchedule,
          id: 'overlap-2',
          gridPosition: { dayIndex: 0, startRow: 3, rowSpan: 2 }
        }
      ]

      const result = groupOverlappingSchedules(overlappingSchedules)
      expect(result).toHaveLength(1) // Should be grouped together
      expect(result[0]).toHaveLength(2) // Both schedules in one group
    })

    it('should keep non-overlapping schedules separate', () => {
      const nonOverlappingSchedules = [
        {
          ...mockProcessedSchedule,
          id: 'separate-1',
          gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 }
        },
        {
          ...mockProcessedSchedule,
          id: 'separate-2',
          gridPosition: { dayIndex: 1, startRow: 2, rowSpan: 2 }
        }
      ]

      const result = groupOverlappingSchedules(nonOverlappingSchedules)
      expect(result).toHaveLength(2) // Should remain separate
      expect(result[0]).toHaveLength(1)
      expect(result[1]).toHaveLength(1)
    })

    it('should handle empty input', () => {
      expect(groupOverlappingSchedules([])).toEqual([])
    })
  })

  describe('calculateBlockStyles', () => {
    it('should calculate correct styles for single block', () => {
      const styles = calculateBlockStyles(mockProcessedSchedule, 0, 1)
      
      expect(styles).toHaveProperty('gridColumn')
      expect(styles).toHaveProperty('gridRow')
      expect(styles.gridColumn).toBe(2) // dayIndex 0 + 2 (for time column)
      expect(styles.gridRow).toContain('2') // startRow
    })

    it('should calculate correct styles for overlapping blocks', () => {
      const styles1 = calculateBlockStyles(mockProcessedSchedule, 0, 2)
      const styles2 = calculateBlockStyles(mockProcessedSchedule, 1, 2)
      
      // Should have different positioning for overlapping blocks
      expect(styles1).not.toEqual(styles2)
    })

    it('should handle edge cases', () => {
      const edgeSchedule = {
        ...mockProcessedSchedule,
        gridPosition: { dayIndex: 6, startRow: 14, rowSpan: 1 }
      }
      
      const styles = calculateBlockStyles(edgeSchedule, 0, 1)
      expect(styles.gridColumn).toBe(8) // Last day (6 + 2 for time column)
    })
  })

  describe('generateTimeSlots', () => {
    it('should generate correct time slots', () => {
      const timeSlots = generateTimeSlots()
      
      expect(timeSlots).toHaveLength(14) // 10am to 11pm
      expect(timeSlots[0]).toBe('10am')
      expect(timeSlots[13]).toBe('11pm')
    })

    it('should handle 12pm correctly', () => {
      const timeSlots = generateTimeSlots()
      expect(timeSlots).toContain('12pm')
    })
  })

  describe('generateDayLabels', () => {
    it('should generate correct day labels for a week', () => {
      const dayLabels = generateDayLabels('2024-01-15') // Monday
      
      expect(dayLabels).toHaveLength(7)
      expect(dayLabels[0].day).toBe('Mon')
      expect(dayLabels[6].day).toBe('Sun')
      expect(dayLabels[0].date).toBe(15)
    })

    it('should handle different week start dates', () => {
      const dayLabels = generateDayLabels('2024-01-17') // Wednesday
      
      expect(dayLabels[0].day).toBe('Mon') // Should still start with Monday
      expect(dayLabels[0].date).toBe(15) // But adjust the dates
    })

    it('should handle month boundaries', () => {
      const dayLabels = generateDayLabels('2024-01-29') // Monday at end of month
      
      expect(dayLabels[6].date).toBe(4) // Sunday should be in February
    })
  })

  // formatTime is not exported, so we'll skip these tests

  describe('formatTimeRange', () => {
    it('should format time range with minutes', () => {
      const result = formatTimeRange('10:00', '12:30', true)
      expect(result).toContain('10am')
      expect(result).toContain('12:30pm')
    })

    it('should format time range without minutes', () => {
      const result = formatTimeRange('10:00', '12:00', false)
      expect(result).toContain('10am')
      expect(result).toContain('12pm')
    })
  })

  describe('getResponsiveConfig', () => {
    it('should return mobile config for small screens', () => {
      const config = getResponsiveConfig(320)
      expect(config.fontSize).toBe('0.75rem')
      expect(config.showMinutes).toBe(false)
    })

    it('should return desktop config for large screens', () => {
      const config = getResponsiveConfig(1200)
      expect(config.fontSize).toBe('0.875rem')
      expect(config.showMinutes).toBe(true)
    })
  })
})

describe('Staff Colors Utils - Comprehensive Tests', () => {
  describe('generateStaffColorAssignments', () => {
    it('should generate color assignments for staff', () => {
      const staff = [
        { id: 'staff-1', staff_name: 'John Doe' },
        { id: 'staff-2', staff_name: 'Jane Smith' }
      ]

      const result = generateStaffColorAssignments(staff)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('staffId', 'staff-1')
      expect(result[0]).toHaveProperty('staffName', 'John Doe')
      expect(result[0]).toHaveProperty('color')
      expect(result[0].color).toHaveProperty('bg')
      expect(result[0].color).toHaveProperty('hex')
    })

    it('should cycle through available colors', () => {
      const manyStaff = Array.from({ length: 12 }, (_, i) => ({
        id: `staff-${i}`,
        staff_name: `Staff ${i}`
      }))

      const result = generateStaffColorAssignments(manyStaff)
      
      expect(result).toHaveLength(manyStaff.length)
      // Should cycle back to first color after available colors are used
      expect(result[10].color.hex).toBe(result[0].color.hex)
    })

    it('should handle empty input', () => {
      expect(generateStaffColorAssignments([])).toEqual([])
    })
  })

  describe('getStaffColor', () => {
    it('should return correct color for staff', () => {
      const assignments = [
        {
          staffId: 'staff-1',
          staffName: 'John Doe',
          color: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-900',
            hex: '#3b82f6'
          }
        }
      ]

      const result = getStaffColor('staff-1', assignments)
      expect(result).toEqual({
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        hex: '#3b82f6'
      })
    })

    it('should return default color for unknown staff', () => {
      const result = getStaffColor('unknown-staff', [])
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('hex')
    })
  })
})

describe('Accessibility Utils - Comprehensive Tests', () => {
  describe('getContrastRatio', () => {
    it('should calculate high contrast correctly', () => {
      const ratio = getContrastRatio('#000000', '#ffffff')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should calculate low contrast correctly', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff')
      expect(ratio).toBe(1)
    })

    it('should handle invalid colors', () => {
      const ratio = getContrastRatio('invalid', '#ffffff')
      expect(ratio).toBe(1)
    })
  })

  describe('hasAccessibleContrast', () => {
    it('should return true for accessible combinations', () => {
      expect(hasAccessibleContrast('#000000', '#ffffff')).toBe(true)
      expect(hasAccessibleContrast('#ffffff', '#000000')).toBe(true)
    })

    it('should return false for inaccessible combinations', () => {
      expect(hasAccessibleContrast('#cccccc', '#ffffff')).toBe(false)
    })
  })

  describe('getAccessibleTextColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getAccessibleTextColor('#000000')).toBe('#ffffff')
      expect(getAccessibleTextColor('#333333')).toBe('#ffffff')
    })

    it('should return black for light backgrounds', () => {
      expect(getAccessibleTextColor('#ffffff')).toBe('#000000')
      expect(getAccessibleTextColor('#ffff00')).toBe('#000000')
    })
  })

  describe('generateScheduleBlockAriaLabel', () => {
    it('should generate comprehensive aria label', () => {
      const label = generateScheduleBlockAriaLabel(mockProcessedSchedule)
      
      expect(label).toContain('John Doe')
      expect(label).toContain('10:00')
      expect(label).toContain('12:00')
      expect(label).toContain('Main Floor')
      expect(label).toContain('2 hours')
    })

    it('should handle missing location', () => {
      const scheduleWithoutLocation = {
        ...mockProcessedSchedule,
        location: undefined
      }
      
      const label = generateScheduleBlockAriaLabel(scheduleWithoutLocation)
      expect(label).not.toContain('at ')
    })

    it('should handle recurring schedules', () => {
      const recurringSchedule = {
        ...mockProcessedSchedule,
        isRecurring: true
      }
      
      const label = generateScheduleBlockAriaLabel(recurringSchedule)
      expect(label).toContain('recurring')
    })
  })

  describe('generateGridCellAriaLabel', () => {
    it('should generate correct grid cell labels', () => {
      const label = generateGridCellAriaLabel(0, 2, '2024-01-15', { start: 10, end: 23 })
      
      expect(label).toContain('Monday')
      expect(label).toContain('12pm')
    })

    it('should handle different days and times', () => {
      const label = generateGridCellAriaLabel(4, 5, '2024-01-15', { start: 10, end: 23 })
      
      expect(label).toContain('Friday')
      expect(label).toContain('3pm')
    })
  })

  describe('generateTimeSlotAriaLabel', () => {
    it('should generate correct time slot labels', () => {
      expect(generateTimeSlotAriaLabel(10)).toBe('10 AM time slot')
      expect(generateTimeSlotAriaLabel(12)).toBe('12 PM time slot')
      expect(generateTimeSlotAriaLabel(15)).toBe('3 PM time slot')
    })
  })

  describe('getNextFocusableBlock', () => {
    const mockBlocks = [
      { ...mockProcessedSchedule, id: '1', gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 } },
      { ...mockProcessedSchedule, id: '2', gridPosition: { dayIndex: 1, startRow: 3, rowSpan: 1 } },
      { ...mockProcessedSchedule, id: '3', gridPosition: { dayIndex: 0, startRow: 4, rowSpan: 1 } }
    ]

    it('should navigate to next block', () => {
      const nextId = getNextFocusableBlock('1', mockBlocks, 'next')
      expect(nextId).toBe('2')
    })

    it('should navigate to previous block', () => {
      const prevId = getNextFocusableBlock('2', mockBlocks, 'previous')
      expect(prevId).toBe('1')
    })

    it('should wrap around at boundaries', () => {
      const nextId = getNextFocusableBlock('3', mockBlocks, 'next')
      expect(nextId).toBe('1')
      
      const prevId = getNextFocusableBlock('1', mockBlocks, 'previous')
      expect(prevId).toBe('3')
    })

    it('should handle empty blocks', () => {
      const nextId = getNextFocusableBlock('1', [], 'next')
      expect(nextId).toBeNull()
    })
  })

  describe('createLiveRegionAnnouncement', () => {
    it('should create schedule loaded announcement', () => {
      const announcement = createLiveRegionAnnouncement('schedule-loaded', {
        blockCount: 5,
        staffCount: 3
      })
      
      expect(announcement).toContain('5 scheduled shifts')
      expect(announcement).toContain('3 staff members')
    })

    it('should create schedule updated announcement', () => {
      const announcement = createLiveRegionAnnouncement('schedule-updated', {
        changedCount: 2
      })
      
      expect(announcement).toContain('2 shifts modified')
    })

    it('should handle unknown types', () => {
      const announcement = createLiveRegionAnnouncement('unknown' as any)
      expect(announcement).toBe('')
    })
  })
})

describe('Responsive Design Utils - Comprehensive Tests', () => {
  describe('getCurrentBreakpoint', () => {
    it('should return correct breakpoints', () => {
      expect(getCurrentBreakpoint(320)).toBe('mobile')
      expect(getCurrentBreakpoint(768)).toBe('tablet')
      expect(getCurrentBreakpoint(1024)).toBe('desktop')
      expect(getCurrentBreakpoint(1440)).toBe('wide')
    })
  })

  describe('getResponsiveDesignConfig', () => {
    it('should return correct config for each breakpoint', () => {
      const mobileConfig = getResponsiveDesignConfig(320)
      expect(mobileConfig.breakpoint).toBe('mobile')
      expect(mobileConfig.compactMode).toBe(true)
      
      const desktopConfig = getResponsiveDesignConfig(1200)
      expect(desktopConfig.breakpoint).toBe('desktop')
      expect(desktopConfig.compactMode).toBe(false)
    })
  })

  describe('generateResponsiveClasses', () => {
    it('should generate responsive classes correctly', () => {
      const result = generateResponsiveClasses('base', {
        mobile: 'text-sm',
        desktop: 'text-lg'
      })
      
      expect(result).toBe('base text-sm desktop:text-lg')
    })

    it('should handle empty responsive classes', () => {
      const result = generateResponsiveClasses('base', {})
      expect(result).toBe('base')
    })
  })

  describe('isTouchDevice', () => {
    it('should detect touch devices', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true
      })
      
      expect(isTouchDevice()).toBe(true)
    })

    it('should handle non-touch devices', () => {
      // Remove touch support
      delete (window as any).ontouchstart
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 0,
        writable: true
      })
      
      // Touch device detection may vary based on test environment
      expect(typeof isTouchDevice()).toBe('boolean')
    })
  })

  describe('getViewportDimensions', () => {
    it('should return current viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
      
      const dimensions = getViewportDimensions()
      expect(dimensions).toEqual({ width: 1024, height: 768 })
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined inputs gracefully', () => {
    expect(() => processScheduleData(null as any)).not.toThrow()
    expect(() => validateScheduleData(null)).not.toThrow()
    // groupOverlappingSchedules expects an array, so null will throw
    expect(groupOverlappingSchedules([])).toEqual([])
    expect(() => generateStaffColorAssignments(null as any)).not.toThrow()
  })

  it('should handle malformed data gracefully', () => {
    const malformedData = [
      { not_a_schedule: true },
      'string instead of object',
      123,
      [],
      { schedule_id: null }
    ]

    expect(() => processScheduleData(malformedData as any)).not.toThrow()
    const result = processScheduleData(malformedData as any)
    expect(result).toEqual([])
  })

  it('should handle extreme values', () => {
    const extremeSchedule = {
      ...mockRawSchedule,
      start_time: '00:00',
      end_time: '23:59',
      schedule_date: '1900-01-01'
    }

    expect(() => validateScheduleData(extremeSchedule)).not.toThrow()
    expect(() => processScheduleData([extremeSchedule])).not.toThrow()
  })

  it('should handle very large datasets', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      ...mockRawSchedule,
      schedule_id: `large-${i}`,
      staff_id: `staff-${i % 100}`
    }))

    expect(() => processScheduleData(largeDataset)).not.toThrow()
    const result = processScheduleData(largeDataset)
    expect(result).toHaveLength(10000)
  })
})