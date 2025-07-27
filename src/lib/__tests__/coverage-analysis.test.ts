import { calculateDayCoverageGaps, formatCoverageGap, hasSignificantGaps } from '../coverage-analysis'

describe('Coverage Analysis', () => {
  describe('calculateDayCoverageGaps', () => {
    it('should identify full day gap when no schedules exist', () => {
      const result = calculateDayCoverageGaps([])
      
      expect(result.hasSchedules).toBe(false)
      expect(result.coverageGaps).toHaveLength(1)
      expect(result.coverageGaps[0]).toEqual({
        start: '10:00',
        end: '23:00',
        duration: 780 // 13 hours in minutes
      })
      expect(result.coveragePercentage).toBe(0)
    })

    it('should calculate no gaps for full coverage', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '10:00:00',
          end_time: '23:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.hasSchedules).toBe(true)
      expect(result.coverageGaps).toHaveLength(0)
      expect(result.coveragePercentage).toBe(100)
      expect(result.totalCoverageMinutes).toBe(780)
    })

    it('should identify gap at beginning of day', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '12:00:00',
          end_time: '23:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.coverageGaps).toHaveLength(1)
      expect(result.coverageGaps[0]).toEqual({
        start: '10:00',
        end: '12:00',
        duration: 120 // 2 hours
      })
      expect(result.coveragePercentage).toBe(85) // 11/13 hours covered
    })

    it('should identify gap at end of day', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '10:00:00',
          end_time: '20:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.coverageGaps).toHaveLength(1)
      expect(result.coverageGaps[0]).toEqual({
        start: '20:00',
        end: '23:00',
        duration: 180 // 3 hours
      })
      expect(result.coveragePercentage).toBe(77) // 10/13 hours covered
    })

    it('should identify gap between shifts', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '10:00:00',
          end_time: '14:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        },
        {
          schedule_date: '2025-01-15',
          start_time: '16:00:00',
          end_time: '23:00:00',
          staff_id: 2,
          staff_name: 'Jane Smith'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.coverageGaps).toHaveLength(1)
      expect(result.coverageGaps[0]).toEqual({
        start: '14:00',
        end: '16:00',
        duration: 120 // 2 hours
      })
      expect(result.coveragePercentage).toBe(85) // 11/13 hours covered
    })

    it('should merge overlapping shifts', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '10:00:00',
          end_time: '15:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        },
        {
          schedule_date: '2025-01-15',
          start_time: '14:00:00',
          end_time: '23:00:00',
          staff_id: 2,
          staff_name: 'Jane Smith'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.coverageGaps).toHaveLength(0)
      expect(result.coveragePercentage).toBe(100)
    })

    it('should handle shifts outside business hours', () => {
      const schedules = [
        {
          schedule_date: '2025-01-15',
          start_time: '08:00:00',
          end_time: '12:00:00',
          staff_id: 1,
          staff_name: 'John Doe'
        },
        {
          schedule_date: '2025-01-15',
          start_time: '20:00:00',
          end_time: '23:30:00', // Within same day
          staff_id: 2,
          staff_name: 'Jane Smith'
        }
      ]
      
      const result = calculateDayCoverageGaps(schedules)
      
      expect(result.coverageGaps).toHaveLength(1)
      expect(result.coverageGaps[0]).toEqual({
        start: '12:00',
        end: '20:00',
        duration: 480 // 8 hours
      })
      // Only counts coverage within business hours (10-12 and 20-23)
      expect(result.totalCoverageMinutes).toBe(300) // 2 + 3 hours
    })
  })

  describe('formatCoverageGap', () => {
    it('should format time gaps correctly', () => {
      const gap = {
        start: '10:00',
        end: '14:30',
        duration: 270
      }
      
      expect(formatCoverageGap(gap)).toBe('10:00AM - 2:30PM')
    })

    it('should handle midnight and noon correctly', () => {
      const gap1 = {
        start: '00:00',
        end: '12:00',
        duration: 720
      }
      
      const gap2 = {
        start: '12:00',
        end: '23:59',
        duration: 719
      }
      
      expect(formatCoverageGap(gap1)).toBe('12:00AM - 12:00PM')
      expect(formatCoverageGap(gap2)).toBe('12:00PM - 11:59PM')
    })
  })

  describe('hasSignificantGaps', () => {
    it('should identify significant gaps (>2 hours)', () => {
      const coverage = {
        date: '2025-01-15',
        hasSchedules: true,
        coverageGaps: [
          { start: '10:00', end: '13:00', duration: 180 } // 3 hours
        ],
        totalCoverageMinutes: 600,
        requiredCoverageMinutes: 780,
        coveragePercentage: 77
      }
      
      expect(hasSignificantGaps(coverage)).toBe(true)
    })

    it('should not flag minor gaps (<=2 hours)', () => {
      const coverage = {
        date: '2025-01-15',
        hasSchedules: true,
        coverageGaps: [
          { start: '14:00', end: '16:00', duration: 120 } // 2 hours
        ],
        totalCoverageMinutes: 660,
        requiredCoverageMinutes: 780,
        coveragePercentage: 85
      }
      
      expect(hasSignificantGaps(coverage)).toBe(false)
    })

    it('should handle multiple small gaps that sum to significant', () => {
      const coverage = {
        date: '2025-01-15',
        hasSchedules: true,
        coverageGaps: [
          { start: '10:00', end: '11:00', duration: 60 },
          { start: '14:00', end: '15:00', duration: 60 },
          { start: '20:00', end: '21:00', duration: 60 }
        ],
        totalCoverageMinutes: 600,
        requiredCoverageMinutes: 780,
        coveragePercentage: 77
      }
      
      expect(hasSignificantGaps(coverage)).toBe(true)
    })
  })
})