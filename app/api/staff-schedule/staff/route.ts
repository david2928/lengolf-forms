import { NextResponse } from 'next/server'
import { getStaffForUI } from '@/lib/staff-integration'

export async function GET() {
  try {
    // Use the integrated staff utility for consistent data access
    const formattedStaff = await getStaffForUI()

    const response = {
      success: true,
      data: {
        staff: formattedStaff,
        total_staff: formattedStaff.length
      }
    }

    // Set cache headers for performance (staff list doesn't change often)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    })

  } catch (error: any) {
    console.error('Staff list API error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error',
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        code: error.code
      } : undefined
    }, { status: 500 })
  }
}