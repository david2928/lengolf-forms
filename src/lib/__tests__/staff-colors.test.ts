/**
 * Tests for staff color assignment utilities
 */

import {
  generateStaffColorAssignments,
  getStaffColor,
  getStaffName,
  STAFF_COLOR_PALETTE,
  OFF_DAY_COLOR
} from '../staff-colors'

describe('Staff Color Assignments', () => {
  const mockStaff = [
    { id: 1, staff_name: 'John Doe' },
    { id: 2, staff_name: 'Jane Smith' },
    { id: 3, staff_name: 'Bob Johnson' },
    { id: 4, staff_name: 'Alice Brown' }
  ]

  describe('generateStaffColorAssignments', () => {
    it('should assign colors to staff members', () => {
      const assignments = generateStaffColorAssignments(mockStaff)
      
      expect(assignments).toHaveLength(4)
      expect(assignments[0]).toEqual({
        staffId: 1,
        staffName: 'John Doe',
        color: STAFF_COLOR_PALETTE[0]
      })
      expect(assignments[1]).toEqual({
        staffId: 2,
        staffName: 'Jane Smith',
        color: STAFF_COLOR_PALETTE[1]
      })
    })

    it('should handle staff with name property', () => {
      const staffWithName = [{ id: 1, name: 'Test User' }]
      const assignments = generateStaffColorAssignments(staffWithName)
      
      expect(assignments[0].staffName).toBe('Test User')
    })

    it('should provide fallback name for staff without name', () => {
      const staffWithoutName = [{ id: 1 }]
      const assignments = generateStaffColorAssignments(staffWithoutName)
      
      expect(assignments[0].staffName).toBe('Staff 1')
    })
  })

  describe('getStaffColor', () => {
    const assignments = generateStaffColorAssignments(mockStaff)

    it('should return correct color for existing staff', () => {
      const color = getStaffColor(1, assignments)
      expect(color).toBe(STAFF_COLOR_PALETTE[0])
    })

    it('should return default color for non-existing staff', () => {
      const color = getStaffColor(999, assignments)
      expect(color).toBe(STAFF_COLOR_PALETTE[0])
    })
  })

  describe('getStaffName', () => {
    const assignments = generateStaffColorAssignments(mockStaff)

    it('should return correct name for existing staff', () => {
      const name = getStaffName(1, assignments)
      expect(name).toBe('John Doe')
    })

    it('should return fallback name for non-existing staff', () => {
      const name = getStaffName(999, assignments)
      expect(name).toBe('Staff 999')
    })
  })

  // createStaffColorLegend tests removed - function no longer exists for compact layout

  describe('OFF_DAY_COLOR', () => {
    it('should have gray color properties', () => {
      expect(OFF_DAY_COLOR.bg).toBe('bg-gray-50')
      expect(OFF_DAY_COLOR.border).toBe('border-gray-200')
      expect(OFF_DAY_COLOR.text).toBe('text-gray-600')
    })
  })

  describe('Color consistency for OFF days', () => {
    it('should use staff color for name in OFF day indicators', () => {
      const assignments = generateStaffColorAssignments(mockStaff)
      const staffColor = getStaffColor(1, assignments)
      
      // Verify that staff color text class is different from OFF day text class
      expect(staffColor.text).not.toBe(OFF_DAY_COLOR.text)
      expect(staffColor.text).toBe('text-blue-900') // First staff gets blue
    })
  })
})