import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { calculatePayrollForMonth } from '@/lib/payroll-calculations';
import { validateMonthFormat, getUserFriendlyMessage, PAYROLL_ERROR_CODES } from '@/lib/payroll-error-handling';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/admin/payroll/[month]/submit
// Returns snapshot status for the given period so the UI can show a warning
// before the user submits (without requiring a full calculation run).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;

    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monthValidation = validateMonthFormat(month);
    if (!monthValidation.isValid) {
      return NextResponse.json(
        { error: monthValidation.errors[0] },
        { status: 400 }
      );
    }

    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('payroll_snapshots')
      .select('status, staff_id, total_payout, calculated_at, calculated_by')
      .eq('period_code', month)
      .neq('status', 'superseded');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch snapshot status', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ status: 'none', staff_count: 0, total_payout: 0, calculated_at: null, calculated_by: null });
    }

    const firstRow = data[0];
    const totalPayout = data.reduce((sum: number, r: { total_payout: number }) => sum + r.total_payout, 0);

    return NextResponse.json({
      status: firstRow.status,
      staff_count: data.length,
      total_payout: totalPayout,
      calculated_at: firstRow.calculated_at,
      calculated_by: firstRow.calculated_by,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch snapshot status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payroll/[month]/submit
// Calculates payroll for the given month and writes results to
// backoffice.payroll_snapshots so the accounting app can import them.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;

    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const calculatedBy = session.user.email;

    // Validate month format (YYYY-MM)
    const monthValidation = validateMonthFormat(month);
    if (!monthValidation.isValid) {
      return NextResponse.json(
        { error: monthValidation.errors[0], details: monthValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check whether a pending snapshot already exists for this period
    const { data: existingRows, error: existingError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('payroll_snapshots')
      .select('id')
      .eq('period_code', month)
      .eq('status', 'pending')
      .limit(1);

    if (existingError) {
      console.error('Error checking existing snapshots:', existingError);
      return NextResponse.json(
        { error: 'Failed to check existing snapshots', details: existingError.message },
        { status: 500 }
      );
    }

    const hasExisting = existingRows && existingRows.length > 0;

    // Run payroll calculation
    console.log(`Calculating payroll for snapshot: ${month}`);
    const payrollResults = await calculatePayrollForMonth(month);

    if (payrollResults.length === 0) {
      return NextResponse.json(
        { error: 'No payroll data found for this period. Ensure staff have time entries and compensation settings configured.' },
        { status: 422 }
      );
    }

    // Mark any existing pending snapshots for this period as superseded
    if (hasExisting) {
      const { error: supersededError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('payroll_snapshots')
        .update({ status: 'superseded' })
        .eq('period_code', month)
        .eq('status', 'pending');

      if (supersededError) {
        console.error('Error superseding existing snapshots:', supersededError);
        return NextResponse.json(
          { error: 'Failed to supersede existing snapshot', details: supersededError.message },
          { status: 500 }
        );
      }
    }

    // Build rows to insert
    const now = new Date().toISOString();
    const rows = payrollResults.map((result) => ({
      period_code: month,
      staff_id: result.staff_id,
      staff_name: result.staff_name,
      compensation_type: result.compensation_type,
      working_days: result.working_days,
      total_hours: result.total_hours,
      overtime_hours: result.overtime_hours,
      holiday_hours: result.holiday_hours,
      base_pay: result.base_pay,
      daily_allowance: result.daily_allowance,
      overtime_pay: result.overtime_pay,
      holiday_pay: result.holiday_pay,
      service_charge: result.service_charge,
      total_payout: result.total_payout,
      status: 'pending',
      calculated_at: now,
      calculated_by: calculatedBy,
    }));

    const { error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('payroll_snapshots')
      .insert(rows);

    if (insertError) {
      console.error('Error inserting payroll snapshots:', insertError);
      return NextResponse.json(
        { error: 'Failed to save payroll snapshot', details: insertError.message },
        { status: 500 }
      );
    }

    const totalPayout = payrollResults.reduce((sum, r) => sum + r.total_payout, 0);

    console.log(`Payroll snapshot submitted for ${month}: ${payrollResults.length} staff, ฿${totalPayout.toFixed(2)} total`);

    return NextResponse.json({
      period_code: month,
      staff_count: payrollResults.length,
      total_payout: totalPayout,
      superseded_existing: hasExisting,
      calculated_by: calculatedBy,
      calculated_at: now,
    });
  } catch (error) {
    console.error('Error submitting payroll snapshot:', error);

    // Surface PayrollError codes with user-friendly messages.
    // createPayrollError returns a plain object (not an Error instance), so check for .code field.
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const payrollError = error as { code: string; message: string; details?: string };
      const details =
        payrollError.details && payrollError.details !== 'Unknown error'
          ? payrollError.details
          : payrollError.code === PAYROLL_ERROR_CODES.INSUFFICIENT_DATA
          ? 'No time entries or compensation data found for this period. Ensure staff have clocked in/out and compensation settings are configured.'
          : payrollError.message;
      return NextResponse.json(
        {
          error: getUserFriendlyMessage(payrollError),
          details,
          code: payrollError.code,
        },
        { status: payrollError.code === PAYROLL_ERROR_CODES.MISSING_COMPENSATION_SETTINGS ? 400 : 422 }
      );
    }

    // Also handle PayrollError serialized into Error.message (older throw pattern)
    if (error instanceof Error && error.message.includes('PAYROLL_ERROR')) {
      try {
        const payrollError = JSON.parse(error.message);
        return NextResponse.json(
          {
            error: getUserFriendlyMessage(payrollError),
            details: payrollError.details,
            code: payrollError.code,
          },
          { status: payrollError.code === PAYROLL_ERROR_CODES.MISSING_COMPENSATION_SETTINGS ? 400 : 422 }
        );
      } catch {
        // fall through to generic handler
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to submit payroll snapshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
