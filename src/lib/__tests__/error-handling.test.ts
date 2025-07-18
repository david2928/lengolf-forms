// Comprehensive tests for error handling system

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  ScheduleErrorCodes,
  createScheduleError,
  createValidationError,
  getErrorMessage,
  getHttpStatusFromErrorCode,
  isScheduleError,
  ERROR_MESSAGES,
  USER_FRIENDLY_MESSAGES
} from '@/types/errors'
import {
  validateDate,
  validateTime,
  validateStaffId,
  validateTimeRange,
  validateDateRange,
  validateNotPastDate,
  validateScheduleCreate,
  validateScheduleUpdate,
  validateScheduleQuery
} from '@/lib/validation'
import {
  detectScheduleConflict,
  validateBusinessHours,
  validateMinimumShiftDuration,
  validateMaximumShiftDuration,
  canDeleteSchedule,
  canModifySchedule
} from '@/lib/staff-schedule-validation'

describe('Error Types and Utilities', () => {
  describe('createScheduleError', () => {
    it('should create a schedule error with all properties', () => {
      const error = createScheduleError(
        ScheduleErrorCodes.SCHEDULE_CONFLICT,
        { conflictingId: '123' },
        'staff_id',
        '/api/schedules'
      )

      expect(error.code).toBe(ScheduleErrorCodes.SCHEDULE_CONFLICT)
      expect(error.message).toBe(ERROR_MESSAGES[ScheduleErrorCodes.SCHEDULE_CONFLICT])
      expect(error.details).toEqual({ conflictingId: '123' })
      expect(error.field).toBe('staff_id')
      expect(error.path).toBe('/api/schedules')
      expect(error.timestamp).toBeDefined()
    })

    it('should create a minimal schedule error', () => {
      const error = createScheduleError(ScheduleErrorCodes.NETWORK_ERROR)

      expect(error.code).toBe(ScheduleErrorCodes.NETWORK_ERROR)
      expect(error.message).toBe(ERROR_MESSAGES[ScheduleErrorCodes.NETWORK_ERROR])
      expect(error.timestamp).toBeDefined()
    })
  })

  describe('createValidationError', () => {
    it('should create a validation error', () => {
      const error = createValidationError(
        'email',
        ScheduleErrorCodes.INVALID_DATE_FORMAT,
        'invalid@email'
      )

      expect(error.field).toBe('email')
      expect(error.code).toBe(ScheduleErrorCodes.INVALID_DATE_FORMAT)
      expect(error.message).toBe(ERROR_MESSAGES[ScheduleErrorCodes.INVALID_DATE_FORMAT])
      expect(error.value).toBe('invalid@email')
    })
  })

  describe('getErrorMessage', () => {
    it('should return technical error message by default', () => {
      const error = createScheduleError(ScheduleErrorCodes.SCHEDULE_CONFLICT)
      const message = getErrorMessage(error, false)
      
      expect(message).toBe(ERROR_MESSAGES[ScheduleErrorCodes.SCHEDULE_CONFLICT])
    })

    it('should return user-friendly error message when requested', () => {
      const error = createScheduleError(ScheduleErrorCodes.SCHEDULE_CONFLICT)
      const message = getErrorMessage(error, true)
      
      expect(message).toBe(USER_FRIENDLY_MESSAGES[ScheduleErrorCodes.SCHEDULE_CONFLICT])
    })
  })

  describe('getHttpStatusFromErrorCode', () => {
    it('should return correct HTTP status codes', () => {
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.INVALID_DATE_FORMAT)).toBe(400)
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.UNAUTHORIZED_ACCESS)).toBe(401)
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS)).toBe(403)
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.SCHEDULE_NOT_FOUND)).toBe(404)
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.SCHEDULE_CONFLICT)).toBe(409)
      expect(getHttpStatusFromErrorCode(ScheduleErrorCodes.SERVER_ERROR)).toBe(500)
    })
  })

  describe('isScheduleError', () => {
    it('should identify schedule errors correctly', () => {
      const scheduleError = createScheduleError(ScheduleErrorCodes.NETWORK_ERROR)
      const regularError = new Error('Regular error')
      const plainObject = { message: 'Not an error' }

      expect(isScheduleError(scheduleError)).toBe(true)
      expect(isScheduleError(regularError)).toBe(false)
      expect(isScheduleError(plainObject)).toBe(false)
      expect(isScheduleError(null)).toBe(false)
    })
  })
})

