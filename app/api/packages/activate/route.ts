import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { packageId, firstUseDate, employeeName } = await request.json()

    if (!packageId || !firstUseDate) {
      return NextResponse.json(
        { error: 'Package ID and first use date are required' },
        { status: 400 }
      )
    }

    // Update the package with first use date
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .update({
        first_use_date: firstUseDate,
        employee_name: employeeName || null
      })
      .eq('id', packageId)

    if (updateError) {
      console.error('Error activating package:', updateError)
      return NextResponse.json(
        { error: 'Failed to activate package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/packages/activate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 