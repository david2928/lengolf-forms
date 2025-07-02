import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      status = 'ALL',
      paymentMethod,
      staffName,
      customerName,
      minAmount,
      maxAmount,
      hasSimUsage,
      page = 1,
      limit = 50,
      sortBy = 'sales_timestamp',
      sortOrder = 'desc'
    } = body;

    const startTime = Date.now();

    // Execute the database function
    const { data: transactions, error: transactionsError } = await refacSupabaseAdmin
      .rpc('get_transactions_list', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_status: status,
        p_payment_method: paymentMethod,
        p_staff_name: staffName,
        p_customer_name: customerName,
        p_min_amount: minAmount,
        p_max_amount: maxAmount,
        p_has_sim_usage: hasSimUsage,
        p_page: page,
        p_limit: limit,
        p_sort_by: sortBy,
        p_sort_order: sortOrder
      });

    if (transactionsError) {
      throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
    }

    const processedTransactions = transactions?.map((t: any) => ({
      receipt_number: t.receipt_number,
      date: t.date,
      sales_timestamp: t.sales_timestamp,
      customer_name: t.customer_name,
      staff_name: t.staff_name,
      payment_method: t.payment_method,
      total_amount: parseFloat(t.total_amount || 0),
      net_amount: parseFloat(t.net_amount || 0),
      total_profit: parseFloat(t.total_profit || 0),
      item_count: parseInt(t.item_count || 0),
      sim_usage_count: parseInt(t.sim_usage_count || 0),
      status: t.status
    })) || [];

    // For now, we'll use the transaction count as total (could create separate count function if needed)
    const totalCount = processedTransactions.length;
    const totalPages = Math.ceil(totalCount / limit);

    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: processedTransactions,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        total: totalCount,
        totalPages
      },
      performance: {
        query_time_ms: queryTime
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transactions',
      code: 'TRANSACTIONS_FETCH_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Transactions API',
    status: 'ready',
    description: 'POST to this endpoint to fetch transactions with filters',
    endpoints: {
      'POST /': 'Fetch transactions list with filters and pagination',
      'GET /[receipt_number]': 'Get transaction details by receipt number'
    }
  });
} 