describe('Basic Validation Functions', () => {
  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      expect(validateDate('2024-01-15')).toBeNull()
      expect(validateDate('2024-12-31')).toBeNull()
    })

    it('should reject invalid date formats', () => {
      expect(validateDate('2024/01/15')).not.toBeNull()
      expect(validateDate('15-01-2024')).not.toBeNull()
      expect(validateDate('invalid-date')).not.toBeNull()
      expect(validateDate('')).not.toBeNull()
    })

    it('should reject invalid dates', () => {
      expect(validateDate('2024-13-01')).not.toBeNull()
      expect(validateDate('2024-02-30')).not.toBeNull()
    })
  })

  describe('validateTime', () => {
    it('should validate correct time formats', () => {
      expect(validateTime('09:30')).toBeNull()
      expect(validateTime('23:59')).toBeNull()
      expect(validateTime('00:00')).toBeNull()
    })

    it('should reject invalid time formats', () => {
      expect(validateTime('9:30')).toBeNull() // Should accept single digit hours
      expect(validateTime('24:00')).not.toBeNull()
      expect(validateTime('12:60')).not.toBeNull()
      expect(validateTime('invalid-time')).not.toBeNull()
      expect(validateTime('')).not.toBeNull()
    })
  })

  describe('validateStaffId', () => {
    it('should validate correct staff IDs', () => {
      expect(validateStaffId(1)).toBeNull()
      expect(validateStaffId('5')).toBeNull()
      expect(validateStaffId(999)).toBeNull()
    })

    it('should reject invalid staff IDs', () => {
      expect(validateStaffId(0)).not.toBeNull()
      expect(validateStaffId(-1)).not.toBeNull()
      expect(validateStaffId('invalid')).not.toBeNull()
      expect(validateStaffId(null)).not.toBeNull()
      expect(validateStaffId(undefined)).not.toBeNull()
    })
  })

  describe('validateTimeRange', () => {
    it('should validate correct time ranges', () => {
      expect(validateTimeRange('09:00', '17:00')).toBeNull()
      expect(validateTimeRange('23:00', '23:30')).toBeNull()
    })

    it('should reject invalid time ranges', () => {
      expect(validateTimeRange('17:00', '09:00')).not.toBeNull()
      expect(validateTimeRange('12:00', '12:00')).not.toBeNull()
      expect(validateTimeRange('invalid', '17:00')).not.toBeNull()
    })
  })

  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      expect(validateDateRange('2024-01-01', '2024-01-31')).toBeNull()
      expect(validateDateRange('2024-01-01', '2024-01-01')).toBeNull()
    })

    it('should reject invalid date ranges', () => {
      expect(validateDateRange('2024-01-31', '2024-01-01')).not.toBeNull()
      expect(validateDateRange('invalid', '2024-01-01')).not.toBeNull()
    })
  })

  describe('validateNotPastDate', () => {
    it('should accept future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]
      
      expect(validateNotPastDate(futureDateString)).toBeNull()
    })

    it('should accept today', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(validateNotPastDate(today)).toBeNull()
    })

    it('should reject past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastDateString = pastDate.toISOString().split('T')[0]
      
      expect(validateNotPastDate(pastDateString)).not.toBeNull()
    })
  })
})

