import { 
  getConfirmedActiveStaff, 
  getOffStaffForDay, 
  shouldShowStaffInSchedule 
} from '../staff-status-utils'

describe('Staff Status Utils', () => {
  const mockAllStaff = [
    { id: 1, staff_name: 'John Smith', is_active: true },
    { id: 2, staff_name: 'Sarah Johnson', is_active: true },
    { id: 3, staff_name: 'David Brown', is_active: false }, // Inactive staff
    { id: 4, staff_name: 'Emily Davis', is_active: true },
    { id: 5, staff_name: 'Mike Wilson' } // No explicit is_active field
  ]

  const mockScheduleStaff = [
    { staff_id: 1, staff_name: 'John Smith' },
    { staff_id: 2, staff_name: 'Sarah Johnson' },
    { staff_id: 4, staff_name: 'Emily Davis' }
  ]

  describe('getConfirmedActiveStaff', () => {
    it('should include staff who appear in schedules', () => {
      const result = getConfirmedActiveStaff(mockAllStaff, mockScheduleStaff)
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).toContain(1) // John - in schedules
      expect(staffIds).toContain(2) // Sarah - in schedules
      expect(staffIds).toContain(4) // Emily - in schedules
    })

    it('should exclude explicitly inactive staff', () => {
      const result = getConfirmedActiveStaff(mockAllStaff, mockScheduleStaff)
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).not.toContain(3) // David - explicitly inactive
    })

    it('should include staff without explicit is_active field', () => {
      const result = getConfirmedActiveStaff(mockAllStaff, mockScheduleStaff)
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).toContain(5) // Mike - no explicit is_active field
    })

    it('should work with empty schedule staff', () => {
      const result = getConfirmedActiveStaff(mockAllStaff, [])
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).toContain(1) // John - active
      expect(staffIds).toContain(2) // Sarah - active
      expect(staffIds).not.toContain(3) // David - inactive
      expect(staffIds).toContain(4) // Emily - active
      expect(staffIds).toContain(5) // Mike - no explicit field
    })
  })

  describe('getOffStaffForDay', () => {
    it('should return staff who are not scheduled for the day', () => {
      const scheduledStaffIds = new Set([1, 2]) // John and Sarah are scheduled
      const result = getOffStaffForDay(mockAllStaff, scheduledStaffIds, mockScheduleStaff)
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).not.toContain(1) // John - scheduled
      expect(staffIds).not.toContain(2) // Sarah - scheduled
      expect(staffIds).not.toContain(3) // David - inactive, shouldn't appear
      expect(staffIds).toContain(4) // Emily - active but not scheduled
      expect(staffIds).toContain(5) // Mike - active but not scheduled
    })

    it('should not show inactive staff as OFF', () => {
      const scheduledStaffIds = new Set([1]) // Only John is scheduled
      const result = getOffStaffForDay(mockAllStaff, scheduledStaffIds, mockScheduleStaff)
      
      const davidInResult = result.find(s => s.staff_name === 'David Brown')
      expect(davidInResult).toBeUndefined() // David should not appear as OFF
    })

    it('should handle empty scheduled staff', () => {
      const scheduledStaffIds = new Set<number>() // No one is scheduled
      const result = getOffStaffForDay(mockAllStaff, scheduledStaffIds, mockScheduleStaff)
      
      const staffIds = result.map(s => s.id)
      expect(staffIds).toContain(1) // John - active, not scheduled
      expect(staffIds).toContain(2) // Sarah - active, not scheduled
      expect(staffIds).not.toContain(3) // David - inactive
      expect(staffIds).toContain(4) // Emily - active, not scheduled
      expect(staffIds).toContain(5) // Mike - active, not scheduled
    })
  })

  describe('shouldShowStaffInSchedule', () => {
    it('should return true for confirmed active staff', () => {
      expect(shouldShowStaffInSchedule(1, mockAllStaff, mockScheduleStaff)).toBe(true) // John
      expect(shouldShowStaffInSchedule(2, mockAllStaff, mockScheduleStaff)).toBe(true) // Sarah
      expect(shouldShowStaffInSchedule(4, mockAllStaff, mockScheduleStaff)).toBe(true) // Emily
      expect(shouldShowStaffInSchedule(5, mockAllStaff, mockScheduleStaff)).toBe(true) // Mike
    })

    it('should return false for inactive staff', () => {
      expect(shouldShowStaffInSchedule(3, mockAllStaff, mockScheduleStaff)).toBe(false) // David
    })

    it('should return false for non-existent staff', () => {
      expect(shouldShowStaffInSchedule(999, mockAllStaff, mockScheduleStaff)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty staff arrays', () => {
      const result = getConfirmedActiveStaff([], [])
      expect(result).toEqual([])
    })

    it('should handle staff with same ID in both arrays', () => {
      const allStaff = [{ id: 1, staff_name: 'John Smith', is_active: true }]
      const scheduleStaff = [{ staff_id: 1, staff_name: 'John Smith' }]
      
      const result = getConfirmedActiveStaff(allStaff, scheduleStaff)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('should handle staff only in schedules', () => {
      const allStaff = [{ id: 1, staff_name: 'John Smith', is_active: true }]
      const scheduleStaff = [
        { staff_id: 1, staff_name: 'John Smith' },
        { staff_id: 2, staff_name: 'Sarah Johnson' } // Only in schedules
      ]
      
      const result = getConfirmedActiveStaff(allStaff, scheduleStaff)
      const staffIds = result.map(s => s.id)
      expect(staffIds).toContain(1) // John - in both
      expect(staffIds).toContain(2) // Sarah - only in schedules, but confirmed active
    })
  })
})