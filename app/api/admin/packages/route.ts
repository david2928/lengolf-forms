import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const customerId = searchParams.get('customer_id');
    const packageTypeId = searchParams.get('package_type_id');
    const status = searchParams.get('status'); // active, expired, expiring
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        *,
        package_types:package_type_id (
          id,
          name,
          hours,
          type,
          display_name
        ),
        package_usage (
          used_hours
        )
      `, { count: 'exact' });

    // Apply search - look up customer by name and show their packages
    if (search) {
      // First try to find customers by name
      const { data: matchingCustomers } = await refacSupabaseAdmin
        .from('customers')
        .select('id, customer_name')
        .ilike('customer_name', `%${search}%`)
        .limit(10);
      
      if (matchingCustomers && matchingCustomers.length > 0) {
        // Filter packages by matching customer IDs
        const customerIds = matchingCustomers.map((c: any) => c.id);
        query = query.in('customer_id', customerIds);
      } else {
        // Fallback to direct customer_name search in packages
        query = query.or(`customer_name.ilike.%${search}%,stable_hash_id.ilike.%${search}%`);
      }
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (packageTypeId) {
      query = query.eq('package_type_id', parseInt(packageTypeId));
    }

    // Status filtering
    const today = new Date().toISOString().split('T')[0];
    if (status === 'active') {
      query = query.gte('expiration_date', today);
    } else if (status === 'expired') {
      query = query.lt('expiration_date', today);
    } else if (status === 'expiring') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      query = query
        .gte('expiration_date', today)
        .lte('expiration_date', weekFromNow.toISOString().split('T')[0]);
    }

    // Sorting and pagination
    const offset = (page - 1) * limit;
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: packages, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate remaining hours for each package
    const packagesWithCalculations = packages.map((pkg: any) => {
      const totalUsedHours = pkg.package_usage.reduce((sum: number, usage: any) => 
        sum + parseFloat(usage.used_hours), 0
      );
      
      const isUnlimited = !pkg.package_types.hours;
      const remainingHours = isUnlimited 
        ? null 
        : Math.max(0, parseFloat(pkg.package_types.hours) - totalUsedHours);

      return {
        ...pkg,
        total_used_hours: totalUsedHours,
        remaining_hours: remainingHours,
        is_unlimited: isUnlimited,
        package_type_name: pkg.package_types.display_name || pkg.package_types.name,
        total_hours: pkg.package_types.hours
      };
    });

    return NextResponse.json({
      data: packagesWithCalculations,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();
    const {
      customer_id,
      customer_name,
      package_type_id,
      purchase_date,
      expiration_date,
      first_use_date,
      employee_name,
      notes
    } = data;

    // Validate required fields
    if (!customer_name || !package_type_id || !purchase_date || !expiration_date) {
      return NextResponse.json(
        { error: 'Customer name, package type, purchase date, and expiration date are required' },
        { status: 400 }
      );
    }

    // Insert package
    const { data: newPackage, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .insert({
        customer_id,
        customer_name,
        package_type_id: parseInt(package_type_id),
        purchase_date,
        expiration_date,
        first_use_date: first_use_date || null,
        employee_name: employee_name || null,
        last_modified_by: session.user.email,
        modification_notes: 'Package created via admin interface'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Package created successfully',
      data: newPackage
    });

  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    );
  }
}