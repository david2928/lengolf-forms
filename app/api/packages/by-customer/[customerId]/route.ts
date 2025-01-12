import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    // Create a new supabase client with cookies
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Decode the URL-encoded customer name
    const customerName = decodeURIComponent(params.customerId)
    console.log('Looking up packages for customer:', customerName)

    // Using the function for customer packages
    const { data: customerPackages, error } = await supabase
      .rpc('get_packages_by_customer_name', { 
        p_customer_name: customerName
      })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch customer packages', details: error.message },
        { status: 500 }
      )
    }

    console.log('Raw customer packages:', customerPackages)

    if (!customerPackages || customerPackages.length === 0) {
      return NextResponse.json([])
    }

    // Format packages for display
    const formattedPackages = customerPackages.map((pkg: any) => ({
      id: pkg.id,
      label: `${pkg.package_type_name} - ${format(new Date(pkg.first_use_date), 'MM/dd/yyyy')}`,
      details: {
        customerName: pkg.customer_name,
        packageTypeName: pkg.package_type_name,
        firstUseDate: pkg.first_use_date,
        expirationDate: pkg.expiration_date,
        remainingHours: pkg.remaining_hours
      }
    }))

    return NextResponse.json(formattedPackages)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}