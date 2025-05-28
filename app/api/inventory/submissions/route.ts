import { NextRequest, NextResponse } from 'next/server'
import { refacSupabase as supabase } from '@/lib/refac-supabase'
import { CreateSubmissionRequest, CreateSubmissionResponse, SubmissionsApiResponse } from '@/types/inventory'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const staffName = searchParams.get('staff_name')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('inventory_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })

    // Apply filters
    if (date) {
      query = query.eq('submission_date', date)
    }
    if (staffName) {
      query = query.eq('staff_name', staffName)
    }
    if (startDate && endDate) {
      query = query.gte('submission_date', startDate).lte('submission_date', endDate)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: submissions, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Submissions fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory submissions' },
        { status: 500 }
      )
    }

    const response: SubmissionsApiResponse = {
      submissions: submissions || [],
      total: count || 0,
      page,
      limit
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSubmissionRequest = await request.json()

    // Validate required fields
    if (!body.staff_name || !body.submission_date || !body.inventory_data) {
      return NextResponse.json(
        { error: 'Missing required fields: staff_name, submission_date, inventory_data' },
        { status: 400 }
      )
    }

    // Check if submission already exists for this staff and date
    const { data: existingSubmission, error: checkError } = await supabase
      .from('inventory_submissions')
      .select('id')
      .eq('staff_name', body.staff_name)
      .eq('submission_date', body.submission_date)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Check existing submission error:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing submissions' },
        { status: 500 }
      )
    }

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Submission already exists for this staff member and date' },
        { status: 409 }
      )
    }

    // Create new submission
    const { data: newSubmission, error: insertError } = await supabase
      .from('inventory_submissions')
      .insert([{
        staff_name: body.staff_name,
        submission_date: body.submission_date,
        inventory_data: body.inventory_data,
        notes: body.notes || null
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Insert submission error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create inventory submission' },
        { status: 500 }
      )
    }

    const response: CreateSubmissionResponse = {
      success: true,
      submission: newSubmission
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 