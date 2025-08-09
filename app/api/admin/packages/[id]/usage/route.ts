import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const packageId = params.id;
    
    const { data: usageRecords, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .select('*')
      .eq('package_id', packageId)
      .order('used_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: usageRecords });

  } catch (error) {
    console.error('Error fetching usage records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage records' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { usedHours, usedDate, employeeName, bookingId, notes } = await request.json();
    const packageId = params.id;

    // Validate inputs
    if (!usedHours || !usedDate || !employeeName) {
      return NextResponse.json(
        { error: 'Used hours, date, and employee name are required' },
        { status: 400 }
      );
    }

    // Insert usage record
    const { data: newUsage, error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .insert({
        package_id: packageId,
        used_hours: parseFloat(usedHours),
        used_date: usedDate,
        employee_name: employeeName,
        booking_id: bookingId || null,
        notes: notes || null,
        modified_by: session.user.email,
        modification_reason: 'Manual usage record added by admin'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      message: 'Usage record added successfully',
      data: newUsage
    });

  } catch (error) {
    console.error('Error adding usage record:', error);
    return NextResponse.json(
      { error: 'Failed to add usage record' },
      { status: 500 }
    );
  }
}