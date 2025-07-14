import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDevSession } from '@/lib/dev-session';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { 
  validateStaffName, 
  validateStaffId,
  logStaffAction,
  getStaffById 
} from '@/lib/staff-utils';
import { UpdateStaffRequest } from '@/types/staff';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/[staffId] - Get individual staff details
 * Admin authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const staffId = parseInt(params.staffId);
    if (isNaN(staffId)) {
      return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
    }

    // Get staff member details (excluding pin_hash for security)
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, failed_attempts, locked_until, created_at, updated_at')
      .eq('id', staffId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }
      console.error('Error fetching staff member:', error);
      return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 });
    }

    // Include additional status information
    const staffWithStatus = {
      ...staff,
      is_locked: staff.locked_until ? new Date(staff.locked_until) > new Date() : false,
      time_until_unlock: staff.locked_until ? Math.max(0, Math.floor((new Date(staff.locked_until).getTime() - new Date().getTime()) / 1000)) : 0
    };

    return NextResponse.json({
      success: true,
      data: staffWithStatus
    });

  } catch (error) {
    console.error('Error in GET /api/staff/[staffId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/staff/[staffId] - Update staff information
 * Admin authentication required
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const staffId = parseInt(params.staffId);
    if (isNaN(staffId)) {
      return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
    }

    // Parse request body
    const body: UpdateStaffRequest & { new_pin?: string } = await request.json();
    const { staff_name, staff_id, is_active, new_pin } = body;

    // Get current staff data for audit trail
    const currentStaff = await getStaffById(staffId);
    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Validate updates
    const updates: any = {};
    let changes: string[] = [];

    if (staff_name !== undefined) {
      const nameValidation = validateStaffName(staff_name);
      if (!nameValidation.valid) {
        return NextResponse.json({ error: nameValidation.error }, { status: 400 });
      }
      if (staff_name.trim() !== currentStaff.staff_name) {
        updates.staff_name = staff_name.trim();
        changes.push(`Name: "${currentStaff.staff_name}" → "${staff_name.trim()}"`);
      }
    }

    if (staff_id !== undefined) {
      const staffIdValidation = validateStaffId(staff_id);
      if (!staffIdValidation.valid) {
        return NextResponse.json({ error: staffIdValidation.error }, { status: 400 });
      }

      const trimmedStaffId = staff_id?.trim() || null;
      if (trimmedStaffId !== currentStaff.staff_id) {
        // Check if new staff_id already exists (if provided)
        if (trimmedStaffId) {
          const { data: existingStaffId, error: checkError } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('staff')
            .select('id')
            .eq('staff_id', trimmedStaffId)
            .neq('id', staffId)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking staff ID uniqueness:', checkError);
            return NextResponse.json({ error: 'Database error checking staff ID' }, { status: 500 });
          }

          if (existingStaffId) {
            return NextResponse.json({ error: 'Staff ID already exists' }, { status: 409 });
          }
        }

        updates.staff_id = trimmedStaffId;
        changes.push(`Staff ID: "${currentStaff.staff_id || 'None'}" → "${trimmedStaffId || 'None'}"`);
      }
    }

    if (is_active !== undefined && is_active !== currentStaff.is_active) {
      updates.is_active = is_active;
      changes.push(`Status: ${currentStaff.is_active ? 'Active' : 'Inactive'} → ${is_active ? 'Active' : 'Inactive'}`);
    }

    // Handle PIN reset
    if (new_pin !== undefined) {
      const { validatePinFormat, hashPin } = await import('@/lib/staff-utils');
      
      const pinValidation = validatePinFormat(new_pin);
      if (!pinValidation.valid) {
        return NextResponse.json({ error: pinValidation.error }, { status: 400 });
      }

      try {
        const hashedPin = await hashPin(new_pin);
        updates.pin_hash = hashedPin;
        updates.failed_attempts = 0; // Reset failed attempts when PIN is reset
        updates.locked_until = null; // Unlock account when PIN is reset
        changes.push('PIN reset');
      } catch (error) {
        console.error('Error hashing new PIN:', error);
        return NextResponse.json({ error: 'Error processing new PIN' }, { status: 500 });
      }
    }

    // If no changes, return current data
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        data: currentStaff,
        message: 'No changes were made'
      });
    }

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    // Update staff member
    const { data: updatedStaff, error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update(updates)
      .eq('id', staffId)
      .select('id, staff_name, staff_id, is_active, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating staff member:', updateError);

      // Handle unique constraint violations
      if (updateError.code === '23505') {
        if (updateError.message.includes('staff_id')) {
          return NextResponse.json({ error: 'Staff ID already exists' }, { status: 409 });
        }
      }

      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
    }

    // Log the update in audit trail
    await logStaffAction(
      staffId,
      'updated',
      'admin',
      session.user.email,
      `Staff member updated: ${changes.join(', ')}`,
      'Staff information update',
      {
        staff_name: currentStaff.staff_name,
        staff_id: currentStaff.staff_id,
        is_active: currentStaff.is_active
      },
      {
        staff_name: updatedStaff.staff_name,
        staff_id: updatedStaff.staff_id,
        is_active: updatedStaff.is_active
      }
    );

    console.log('Staff member updated successfully:', {
      id: staffId,
      changes: changes,
      updated_by: session.user.email
    });

    return NextResponse.json({
      success: true,
      data: updatedStaff,
      message: 'Staff member updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/staff/[staffId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/staff/[staffId] - Deactivate staff member
 * Admin authentication required
 * Note: We don't actually delete, just deactivate for audit trail
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const staffId = parseInt(params.staffId);
    if (isNaN(staffId)) {
      return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
    }

    // Get current staff data
    const currentStaff = await getStaffById(staffId);
    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Check if already inactive
    if (!currentStaff.is_active) {
      return NextResponse.json({
        success: true,
        message: 'Staff member is already inactive'
      });
    }

    // Deactivate staff member (soft delete)
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update({
        is_active: false,
        locked_until: null, // Clear any locks when deactivating
        failed_attempts: 0,  // Reset failed attempts
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);

    if (updateError) {
      console.error('Error deactivating staff member:', updateError);
      return NextResponse.json({ error: 'Failed to deactivate staff member' }, { status: 500 });
    }

    // Log the deactivation in audit trail
    await logStaffAction(
      staffId,
      'deactivated',
      'admin',
      session.user.email,
      `Staff member deactivated: ${currentStaff.staff_name}${currentStaff.staff_id ? ` (ID: ${currentStaff.staff_id})` : ''}`,
      'Staff member deactivation',
      {
        staff_name: currentStaff.staff_name,
        staff_id: currentStaff.staff_id,
        is_active: true
      },
      {
        staff_name: currentStaff.staff_name,
        staff_id: currentStaff.staff_id,
        is_active: false
      }
    );

    console.log('Staff member deactivated successfully:', {
      id: staffId,
      staff_name: currentStaff.staff_name,
      deactivated_by: session.user.email
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/staff/[staffId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 