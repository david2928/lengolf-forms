import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { calculatePayrollForMonth, getServiceCharge } from '@/lib/payroll-calculations';
import { 
  validateMonthFormat, 
  getUserFriendlyMessage, 
  createPayrollError, 
  PAYROLL_ERROR_CODES 
} from '@/lib/payroll-error-handling';

// GET /api/admin/payroll/[month]/calculations - Returns all payroll calculations for a month
export async function GET(request: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  try {
    const { month } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate month format using enhanced validation
    const monthValidation = validateMonthFormat(month);
    if (!monthValidation.isValid) {
      return NextResponse.json({ 
        error: monthValidation.errors[0],
        details: monthValidation.errors.join(', '),
        warnings: monthValidation.warnings.length > 0 ? monthValidation.warnings : undefined
      }, { status: 400 });
    }

    console.log(`Calculating payroll for month: ${month}`);
    
    // Calculate payroll for the month
    const payrollResults = await calculatePayrollForMonth(month);
    
    // Get staff compensation data for eligibility flags
    const { getStaffCompensation } = await import('@/lib/payroll-calculations');
    const staffCompensation = await getStaffCompensation(month);
    
    // Get service charge information - fix eligibility calculation
    const totalServiceCharge = await getServiceCharge(month);
    const eligibleStaffCount = Array.from(staffCompensation.values())
      .filter(comp => comp.is_service_charge_eligible).length;
    const serviceChargePerStaff = eligibleStaffCount > 0 ? totalServiceCharge / eligibleStaffCount : 0;
    
    // Group results by category for the UI
    const summary = {
      total_staff: payrollResults.length,
      total_regular_hours: payrollResults.reduce((sum, result) => sum + result.total_hours, 0),
      total_ot_hours: payrollResults.reduce((sum, result) => sum + result.overtime_hours, 0),
      total_payroll: payrollResults.reduce((sum, result) => sum + result.total_payout, 0)
    };

    // Format response according to UI requirements
    const response = {
      month,
      summary,
      
      // Staff payroll data for UI tables
      staff_payroll: payrollResults.map(result => {
        const compensation = staffCompensation.get(result.staff_id);
        return {
          staff_id: result.staff_id,
          staff_name: result.staff_name,
          compensation_type: result.compensation_type,
          base_salary: result.base_salary,
          hourly_rate: result.hourly_rate,
          regular_hours: result.total_hours,
          ot_hours: result.overtime_hours,
          ot_pay: result.overtime_pay,
          holiday_hours: result.holiday_hours,
          holiday_pay: result.holiday_pay,
          working_days: result.working_days,
          total_allowance: result.daily_allowance,
          service_charge: result.service_charge,
          total_payout: result.total_payout,
          is_service_charge_eligible: compensation?.is_service_charge_eligible || false
        };
      }),
      
      // Service charge summary
      service_charge_summary: {
        total_amount: totalServiceCharge,
        eligible_staff_count: eligibleStaffCount,
        per_staff_amount: serviceChargePerStaff,
        total_distributed: eligibleStaffCount * serviceChargePerStaff
      },
      
      calculated_at: new Date().toISOString()
    };

    console.log(`Payroll calculation completed for ${payrollResults.length} staff members`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error calculating payroll:', error);
    
    // Handle PayrollError types with user-friendly messages
    if (error instanceof Error && error.message.includes('PAYROLL_ERROR')) {
      try {
        const payrollError = JSON.parse(error.message);
        return NextResponse.json({ 
          error: getUserFriendlyMessage(payrollError),
          details: payrollError.details,
          code: payrollError.code,
          retryable: payrollError.retryable
        }, { status: payrollError.code === PAYROLL_ERROR_CODES.MISSING_COMPENSATION_SETTINGS ? 400 : 500 });
      } catch (parseError) {
        // Fallback if not a proper PayrollError
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to calculate payroll',
      details: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Unable to calculate payroll data. Please check that all staff have compensation settings configured and try again.'
    }, { status: 500 });
  }
}

// POST /api/admin/payroll/[month]/calculations - Refresh calculations (same as GET for now)
export async function POST(request: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  // For now, refresh is the same as GET - just recalculate
  return GET(request, { params });
} 