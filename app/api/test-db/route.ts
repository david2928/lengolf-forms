import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('package_types')
      .select('*')
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}