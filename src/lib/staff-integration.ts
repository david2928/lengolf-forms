/**
 * Staff Integration Utilities
 * Provides consistent access to staff data across the scheduling system
 * Integrates with existing staff management system
 */

import { refacSupabaseAdmin } from './refac-supabase'

export interface StaffMember {
  id: number
  staff_name: string
  staff_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffWithStatus extends StaffMember {
  currently_clocked_in: boolean
  last_activity: string | null
  failed_attempts: number
  locked_until: string | null
}

/**
 * Get all active staff members for scheduling
 * Integrates with existing backoffice.staff table
 */
export async function getActiveStaffForScheduling(): Promise<StaffMember[]> {
  try {
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('staff_name')

    if (error) {
      console.error('Error fetching active staff:', error)
      throw new Error('Failed to fetch active staff members')
    }

    return staff || []
  } catch (error) {
    console.error('Staff integration error:', error)
    throw error
  }
}

/**
 * Get staff member by ID with validation
 */
export async function getStaffMemberById(staffId: number): Promise<StaffMember | null> {
  try {
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, created_at, updated_at')
      .eq('id', staffId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      console.error('Error fetching staff member:', error)
      throw new Error('Failed to fetch staff member')
    }

    return staff
  } catch (error) {
    console.error('Staff member lookup error:', error)
    throw error
  }
}

/**
 * Get staff members with current status for admin dashboard
 */
export async function getStaffWithCurrentStatus(): Promise<StaffWithStatus[]> {
  try {
    // Get staff members with their current clock-in status
    const { data: staffStatus, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_status')
      .select('*')
      .order('staff_name')

    if (error) {
      console.error('Error fetching staff status:', error)
      throw new Error('Failed to fetch staff status')
    }

    return staffStatus || []
  } catch (error) {
    console.error('Staff status integration error:', error)
    throw error
  }
}

/**
 * Validate staff member exists and is active
 */
export async function validateStaffMember(staffId: number): Promise<boolean> {
  try {
    const staff = await getStaffMemberById(staffId)
    return staff !== null && staff.is_active
  } catch (error) {
    console.error('Staff validation error:', error)
    return false
  }
}

/**
 * Get staff members formatted for UI components
 */
export async function getStaffForUI(): Promise<Array<{
  id: number
  name: string
  staff_id: string | null
  initials: string
  department: string
  position: string
  profile_photo?: string
}>> {
  try {
    console.log('getStaffForUI: Starting staff fetch...')
    console.log('refacSupabaseAdmin client available:', !!refacSupabaseAdmin)
    
    // Get staff with profile photo information
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, created_at, updated_at, profile_photo')
      .eq('is_active', true)
      .order('staff_name')

    console.log('Supabase query completed. Error:', error, 'Data count:', staff?.length || 0)

    if (error) {
      console.error('Error fetching staff for UI:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Return mock data as fallback
      console.log('Returning mock staff data as fallback')
      return getMockStaffData()
    }

    const formattedStaff = (staff || []).map(member => ({
      id: member.id,
      name: member.staff_name,
      staff_id: member.staff_id,
      initials: member.staff_name
        .split(' ')
        .map((name: string) => name.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2),
      department: 'Staff', // Default since column doesn't exist
      position: 'Team Member', // Default since column doesn't exist
      profile_photo: member.profile_photo || undefined
    }))

    console.log('Staff formatting completed. Returning', formattedStaff.length, 'staff members')
    return formattedStaff
  } catch (error) {
    console.error('Staff UI formatting error:', error)
    console.log('Returning mock staff data as fallback')
    return getMockStaffData()
  }
}

/**
 * Mock staff data for development/fallback
 */
function getMockStaffData(): Array<{
  id: number
  name: string
  staff_id: string | null
  initials: string
  department: string
  position: string
  profile_photo?: string
}> {
  return [
    {
      id: 1,
      name: 'John Smith',
      staff_id: 'JS001',
      initials: 'JS',
      department: 'Staff',
      position: 'Team Member'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      staff_id: 'SJ002',
      initials: 'SJ',
      department: 'Staff',
      position: 'Team Member'
    },
    {
      id: 3,
      name: 'Mike Wilson',
      staff_id: 'MW003',
      initials: 'MW',
      department: 'Staff',
      position: 'Team Member'
    },
    {
      id: 4,
      name: 'Emily Davis',
      staff_id: 'ED004',
      initials: 'ED',
      department: 'Staff',
      position: 'Team Member'
    },
    {
      id: 5,
      name: 'David Brown',
      staff_id: 'DB005',
      initials: 'DB',
      department: 'Staff',
      position: 'Team Member'
    }
  ]
}

/**
 * Check if staff member status has changed and update schedules accordingly
 */
export async function syncStaffStatusWithSchedules(staffId: number): Promise<void> {
  try {
    const staff = await getStaffMemberById(staffId)
    
    if (!staff || !staff.is_active) {
      // Staff is inactive, handle future schedules
      const { error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .update({ 
          notes: 'Staff member deactivated - schedule may need reassignment',
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', staffId)
        .gte('schedule_date', new Date().toISOString().split('T')[0])

      if (error) {
        console.error('Error updating schedules for inactive staff:', error)
        throw new Error('Failed to sync staff status with schedules')
      }
    }
  } catch (error) {
    console.error('Staff status sync error:', error)
    throw error
  }
}