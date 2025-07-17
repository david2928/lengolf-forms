import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    
    let referralData, salesDashboardData;
    
    if (period === 'monthly') {
      // Get referral analytics monthly data
      const { data: referralMonthly } = await supabase
        .rpc('get_new_customers_by_month', { months_back: 12 });
      
      // Get sales dashboard monthly data (simulated - you'd call the actual sales dashboard function)
      const { data: salesMonthly } = await supabase
        .rpc('get_new_customers_by_month', { months_back: 12 });
      
      referralData = referralMonthly;
      salesDashboardData = salesMonthly;
    } else {
      // Get referral analytics weekly data
      const { data: referralWeekly } = await supabase
        .rpc('get_new_customers_by_week', { weeks_back: 12 });
      
      // Get sales dashboard weekly data (simulated - you'd call the actual sales dashboard function)
      const { data: salesWeekly } = await supabase
        .rpc('get_new_customers_by_week', { weeks_back: 12 });
      
      referralData = referralWeekly;
      salesDashboardData = salesWeekly;
    }
    
    // Compare the data
    const comparison = {
      period,
      referralAnalytics: {
        totalCustomers: referralData?.reduce((sum: number, item: any) => 
          sum + (item.new_customer_count || 0), 0) || 0,
        periods: referralData?.length || 0,
        data: referralData || []
      },
      salesDashboard: {
        totalCustomers: salesDashboardData?.reduce((sum: number, item: any) => 
          sum + (item.new_customer_count || 0), 0) || 0,
        periods: salesDashboardData?.length || 0,
        data: salesDashboardData || []
      },
      match: JSON.stringify(referralData) === JSON.stringify(salesDashboardData)
    };
    
    return NextResponse.json(comparison);
    
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate data' },
      { status: 500 }
    );
  }
}