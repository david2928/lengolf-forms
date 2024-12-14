import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface AvailablePackage {
  id: string;
  customer_name: string;
  package_type_name: string;
  first_use_date: string;
  expiration_date: string;
  remaining_hours: number | null;
  package_type_id: number;
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    const { packageId, employeeName, usedHours, usedDate } = body

    // Validate request body
    if (!packageId || !employeeName || !usedHours || !usedDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get package details to validate hours
    const { data: packageData, error: packageError } = await supabase
      .rpc('get_available_packages')
      .eq('id', packageId)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found or expired' },
        { status: 404 }
      )
    }

    // Type assertion since we know the structure from our function
    const pkg = packageData as AvailablePackage

    // For non-unlimited packages, check if there are enough hours remaining
    if (pkg.remaining_hours !== null) {
      if (usedHours > pkg.remaining_hours) {
        return NextResponse.json(
          { error: 'Not enough hours remaining in package' },
          { status: 400 }
        )
      }
    }

    // Insert usage record
    const { data: usageData, error: usageError } = await supabase
      .from('package_usage')
      .insert({
        package_id: packageId,
        employee_name: employeeName,
        used_hours: usedHours,
        used_date: usedDate,
        package_type_id: pkg.package_type_id // Include package type for reference
      })
      .select()
      .single()

    if (usageError) {
      console.error('Error recording usage:', usageError)
      return NextResponse.json(
        { error: 'Failed to record package usage' },
        { status: 500 }
      )
    }

    return NextResponse.json(usageData)
  } catch (error) {
    console.error('Error in POST /api/packages/usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}