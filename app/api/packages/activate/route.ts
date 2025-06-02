import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { packageId, activationDate } = await request.json()

    if (!packageId || !activationDate) {
      return NextResponse.json(
        { error: 'Package ID and activation date are required' },
        { status: 400 }
      )
    }

    // First, get the package details to calculate expiration
    const { data: packageData, error: fetchError } = await supabase
      .from('packages')
      .select('*, package_types!inner(*)')
      .eq('id', packageId)
      .single()

    if (fetchError || !packageData) {
      console.error('Error fetching package:', fetchError)
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Check if package is already activated
    if (packageData.first_use_date) {
      return NextResponse.json(
        { error: 'Package is already activated' },
        { status: 400 }
      )
    }

    // Calculate expiration date based on package type validity period
    const activationDateObj = new Date(activationDate)
    const expirationDate = new Date(activationDateObj)
    
    // Default to 365 days if validity_days is null or invalid
    const validityDays = packageData.package_types.validity_days || 365
    expirationDate.setDate(activationDateObj.getDate() + validityDays)

    // Validate that the calculated expiration date is valid
    if (isNaN(expirationDate.getTime())) {
      console.error('Invalid expiration date calculated:', {
        activationDate,
        validityDays,
        packageType: packageData.package_types.name
      })
      return NextResponse.json(
        { error: 'Failed to calculate expiration date' },
        { status: 500 }
      )
    }

    // Update the package with first_use_date and expiration_date
    const { error: updateError } = await supabase
      .from('packages')
      .update({
        first_use_date: activationDate,
        expiration_date: expirationDate.toISOString().split('T')[0]
      })
      .eq('id', packageId)

    if (updateError) {
      console.error('Error updating package:', updateError)
      return NextResponse.json(
        { error: 'Failed to activate package' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Package activated successfully',
      activationDate,
      expirationDate: expirationDate.toISOString().split('T')[0]
    })

  } catch (error) {
    console.error('Error in POST /api/packages/activate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 