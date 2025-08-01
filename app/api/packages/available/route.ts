import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: availablePackages, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_available_packages')

    if (error) {
      console.error('Error fetching available packages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available packages' },
        { status: 500 }
      )
    }

    // Format packages for display
    const formattedPackages = availablePackages.map((pkg: any) => {
      // Handle packages that haven't been activated yet (first_use_date is null)
      const dateLabel = pkg.first_use_date 
        ? format(new Date(pkg.first_use_date), 'MM/dd/yyyy')
        : 'Not Activated';
      
      const statusPrefix = pkg.is_activated ? '' : '[INACTIVE] ';
      
      return {
        id: pkg.id,
        label: `${statusPrefix}${pkg.customer_name} - ${pkg.package_type_name} - ${dateLabel}`,
        details: {
          customerName: pkg.customer_name,
          packageTypeName: pkg.package_type_name,
          firstUseDate: pkg.first_use_date,
          expirationDate: pkg.expiration_date,
          remainingHours: pkg.remaining_hours,
          isActivated: pkg.is_activated,
          customerId: pkg.customer_id,
          customerCode: pkg.customer_code,
          contactNumber: pkg.contact_number,
          email: pkg.email
        }
      }
    })

    return NextResponse.json(formattedPackages)
  } catch (error) {
    console.error('Error in GET /api/packages/available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}