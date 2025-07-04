import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { NextResponse } from 'next/server'

// Force dynamic since this tests DB connection
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_types')
      .select('*')
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data,
      connectionInfo: {
        url: process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
        hasAnon: !!process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
      }
    })
  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}