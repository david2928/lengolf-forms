import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { lengolfWin32Printer, ReceiptData } from '@/services/Win32ThermalPrinter';
import { transactionService } from '@/services/TransactionService';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      transactionId, 
      receiptNumber,
      testPrint = false 
    } = body as {
      transactionId?: string;
      receiptNumber?: string;
      testPrint?: boolean;
    };

    console.log('🖨️ Win32Print API: Request received', { transactionId, receiptNumber, testPrint });

    // Check if Python win32print is available
    const pythonAvailable = await lengolfWin32Printer.checkPythonWin32Print();
    if (!pythonAvailable) {
      return NextResponse.json({
        error: 'Python win32print not available',
        details: 'Please install Python and pywin32: pip install pywin32'
      }, { status: 500 });
    }

    // Test print functionality
    if (testPrint) {
      console.log('🧪 Testing LENGOLF printer via win32print...');
      const testResult = await lengolfWin32Printer.testPrinter();
      
      return NextResponse.json({
        success: testResult,
        message: testResult 
          ? 'Test page printed successfully via win32print!' 
          : 'Printer test failed - check Python win32print setup',
        printerName: 'LENGOLF',
        method: 'Python win32print'
      });
    }

    // Validate input
    if (!transactionId && !receiptNumber) {
      return NextResponse.json({
        error: 'Either transactionId or receiptNumber is required'
      }, { status: 400 });
    }

    // Look up transaction using the new view
    let transaction;
    if (transactionId) {
      transaction = await transactionService.getTransaction(transactionId);
    } else {
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
      transaction = {
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
    }

    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    console.log('✅ Win32Print API: Transaction found:', transaction.receiptNumber);

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

    // Prepare receipt data for thermal printer
    const receiptData: ReceiptData = {
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
      staffName: (transaction as any).staffName || 'Unknown Staff',
      transactionDate: (transaction as any).salesTimestampBkk || (transaction as any).transactionDate || (transaction as any).createdAt,
      paxCount: (transaction as any).paxCount || 1
    };

    console.log('🖨️ Win32Print API: Sending to LENGOLF printer via Python win32print...');

    // Print to thermal printer using Python win32print
    await lengolfWin32Printer.printReceipt(receiptData);

    console.log('✅ Win32Print API: Receipt printed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Receipt printed to LENGOLF thermal printer via win32print successfully!',
      receiptNumber: transaction.receiptNumber,
      printerName: 'LENGOLF',
      method: 'Python win32print',
      itemCount: receiptData.items.length,
      total: receiptData.total
    });

  } catch (error) {
    console.error('❌ Win32Print API: Error:', error);
    return NextResponse.json({
      error: 'Print failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      method: 'Python win32print'
    }, { status: 500 });
  }
}