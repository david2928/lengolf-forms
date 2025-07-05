import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase'
import { CreateSubmissionRequest, CreateSubmissionResponse, SubmissionsApiResponse } from '@/types/inventory'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const staff = searchParams.get('staff')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const productId = searchParams.get('product_id')

    // Query the simplified table structure
    let query = supabase
      .from('inventory_submission')
      .select(`
        *,
        product:inventory_products(name, unit, input_type),
        category:inventory_categories(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (date) {
      query = query.eq('date', date)
    }
    if (staff) {
      query = query.eq('staff', staff)
    }
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }
    if (productId) {
      query = query.eq('product_id', productId)
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
    const body = await request.json() as CreateSubmissionRequest
    
    // Validate required fields
    if (!body.staff_name || !body.submission_date || !body.products || body.products.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: staff_name, submission_date, products' },
        { status: 400 }
      )
    }

    // Prepare submissions for the table structure
    const submissions = body.products.map(product => ({
      date: body.submission_date,
      staff: body.staff_name,
      product_id: product.product_id,
      category_id: product.category_id,
      value_numeric: product.value_numeric || null,
      value_text: product.value_text || null,
      value_json: product.value_json || null,
      note: product.note || null
    }))

    // Validate that each submission has at least one value field
    for (const submission of submissions) {
      if (!submission.value_numeric && !submission.value_text && !submission.value_json) {
        // Default to 0 for numeric value to satisfy constraint
        submission.value_numeric = 0
      }
    }

    // Insert submissions into the table
    const { data: newSubmissions, error: insertError } = await supabase
      .from('inventory_submission')
      .insert(submissions)
      .select(`
        *,
        product:inventory_products(name, unit, input_type),
        category:inventory_categories(name)
      `)

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Submission already exists for one or more products for this staff member and date' },
          { status: 409 }
        )
      }
      console.error('Insert submissions error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create inventory submissions' },
        { status: 500 }
      )
    }

    const response: CreateSubmissionResponse = {
      success: true,
      submissions: newSubmissions || []
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