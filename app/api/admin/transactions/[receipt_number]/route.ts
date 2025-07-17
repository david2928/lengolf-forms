import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface RouteParams {
  params: {
    receipt_number: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { receipt_number } = params;
    const startTime = Date.now();

    if (!receipt_number) {
      return NextResponse.json({
        success: false,
        error: 'Receipt number is required',
        code: 'MISSING_RECEIPT_NUMBER'
      }, { status: 400 });
    }

    // Get transaction details using database function
    const { data: transactionData, error: transactionError } = await refacSupabaseAdmin
      .rpc('get_transaction_details', {
        p_receipt_number: receipt_number
      });

    if (transactionError) {
      console.error('Database error:', transactionError);
      throw new Error(`Failed to fetch transaction details: ${transactionError.message}`);
    }

    // Debug logging
    console.log('Transaction data received:', JSON.stringify(transactionData, null, 2));

    if (!transactionData) {
      return NextResponse.json({
        success: false,
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      }, { status: 404 });
    }

    // Fix: Handle the data structure correctly - database function returns object directly
    let result;
    if (Array.isArray(transactionData)) {
      result = transactionData[0];
    } else {
      result = transactionData;
    }
    
    console.log('Result object:', JSON.stringify(result, null, 2));
    
    // Check if result exists and has proper structure
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Empty transaction result',
        code: 'EMPTY_TRANSACTION_RESULT'
      }, { status: 404 });
    }

    // Check if transaction_summary exists
    if (!result.transaction_summary) {
      console.error('Missing transaction_summary in result:', result);
      return NextResponse.json({
        success: false,
        error: 'Transaction data incomplete - no transaction summary found',
        code: 'INCOMPLETE_TRANSACTION_DATA',
        debug: {
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : [],
          resultType: typeof result
        }
      }, { status: 404 });
    }

    const transaction = result.transaction_summary;
    const items = result.transaction_items || [];

    // Additional validation
    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: 'Transaction summary is null',
        code: 'NULL_TRANSACTION_SUMMARY'
      }, { status: 404 });
    }

    // Calculate summary values
    const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.sales_net || 0), 0);
    const total = parseFloat(transaction.total_amount || 0);
    const netAmount = parseFloat(transaction.net_amount || 0);
    const vat = netAmount ? total - netAmount : 0;

    const transactionDetails = {
      transaction: {
        receipt_number: transaction.receipt_number,
        date: transaction.date,
        sales_timestamp: transaction.sales_timestamp || 
                        transaction.timestamp || 
                        transaction.transaction_timestamp ||
                        (transaction.date + "T00:00:00Z"),
        customer_name: transaction.customer_name,
        staff_name: transaction.staff_name,
        payment_method: transaction.payment_method,
        total_amount: parseFloat(transaction.total_amount),
        net_amount: netAmount,
        total_profit: parseFloat(transaction.total_profit || 0),
        item_count: parseInt(transaction.item_count),
        sim_usage_count: parseInt(transaction.sim_usage_count),
        status: transaction.status as 'COMPLETED' | 'VOIDED'
      },
      items: items.map((item: any) => ({
        id: item.id,
        receipt_number: item.receipt_number,
        product_name: item.product_name,
        product_category: item.product_category,
        product_parent_category: item.product_parent_category,
        item_cnt: item.item_cnt,
        item_price_incl_vat: parseFloat(item.item_price_incl_vat || 0),
        item_price_excl_vat: parseFloat(item.item_price_excl_vat || 0),
        item_discount: parseFloat(item.item_discount || 0),
        sales_total: parseFloat(item.sales_total || 0),
        sales_net: parseFloat(item.sales_net || 0),
        sales_discount: parseFloat(item.sales_discount || 0),
        gross_profit: parseFloat(item.gross_profit || 0),
        is_sim_usage: item.is_sim_usage,
        item_notes: item.item_notes,
        sku_number: item.sku_number
      })),
      summary: {
        subtotal,
        vat,
        total,
        total_profit: parseFloat(transaction.total_profit || 0),
        payment_method: transaction.payment_method,
        staff_name: transaction.staff_name
      }
    };

    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: transactionDetails,
      performance: {
        query_time_ms: queryTime
      }
    });

  } catch (error) {
    console.error('Error fetching transaction details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transaction details',
      code: 'TRANSACTION_DETAILS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 