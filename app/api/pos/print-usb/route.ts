import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { receiptNumber } = body as { receiptNumber: string };

    console.log('🔌 USB Print API: Request received', { receiptNumber });

    if (!receiptNumber) {
      return NextResponse.json({
        error: 'Receipt number is required'
      }, { status: 400 });
    }

    // Look up transaction using the transaction_details view
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
      salesTimestampBkk: data.sales_timestamp_bkk,
      paxCount: data.pax_count,
      paymentMethods: [{
        method: 'Cash',
        amount: data.total_amount
      }]
    };

    console.log('✅ USB Print API: Transaction found:', transaction.receiptNumber);

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

    // Prepare receipt data for USB printing
    const receiptData = {
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
      transactionDate: transaction.salesTimestampBkk || data.created_at,
      paxCount: transaction.paxCount || 1
    };

    console.log('🔌 USB Print API: Receipt data prepared for client-side printing');

    // Return receipt data for client-side USB printing
    return NextResponse.json({
      success: true,
      message: 'Receipt data ready for USB printing',
      receiptData: receiptData,
      method: 'WebUSB API',
      itemCount: receiptData.items.length,
      total: receiptData.total
    });

  } catch (error) {
    console.error('❌ USB Print API: Error:', error);
    return NextResponse.json({
      error: 'Failed to prepare receipt data',
      details: error instanceof Error ? error.message : 'Unknown error',
      method: 'WebUSB API'
    }, { status: 500 });
  }
}