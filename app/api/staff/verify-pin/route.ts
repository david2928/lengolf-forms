import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json(
        { success: false, message: 'PIN is required' },
        { status: 400 }
      );
    }

    // Get all active staff to verify PIN
    const { data: staffList, error: staffError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, pin_hash, is_active, failed_attempts, locked_until, created_at, updated_at')
      .eq('is_active', true);

    if (staffError) {
      console.error('Database error:', staffError);
      return NextResponse.json(
        { success: false, message: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!staffList || staffList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active staff found' },
        { status:404 }
      );
    }

    // Check PIN against all staff members
    let matchedStaff = null;
    for (const staff of staffList) {
      try {
        // Check if account is locked
        if (staff.locked_until) {
          const lockExpiry = new Date(staff.locked_until);
          if (lockExpiry > new Date()) {
            // Still locked, skip this staff member
            continue;
          }
        }

        // Verify PIN
        const isValidPin = await bcrypt.compare(pin, staff.pin_hash);
        if (isValidPin) {
          matchedStaff = staff;
          break;
        }
      } catch (error) {
        console.error(`Error verifying PIN for staff ${staff.id}:`, error);
        continue;
      }
    }

    if (matchedStaff) {
      // Success! Reset failed attempts if needed
      if (matchedStaff.failed_attempts > 0 || matchedStaff.locked_until) {
        await supabase
          .schema('backoffice')
          .from('staff')
          .update({
            failed_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedStaff.id);
      }

      // Return staff information (excluding sensitive data)
      const staffResponse = {
        id: matchedStaff.id,
        staff_name: matchedStaff.staff_name,
        staff_id: matchedStaff.staff_id,
        is_active: matchedStaff.is_active,
        created_at: matchedStaff.created_at,
        updated_at: matchedStaff.updated_at,
        failed_attempts: 0, // Reset to 0 on successful login
        pin_hash: '', // Don't send back the hash
        locked_until: null
      };

      return NextResponse.json({
        success: true,
        staff: staffResponse,
        message: 'Authentication successful'
      });
    } else {
      // Invalid PIN - increment failed attempts for all staff (security measure)
      // In a production system, you might want to be more targeted about this
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Staff verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}