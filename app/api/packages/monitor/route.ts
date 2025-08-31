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
  contact_number: string;
  package_type_name: string;
  package_type: string;
  purchase_date: string;
  first_use_date: string | null;
  expiration_date: string | null;
  employee_name: string;
  remaining_hours: string;
  used_hours?: number;
}

interface PackageUsage {
  package_id: string;
  used_hours: number;
}

interface TransformedPackage {
  id: string;
  customer_name: string;
  contact_number: string;
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
    // Use the new RPC function with proper customer joins
    const { data: packageData, error: packageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_package_monitor_data_v2');

    if (packageError) {
      console.error('Error fetching package data:', packageError);
      return NextResponse.json(
        { error: 'Failed to fetch package data' },
        { status: 500 }
      );
    }

    // The RPC function returns data in the expected format
    const result = Array.isArray(packageData) ? packageData[0] : packageData;

    return NextResponse.json(result || {
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