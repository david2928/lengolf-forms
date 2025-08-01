import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reconciliationType = searchParams.get('type');

    // Validate required parameters
    if (!startDate || !endDate || !reconciliationType) {
      return NextResponse.json({
        error: 'Missing required parameters: startDate, endDate, type'
      }, { status: 400 });
    }

    // Validate reconciliation type
    const validTypes = ['restaurant', 'golf_coaching_ratchavin', 'golf_coaching_boss', 'golf_coaching_noon', 'smith_and_co_restaurant'];
    if (!validTypes.includes(reconciliationType)) {
      return NextResponse.json({
        error: `Invalid reconciliation type: ${reconciliationType}`,
        validTypes
      }, { status: 400 });
    }

    console.log(`Fetching POS data for ${reconciliationType} from ${startDate} to ${endDate}`);

    let data;
    let summary;

    if (reconciliationType === 'restaurant') {
      // Restaurant reconciliation: items with SKU numbers
      // Original filter: "sku_number <> '-' AND is_voided = false"
      const { data: restaurantData, error } = await supabase
        .schema('pos')
        .from('lengolf_sales')
        .select(`
          id,
          date,
          customer_name,
          product_name,
          product_category,
          sku_number,
          item_cnt,
          item_price_incl_vat,
          receipt_number,
          payment_method
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .neq('sku_number', '-')
        .not('sku_number', 'is', null)
        .or('is_voided.is.null,is_voided.eq.false')
        .order('date', { ascending: true })
        .order('customer_name', { ascending: true });

      if (error) {
        console.error('Supabase error (restaurant):', error);
        return NextResponse.json({
          error: 'Failed to fetch restaurant data',
          details: error.message
        }, { status: 500 });
      }

      // Transform data to match interface
      data = restaurantData?.map(item => ({
        id: item.id,
        date: item.date,
        customerName: item.customer_name,
        productName: item.product_name,
        productCategory: item.product_category,
        skuNumber: item.sku_number,
        quantity: item.item_cnt || 0,
        totalAmount: parseFloat(item.item_price_incl_vat || '0'),
        receiptNumber: item.receipt_number,
        paymentMethod: item.payment_method,
        isVoided: false
      })) || [];

      summary = {
        totalRecords: data.length,
        totalAmount: data.reduce((sum, item) => sum + item.totalAmount, 0),
        dateRange: { start: startDate, end: endDate },
        reconciliationType
      };

    } else if (reconciliationType === 'smith_and_co_restaurant') {
      const { data: skuData, error } = await supabase
        .rpc('get_sales_by_sku', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) {
        console.error('Supabase error (Smith & Co):', error);
        return NextResponse.json({
          error: 'Failed to fetch Smith & Co data',
          details: error.message
        }, { status: 500 });
      }

      data = skuData?.map((item: any) => ({
        ...item,
        totalAmount: parseFloat(item.total_amount || '0'),
        quantity: parseInt(item.total_quantity || '0', 10)
      })) || [];

      summary = {
        totalRecords: data.length,
        totalAmount: data.reduce((sum: number, item: any) => sum + item.totalAmount, 0),
        dateRange: { start: startDate, end: endDate },
        reconciliationType
      };

    } else {
      // Golf coaching reconciliation: use coach earnings data instead of POS sales
      // This provides actual monetary value of lessons delivered
      
      const coachName = reconciliationType === 'golf_coaching_ratchavin'
        ? 'RATCHAVIN'
        : reconciliationType === 'golf_coaching_boss'
          ? 'BOSS'
          : reconciliationType === 'golf_coaching_noon'
            ? 'NOON'
            : null;

      if (!coachName) {
        return NextResponse.json({
          error: 'Invalid golf coaching reconciliation type',
          details: `Unknown coach for type: ${reconciliationType}`
        }, { status: 400 });
      }

      const { data: earningsData, error } = await supabase
        .schema('backoffice')
        .from('coach_earnings')
        .select(`
          date,
          customer_name,
          rate_type,
          hour_cnt,
          coach_earnings,
          receipt_number
        `)
        .eq('coach', coachName)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('customer_name', { ascending: true });

      if (error) {
        console.error('Supabase error (coach earnings):', error);
        return NextResponse.json({
          error: 'Failed to fetch coach earnings data',
          details: error.message
        }, { status: 500 });
      }

      // Transform earnings data to match POS record interface
      data = earningsData?.map(earning => ({
        date: earning.date,
        customerName: earning.customer_name || 'Unknown',
        productName: `${earning.rate_type} Lesson`,
        totalQuantity: earning.hour_cnt || 1,
        totalAmount: parseFloat(earning.coach_earnings || '0'),
        transactionCount: 1,
        receiptNumber: earning.receipt_number
      })) || [];

      summary = {
        totalRecords: data.length,
        totalAmount: data.reduce((sum, item) => sum + item.totalAmount, 0),
        dateRange: { start: startDate, end: endDate },
        reconciliationType
      };
    }

    console.log(`Retrieved ${data.length} records for ${reconciliationType}`);

    return NextResponse.json({
      data,
      summary
    });

  } catch (error) {
    console.error('Error fetching POS data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 