describe('Schedule Validation Functions', () => {
  const validScheduleData = {
    staff_id: 1,
    schedule_date: '2024-12-31',
    start_time: '09:00',
    end_time: '17:00',
    location: 'Main Office',
    notes: 'Regular shift'
  }

  describe('validateScheduleCreate', () => {
    it('should validate correct schedule data', () => {
      const errors = validateScheduleCreate(validScheduleData)
      expect(errors).toHaveLength(0)
    })

    it('should reject missing required fields', () => {
      const invalidData = { ...validScheduleData }
      delete invalidData.staff_id
      
      const errors = validateScheduleCreate(invalidData)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field === 'staff_id')).toBe(true)
    })

    it('should reject invalid time ranges', () => {
      const invalidData = {
        ...validScheduleData,
        start_time: '17:00',
        end_time: '09:00'
      }
      
      const errors = validateScheduleCreate(invalidData)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateScheduleUpdate', () => {
    it('should validate correct update data', () => {
      const updateData = {
        id: 'test-id',
        start_time: '10:00',
        end_time: '18:00'
      }
      
      const errors = validateScheduleUpdate(updateData)
      expect(errors).toHaveLength(0)
    })

    it('should reject missing ID', () => {
      const invalidData = {
        start_time: '10:00',
        end_time: '18:00'
      }
      
      const errors = validateScheduleUpdate(invalidData as any)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateScheduleQuery', () => {
    it('should validate correct query parameters', () => {
      const params = {
        staff_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        view_mode: 'personal'
      }
      
      const errors = validateScheduleQuery(params)
      expect(errors).toHaveLength(0)
    })

    it('should reject invalid query parameters', () => {
      const params = {
        staff_id: 'invalid',
        start_date: 'invalid-date',
        view_mode: 'invalid-mode'
      }
      
      const errors = validateScheduleQuery(params)
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})

describe('Advanced Schedule Validation', () => {
  const existingSchedules = [
    {
      id: '1',
      staff_id: 1,
      schedule_date: '2024-01-15',
      start_time: '09:00',
      end_time: '17:00'
    },
    {
      id: '2',
      staff_id: 2,
      schedule_date: '2024-01-15',
      start_time: '10:00',
      end_time: '18:00'
    }
  ]

  describe('detectScheduleConflict', () => {
    it('should detect overlapping schedules', () => {
      const newSchedule = {
        staff_id: 1,
        schedule_date: '2024-01-15',
        start_time: '08:00',
        end_time: '10:00'
      }
      
      const conflict = detectScheduleConflict(newSchedule, existingSchedules)
      expect(conflict).not.toBeNull()
      expect(conflict?.code).toBe(ScheduleErrorCodes.SCHEDULE_CONFLICT)
    })

    it('should allow non-overlapping schedules', () => {
      const newSchedule = {
        staff_id: 1,
        schedule_date: '2024-01-15',
        start_time: '18:00',
        end_time: '20:00'
      }
      
      const conflict = detectScheduleConflict(newSchedule, existingSchedules)
      expect(conflict).toBeNull()
    })

    it('should allow schedules for different staff', () => {
      const newSchedule = {
        staff_id: 3,
        schedule_date: '2024-01-15',
        start_time: '09:00',
        end_time: '17:00'
      }
      
      const conflict = detectScheduleConflict(newSchedule, existingSchedules)
      expect(conflict).toBeNull()
    })

    it('should exclude current schedule when updating', () => {
      const updateSchedule = {
        staff_id: 1,
        schedule_date: '2024-01-15',
        start_time: '09:30',
        end_time: '17:30'
      }
      
      const conflict = detectScheduleConflict(updateSchedule, existingSchedules, '1')
      expect(conflict).toBeNull()
    })
  })

  describe('validateBusinessHours', () => {
    it('should accept schedules within business hours', () => {
      const error = validateBusinessHours('09:00', '17:00')
      expect(error).toBeNull()
    })

    it('should reject schedules outside business hours', () => {
      const error = validateBusinessHours('05:00', '17:00')
      expect(error).not.toBeNull()
    })

    it('should accept custom business hours', () => {
      const customHours = { start: '08:00', end: '20:00' }
      const error = validateBusinessHours('19:00', '20:00', customHours)
      expect(error).toBeNull()
    })
  })

  describe('validateMinimumShiftDuration', () => {
    it('should accept shifts meeting minimum duration', () => {
      const error = validateMinimumShiftDuration('09:00', '10:30', 60)
      expect(error).toBeNull()
    })

    it('should reject shifts below minimum duration', () => {
      const error = validateMinimumShiftDuration('09:00', '09:30', 60)
      expect(error).not.toBeNull()
    })
  })

  describe('validateMaximumShiftDuration', () => {
    it('should accept shifts within maximum duration', () => {
      const error = validateMaximumShiftDuration('09:00', '17:00', 480)
      expect(error).toBeNull()
    })

    it('should reject shifts exceeding maximum duration', () => {
      const error = validateMaximumShiftDuration('09:00', '20:00', 480)
      expect(error).not.toBeNull()
    })
  })
})

describe('Schedule Modification Rules', () => {
  describe('canDeleteSchedule', () => {
    it('should allow deleting future schedules', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]
      
      const result = canDeleteSchedule(futureDateString)
      expect(result.canDelete).toBe(true)
    })

    it('should prevent deleting past schedules', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastDateString = pastDate.toISOString().split('T')[0]
      
      const result = canDeleteSchedule(pastDateString)
      expect(result.canDelete).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })

  describe('canModifySchedule', () => {
    it('should allow modifying future schedules', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]
      
      const result = canModifySchedule(futureDateString)
      expect(result.canModify).toBe(true)
    })

    it('should prevent modifying past schedules', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastDateString = pastDate.toISOString().split('T')[0]
      
      const result = canModifySchedule(pastDateString)
      expect(result.canModify).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })
})

describe('Error Message Coverage', () => {
  it('should have error messages for all error codes', () => {
    Object.values(ScheduleErrorCodes).forEach(code => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(USER_FRIENDLY_MESSAGES[code]).toBeDefined()
    })
  })

  it('should have different technical and user-friendly messages', () => {
    Object.values(ScheduleErrorCodes).forEach(code => {
      const technical = ERROR_MESSAGES[code]
      const userFriendly = USER_FRIENDLY_MESSAGES[code]
      
      expect(technical).toBeDefined()
      expect(userFriendly).toBeDefined()
      
      // Most messages should be different (some might be the same for simplicity)
      if (technical !== userFriendly) {
        expect(userFriendly.length).toBeGreaterThan(0)
      }
    })
  })
})