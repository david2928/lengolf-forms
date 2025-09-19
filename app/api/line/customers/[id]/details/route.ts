import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: customerId } = await params;

    if (!customerId) {
      return NextResponse.json({
        error: "Missing customer ID"
      }, { status: 400 });
    }

    // Fetch customer basic info
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select(`
        id,
        customer_name,
        customer_code,
        contact_number,
        email,
        total_lifetime_value,
        total_visits,
        last_visit_date,
        customer_profiles
      `)
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({
        error: "Customer not found"
      }, { status: 404 });
    }

    // Fetch only upcoming bookings (soonest first)
    const { data: bookings, error: bookingsError } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        id,
        date,
        start_time,
        duration,
        bay,
        number_of_people,
        status,
        created_at
      `)
      .eq('customer_id', customerId)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future dates
      .order('date', { ascending: true }) // Soonest first
      .limit(1); // Only the next upcoming booking

    // Fetch ALL active packages for this customer (not just package monitor categories)
    const { data: packages, error: packagesError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id,
        customer_name,
        purchase_date,
        first_use_date,
        expiration_date,
        employee_name,
        package_types!inner(
          name,
          type,
          hours
        )
      `)
      .eq('customer_id', customerId)
      .gte('expiration_date', new Date().toISOString().split('T')[0]) // Not expired
      .order('purchase_date', { ascending: false });

    let processedPackages: any[] = [];

    if (packages && !packagesError) {
      // Get usage data for all packages
      const packageIds = packages.map((p: any) => p.id);
      const { data: usageData } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('package_id, used_hours')
        .in('package_id', packageIds);

      // Process packages with usage calculations
      processedPackages = packages.map((pkg: any) => {
        const totalUsed = usageData
          ?.filter((usage: any) => usage.package_id === pkg.id)
          ?.reduce((sum: number, usage: any) => sum + Number(usage.used_hours || 0), 0) || 0;

        const totalHours = Number(pkg.package_types.hours || 0);
        const remainingHours = pkg.package_types.type === 'Unlimited'
          ? 'Unlimited'
          : Math.max(0, totalHours - totalUsed).toString();

        return {
          id: pkg.id,
          customer_name: pkg.customer_name,
          contact_number: customer.phone, // Use customer phone from our record
          package_type_name: pkg.package_types.name,
          package_type: pkg.package_types.type,
          purchase_date: pkg.purchase_date,
          first_use_date: pkg.first_use_date,
          expiration_date: pkg.expiration_date,
          employee_name: pkg.employee_name,
          remaining_hours: remainingHours,
          used_hours: totalUsed,
          hours_remaining: pkg.package_types.type === 'Unlimited' ? null : Math.max(0, totalHours - totalUsed)
        };
      }).filter((pkg: any) => {
        // Only show packages that have remaining hours or are unlimited
        return pkg.package_type === 'Unlimited' || Number(pkg.remaining_hours) > 0;
      });
    }

    // Fetch recent transactions (last 5)
    const { data: transactions, error: transactionsError } = await refacSupabaseAdmin
      .from('pos_transactions')
      .select(`
        id,
        transaction_date,
        total_amount,
        payment_method,
        receipt_number,
        created_at
      `)
      .eq('customer_id', customerId)
      .order('transaction_date', { ascending: false })
      .limit(5);

    // Calculate some quick stats
    const totalActivePackages = processedPackages?.length || 0;
    const totalRemainingHours = processedPackages?.reduce((total: number, pkg: any) => total + (pkg.hours_remaining || 0), 0) || 0;
    const recentTransactionAmount = transactions?.[0]?.total_amount || 0;

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.customer_name,
        code: customer.customer_code,
        phone: customer.contact_number,
        email: customer.email,
        lifetimeValue: customer.total_lifetime_value || 0,
        totalVisits: customer.total_visits || 0,
        lastVisitDate: customer.last_visit_date,
        profiles: customer.customer_profiles
      },
      bookings: bookings || [],
      packages: processedPackages || [],
      transactions: transactions || [],
      stats: {
        totalActivePackages,
        totalRemainingHours,
        recentTransactionAmount
      }
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}