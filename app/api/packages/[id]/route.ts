import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First fetch the package details with customer information
    const { data: packageData, error: packageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        *, 
        package_types!inner(*)
      `)
      .eq('id', params.id)
      .single()

    if (packageError || !packageData) {
      console.error('Error fetching package:', packageError)
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Fetch customer information separately
    let customerData = null
    if (packageData.customer_id) {
      const { data: customer, error: customerError } = await refacSupabaseAdmin
        .schema('public')
        .from('customers')
        .select('id, customer_name, customer_code, contact_number, email')
        .eq('id', packageData.customer_id)
        .single()
      
      if (!customerError && customer) {
        customerData = customer
      }
    }

    // Then fetch usage history
    const { data: usageData, error: usageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_usage')
      .select('*')
      .eq('package_id', params.id)
      .order('used_date', { ascending: false })

    if (usageError) {
      console.error('Error fetching usage history:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch usage history' },
        { status: 500 }
      )
    }

    // Calculate remaining hours
    const totalUsed = usageData.reduce((sum: any, usage: any) => sum + usage.used_hours, 0)
    const remainingHours = packageData.package_types.hours 
      ? packageData.package_types.hours - totalUsed 
      : null // null for unlimited packages

    // Calculate days remaining - only for activated packages with expiration dates
    let daysRemaining = null
    let isExpired = false
    
    if (packageData.expiration_date && packageData.first_use_date) {
      const today = new Date()
      const expiryDate = new Date(packageData.expiration_date)
      daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      isExpired = daysRemaining < 0
    }

    const packageDetails = {
      ...packageData,
      customer: customerData,
      remainingHours,
      daysRemaining,
      usageHistory: usageData,
      isExpired,
      totalUsedHours: totalUsed
    }

    return NextResponse.json(packageDetails)
  } catch (error) {
    console.error('Error in GET /api/packages/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}