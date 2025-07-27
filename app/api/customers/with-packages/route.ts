import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const useNewSystem = searchParams.get('useNewSystem') !== 'false'; // Default to new system
    
    let data, error;
    
    if (useNewSystem) {
      // Start with packages table, then manually join customer information
      let packageQuery = refacSupabaseAdmin
        .schema('backoffice')
        .from('packages')
        .select('customer_id')
        .not('customer_id', 'is', null);

      // Add active packages filter if specified
      if (active === 'true') {
        const today = new Date().toISOString().split('T')[0];
        packageQuery = packageQuery.gte('expiration_date', today);
      }

      const { data: packagesData, error: packageError } = await packageQuery;

      if (!packageError && packagesData) {
        // Get unique customer IDs
        const customerIds = Array.from(new Set(packagesData.map((pkg: any) => pkg.customer_id)));

        if (customerIds.length > 0) {
          // Query customers table with search filter
          let customerQuery = refacSupabaseAdmin
            .from('customers')
            .select('id, customer_name, contact_number, customer_code')
            .in('id', customerIds)
            .eq('is_active', true);

          // Add search filter if provided
          if (search && search.trim()) {
            customerQuery = customerQuery.or(
              `customer_name.ilike.%${search}%,contact_number.ilike.%${search}%,customer_code.ilike.%${search}%`
            );
          }

          const { data: customersData, error: customerError } = await customerQuery;

          if (!customerError && customersData) {
            // Transform to expected format
            data = customersData
              .map(customer => ({
                customer_id: customer.id,
                customer_name: customer.contact_number 
                  ? `${customer.customer_name} (${customer.contact_number})`
                  : customer.customer_name,
                has_active_packages: true
              }))
              .sort((a, b) => a.customer_name.localeCompare(b.customer_name));
          } else {
            error = customerError;
          }
        } else {
          data = [];
        }
      } else {
        error = packageError;
      }
    } else {
      // Legacy function for backward compatibility - add basic search support
      ({ data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .rpc('get_customers_with_packages', {
          p_active_only: active === null ? null : active === 'true'
        }));

      // Client-side filtering for legacy mode if search provided
      if (!error && data && search && search.trim()) {
        const searchTerm = search.toLowerCase();
        data = data.filter((customer: any) => 
          customer.customer_name?.toLowerCase().includes(searchTerm)
        );
      }
    }

    if (error) {
      console.error('Error fetching customers with packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers with packages' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/customers/with-packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}