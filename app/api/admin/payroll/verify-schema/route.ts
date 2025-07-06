import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Schema verification endpoint for Story #1
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Verifying payroll schema...');

    // Check if each required table exists
    const requiredTables = [
      'public_holidays',
      'staff_compensation', 
      'payroll_settings',
      'monthly_service_charge'
    ];

    const tableStatus = [];

    for (const tableName of requiredTables) {
      try {
        const { count, error } = await refacSupabaseAdmin
          .schema('backoffice')
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        tableStatus.push({ 
          table: tableName, 
          exists: !error, 
          count: error ? null : count,
          error: error?.message || null 
        });
      } catch (err) {
        tableStatus.push({ 
          table: tableName, 
          exists: false, 
          count: null,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Check staff table column
    let staffColumnExists = false;
    try {
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .select('is_service_charge_eligible')
        .limit(1);
      staffColumnExists = !error;
    } catch (err) {
      staffColumnExists = false;
    }

    const allTablesExist = tableStatus.every(table => table.exists);
    const schemaComplete = allTablesExist && staffColumnExists;

    return NextResponse.json({
      schema_complete: schemaComplete,
      tables_status: tableStatus,
      staff_column_added: staffColumnExists,
      migration_required: !schemaComplete
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Verification failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 