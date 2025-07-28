import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();
    const serviceChargeAmount = amount || 12000; // Default to ฿12,000
    const monthYear = '2025-06'; // June 2025

    console.log(`Setting service charge for ${monthYear}: ฿${serviceChargeAmount}`);

    // Insert or update service charge for June 2025
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('monthly_service_charge')
      .upsert({
        month_year: monthYear,
        total_amount: serviceChargeAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'month_year'
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting service charge:', error);
      return NextResponse.json({
        error: 'Failed to set service charge',
        details: error.message
      }, { status: 500 });
    }

    // Get eligible staff count for calculation preview
    const { data: eligibleStaff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select(`
        id,
        staff_name,
        staff_compensation!inner (
          is_service_charge_eligible
        )
      `)
      .eq('is_active', true)
      .eq('staff_compensation.is_service_charge_eligible', true);

    if (staffError) {
      console.error('Error fetching eligible staff:', staffError);
    }

    const eligibleCount = eligibleStaff?.length || 0;
    const perStaffAmount = eligibleCount > 0 ? serviceChargeAmount / eligibleCount : 0;

    return NextResponse.json({
      success: true,
      message: 'Service charge set successfully',
      data: {
        month_year: monthYear,
        total_amount: serviceChargeAmount,
        eligible_staff_count: eligibleCount,
        per_staff_amount: perStaffAmount,
        eligible_staff_names: eligibleStaff?.map((s: any) => s.staff_name) || []
      }
    });

  } catch (error) {
    console.error('Error in fix-service-charge endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monthYear = '2025-06';

    // Check current service charge
    const { data: currentCharge, error: chargeError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('monthly_service_charge')
      .select('*')
      .eq('month_year', monthYear)
      .maybeSingle();

    // Get eligible staff
    const { data: eligibleStaff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select(`
        id,
        staff_name,
        staff_compensation!inner (
          is_service_charge_eligible
        )
      `)
      .eq('is_active', true)
      .eq('staff_compensation.is_service_charge_eligible', true);

    return NextResponse.json({
      current_service_charge: currentCharge,
      eligible_staff: eligibleStaff?.map((s: any) => s.staff_name) || [],
      eligible_count: eligibleStaff?.length || 0,
      month_year: monthYear
    });

  } catch (error) {
    console.error('Error in fix-service-charge GET endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 