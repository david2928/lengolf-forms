/**
 * Integration tests for coverage gap functionality
 */

import { calculateDayCoverageGaps } from '@/lib/coverage-analysis'

describe('Coverage Gap Integration', () => {
  it('should calculate coverage gaps for realistic schedule data', () => {
    // Simulate a typical day with some gaps
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
        start_time: '15:00:00',
        end_time: '19:00:00',
        staff_id: 2,
        staff_name: 'Jane Smith'
      },
      {
        schedule_date: '2025-01-15',
        start_time: '20:00:00',
        end_time: '23:00:00',
        staff_id: 3,
        staff_name: 'Bob Johnson'
      }
    ]

    const result = calculateDayCoverageGaps(schedules)

    // Should have gaps: 14:00-15:00 and 19:00-20:00
    expect(result.coverageGaps).toHaveLength(2)
    expect(result.coverageGaps[0]).toEqual({
      start: '14:00',
      end: '15:00',
      duration: 60
    })
    expect(result.coverageGaps[1]).toEqual({
      start: '19:00',
      end: '20:00',
      duration: 60
    })

    // Coverage: 4 + 4 + 3 = 11 hours out of 13
    expect(result.coveragePercentage).toBe(85)
  })

  it('should handle day with no coverage', () => {
    const result = calculateDayCoverageGaps([])

    expect(result.hasSchedules).toBe(false)
    expect(result.coverageGaps).toHaveLength(1)
    expect(result.coverageGaps[0]).toEqual({
      start: '10:00',
      end: '23:00',
      duration: 780
    })
    expect(result.coveragePercentage).toBe(0)
  })

  it('should handle perfect coverage', () => {
    const schedules = [
      {
        schedule_date: '2025-01-15',
        start_time: '10:00:00',
        end_time: '16:00:00',
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

    expect(result.hasSchedules).toBe(true)
    expect(result.coverageGaps).toHaveLength(0)
    expect(result.coveragePercentage).toBe(100)
    expect(result.totalCoverageMinutes).toBe(780)
  })
})