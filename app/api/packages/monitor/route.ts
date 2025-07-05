import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_package_monitor_data');

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