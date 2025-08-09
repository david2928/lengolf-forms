import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { usageId: string } }
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

    const { usedHours, usedDate, employeeName, bookingId, notes, modificationReason } = await request.json();
    const usageId = params.usageId;

    // Validate inputs
    if (!usedHours || !usedDate || !employeeName) {
      return NextResponse.json(
        { error: 'Used hours, date, and employee name are required' },
        { status: 400 }
      );
    }

    // Update usage record
    const { data: updatedUsage, error } = await refacSupabaseAdmin
      .from('package_usage')
      .update({
        used_hours: parseFloat(usedHours),
        used_date: usedDate,
        employee_name: employeeName,
        booking_id: bookingId || null,
        notes: notes || null,
        modified_by: session.user.email,
        modification_reason: modificationReason || 'Usage record updated by admin'
      })
      .eq('id', usageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Usage record updated successfully',
      data: updatedUsage
    });

  } catch (error) {
    console.error('Error updating usage record:', error);
    return NextResponse.json(
      { error: 'Failed to update usage record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { usageId: string } }
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

    const usageId = params.usageId;

    // Delete usage record
    const { error } = await refacSupabaseAdmin
      .from('package_usage')
      .delete()
      .eq('id', usageId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Usage record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting usage record:', error);
    return NextResponse.json(
      { error: 'Failed to delete usage record' },
      { status: 500 }
    );
  }
}