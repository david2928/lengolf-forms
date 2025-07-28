/**
 * Staff Status Utilities
 * Provides consistent handling of staff active/inactive status across the application
 */

export interface StaffMember {
  id: number
  staff_name: string
  is_active?: boolean
}

export interface ScheduleStaffMember {
  staff_id: number
  staff_name: string
}

/**
 * Filter staff to only include confirmed active members
 * This prevents showing inactive staff as "OFF" in schedules
 */
export function getConfirmedActiveStaff(
  allStaff: StaffMember[],
  scheduleStaff: ScheduleStaffMember[] = []
): StaffMember[] {
  // Create a set of staff IDs that appear in schedules (confirmed active)
  const confirmedActiveIds = new Set(
    scheduleStaff.map(schedule => schedule.staff_id)
  )

  // Create a map to deduplicate and combine staff data
  const activeStaffMap = new Map<number, StaffMember>()

  // Add staff from schedules (definitely active)
  scheduleStaff.forEach(schedule => {
    if (!activeStaffMap.has(schedule.staff_id)) {
      activeStaffMap.set(schedule.staff_id, {
        id: schedule.staff_id,
        staff_name: schedule.staff_name,
        is_active: true
      })
    }
  })

  // Add staff from allStaff list, but only if they're not explicitly inactive
  allStaff.forEach(staff => {
    // Only include if:
    // 1. They appear in schedules (confirmed active), OR
    // 2. They're in allStaff and not explicitly marked as inactive
    const isConfirmedActive = confirmedActiveIds.has(staff.id)
    const isNotExplicitlyInactive = staff.is_active !== false
    
    if (isConfirmedActive || isNotExplicitlyInactive) {
      if (!activeStaffMap.has(staff.id)) {
        activeStaffMap.set(staff.id, staff)
      }
    }
  })

  return Array.from(activeStaffMap.values())
}

/**
 * Get staff members who should show as "OFF" for a given day
 * Only includes confirmed active staff who don't have schedules
 */
export function getOffStaffForDay(
  allStaff: StaffMember[],
  scheduledStaffIds: Set<number>,
  scheduleStaff: ScheduleStaffMember[] = []
): StaffMember[] {
  const confirmedActiveStaff = getConfirmedActiveStaff(allStaff, scheduleStaff)
  
  return confirmedActiveStaff.filter(staff => 
    !scheduledStaffIds.has(staff.id)
  )
}

/**
 * Validate that a staff member should be shown in the schedule interface
 * This helps prevent showing deactivated staff
 */
export function shouldShowStaffInSchedule(
  staffId: number,
  allStaff: StaffMember[],
  scheduleStaff: ScheduleStaffMember[] = []
): boolean {
  const confirmedActiveStaff = getConfirmedActiveStaff(allStaff, scheduleStaff)
  return confirmedActiveStaff.some(staff => staff.id === staffId)
}

/**
 * Debug function to help identify staff status issues
 */
export function debugStaffStatus(
  allStaff: StaffMember[],
  scheduleStaff: ScheduleStaffMember[] = [],
  targetStaffName?: string
) {
  console.group('🔍 Staff Status Debug')
  
  console.log('All Staff:', allStaff.length)
  allStaff.forEach(staff => {
    const isTarget = targetStaffName && 
      staff.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    console.log(`  ${isTarget ? '👤' : '-'} ${staff.staff_name} (ID: ${staff.id}, Active: ${staff.is_active})`)
  })
  
  console.log('\nSchedule Staff:', scheduleStaff.length)
  const scheduleStaffIds = new Set(scheduleStaff.map(s => s.staff_id))
  scheduleStaff.forEach(schedule => {
    const isTarget = targetStaffName && 
      schedule.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    console.log(`  ${isTarget ? '👤' : '-'} ${schedule.staff_name} (ID: ${schedule.staff_id})`)
  })
  
  const confirmedActive = getConfirmedActiveStaff(allStaff, scheduleStaff)
  console.log('\nConfirmed Active Staff:', confirmedActive.length)
  confirmedActive.forEach(staff => {
    const isTarget = targetStaffName && 
      staff.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    const inSchedules = scheduleStaffIds.has(staff.id)
    console.log(`  ${isTarget ? '👤' : '-'} ${staff.staff_name} (ID: ${staff.id}, In Schedules: ${inSchedules})`)
  })
  
  if (targetStaffName) {
    const targetInAll = allStaff.find(s => 
      s.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    )
    const targetInSchedules = scheduleStaff.find(s => 
      s.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    )
    const targetInConfirmed = confirmedActive.find(s => 
      s.staff_name.toLowerCase().includes(targetStaffName.toLowerCase())
    )
    
    console.log(`\n🎯 Target "${targetStaffName}" Status:`)
    console.log(`  In All Staff: ${!!targetInAll} ${targetInAll ? `(Active: ${targetInAll.is_active})` : ''}`)
    console.log(`  In Schedules: ${!!targetInSchedules}`)
    console.log(`  In Confirmed Active: ${!!targetInConfirmed}`)
    console.log(`  Should Show as OFF: ${!!targetInConfirmed && !targetInSchedules}`)
  }
  
  console.groupEnd()
}