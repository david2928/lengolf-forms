import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test database connection
    console.log('Testing Supabase connection...')
    
    const { data, error } = await supabase
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
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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