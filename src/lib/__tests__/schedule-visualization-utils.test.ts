/**
 * Tests for Schedule Visualization Utilities
 */

import {
  calculateGridPosition,
  getDayIndex,
  generateTimeSlots,
  generateDayLabels,
  processScheduleData,
  groupOverlappingSchedules,
  calculateBlockStyles,
  validateScheduleData,
  getResponsiveConfig,
  formatTimeRange
} from '../schedule-visualization-utils'

describe('Schedule Visualization Utils', () => {
  describe('calculateGridPosition', () => {
    it('should calculate correct grid position for morning shift', () => {
      const schedule = {
        schedule_id: '1',
        staff_id: 1,
        staff_name: 'John Doe',
        schedule_date: '2024-01-15', // Monday
        start_time: '10:00',
        end_time: '14:00',
        location: null,
        notes: null,
        shift_color: '#06B6D4',
        duration_hours: 4
      }

      const position = calculateGridPosition(schedule)
      
      expect(position.dayIndex).toBe(0) // Monday
      expect(position.startRow).toBe(0) // 10am = row 0
      expect(position.endRow).toBe(4) // 2pm = row 4
      expect(position.rowSpan).toBe(4) // 4 hours
    })

    it('should handle partial hours correctly', () => {
      const schedule = {
        schedule_id: '2',
        staff_id: 2,
        staff_name: 'Jane Smith',
        schedule_date: '2024-01-16', // Tuesday
        start_time: '11:30',
        end_time: '15:30',
        location: null,
        notes: null,
        shift_color: '#F59E0B',
        duration_hours: 4
      }

      const position = calculateGridPosition(schedule)
      
      expect(position.dayIndex).toBe(1) // Tuesday
      expect(position.startRow).toBe(1) // 11am = row 1
      expect(position.rowSpan).toBe(5) // Should span 5 rows due to partial hours
    })
  })

  describe('getDayIndex', () => {
    it('should return correct day indices for week days', () => {
      expect(getDayIndex('2024-01-15')).toBe(0) // Monday
      expect(getDayIndex('2024-01-16')).toBe(1) // Tuesday
      expect(getDayIndex('2024-01-17')).toBe(2) // Wednesday
      expect(getDayIndex('2024-01-18')).toBe(3) // Thursday
      expect(getDayIndex('2024-01-19')).toBe(4) // Friday
      expect(getDayIndex('2024-01-20')).toBe(5) // Saturday
      expect(getDayIndex('2024-01-21')).toBe(6) // Sunday
    })
  })

  describe('generateTimeSlots', () => {
    it('should generate correct time slots for business hours', () => {
      const slots = generateTimeSlots()
      
      expect(slots).toHaveLength(14) // 10am to 11pm = 14 slots
      expect(slots[0]).toBe('10am')
      expect(slots[1]).toBe('11am')
      expect(slots[12]).toBe('10pm')
      expect(slots[13]).toBe('11pm')
    })
  })

  describe('generateDayLabels', () => {
    it('should generate correct day labels for a week', () => {
      const labels = generateDayLabels('2024-01-15') // Monday
      
      expect(labels).toHaveLength(7)
      expect(labels[0].day).toBe('Mon')
      expect(labels[0].date).toBe(15)
      expect(labels[6].day).toBe('Sun')
      expect(labels[6].date).toBe(21)
    })
  })

  describe('processScheduleData', () => {
    it('should process valid schedule data correctly', () => {
      const rawSchedules = [
        {
          schedule_id: '1',
          staff_id: 1,
          staff_name: 'John Doe',
          schedule_date: '2024-01-15',
          start_time: '10:00',
          end_time: '14:00',
          location: 'Main Office',
          notes: 'Regular shift',
          is_recurring: false
        }
      ]

      const processed = processScheduleData(rawSchedules)
      
      expect(processed).toHaveLength(1)
      expect(processed[0].id).toBe('1')
      expect(processed[0].staffName).toBe('John Doe')
      expect(processed[0].duration).toBe(4)
      expect(processed[0].gridPosition.dayIndex).toBe(0)
    })

    it('should filter out schedules outside business hours', () => {
      const rawSchedules = [
        {
          schedule_id: '1',
          staff_id: 1,
          staff_name: 'John Doe',
          schedule_date: '2024-01-15',
          start_time: '08:00', // Before business hours
          end_time: '12:00',
          location: null,
          notes: null
        },
        {
          schedule_id: '2',
          staff_id: 2,
          staff_name: 'Jane Smith',
          schedule_date: '2024-01-15',
          start_time: '10:00', // Within business hours
          end_time: '14:00',
          location: null,
          notes: null
        }
      ]

      const processed = processScheduleData(rawSchedules)
      
      expect(processed).toHaveLength(1)
      expect(processed[0].staffName).toBe('Jane Smith')
    })

    it('should handle empty or invalid input', () => {
      expect(processScheduleData([])).toEqual([])
      expect(processScheduleData(null as any)).toEqual([])
      expect(processScheduleData(undefined as any)).toEqual([])
    })
  })

  describe('validateScheduleData', () => {
    it('should validate correct schedule data', () => {
      const validSchedule = {
        staff_id: 1,
        staff_name: 'John Doe',
        start_time: '10:00',
        end_time: '14:00',
        schedule_date: '2024-01-15'
      }

      expect(validateScheduleData(validSchedule)).toBe(true)
    })

    it('should reject invalid schedule data', () => {
      expect(validateScheduleData(null)).toBe(false)
      expect(validateScheduleData({})).toBe(false)
      
      const invalidTime = {
        staff_id: 1,
        staff_name: 'John Doe',
        start_time: '25:00', // Invalid time
        end_time: '14:00',
        schedule_date: '2024-01-15'
      }
      expect(validateScheduleData(invalidTime)).toBe(false)
      
      const invalidDate = {
        staff_id: 1,
        staff_name: 'John Doe',
        start_time: '10:00',
        end_time: '14:00',
        schedule_date: '2024-13-45' // Invalid date
      }
      expect(validateScheduleData(invalidDate)).toBe(false)
    })
  })

  describe('getResponsiveConfig', () => {
    it('should return mobile config for small screens', () => {
      const config = getResponsiveConfig(500)
      expect(config.timeSlotHeight).toBe(40)
      expect(config.showMinutes).toBe(false)
    })

    it('should return tablet config for medium screens', () => {
      const config = getResponsiveConfig(800)
      expect(config.timeSlotHeight).toBe(50)
      expect(config.showMinutes).toBe(true)
    })

    it('should return desktop config for large screens', () => {
      const config = getResponsiveConfig(1200)
      expect(config.timeSlotHeight).toBe(60)
      expect(config.showMinutes).toBe(true)
    })
  })

  describe('formatTimeRange', () => {
    it('should format time range with minutes', () => {
      const result = formatTimeRange('10:30', '14:45', true)
      expect(result).toBe('10:30am - 2:45pm')
    })

    it('should format time range without minutes for mobile', () => {
      const result = formatTimeRange('10:00', '14:00', false)
      expect(result).toBe('10am-2pm')
    })
  })

  describe('calculateBlockStyles', () => {
    it('should calculate correct CSS styles for single block', () => {
      const schedule = {
        id: '1',
        staffId: 1,
        staffName: 'John Doe',
        startTime: '10:00',
        endTime: '14:00',
        date: '2024-01-15',
        gridPosition: {
          dayIndex: 0,
          startRow: 0,
          endRow: 4,
          rowSpan: 4
        },
        duration: 4,
        originalSchedule: {} as any
      }

      const styles = calculateBlockStyles(schedule)
      
      expect(styles.gridColumn).toBe(2) // dayIndex 0 + 2
      expect(styles.gridRow).toBe('2 / span 4') // startRow 0 + 2, span 4
      expect(styles.width).toBe('100%')
      expect(styles.position).toBe('static')
    })

    it('should calculate correct styles for overlapping blocks', () => {
      const schedule = {
        id: '1',
        staffId: 1,
        staffName: 'John Doe',
        startTime: '10:00',
        endTime: '14:00',
        date: '2024-01-15',
        gridPosition: {
          dayIndex: 0,
          startRow: 0,
          endRow: 4,
          rowSpan: 4
        },
        duration: 4,
        originalSchedule: {} as any
      }

      const styles = calculateBlockStyles(schedule, 1, 3) // Second of 3 overlapping blocks
      
      expect(styles.width).toBe('33.333333333333336%') // 100% / 3
      expect(styles.left).toBe('33.333333333333336%') // (1 * 100%) / 3
      expect(styles.position).toBe('relative')
      expect(styles.zIndex).toBe(2) // overlapIndex 1 + 1
    })
  })
})