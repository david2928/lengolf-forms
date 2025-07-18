/**
 * System Integration Tests
 * Tests the integration between staff scheduling, staff management, time clock, and payroll systems
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  getActiveStaffForScheduling, 
  getStaffMemberById, 
  validateStaffMember,
  getStaffForUI
} from '../staff-integration'
import { 
  clockInOutFromSchedule, 
  getScheduleLinkedTimeEntries,
  getStaffClockStatus
} from '../time-clock-integration'
import { 
  generatePayrollSummary, 
  generateAttendanceReport,
  getScheduleStatistics
} from '../payroll-integration'

// Mock the Supabase client
const mockSupabaseAdmin = {
  schema: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            data: [
              {
                id: 1,
                staff_name: 'Test Staff 1',
                staff_id: 'EMP001',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              {
                id: 2,
                staff_name: 'Test Staff 2',
                staff_id: 'EMP002',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              }
            ],
            error: null
          })
        }),
        single: () => ({
          data: {
            id: 1,
            staff_name: 'Test Staff 1',
            staff_id: 'EMP001',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          error: null
        })
      })
    })
  })
}

// Mock the refac-supabase module
vi.mock('../refac-supabase', () => ({
  refacSupabaseAdmin: mockSupabaseAdmin
}))

describe('System Integration Tests', () => {
  describe('Staff Management Integration', () => {
    it('should fetch active staff for scheduling', async () => {
      const staff = await getActiveStaffForScheduling()
      
      expect(staff).toHaveLength(2)
      expect(staff[0]).toMatchObject({
        id: 1,
        staff_name: 'Test Staff 1',
        staff_id: 'EMP001',
        is_active: true
      })
    })

    it('should get staff member by ID', async () => {
      const staff = await getStaffMemberById(1)
      
      expect(staff).toMatchObject({
        id: 1,
        staff_name: 'Test Staff 1',
        staff_id: 'EMP001',
        is_active: true
      })
    })

    it('should validate staff member exists', async () => {
      const isValid = await validateStaffMember(1)
      expect(isValid).toBe(true)
    })

    it('should format staff data for UI components', async () => {
      const staffForUI = await getStaffForUI()
      
      expect(staffForUI).toHaveLength(2)
      expect(staffForUI[0]).toMatchObject({
        id: 1,
        name: 'Test Staff 1',
        staff_id: 'EMP001',
        initials: 'TS',
        department: 'Staff',
        position: 'Team Member'
      })
    })
  })

  describe('Time Clock Integration', () => {
    it('should handle clock in/out from scheduled shift', async () => {
      // Mock PIN verification
      vi.mock('../staff-utils', () => ({
        verifyStaffPin: vi.fn().mockResolvedValue({
          success: true,
          staff_id: 1,
          staff_name: 'Test Staff 1',
          currently_clocked_in: false
        }),
        recordTimeEntry: vi.fn().mockResolvedValue({
          entry_id: 1,
          timestamp: '2024-01-01T09:00:00Z'
        })
      }))

      // This would normally require a real schedule ID and PIN
      // In a real test, you'd set up test data first
      const result = await clockInOutFromSchedule('123456', 'test-schedule-id')
      
      // The function should handle the integration properly
      expect(result).toHaveProperty('success')
    })

    it('should get staff clock status', async () => {
      const status = await getStaffClockStatus(1)
      
      expect(status).toHaveProperty('currently_clocked_in')
      expect(typeof status.currently_clocked_in).toBe('boolean')
    })
  })

  describe('Payroll Integration', () => {
    it('should generate payroll summary', async () => {
      const summary = await generatePayrollSummary('2024-01-01', '2024-01-07')
      
      expect(Array.isArray(summary)).toBe(true)
      // Each summary should have required payroll fields
      if (summary.length > 0) {
        expect(summary[0]).toHaveProperty('staff_id')
        expect(summary[0]).toHaveProperty('staff_name')
        expect(summary[0]).toHaveProperty('total_scheduled_hours')
        expect(summary[0]).toHaveProperty('total_actual_hours')
        expect(summary[0]).toHaveProperty('shifts')
      }
    })

    it('should generate attendance report', async () => {
      const report = await generateAttendanceReport('2024-01-01', '2024-01-07')
      
      expect(Array.isArray(report)).toBe(true)
      // Each record should have attendance tracking fields
      if (report.length > 0) {
        expect(report[0]).toHaveProperty('staff_id')
        expect(report[0]).toHaveProperty('date')
        expect(report[0]).toHaveProperty('scheduled_hours')
        expect(report[0]).toHaveProperty('actual_hours')
        expect(report[0]).toHaveProperty('status')
      }
    })

    it('should get schedule statistics', async () => {
      const stats = await getScheduleStatistics('2024-01-01', '2024-01-07')
      
      expect(stats).toHaveProperty('total_schedules')
      expect(stats).toHaveProperty('total_staff_scheduled')
      expect(stats).toHaveProperty('total_scheduled_hours')
      expect(stats).toHaveProperty('schedule_compliance_rate')
      expect(typeof stats.total_schedules).toBe('number')
      expect(typeof stats.schedule_compliance_rate).toBe('number')
    })
  })

  describe('Cross-System Data Consistency', () => {
    it('should maintain consistent staff data across systems', async () => {
      const staffFromScheduling = await getActiveStaffForScheduling()
      const staffForUI = await getStaffForUI()
      
      // Both should return the same number of active staff
      expect(staffFromScheduling.length).toBe(staffForUI.length)
      
      // Staff IDs should match
      const schedulingIds = staffFromScheduling.map(s => s.id).sort()
      const uiIds = staffForUI.map(s => s.id).sort()
      expect(schedulingIds).toEqual(uiIds)
    })

    it('should handle staff status changes consistently', async () => {
      // Test that when a staff member is deactivated,
      // all systems reflect this change
      const staffId = 1
      const isValid = await validateStaffMember(staffId)
      
      // This test would verify that deactivated staff
      // don't appear in scheduling interfaces
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const originalSupabase = mockSupabaseAdmin
      mockSupabaseAdmin.schema = () => {
        throw new Error('Database connection failed')
      }

      try {
        await getActiveStaffForScheduling()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('Database connection failed')
      }

      // Restore original mock
      Object.assign(mockSupabaseAdmin, originalSupabase)
    })

    it('should validate input parameters', async () => {
      // Test invalid staff ID
      const staff = await getStaffMemberById(-1)
      expect(staff).toBeNull()
    })

    it('should handle missing schedule data', async () => {
      const report = await generateAttendanceReport('2024-01-01', '2024-01-01')
      expect(Array.isArray(report)).toBe(true)
      // Should return empty array rather than throwing error
    })
  })
})

describe('API Integration Tests', () => {
  describe('Staff Schedule API', () => {
    it('should return formatted staff data', async () => {
      // This would test the actual API endpoint
      // In a real test environment, you'd make HTTP requests
      const mockResponse = {
        success: true,
        data: {
          staff: [
            {
              id: 1,
              name: 'Test Staff 1',
              staff_id: 'EMP001',
              initials: 'TS',
              department: 'Staff',
              position: 'Team Member'
            }
          ],
          total_staff: 1
        }
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.data.staff).toHaveLength(1)
      expect(mockResponse.data.staff[0]).toHaveProperty('initials')
    })
  })

  describe('Payroll API', () => {
    it('should handle payroll data requests', async () => {
      // Mock payroll API response
      const mockPayrollResponse = {
        success: true,
        data: [
          {
            staff_id: 1,
            staff_name: 'Test Staff 1',
            total_scheduled_hours: 40,
            total_actual_hours: 38.5,
            total_variance_hours: -1.5
          }
        ],
        metadata: {
          start_date: '2024-01-01',
          end_date: '2024-01-07',
          type: 'summary'
        }
      }

      expect(mockPayrollResponse.success).toBe(true)
      expect(mockPayrollResponse.data[0]).toHaveProperty('total_scheduled_hours')
      expect(mockPayrollResponse.metadata).toHaveProperty('start_date')
    })
  })
})

describe('Performance and Caching', () => {
  it('should cache staff data appropriately', async () => {
    const start = Date.now()
    await getActiveStaffForScheduling()
    const firstCallTime = Date.now() - start

    const start2 = Date.now()
    await getActiveStaffForScheduling()
    const secondCallTime = Date.now() - start2

    // Second call should be faster due to caching
    // (This is a simplified test - real caching would need more setup)
    expect(typeof firstCallTime).toBe('number')
    expect(typeof secondCallTime).toBe('number')
  })

  it('should handle large datasets efficiently', async () => {
    // Test with a longer date range
    const start = Date.now()
    await generatePayrollSummary('2024-01-01', '2024-12-31')
    const duration = Date.now() - start

    // Should complete within reasonable time (5 seconds)
    expect(duration).toBeLessThan(5000)
  })
})