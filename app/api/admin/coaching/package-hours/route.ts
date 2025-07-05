import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (skip in development with SKIP_AUTH)
    if (process.env.NODE_ENV === 'production' || process.env.SKIP_AUTH !== 'true') {
      const { data: currentUser, error: userError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, email, is_admin')
        .eq('email', session.user.email)
        .single();

      if (userError || !currentUser?.is_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // Get all active coaching packages with remaining hours
    const { data: packages, error: packagesError } = await supabase
      .schema('backoffice')
      .from('packages')
      .select(`
        id,
        customer_name,
        expiration_date,
        package_types!inner (
          id,
          name,
          hours,
          type
        )
      `)
      .eq('package_types.type', 'Coaching')
      .gte('expiration_date', new Date().toISOString().split('T')[0]);

    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    // Get usage for each package
    const packageIds = packages?.map(p => p.id) || [];
    const { data: usage, error: usageError } = await supabase
      .schema('backoffice')
      .from('package_usage')
      .select('package_id, used_hours')
      .in('package_id', packageIds);

    if (usageError) {
      console.error('Error fetching usage:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }

    // Calculate total remaining hours
    let totalHoursRemaining = 0;
    const packageDetails = [];

    for (const pkg of packages || []) {
      const packageType = Array.isArray(pkg.package_types) ? pkg.package_types[0] : pkg.package_types;
      const totalHours = packageType?.hours || 0;
      const usedHours = usage
        ?.filter(u => u.package_id === pkg.id)
        .reduce((sum, u) => sum + (u.used_hours || 0), 0) || 0;
      const remainingHours = Math.max(0, totalHours - usedHours);
      
      totalHoursRemaining += remainingHours;
      
      packageDetails.push({
        id: pkg.id,
        customer_name: pkg.customer_name,
        package_type: packageType?.name,
        total_hours: totalHours,
        used_hours: usedHours,
        remaining_hours: remainingHours,
        expiration_date: pkg.expiration_date
      });
    }

    return NextResponse.json({
      total_hours_remaining: totalHoursRemaining,
      total_packages: packageDetails.length,
      packages: packageDetails
    });

  } catch (error) {
    console.error('Error in coaching package hours API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}