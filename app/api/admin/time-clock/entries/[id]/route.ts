import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getDevSession } from '@/lib/dev-session'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { DateTime } from 'luxon'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface RouteParams {
  id: string
}

interface DeleteTimeEntryResponse {
  success: boolean
  message: string
  error?: string
  deleted_entry?: {
    entry_id: number
    staff_name: string
    action: string
    timestamp: string
  }
}

interface UpdateTimeEntryRequest {
  timestamp?: string // ISO timestamp
  notes?: string
}

interface UpdateTimeEntryResponse {
  success: boolean
  message: string
  error?: string
  updated_entry?: {
    entry_id: number
    staff_name: string
    action: string
    old_timestamp: string
    new_timestamp: string
  }
}

/**
 * PUT /api/admin/time-clock/entries/[id] - Update a time entry
 * Admin authentication required
 */
export async function PUT(
  request: NextRequest, 
  { params }: { params: RouteParams }
) {
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

    const { id } = params
    const entryId = parseInt(id)
    
    if (isNaN(entryId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid entry ID. Must be a number.',
        error: 'Validation failed'
      } as UpdateTimeEntryResponse, { status: 400 })
    }

    // Parse request body
    const body: UpdateTimeEntryRequest = await request.json()
    const { timestamp, notes } = body

    if (!timestamp) {
      return NextResponse.json({
        success: false,
        message: 'timestamp is required for updates',
        error: 'Validation failed'
      } as UpdateTimeEntryResponse, { status: 400 })
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
      } as UpdateTimeEntryResponse, { status: 400 })
    }

    // Get the entry details before update
    const { data: entryToUpdate, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select(`
        id,
        staff_id,
        action,
        timestamp,
        staff:staff_id (
          staff_name
        )
      `)
      .eq('id', entryId)
      .single()

    if (fetchError || !entryToUpdate) {
      return NextResponse.json({
        success: false,
        message: `Time entry with ID ${entryId} not found`,
        error: 'Entry not found'
      } as UpdateTimeEntryResponse, { status: 404 })
    }

    // Update the time entry
    const existingDeviceInfo = (entryToUpdate.device_info as any) || {}
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .update({ 
        timestamp: parsedTimestamp.toISOString(),
        device_info: {
          ...existingDeviceInfo,
          updated_by: 'admin',
          admin_user: session.user.email,
          update_notes: notes || 'Updated by admin',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', entryId)

    if (updateError) {
      console.error('Error updating time entry:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update time entry',
        error: updateError.message
      } as UpdateTimeEntryResponse, { status: 500 })
    }

    // Create audit log
    try {
      const staffName = (entryToUpdate.staff as any)?.staff_name || 'Unknown Staff'
      const oldTime = DateTime.fromISO(entryToUpdate.timestamp).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
      const newTime = DateTime.fromISO(parsedTimestamp.toISOString()).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
      
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('audit_logs')
        .insert({
          action_type: 'time_entry_updated',
          changed_by_type: 'admin',
          changed_by_identifier: session.user.email,
          changes_summary: `Updated ${entryToUpdate.action} entry for ${staffName} from ${oldTime} to ${newTime}`,
          old_data_snapshot: JSON.stringify({
            entry_id: entryToUpdate.id,
            staff_id: entryToUpdate.staff_id,
            staff_name: staffName,
            action: entryToUpdate.action,
            timestamp: entryToUpdate.timestamp
          }),
          new_data_snapshot: JSON.stringify({
            entry_id: entryToUpdate.id,
            staff_id: entryToUpdate.staff_id,
            staff_name: staffName,
            action: entryToUpdate.action,
            timestamp: parsedTimestamp.toISOString()
          }),
          reason: notes || 'Time entry correction by admin',
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.warn('Failed to create audit log (non-fatal):', auditError)
    }

    const staffName = (entryToUpdate.staff as any)?.staff_name || 'Unknown Staff'
    const oldTime = DateTime.fromISO(entryToUpdate.timestamp).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
    const newTime = DateTime.fromISO(parsedTimestamp.toISOString()).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${entryToUpdate.action} entry for ${staffName}`,
      updated_entry: {
        entry_id: entryToUpdate.id,
        staff_name: staffName,
        action: entryToUpdate.action,
        old_timestamp: oldTime,
        new_timestamp: newTime
      }
    } as UpdateTimeEntryResponse)

  } catch (error) {
    console.error('Error in PUT /api/admin/time-clock/entries/[id]:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as UpdateTimeEntryResponse, { status: 500 })
  }
}

/**
 * DELETE /api/admin/time-clock/entries/[id] - Delete a time entry
 * Admin authentication required
 */
export async function DELETE(
  request: NextRequest, 
  { params }: { params: RouteParams }
) {
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

    const { id } = params
    const entryId = parseInt(id)
    
    if (isNaN(entryId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid entry ID. Must be a number.',
        error: 'Validation failed'
      } as DeleteTimeEntryResponse, { status: 400 })
    }

    // Get the entry details before deletion for audit log and response
    const { data: entryToDelete, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select(`
        id,
        staff_id,
        action,
        timestamp,
        photo_captured,
        staff:staff_id (
          staff_name
        )
      `)
      .eq('id', entryId)
      .single()

    if (fetchError || !entryToDelete) {
      return NextResponse.json({
        success: false,
        message: `Time entry with ID ${entryId} not found`,
        error: 'Entry not found'
      } as DeleteTimeEntryResponse, { status: 404 })
    }

    // Check if this is a recent entry (within last 24 hours) for safety
    const entryTime = new Date(entryToDelete.timestamp)
    const now = new Date()
    const hoursOld = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
    
    if (hoursOld > 168) { // 7 days old
      return NextResponse.json({
        success: false,
        message: 'Cannot delete time entries older than 7 days. Contact system administrator if needed.',
        error: 'Entry too old'
      } as DeleteTimeEntryResponse, { status: 400 })
    }

    // Check if deleting this entry would create data integrity issues
    // For example, if this is a clock-out and there's a later clock-in without a matching clock-out
    if (entryToDelete.action === 'clock_out') {
      const { data: laterEntries, error: laterError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('time_entries')
        .select('id, action, timestamp')
        .eq('staff_id', entryToDelete.staff_id)
        .gt('timestamp', entryToDelete.timestamp)
        .order('timestamp', { ascending: true })
        .limit(1)

      if (!laterError && laterEntries && laterEntries.length > 0) {
        const nextEntry = laterEntries[0]
        if (nextEntry.action === 'clock_in') {
          return NextResponse.json({
            success: false,
            message: 'Cannot delete this clock-out entry because there is a later clock-in entry. This would create data integrity issues.',
            error: 'Data integrity violation'
          } as DeleteTimeEntryResponse, { status: 400 })
        }
      }
    }

    // Parse request body for optional deletion reason
    let deletionReason = 'Entry deleted by admin'
    try {
      const body = await request.json()
      if (body.reason) {
        deletionReason = body.reason
      }
    } catch (error) {
      // No body provided, use default reason
    }

    // Perform the deletion
    const { error: deleteError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .delete()
      .eq('id', entryId)

    if (deleteError) {
      console.error('Error deleting time entry:', deleteError)
      return NextResponse.json({
        success: false,
        message: 'Failed to delete time entry',
        error: deleteError.message
      } as DeleteTimeEntryResponse, { status: 500 })
    }

    // Create audit log
    try {
      const staffName = (entryToDelete.staff as any)?.staff_name || 'Unknown Staff'
      const displayTime = DateTime.fromISO(entryToDelete.timestamp).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
      
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('audit_logs')
        .insert({
          action_type: 'time_entry_deleted',
          changed_by_type: 'admin',
          changed_by_identifier: session.user.email,
          changes_summary: `Deleted ${entryToDelete.action} entry for ${staffName} at ${displayTime}`,
          old_data_snapshot: JSON.stringify({
            entry_id: entryToDelete.id,
            staff_id: entryToDelete.staff_id,
            staff_name: staffName,
            action: entryToDelete.action,
            timestamp: entryToDelete.timestamp,
            photo_captured: entryToDelete.photo_captured
          }),
          new_data_snapshot: JSON.stringify(null),
          reason: deletionReason,
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.warn('Failed to create audit log (non-fatal):', auditError)
    }

    const staffName = (entryToDelete.staff as any)?.staff_name || 'Unknown Staff'
    const displayTime = DateTime.fromISO(entryToDelete.timestamp).setZone('Asia/Bangkok').toFormat('MMM dd, yyyy h:mm a')
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${entryToDelete.action} entry for ${staffName} at ${displayTime}`,
      deleted_entry: {
        entry_id: entryToDelete.id,
        staff_name: staffName,
        action: entryToDelete.action,
        timestamp: displayTime
      }
    } as DeleteTimeEntryResponse)

  } catch (error) {
    console.error('Error in DELETE /api/admin/time-clock/entries/[id]:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as DeleteTimeEntryResponse, { status: 500 })
  }
}