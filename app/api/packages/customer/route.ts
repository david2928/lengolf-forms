import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const customerPhone = searchParams.get('customerPhone');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const bookingDate = searchParams.get('bookingDate'); // New parameter for booking date

    // Use booking date if provided, otherwise use current date
    const dateToUse = bookingDate || new Date().toISOString().split('T')[0];

    // Prefer customerId over customerName for new system
    if (customerId) {
      // Use the new date-aware function for customer_id lookups
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .rpc('get_customer_packages_by_id_and_date', {
          p_customer_id: customerId,
          p_booking_date: dateToUse,
          p_active: includeInactive ? null : true
        });

      if (error) {
        console.error('Error fetching customer packages by ID:', error);
        return NextResponse.json(
          { error: 'Failed to fetch packages' },
          { status: 500 }
        );
      }

      // Transform the data to add is_active field and other required fields
      const transformedData = (data || []).map((pkg: any) => {
        const isActivated = pkg.is_activated;
        const now = new Date();
        const expirationDate = pkg.expiration_date ? new Date(pkg.expiration_date) : null;
        const hasRemainingHours = pkg.package_type === 'Unlimited' || (pkg.remaining_hours && pkg.remaining_hours > 0);
        
        // Use booking date for expiration check instead of current date
        const bookingDateObj = new Date(dateToUse);
        const isActive = !isActivated || 
                        (isActivated && 
                         (!expirationDate || expirationDate.getTime() >= bookingDateObj.setHours(0,0,0,0)) && 
                         (pkg.package_type === 'Unlimited' || (pkg.remaining_hours && pkg.remaining_hours > 0)));

        return {
          ...pkg,
          id: pkg.id,
          name: pkg.package_type_name,
          status: !isActivated ? 'not_activated' : 'active',
          sessions_used: pkg.used_hours || 0,
          sessions_total: pkg.package_type === 'Unlimited' ? null : pkg.remaining_hours + (pkg.used_hours || 0),
          expiry_date: pkg.expiration_date,
          is_active: isActive
        };
      });

      return NextResponse.json({ packages: transformedData });
    }

    // Fallback to legacy customer name lookup
    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer ID or name is required' },
        { status: 400 }
      );
    }

    // Call the new date-aware function for backward compatibility
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_customer_packages_by_date', {
        p_customer_name: decodeURIComponent(customerName),
        p_booking_date: dateToUse,
        p_active: includeInactive ? null : true
      });

    if (error) {
      console.error('Error fetching customer packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      );
    }

    // Transform the data to add is_active field and other required fields
    const transformedData = (data || []).map((pkg: any) => {
      // Calculate if the package is currently active/available
      const isActivated = pkg.is_activated;
      const now = new Date();
      const expirationDate = pkg.expiration_date ? new Date(pkg.expiration_date) : null;
      const hasRemainingHours = pkg.package_type === 'Unlimited' || (pkg.remaining_hours && pkg.remaining_hours > 0);
      
      // A package is active if:
      // 1. It's not activated yet (can be activated), OR
      // 2. It's activated AND not expired on booking date AND (unlimited OR has remaining hours)
      const bookingDateObj = new Date(dateToUse);
      const isActive = !isActivated || 
                      (isActivated && 
                       (!expirationDate || expirationDate.getTime() >= bookingDateObj.setHours(0,0,0,0)) && 
                       (pkg.package_type === 'Unlimited' || (pkg.remaining_hours && pkg.remaining_hours > 0)));

      return {
        ...pkg,
        id: pkg.id,
        name: pkg.package_type_name,
        status: !isActivated ? 'not_activated' : 'active',
        sessions_used: pkg.used_hours || 0,
        sessions_total: pkg.package_type === 'Unlimited' ? null : pkg.remaining_hours + (pkg.used_hours || 0),
        expiry_date: pkg.expiration_date,
        is_active: isActive
      };
    });

    return NextResponse.json({ packages: transformedData });
  } catch (error) {
    console.error('Error in GET /api/packages/customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}