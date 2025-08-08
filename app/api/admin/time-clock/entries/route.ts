import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getDevSession } from '@/lib/dev-session'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { DateTime } from 'luxon'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface CreateTimeEntryRequest {
  staff_id: number
  action: 'clock_in' | 'clock_out'
  timestamp: string // ISO timestamp
  notes?: string
}

interface CreateTimeEntryResponse {
  success: boolean
  entry_id?: number
  message: string
  error?: string
}

/**
 * POST /api/admin/time-clock/entries - Manually create a time entry
 * Admin authentication required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userIsAdmin = await isUserAdmin(session.user.email)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body: CreateTimeEntryRequest = await request.json()
    const { staff_id, action, timestamp, notes } = body

    // Validate required fields
    if (!staff_id || !action || !timestamp) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: staff_id, action, and timestamp are required',
        error: 'Validation failed'
      } as CreateTimeEntryResponse, { status: 400 })
    }

    // Validate action
    if (!['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Must be "clock_in" or "clock_out"',
        error: 'Validation failed'
      } as CreateTimeEntryResponse, { status: 400 })
    }

    // Validate timestamp format
    let parsedTimestamp: Date
    try {
      parsedTimestamp = new Date(timestamp)
      if (isNaN(parsedTimestamp.getTime())) {
        throw new Error('Invalid timestamp format')
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Invalid timestamp format. Must be a valid ISO timestamp',
        error: 'Validation failed'
      } as CreateTimeEntryResponse, { status: 400 })
    }

    // Verify staff exists
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('id', staff_id)
      .single()

    if (staffError || !staff) {
      return NextResponse.json({
        success: false,
        message: `Staff member with ID ${staff_id} not found`,
        error: 'Invalid staff_id'
      } as CreateTimeEntryResponse, { status: 404 })
    }

    if (!staff.is_active) {
      return NextResponse.json({
        success: false,
        message: `Staff member ${staff.staff_name} is inactive`,
        error: 'Staff member inactive'
      } as CreateTimeEntryResponse, { status: 400 })
    }

    // Check for potential duplicate entries (within 1 minute of same action)
    const oneMinuteBefore = new Date(parsedTimestamp.getTime() - 60000)
    const oneMinuteAfter = new Date(parsedTimestamp.getTime() + 60000)
    
    const { data: duplicates, error: duplicateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id, timestamp, action')
      .eq('staff_id', staff_id)
      .eq('action', action)
      .gte('timestamp', oneMinuteBefore.toISOString())
      .lte('timestamp', oneMinuteAfter.toISOString())

    if (duplicateError) {
      console.error('Error checking for duplicates:', duplicateError)
      return NextResponse.json({
        success: false,
        message: 'Error checking for duplicate entries',
        error: 'Database error'
      } as CreateTimeEntryResponse, { status: 500 })
    }

    if (duplicates && duplicates.length > 0) {
      const existingEntry = duplicates[0]
      const existingTime = DateTime.fromISO(existingEntry.timestamp).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
      return NextResponse.json({
        success: false,
        message: `Duplicate entry detected: ${staff.staff_name} already has a ${action} entry at ${existingTime}`,
        error: 'Duplicate entry'
      } as CreateTimeEntryResponse, { status: 409 })
    }

    // Create the time entry
    const { data: newEntry, error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .insert({
        staff_id,
        action,
        timestamp: parsedTimestamp.toISOString(),
        photo_captured: false, // Manual entries don't have photos
        photo_url: null,
        camera_error: 'Manual entry - no photo required',
        device_info: {
          created_by: 'admin',
          admin_user: session.user.email,
          notes: notes || 'Manually created by admin',
          created_via: 'admin_dashboard'
        }
      })
      .select('id')
      .single()

    if (insertError || !newEntry) {
      console.error('Error creating time entry:', insertError)
      return NextResponse.json({
        success: false,
        message: 'Failed to create time entry',
        error: insertError?.message || 'Database error'
      } as CreateTimeEntryResponse, { status: 500 })
    }

    // Create audit log
    try {
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('audit_logs')
        .insert({
          action_type: 'time_entry_created',
          changed_by_type: 'admin',
          changed_by_identifier: session.user.email,
          changes_summary: `Manually created ${action} entry for ${staff.staff_name}`,
          old_data_snapshot: JSON.stringify(null),
          new_data_snapshot: JSON.stringify({
            entry_id: newEntry.id,
            staff_id,
            staff_name: staff.staff_name,
            action,
            timestamp: parsedTimestamp.toISOString(),
            notes
          }),
          reason: notes || 'Manual time entry creation by admin',
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.warn('Failed to create audit log (non-fatal):', auditError)
    }

    const displayTime = DateTime.fromISO(parsedTimestamp.toISOString()).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
    
    return NextResponse.json({
      success: true,
      entry_id: newEntry.id,
      message: `Successfully created ${action} entry for ${staff.staff_name} at ${displayTime}`
    } as CreateTimeEntryResponse)

  } catch (error) {
    console.error('Error in POST /api/admin/time-clock/entries:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as CreateTimeEntryResponse, { status: 500 })
  }
}