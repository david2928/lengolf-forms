/**
 * Staff Color Assignment Utilities
 * Provides consistent color assignments for staff members across the scheduling system
 */

// Predefined color palette for staff members
export const STAFF_COLOR_PALETTE = [
  {
    name: 'Blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    accent: 'bg-blue-100',
    hex: '#3B82F6'
  },
  {
    name: 'Green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    accent: 'bg-green-100',
    hex: '#10B981'
  },
  {
    name: 'Purple',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    accent: 'bg-purple-100',
    hex: '#8B5CF6'
  },
  {
    name: 'Orange',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    accent: 'bg-orange-100',
    hex: '#F97316'
  },
  {
    name: 'Indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    accent: 'bg-indigo-100',
    hex: '#6366F1'
  },
  {
    name: 'Rose',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    accent: 'bg-rose-100',
    hex: '#F43F5E'
  },
  {
    name: 'Teal',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-900',
    accent: 'bg-teal-100',
    hex: '#14B8A6'
  },
  {
    name: 'Emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    accent: 'bg-emerald-100',
    hex: '#059669'
  }
] as const

// Gray color for OFF days
export const OFF_DAY_COLOR = {
  name: 'Gray',
  bg: 'bg-gray-50',
  border: 'border-gray-200',
  text: 'text-gray-600',
  accent: 'bg-gray-100',
  hex: '#6B7280'
} as const

export interface StaffColorAssignment {
  staffId: number
  staffName: string
  color: typeof STAFF_COLOR_PALETTE[number]
}

/**
 * Generate consistent color assignments for staff members
 * Uses a deterministic approach based on staff ID to ensure consistency
 */
export function generateStaffColorAssignments(staffList: Array<{ id: number; name?: string; staff_name?: string }>): StaffColorAssignment[] {
  return staffList.map((staff, index) => ({
    staffId: staff.id,
    staffName: staff.name || staff.staff_name || `Staff ${staff.id}`,
    color: STAFF_COLOR_PALETTE[index % STAFF_COLOR_PALETTE.length]
  }))
}

/**
 * Get color assignment for a specific staff member
 */
export function getStaffColor(staffId: number, staffAssignments: StaffColorAssignment[]): typeof STAFF_COLOR_PALETTE[number] {
  const assignment = staffAssignments.find(a => a.staffId === staffId)
  return assignment?.color || STAFF_COLOR_PALETTE[0] // Default to first color if not found
}

/**
 * Get staff name from assignments
 */
export function getStaffName(staffId: number, staffAssignments: StaffColorAssignment[]): string {
  const assignment = staffAssignments.find(a => a.staffId === staffId)
  return assignment?.staffName || `Staff ${staffId}`
}

// Staff Color Legend function removed - no longer needed for compact layout