import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: availablePackages, error } = await supabase
      .rpc('get_available_packages')

    if (error) {
      console.error('Error fetching available packages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available packages' },
        { status: 500 }
      )
    }

    // Format packages for display
    const formattedPackages = availablePackages.map((pkg: any) => ({
      id: pkg.id,
      label: `${pkg.customer_name} - ${pkg.package_type_name} - ${format(new Date(pkg.first_use_date), 'MM/dd/yyyy')}`,
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
    console.error('Error in GET /api/packages/available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}