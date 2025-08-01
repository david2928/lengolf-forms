import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { formatBangkokTime } from '@/lib/bangkok-timezone';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  try {
    // Get parameters from URL query string
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const staffName = searchParams.get('staffName');
    const customerName = searchParams.get('customerName');
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : null;
    const maxAmount = searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : null;
    const hasSimUsage = searchParams.get('hasSimUsage') === 'true' ? true : null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const sortBy = searchParams.get('sortBy') || 'transaction_date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Input validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ 
        error: "Invalid date range: start date must be before end date" 
      }, { status: 400 });
    }

    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
      return NextResponse.json({ 
        error: "Invalid amount range: minimum amount must be less than maximum amount" 
      }, { status: 400 });
    }

    // Call optimized RPC function from pos schema
    const { data, error } = await supabase.schema('pos').rpc('search_transactions', {
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

    if (error) {
      console.error('Database RPC error:', error);
      return NextResponse.json({ 
        error: "Failed to fetch transactions",
        details: error.message 
      }, { status: 500 });
    }

    // Get total count from first row (if any data exists)
    const totalCount = data && data.length > 0 ? parseInt(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Transform the data (remove total_count from response)
    const transactions = (data || []).map((row: any) => ({
      receipt_number: row.receipt_number,
      sales_timestamp: row.sales_timestamp,
      customer_name: row.customer_name,
      staff_name: row.staff_name,
      payment_method: row.payment_method,
      total_amount: parseFloat(row.total_amount),
      item_count: parseInt(row.item_count),
      status: row.status
    }));

    const duration = Date.now() - startTime;
    console.log(`POS transactions query completed in ${duration}ms (${transactions.length} records, page ${page}/${totalPages})`);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
        hasPrevious: page > 1
      },
      performance: {
        queryDuration: duration,
        recordCount: transactions.length
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`API error after ${duration}ms:`, error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { filters = {}, pagination = {}, sort = {} } = body;

    // Validate and prepare parameters
    const startDate = filters.dateRange?.start ? formatBangkokTime(new Date(filters.dateRange.start), 'yyyy-MM-dd') : null;
    const endDate = filters.dateRange?.end ? formatBangkokTime(new Date(filters.dateRange.end), 'yyyy-MM-dd') : null;
    const status = filters.status || null;
    const paymentMethod = filters.paymentMethod || null;
    const staffName = filters.staffName || null;
    const customerName = filters.customerName || null;
    const minAmount = filters.minAmount ? parseFloat(filters.minAmount) : null;
    const maxAmount = filters.maxAmount ? parseFloat(filters.maxAmount) : null;
    const hasSimUsage = filters.hasSimUsage || null;
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 50));
    const sortBy = sort.sortBy || 'transaction_date';
    const sortOrder = sort.sortOrder === 'asc' ? 'asc' : 'desc';

    // Input validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ 
        error: "Invalid date range: start date must be before end date" 
      }, { status: 400 });
    }

    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
      return NextResponse.json({ 
        error: "Invalid amount range: minimum amount must be less than maximum amount" 
      }, { status: 400 });
    }

    // Call optimized RPC function from pos schema
    const { data, error } = await supabase.schema('pos').rpc('search_transactions', {
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

    if (error) {
      console.error('Database RPC error:', error);
      return NextResponse.json({ 
        error: "Failed to fetch transactions",
        details: error.message 
      }, { status: 500 });
    }

    // Get total count from first row (if any data exists)
    const totalCount = data && data.length > 0 ? parseInt(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Transform the data (remove total_count from response)
    const transactions = (data || []).map((row: any) => ({
      receipt_number: row.receipt_number,
      sales_timestamp: row.sales_timestamp,
      customer_name: row.customer_name,
      staff_name: row.staff_name,
      payment_method: row.payment_method,
      total_amount: parseFloat(row.total_amount),
      item_count: parseInt(row.item_count),
      status: row.status
    }));

    const duration = Date.now() - startTime;
    console.log(`POS transactions query completed in ${duration}ms (${transactions.length} records, page ${page}/${totalPages})`);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
        hasPrevious: page > 1
      },
      performance: {
        queryDuration: duration,
        recordCount: transactions.length
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`API error after ${duration}ms:`, error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}