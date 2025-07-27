import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { verifyStaffPin } from '@/lib/staff-utils';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pin, deviceId } = await request.json();

    if (!pin) {
      return NextResponse.json({
        success: false,
        message: 'PIN is required'
      }, { status: 400 });
    }

    // Verify the PIN using the staff-utils function
    const result = await verifyStaffPin(pin, deviceId);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message,
        is_locked: result.is_locked,
        lock_expires_at: result.lock_expires_at
      }, { status: 401 });
    }

    // Return success with staff details
    return NextResponse.json({
      success: true,
      staff: {
        id: result.staff_id,
        name: result.staff_name
      },
      message: result.message,
      currently_clocked_in: result.currently_clocked_in
    });

  } catch (error) {
    console.error('Error verifying staff PIN:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during PIN verification'
    }, { status: 500 });
  }
}