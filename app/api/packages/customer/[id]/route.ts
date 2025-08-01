/**
 * Customer Packages API - By Customer ID
 * Fetches package history for a specific customer using their UUID
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = params.id;
    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('include_expired') === 'true';
    const includeUsed = searchParams.get('include_used') === 'true';

    // Validate customer exists
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, contact_number')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get packages directly from database using customer_id
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
          id,
          name,
          display_name,
          hours,
          type
        )
      `)
      .eq('customer_id', customerId)
      .order('purchase_date', { ascending: false });

    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
    }

    // Get package usage for each package
    const packageIds = (packages || []).map((p: any) => p.id);
    let packageUsage: any[] = [];
    
    if (packageIds.length > 0) {
      const { data: usage } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('package_id, used_hours')
        .in('package_id', packageIds);
      
      packageUsage = usage || [];
    }

    // Calculate usage by package
    const usageByPackage = packageUsage.reduce((acc, usage) => {
      if (!acc[usage.package_id]) {
        acc[usage.package_id] = 0;
      }
      acc[usage.package_id] += usage.used_hours;
      return acc;
    }, {} as Record<string, number>);

    // Format packages with usage information
    const formattedPackages = (packages || []).map((pkg: any) => {
      const packageType = pkg.package_types;
      const totalHours = packageType?.hours || 0;
      const usedHours = usageByPackage[pkg.id] || 0;
      const remainingHours = totalHours - usedHours;

      // Determine status
      let status: 'active' | 'expired' | 'unused' | 'fully_used' | 'unlimited' = 'active';
      
      if (packageType?.type === 'Unlimited') {
        if (pkg.expiration_date && new Date(pkg.expiration_date) < new Date()) {
          status = 'expired';
        } else {
          status = 'unlimited';
        }
      } else {
        if (!pkg.first_use_date) {
          status = 'unused';
        } else if (pkg.expiration_date && new Date(pkg.expiration_date) < new Date()) {
          status = 'expired';
        } else if (remainingHours <= 0) {
          status = 'fully_used';
        } else {
          status = 'active';
        }
      }

      const usagePercentage = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

      return {
        id: pkg.id,
        package_name: packageType?.display_name || packageType?.name || 'Unknown Package',
        package_type: packageType?.type || 'Unknown',
        purchase_date: pkg.purchase_date,
        expiration_date: pkg.expiration_date,
        first_use_date: pkg.first_use_date,
        uses_remaining: packageType?.type === 'Unlimited' ? 999999 : Math.max(0, remainingHours),
        original_uses: packageType?.type === 'Unlimited' ? 999999 : totalHours,
        used_hours: usedHours,
        status: status,
        usage_percentage: packageType?.type === 'Unlimited' ? 0 : usagePercentage,
        employee_name: pkg.employee_name
      };
    });

    // Apply filters
    let filteredPackages = formattedPackages;
    
    if (!includeExpired) {
      filteredPackages = filteredPackages.filter((p: any) => p.status !== 'expired');
    }
    
    if (!includeUsed) {
      filteredPackages = filteredPackages.filter((p: any) => p.status !== 'fully_used');
    }

    // Calculate summary
    const activePackages = formattedPackages.filter((p: any) => p.status === 'active' || p.status === 'unlimited').length;
    const expiredPackages = formattedPackages.filter((p: any) => p.status === 'expired').length;
    const unusedPackages = formattedPackages.filter((p: any) => p.status === 'unused').length;
    const fullyUsedPackages = formattedPackages.filter((p: any) => p.status === 'fully_used').length;

    return NextResponse.json({
      packages: filteredPackages,
      summary: {
        total: formattedPackages.length,
        active: activePackages,
        expired: expiredPackages,
        unused: unusedPackages,
        fully_used: fullyUsedPackages
      },
      customer: {
        id: customer.id,
        name: customer.customer_name,
        phone: customer.contact_number
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer packages:', error);
    return NextResponse.json(
      { error: "Failed to fetch packages", details: error.message },
      { status: 500 }
    );
  }
}