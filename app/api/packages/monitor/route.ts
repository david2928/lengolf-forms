import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// Type definitions for package monitoring
interface PackageType {
  name: string;
  type: string;
  hours?: number;
}

interface DatabasePackage {
  id: string;
  customer_name: string;
  purchase_date: string;
  first_use_date: string | null;
  expiration_date: string | null;
  employee_name: string;
  package_types: PackageType | PackageType[];
}

interface PackageUsage {
  package_id: string;
  used_hours: number;
}

interface TransformedPackage {
  id: string;
  customer_name: string;
  package_type_name?: string;
  package_type?: string;
  purchase_date: string;
  first_use_date: string | null;
  expiration_date: string | null;
  employee_name: string;
  remaining_hours: string;
  used_hours?: number;
  total_hours?: number;
  usage_percentage?: number;
}

export async function GET() {
  try {
    // Use direct SQL instead of stored procedure to avoid potential caching issues
    const { data: unlimitedData, error: unlimitedError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id, customer_name, purchase_date, first_use_date, expiration_date, employee_name,
        package_types!inner(name, type)
      `)
      .eq('package_types.type', 'Unlimited')
      .not('first_use_date', 'is', null)
      .or('expiration_date.is.null,expiration_date.gte.today()')
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .limit(50);

    if (unlimitedError) {
      console.error('Error fetching unlimited packages:', unlimitedError);
      return NextResponse.json(
        { error: 'Failed to fetch package data' },
        { status: 500 }
      );
    }

    // Transform the data to match the stored procedure format
    const unlimited_packages = (unlimitedData || []).map((pkg: DatabasePackage): TransformedPackage => {
      const packageType = Array.isArray(pkg.package_types) ? pkg.package_types[0] : pkg.package_types;
      return {
        id: pkg.id,
        customer_name: pkg.customer_name,
        package_type_name: packageType?.name,
        package_type: packageType?.type,
        purchase_date: pkg.purchase_date,
        first_use_date: pkg.first_use_date,
        expiration_date: pkg.expiration_date,
        employee_name: pkg.employee_name,
        remaining_hours: 'Unlimited'
      };
    });

    // Get expiring packages (within 7 days) using JavaScript date calculation
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysISO = sevenDaysFromNow.toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data: expiringData, error: expiringError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id, customer_name, purchase_date, first_use_date, expiration_date, employee_name,
        package_types!inner(name, type, hours)
      `)
      .not('first_use_date', 'is', null)
      .not('expiration_date', 'is', null)
      .gte('expiration_date', todayISO)
      .lte('expiration_date', sevenDaysISO)
      .order('expiration_date', { ascending: true })
      .limit(50);

    if (expiringError) {
      console.error('Error fetching expiring packages:', expiringError);
    }

    // Calculate usage for expiring packages
    const expiringPackageIds = (expiringData || []).map((p: DatabasePackage) => p.id);
    let expiringUsage: PackageUsage[] = [];
    
    if (expiringPackageIds.length > 0) {
      const { data: usage } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('package_id, used_hours')
        .in('package_id', expiringPackageIds);
      
      expiringUsage = usage || [];
    }

    // Calculate usage by package for expiring packages
    const expiringUsageByPackage = expiringUsage.reduce((acc: Record<string, number>, usage: PackageUsage) => {
      if (!acc[usage.package_id]) {
        acc[usage.package_id] = 0;
      }
      acc[usage.package_id] += usage.used_hours;
      return acc;
    }, {} as Record<string, number>);

    const expiring_packages = (expiringData || []).map((pkg: DatabasePackage): TransformedPackage => {
      const packageType = Array.isArray(pkg.package_types) ? pkg.package_types[0] : pkg.package_types;
      const totalHours = packageType?.hours || 0;
      const usedHours = expiringUsageByPackage[pkg.id] || 0;
      const remainingHours = Math.max(0, totalHours - usedHours);

      return {
        id: pkg.id,
        customer_name: pkg.customer_name,
        package_type_name: packageType?.name,
        package_type: packageType?.type,
        purchase_date: pkg.purchase_date,
        first_use_date: pkg.first_use_date,
        expiration_date: pkg.expiration_date,
        employee_name: pkg.employee_name,
        remaining_hours: packageType?.type === 'Unlimited' ? 'Unlimited' : remainingHours.toString(),
        used_hours: usedHours,
        total_hours: totalHours,
        usage_percentage: totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0
      };
    });

    const data = [{
      unlimited_active: unlimited_packages.length,
      unlimited_packages: unlimited_packages,
      expiring_count: expiring_packages.length,
      expiring_packages: expiring_packages,
      diamond_active: unlimited_packages.filter((pkg: TransformedPackage) => pkg.package_type_name?.toLowerCase().includes('diamond')).length,
      diamond_packages: unlimited_packages.filter((pkg: TransformedPackage) => pkg.package_type_name?.toLowerCase().includes('diamond'))
    }];

    const error = null;

    if (error) {
      console.error('Error fetching package monitor data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch package monitor data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data ? data[0] : {
      unlimited_active: 0,
      unlimited_packages: [],
      expiring_count: 0,
      expiring_packages: [],
      diamond_active: 0,
      diamond_packages: []
    });
  } catch (error) {
    console.error('Error in GET /api/packages/monitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}