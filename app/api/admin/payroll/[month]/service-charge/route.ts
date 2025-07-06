import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email?.includes('@lengolf') && !session?.user?.email?.includes('@gmail.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { month } = params

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }

    // Get service charge for the specified month
    const { data: serviceChargeData, error: serviceChargeError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('monthly_service_charge')
      .select('*')
      .eq('month_year', month)
      .single()

    if (serviceChargeError && serviceChargeError.code !== 'PGRST116') {
      console.error('Error fetching service charge:', serviceChargeError)
      return NextResponse.json({ error: 'Failed to fetch service charge' }, { status: 500 })
    }

    // If no service charge found, return default
    const serviceCharge = serviceChargeData || {
      month_year: month,
      total_amount: 0,
      created_at: null,
      updated_at: null
    }

    return NextResponse.json({
      month: month,
      service_charge: serviceCharge
    })

  } catch (error) {
    console.error('Service charge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email?.includes('@lengolf') && !session?.user?.email?.includes('@gmail.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { month } = params
    const body = await request.json()
    const { total_amount } = body

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }

    // Validate total_amount
    if (typeof total_amount !== 'number' || total_amount < 0) {
      return NextResponse.json({ error: 'Total amount must be a positive number' }, { status: 400 })
    }

    // Upsert service charge record
    const { data: serviceChargeData, error: serviceChargeError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('monthly_service_charge')
      .upsert(
        {
          month_year: month,
          total_amount: total_amount,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'month_year'
        }
      )
      .select()
      .single()

    if (serviceChargeError) {
      console.error('Error updating service charge:', serviceChargeError)
      return NextResponse.json({ error: 'Failed to update service charge' }, { status: 500 })
    }

    // Get updated calculations with new service charge
    const calculationsResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/payroll/${month}/calculations`,
      {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      }
    )

    let updatedCalculations = null
    if (calculationsResponse.ok) {
      updatedCalculations = await calculationsResponse.json()
    }

    return NextResponse.json({
      success: true,
      message: `Service charge updated to ฿${total_amount.toLocaleString()}`,
      service_charge: serviceChargeData,
      updated_calculations: updatedCalculations
    })

  } catch (error) {
    console.error('Service charge update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 