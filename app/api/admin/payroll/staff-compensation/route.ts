import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET /api/admin/payroll/staff-compensation
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Fetching staff compensation settings...');

    // Get all active staff first
    const { data: allStaff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_service_charge_eligible')
      .eq('is_active', true)
      .order('staff_name');

    if (staffError) {
      console.error('Error fetching all staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff data' },
        { status: 500 }
      );
    }

    // Get compensation settings for active staff
    const staffIds = (allStaff || []).map(s => s.id);
    const { data: compensationData, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_compensation')
      .select(`
        id,
        staff_id,
        base_salary,
        ot_rate_per_hour,
        holiday_rate_per_hour,
        is_service_charge_eligible,
        effective_from,
        effective_to,
        created_at,
        updated_at
      `)
      .in('staff_id', staffIds)
      .order('staff_id, effective_from');

    if (error) {
      console.error('Error fetching compensation settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch compensation settings' },
        { status: 500 }
      );
    }

    // Create a staff lookup map
    const staffLookup = new Map();
    for (const staff of allStaff || []) {
      staffLookup.set(staff.id, staff);
    }

    // Group by staff_id to get current and historical settings
    const staffCompensationMap = new Map();
    
    // Initialize all staff in the map
    for (const staff of allStaff || []) {
      staffCompensationMap.set(staff.id, {
        staff_id: staff.id,
        staff_name: staff.staff_name,
        current_compensation: null,
        compensation_history: []
      });
    }

    // Add compensation data
    for (const comp of compensationData || []) {
      const staffId = comp.staff_id;
      const staffData = staffCompensationMap.get(staffId);
      
      if (staffData) {
        staffData.compensation_history.push(comp);
        
        // Set current compensation (active record where effective_to is null)
        if (!comp.effective_to) {
          staffData.current_compensation = comp;
        }
      }
    }

    const result = Array.from(staffCompensationMap.values());

    console.log(`✅ Retrieved compensation settings for ${result.length} staff members`);

    return NextResponse.json({
      success: true,
      staff_compensation: result,
      total_staff: result.length,
      staff_with_compensation: result.filter(s => s.current_compensation).length,
      staff_without_compensation: result.filter(s => !s.current_compensation).length
    });

  } catch (error) {
    console.error('Error in GET /api/admin/payroll/staff-compensation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payroll/staff-compensation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Creating/updating staff compensation:', body);

    // Validate input
    const {
      staff_id,
      base_salary,
      ot_rate_per_hour,
      holiday_rate_per_hour,
      is_service_charge_eligible,
      effective_from
    } = body;

    if (!staff_id || base_salary === undefined || ot_rate_per_hour === undefined || holiday_rate_per_hour === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: staff_id, base_salary, ot_rate_per_hour, holiday_rate_per_hour' },
        { status: 400 }
      );
    }

    // Validate positive values
    if (base_salary < 0 || ot_rate_per_hour < 0 || holiday_rate_per_hour < 0) {
      return NextResponse.json(
        { error: 'Salary and rates must be positive values' },
        { status: 400 }
      );
    }

    // Validate effective_from date
    const effectiveFromDate = effective_from || new Date().toISOString().split('T')[0];
    if (new Date(effectiveFromDate) > new Date()) {
      return NextResponse.json(
        { error: 'Effective date cannot be in the future' },
        { status: 400 }
      );
    }

    // Verify staff exists
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('id', staff_id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (!staff.is_active) {
      return NextResponse.json(
        { error: 'Cannot update compensation for inactive staff' },
        { status: 400 }
      );
    }

    // Transaction: End current compensation and create new one
    const { data: currentComp, error: currentCompError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_compensation')
      .select('id, effective_from')
      .eq('staff_id', staff_id)
      .is('effective_to', null)
      .single();

    if (currentCompError && currentCompError.code !== 'PGRST116') {
      console.error('Error fetching current compensation:', currentCompError);
      return NextResponse.json(
        { error: 'Failed to fetch current compensation' },
        { status: 500 }
      );
    }

    // If there's an existing active compensation record, end it
    if (currentComp) {
      const { error: updateError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_compensation')
        .update({
          effective_to: new Date(new Date(effectiveFromDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // day before new effective date
          updated_at: new Date().toISOString()
        })
        .eq('id', currentComp.id);

      if (updateError) {
        console.error('Error ending current compensation:', updateError);
        return NextResponse.json(
          { error: 'Failed to end current compensation record' },
          { status: 500 }
        );
      }
    }

    // Create new compensation record
    const { data: newComp, error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_compensation')
      .insert({
        staff_id,
        base_salary,
        ot_rate_per_hour,
        holiday_rate_per_hour,
        is_service_charge_eligible: is_service_charge_eligible !== undefined ? is_service_charge_eligible : true,
        effective_from: effectiveFromDate,
        effective_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new compensation:', insertError);
      return NextResponse.json(
        { error: 'Failed to create new compensation record' },
        { status: 500 }
      );
    }

    // Update staff table service charge eligibility
    const { error: staffUpdateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update({
        is_service_charge_eligible: is_service_charge_eligible !== undefined ? is_service_charge_eligible : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', staff_id);

    if (staffUpdateError) {
      console.warn('Warning: Failed to update staff service charge eligibility:', staffUpdateError);
    }

    console.log(`✅ Successfully created/updated compensation for ${staff.staff_name}`);

    return NextResponse.json({
      success: true,
      message: `Compensation settings updated for ${staff.staff_name}`,
      compensation: newComp,
      staff_name: staff.staff_name
    });

  } catch (error) {
    console.error('Error in POST /api/admin/payroll/staff-compensation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 