import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { 
  hashPin, 
  validatePinFormat, 
  validateStaffName, 
  validateStaffId,
  logStaffAction,
  getActiveStaff 
} from '@/lib/staff-utils';
import { CreateStaffRequest, Staff } from '@/types/staff';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/staff - List all staff members
 * Admin authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build query
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, failed_attempts, locked_until, created_at, updated_at')
      .order('staff_name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: staff, error } = await query;

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staff members' },
        { status: 500 }
      );
    }

    // Format response (exclude pin_hash for security)
    const formattedStaff = staff?.map(member => ({
      id: member.id,
      staff_name: member.staff_name,
      staff_id: member.staff_id,
      is_active: member.is_active,
      failed_attempts: member.failed_attempts,
      is_locked: member.locked_until ? new Date(member.locked_until) > new Date() : false,
      locked_until: member.locked_until,
      created_at: member.created_at,
      updated_at: member.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedStaff,
      count: formattedStaff.length
    });

  } catch (error) {
    console.error('Error in GET /api/staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff - Create new staff member
 * Admin authentication required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body: CreateStaffRequest = await request.json();
    const { staff_name, staff_id, pin } = body;

    // Validate required fields
    if (!staff_name || !pin) {
      return NextResponse.json(
        { error: 'Staff name and PIN are required' },
        { status: 400 }
      );
    }

    // Validate staff name
    const nameValidation = validateStaffName(staff_name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate staff ID if provided
    if (staff_id) {
      const staffIdValidation = validateStaffId(staff_id);
      if (!staffIdValidation.valid) {
        return NextResponse.json(
          { error: staffIdValidation.error },
          { status: 400 }
        );
      }

      // Check if staff_id already exists
      const { data: existingStaffId, error: checkError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .select('id')
        .eq('staff_id', staff_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking staff ID uniqueness:', checkError);
        return NextResponse.json(
          { error: 'Database error checking staff ID' },
          { status: 500 }
        );
      }

      if (existingStaffId) {
        return NextResponse.json(
          { error: 'Staff ID already exists' },
          { status: 409 }
        );
      }
    }

    // Validate PIN format
    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { error: pinValidation.error },
        { status: 400 }
      );
    }

    // Hash the PIN
    let hashedPin: string;
    try {
      hashedPin = await hashPin(pin);
    } catch (error) {
      console.error('Error hashing PIN:', error);
      return NextResponse.json(
        { error: 'Error processing PIN' },
        { status: 500 }
      );
    }

    // Create staff member
    const { data: newStaff, error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .insert({
        staff_name: staff_name.trim(),
        staff_id: staff_id?.trim() || null,
        pin_hash: hashedPin,
        is_active: true,
        failed_attempts: 0
      })
      .select('id, staff_name, staff_id, is_active, created_at')
      .single();

    if (insertError) {
      console.error('Error creating staff member:', insertError);
      
      // Handle unique constraint violations
      if (insertError.code === '23505') {
        if (insertError.message.includes('staff_id')) {
          return NextResponse.json(
            { error: 'Staff ID already exists' },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to create staff member' },
        { status: 500 }
      );
    }

    // Log the creation in audit trail
    await logStaffAction(
      newStaff.id,
      'created',
      'admin',
      session.user.email,
      `Staff member created: ${staff_name}${staff_id ? ` (ID: ${staff_id})` : ''}`,
      'New staff member creation',
      null,
      {
        staff_name: newStaff.staff_name,
        staff_id: newStaff.staff_id,
        is_active: newStaff.is_active
      }
    );

    console.log('Staff member created successfully:', {
      id: newStaff.id,
      staff_name: newStaff.staff_name,
      staff_id: newStaff.staff_id,
      created_by: session.user.email
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newStaff.id,
        staff_name: newStaff.staff_name,
        staff_id: newStaff.staff_id,
        is_active: newStaff.is_active,
        created_at: newStaff.created_at
      },
      message: 'Staff member created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 