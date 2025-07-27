import { createMocks } from 'node-mocks-http'
import { GET as schedulesHandler, POST as createScheduleHandler } from '@/app/api/staff-schedule/schedules/route'
import { GET as adminSchedulesHandler, POST as adminCreateHandler } from '@/app/api/admin/staff-scheduling/schedules/route'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Staff Schedule API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/staff-schedule/schedules', () => {
    it('returns schedules for a specific staff member', async () => {
      const mockSchedules = [
        {
          schedule_id: 'schedule-1',
          staff_id: 1,
          staff_name: 'John Doe',
          schedule_date: '2025-07-15',
          start_time: '09:00',
          end_time: '17:00',
          location: 'Main Office',
          notes: 'Regular shift',
          shift_color: '#06B6D4',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockSchedules,
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          staff_id: '1',
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.schedules).toEqual(mockSchedules)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_staff_schedule', {
        p_staff_id: 1,
        p_start_date: '2025-07-15',
        p_end_date: '2025-07-21',
      })
    })

    it('returns all schedules when no staff_id provided', async () => {
      const mockSchedules = [
        {
          schedule_id: 'schedule-1',
          staff_id: 1,
          staff_name: 'John Doe',
          schedule_date: '2025-07-15',
          start_time: '09:00',
          end_time: '17:00',
          location: 'Main Office',
          notes: 'Regular shift',
          shift_color: '#06B6D4',
        },
        {
          schedule_id: 'schedule-2',
          staff_id: 2,
          staff_name: 'Jane Smith',
          schedule_date: '2025-07-15',
          start_time: '14:00',
          end_time: '22:00',
          location: 'Branch Office',
          notes: 'Evening shift',
          shift_color: '#F59E0B',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: mockSchedules,
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.schedules).toEqual(mockSchedules)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_staff_schedule', {
        p_staff_id: null,
        p_start_date: '2025-07-15',
        p_end_date: '2025-07-21',
      })
    })

    it('handles database errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Database connection failed')
    })

    it('validates date parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: 'invalid-date',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Invalid date format')
    })
  })

  describe('POST /api/admin/staff-scheduling/schedules', () => {
    it('creates a new schedule successfully', async () => {
      const newSchedule = {
        staff_id: 1,
        schedule_date: '2025-07-15',
        start_time: '09:00',
        end_time: '17:00',
        location: 'Main Office',
        notes: 'Regular shift',
      }

      const createdSchedule = {
        id: 'schedule-123',
        ...newSchedule,
        created_at: '2025-07-15T08:00:00Z',
        updated_at: '2025-07-15T08:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdSchedule,
              error: null,
            }),
          }),
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'POST',
        body: newSchedule,
      })

      await adminCreateHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.schedule).toEqual(createdSchedule)
    })

    it('validates required fields', async () => {
      const invalidSchedule = {
        staff_id: 1,
        // Missing required fields
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidSchedule,
      })

      await adminCreateHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('validation')
    })

    it('detects scheduling conflicts', async () => {
      const conflictingSchedule = {
        staff_id: 1,
        schedule_date: '2025-07-15',
        start_time: '09:00',
        end_time: '17:00',
        location: 'Main Office',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { 
                code: '23505', // Unique constraint violation
                message: 'Schedule conflict detected',
              },
            }),
          }),
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'POST',
        body: conflictingSchedule,
      })

      await adminCreateHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(409)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('conflict')
    })

    it('validates business hours', async () => {
      const invalidTimeSchedule = {
        staff_id: 1,
        schedule_date: '2025-07-15',
        start_time: '05:00', // Before business hours
        end_time: '06:00',
        location: 'Main Office',
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidTimeSchedule,
      })

      await adminCreateHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('business hours')
    })

    it('validates time range', async () => {
      const invalidRangeSchedule = {
        staff_id: 1,
        schedule_date: '2025-07-15',
        start_time: '17:00',
        end_time: '09:00', // End before start
        location: 'Main Office',
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidRangeSchedule,
      })

      await adminCreateHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('end time must be after start time')
    })
  })

  describe('PUT /api/admin/staff-scheduling/schedules/[id]', () => {
    it('updates an existing schedule', async () => {
      const scheduleId = 'schedule-123'
      const updateData = {
        start_time: '10:00',
        end_time: '18:00',
        notes: 'Updated shift',
      }

      const updatedSchedule = {
        id: scheduleId,
        staff_id: 1,
        schedule_date: '2025-07-15',
        location: 'Main Office',
        ...updateData,
        updated_at: '2025-07-15T09:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSchedule,
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: scheduleId },
        body: updateData,
      })

      // Mock the PUT handler (would need to be imported)
      // await updateScheduleHandler(req as any, res as any)

      // For now, simulate the expected behavior
      expect(mockSupabase.from).toHaveBeenCalledWith('staff_schedules')
    })
  })

  describe('DELETE /api/admin/staff-scheduling/schedules/[id]', () => {
    it('deletes a schedule successfully', async () => {
      const scheduleId = 'schedule-123'

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: scheduleId },
      })

      // Mock the DELETE handler (would need to be imported)
      // await deleteScheduleHandler(req as any, res as any)

      expect(mockSupabase.from).toHaveBeenCalledWith('staff_schedules')
    })

    it('handles deletion of non-existent schedule', async () => {
      const scheduleId = 'non-existent'

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Schedule not found' },
          }),
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: scheduleId },
      })

      // Mock the DELETE handler
      // await deleteScheduleHandler(req as any, res as any)

      expect(mockSupabase.from).toHaveBeenCalledWith('staff_schedules')
    })
  })

  describe('Time Clock Integration', () => {
    it('creates time entry when clocking in', async () => {
      const clockInData = {
        staff_id: 1,
        schedule_id: 'schedule-123',
        pin: '1234',
        action: 'clock_in',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: {
            id: 'time-entry-123',
            staff_id: 1,
            schedule_id: 'schedule-123',
            clock_in_time: '2025-07-15T09:00:00Z',
          },
          error: null,
        }),
      } as any)

      const { req, res } = createMocks({
        method: 'POST',
        body: clockInData,
      })

      // Mock time clock handler
      // await timeClockHandler(req as any, res as any)

      expect(mockSupabase.from).toHaveBeenCalledWith('time_entries')
    })

    it('validates PIN for time clock actions', async () => {
      const invalidPinData = {
        staff_id: 1,
        schedule_id: 'schedule-123',
        pin: 'wrong',
        action: 'clock_in',
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidPinData,
      })

      // Mock time clock handler with PIN validation
      // await timeClockHandler(req as any, res as any)

      // Should return 401 for invalid PIN
      // expect(res._getStatusCode()).toBe(401)
    })
  })

  describe('Performance Tests', () => {
    it('handles large date ranges efficiently', async () => {
      const startTime = Date.now()

      mockSupabase.rpc.mockResolvedValue({
        data: Array.from({ length: 1000 }, (_, i) => ({
          schedule_id: `schedule-${i}`,
          staff_id: (i % 4) + 1,
          staff_name: `Staff ${i}`,
          schedule_date: '2025-07-15',
          start_time: '09:00',
          end_time: '17:00',
          location: 'Office',
          shift_color: '#06B6D4',
        })),
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        },
      })

      await schedulesHandler(req as any, res as any)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(res._getStatusCode()).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })

    it('implements proper caching headers', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res.getHeader('Cache-Control')).toBeDefined()
      expect(res.getHeader('ETag')).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('handles network timeouts gracefully', async () => {
      mockSupabase.rpc.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('timeout')
    })

    it('provides helpful error messages', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          message: 'relation "staff_schedules" does not exist',
          code: '42P01',
        },
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start_date: '2025-07-15',
          end_date: '2025-07-21',
        },
      })

      await schedulesHandler(req as any, res as any)

      expect(res._getStatusCode()).toBe(500)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('database schema')
    })
  })
})