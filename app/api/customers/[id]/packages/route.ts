/**
 * Customer Packages API
 * Fetches package history for a specific customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

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
    const status = searchParams.get('status'); // 'active', 'expired', or null for all

    // Get customer info first  
    const { data: customer } = await refacSupabaseAdmin
      .from('customers')
      .select('customer_name, contact_number')
      .eq('id', customerId)
      .single();

    if (!customer) {
      return NextResponse.json({
        packages: [],
        summary: { total: 0, active: 0, expired: 0, unused: 0 }
      });
    }

    // Get packages using the corrected customer ID endpoint
    let packages = [];
    let packageData: any = {};
    
    try {
      const packageResponse = await fetch(`http://localhost:3000/api/packages/customer/${customerId}?include_expired=true&include_used=true`);
      if (packageResponse.ok) {
        packageData = await packageResponse.json();
        packages = packageData.packages || [];
      }
    } catch (error) {
      console.log('Could not fetch from packages API, falling back to direct query');
    }

    // If no packages from API, fall back to direct database query
    if (packages.length === 0) {
      let query = refacSupabaseAdmin
        .schema('backoffice')
        .from('packages')
        .select(`
          id,
          customer_name,
          purchase_date,
          expiration_date,
          first_use_date,
          created_at,
          package_types!inner(
            name,
            display_name,
            hours,
            type
          )
        `)
        .eq('customer_id', customerId)
        .order('purchase_date', { ascending: false });

      const { data: dbPackages } = await query;
      packages = dbPackages || [];
    }

    // Format packages - if from new API, they're already properly formatted
    let formattedPackages = packages;
    
    // If packages came from the fallback database query, format them
    if (packages.length > 0 && !packages[0].package_name) {
      formattedPackages = packages.map((pkg: any) => {
        let packageStatus: 'active' | 'expired' | 'unused' = 'active';
        
        if (pkg.expiration_date && new Date(pkg.expiration_date) < new Date()) {
          packageStatus = 'expired';
        } else if (!pkg.first_use_date) {
          packageStatus = 'unused';
        }

        const packageType = pkg.package_types;
        const totalHours = packageType?.hours || 0;
        const usedHours = 0; // Would need package_usage join
        const remainingHours = totalHours - usedHours;

        return {
          id: pkg.id,
          package_name: packageType?.display_name || packageType?.name || 'Unknown Package',
          purchase_date: pkg.purchase_date,
          expiration_date: pkg.expiration_date,
          first_use_date: pkg.first_use_date,
          uses_remaining: remainingHours,
          original_uses: totalHours,
          used_hours: usedHours,
          status: packageStatus,
          usage_percentage: totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0
        };
      });
    }

    // Apply status filter if provided
    let filteredPackages = formattedPackages;
    if (status === 'active') {
      filteredPackages = formattedPackages.filter((p: any) => p.status === 'active');
    } else if (status === 'expired') {
      filteredPackages = formattedPackages.filter((p: any) => p.status === 'expired');
    }

    // Use summary from new API if available, otherwise calculate
    let summary;
    if (packageData.summary) {
      summary = packageData.summary;
    } else {
      const activePackages = filteredPackages.filter((p: any) => p.status === 'active' || p.status === 'unlimited').length;
      const expiredPackages = filteredPackages.filter((p: any) => p.status === 'expired').length;
      const unusedPackages = filteredPackages.filter((p: any) => p.status === 'unused').length;
      const fullyUsedPackages = filteredPackages.filter((p: any) => p.status === 'fully_used').length;

      summary = {
        total: filteredPackages.length,
        active: activePackages,
        expired: expiredPackages,
        unused: unusedPackages,
        fully_used: fullyUsedPackages
      };
    }

    return NextResponse.json({
      packages: filteredPackages,
      summary: summary
    });

  } catch (error: any) {
    console.error('Error fetching customer packages:', error);
    return NextResponse.json(
      { error: "Failed to fetch packages", details: error.message },
      { status: 500 }
    );
  }
}