import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionQueryService } from '@/services/TransactionQueryService';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { receiptNumber } = body;

    if (!receiptNumber) {
      return NextResponse.json({
        error: 'Receipt number is required'
      }, { status: 400 });
    }

    console.log('🔍 Preview API: Looking up receipt:', receiptNumber);

    // Look up transaction using the new view
    const { data, error } = await supabase
      .schema('pos')
      .from('transaction_details')
      .select('*')
      .eq('receipt_number', receiptNumber)
      .single();

    if (error || !data) {
      return NextResponse.json({ 
        error: 'Receipt not found' 
      }, { status: 404 });
    }

    // Use transaction details directly from view
    const transaction = {
      receiptNumber: data.receipt_number,
      subtotal: data.subtotal,
      vatAmount: data.vat_amount,
      totalAmount: data.total_amount,
      tableNumber: data.table_number,
      customerName: data.customer_name,
      staffName: data.staff_name,
      tableSessionId: data.table_session_id,
      createdAt: data.created_at,
      salesTimestampBkk: data.sales_timestamp_bkk,
      paxCount: data.pax_count,
      paymentMethods: [{
        method: 'Cash',
        amount: data.total_amount
      }]
    };

    console.log('✅ Preview API: Transaction found:', transaction.receiptNumber);

    // Get order data using table session ID
    const { data: orderData, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('table_session_id', transaction.tableSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ 
        error: 'Order not found for table session' 
      }, { status: 404 });
    }
    const order = orderData;

    // Get product names
    const productIds = order.order_items.map((item: any) => item.product_id);
    const { data: products } = await supabase
      .schema('products')
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const productMap = new Map(products?.map((p: any) => [p.id, p.name]) || []);

    // Format data for preview
    const previewData = {
      receiptNumber: transaction.receiptNumber,
      items: (order.order_items || []).map((item: any) => ({
        name: productMap.get(item.product_id) || 'Unknown Item',
        price: item.unit_price || 0,
        qty: item.quantity || 1,
        notes: item.notes
      })),
      subtotal: transaction.subtotal,
      tax: transaction.vatAmount,
      total: transaction.totalAmount,
      paymentMethods: transaction.paymentMethods || [
        {
          method: 'Cash',
          amount: transaction.totalAmount
        }
      ],
      tableNumber: transaction.tableNumber,
      customerName: transaction.customerName,
      staffName: transaction.staffName || 'Unknown Staff',
      date: transaction.createdAt,
      transactionDate: (transaction as any).salesTimestampBkk || (transaction as any).transactionDate || (transaction as any).createdAt,
      paxCount: transaction.paxCount || 1
    };

    console.log('✅ Preview API: Returning preview data');

    return NextResponse.json(previewData);

  } catch (error) {
    console.error('❌ Preview API: Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch receipt data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}