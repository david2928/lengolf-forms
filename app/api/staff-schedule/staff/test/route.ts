import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET() {
  console.log('GET /api/staff-schedule/staff/test - Testing database connection')
  
  try {
    // Test basic connection
    console.log('Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await refacSupabaseAdmin
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'backoffice')
      .limit(10)

    console.log('Connection test result:', { connectionError, tableCount: connectionTest?.length })

    // Test if staff table exists
    console.log('Testing staff table existence...')
    const { data: staffTableTest, error: staffTableError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('*', { count: 'exact', head: true })

    console.log('Staff table test result:', { staffTableError, exists: !staffTableError })

    // Try to get some sample data
    let sampleData = null
    if (!staffTableError) {
      console.log('Fetching sample staff data...')
      const { data: sample, error: sampleError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .select('id, staff_name, staff_id, is_active')
        .limit(5)
      
      console.log('Sample data result:', { sampleError, sampleCount: sample?.length })
      sampleData = sample
    }

    return NextResponse.json({
      success: true,
      debug: {
        connectionTest: {
          error: connectionError,
          tablesFound: connectionTest?.length || 0,
          tables: connectionTest?.map(t => `${t.table_schema}.${t.table_name}`) || []
        },
        staffTableTest: {
          error: staffTableError,
          exists: !staffTableError
        },
        sampleData: {
          count: sampleData?.length || 0,
          data: sampleData
        }
      }
    })

  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        stack: error.stack
      }
    }, { status: 500 })
  }
}
