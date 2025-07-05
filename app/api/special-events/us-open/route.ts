import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

interface USOpenSubmission {
  employee: string
  date: string
  customer_id: number
  stableford_score: number
  stroke_score: number
  stableford_screenshot_url: string
  stroke_screenshot_url: string
}

export async function POST(request: NextRequest) {
  try {
    const body: USOpenSubmission = await request.json()

    // Validate required fields
    if (!body.employee || !body.date || !body.customer_id || 
        body.stableford_score === undefined || body.stroke_score === undefined ||
        !body.stableford_screenshot_url || !body.stroke_screenshot_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert the US Open score record
    const { data, error } = await refacSupabaseAdmin
      .from('us_open_scores')
      .insert([{
        employee: body.employee,
        date: body.date,
        customer_id: body.customer_id,
        stableford_score: body.stableford_score,
        stroke_score: body.stroke_score,
        stableford_screenshot_url: body.stableford_screenshot_url,
        stroke_screenshot_url: body.stroke_screenshot_url,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('Error inserting US Open score:', error)
      return NextResponse.json(
        { error: 'Failed to save US Open scores', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'US Open scores submitted successfully',
        data: data?.[0]
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in US Open API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 