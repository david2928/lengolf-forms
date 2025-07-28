import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug endpoint called');
    
    // Check authentication first
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Authentication OK');
    
    // Use the existing refac supabase client
    const supabase = refacSupabaseAdmin;
    console.log('Supabase client ready');

    const results = {
      timestamp: new Date().toISOString(),
      checks: [] as any[]
    };

    // Check 1: Do the new staff members exist?
    console.log('Testing new staff query...');
    try {
      const { data: staffData, error: staffError } = await supabase
        .schema('backoffice')
        .from('staff')
        .select('*')
        .in('staff_name', ['Dolly', 'Net', 'May', 'Winnie']);
      
      console.log('Staff query result:', { data: staffData, error: staffError });
      
      results.checks.push({
        check: 'Staff Records',
        success: !staffError,
        error: staffError?.message,
        data: staffData,
        summary: staffData ? `Found ${staffData.length} staff members` : 'No staff found'
      });
      
      // Check 2: Compensation records
      if (staffData && staffData.length > 0) {
        console.log('Testing compensation query...');
        const staffIds = staffData.map((s: any) => s.id);
        const { data: compensationData, error: compensationError } = await supabase
          .schema('backoffice')
          .from('staff_compensation')
          .select('*')
          .in('staff_id', staffIds);

        results.checks.push({
          check: 'Compensation Records',
          success: !compensationError,
          error: compensationError?.message,
          data: compensationData,
          summary: compensationData ? `Found ${compensationData.length} compensation records` : 'No compensation found'
        });
        
        // Check 3: Time entries for June 2025
        console.log('Testing time entries query...');
        const { data: timeData, error: timeError } = await supabase
          .schema('backoffice')
          .from('time_entries')
          .select('*')
          .in('staff_id', staffIds)
          .gte('timestamp', '2025-06-01T00:00:00')
          .lte('timestamp', '2025-06-30T23:59:59');

        results.checks.push({
          check: 'Time Entries (June 2025)',
          success: !timeError,
          error: timeError?.message,
          data: timeData,
          summary: timeData ? `Found ${timeData.length} time entries` : 'No time entries found'
        });
        
        // Check 4: Service charge eligibility analysis
        if (compensationData) {
          const analysis = staffData.map((staff: any) => {
            const compensation = compensationData.find((comp: any) => comp.staff_id === staff.id);
            return {
              staff_name: staff.staff_name,
              staff_table_eligible: staff.is_service_charge_eligible,
              compensation_table_eligible: compensation?.is_service_charge_eligible,
              match: staff.is_service_charge_eligible === compensation?.is_service_charge_eligible,
              base_salary: compensation?.base_salary,
              effective_from: compensation?.effective_from
            };
          });

          results.checks.push({
            check: 'Service Charge Eligibility Analysis',
            success: true,
            data: analysis,
            summary: `${analysis.filter((a: any) => a.match).length}/${analysis.length} staff have matching eligibility`
          });
        }
      }
      
    } catch (error) {
      console.error('Staff query failed:', error);
      results.checks.push({
        check: 'Staff Records',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
        summary: 'Query failed'
      });
    }

    console.log('Returning results:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 