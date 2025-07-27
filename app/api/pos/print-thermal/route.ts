import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { lengolfThermalPrinter, ReceiptData } from '@/services/ReliableThermalPrinter';
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

    console.log('🖨️ Thermal Print API: Request received', { transactionId, receiptNumber, testPrint });

    // Test print functionality
    if (testPrint) {
      console.log('🧪 Testing LENGOLF printer...');
      const testResult = await lengolfThermalPrinter.testPrinter();
      
      return NextResponse.json({
        success: testResult,
        message: testResult 
          ? 'Test page printed successfully!' 
          : 'Printer test failed - check connection',
        printerName: 'LENGOLF'
      });
    }

    // Validate input
    if (!transactionId && !receiptNumber) {
      return NextResponse.json({
        error: 'Either transactionId or receiptNumber is required'
      }, { status: 400 });
    }

    // Look up transaction
    let transaction;
    if (transactionId) {
      transaction = await transactionService.getTransaction(transactionId);
    } else {
      const { data, error } = await supabase
        .schema('pos')
        .from('transactions')
        .select('transaction_id')
        .eq('receipt_number', receiptNumber)
        .single();

      if (error || !data) {
        return NextResponse.json({ 
          error: 'Receipt not found' 
        }, { status: 404 });
      }

      transaction = await transactionService.getTransaction(data.transaction_id);
    }

    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    console.log('✅ Thermal Print API: Transaction found:', transaction.receiptNumber);

    // Get order data
    let order;
    if (transaction.orderId) {
      const { data: orderData, error: orderError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('id', transaction.orderId)
        .single();

      if (orderError || !orderData) {
        return NextResponse.json({ 
          error: 'Order not found' 
        }, { status: 404 });
      }
      order = orderData;
    } else {
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
      order = orderData;
    }

    // Prepare receipt data for thermal printer
    const receiptData: ReceiptData = {
      receiptNumber: transaction.receiptNumber,
      items: (order.order_items || []).map((item: any) => ({
        name: item.product_name || 'Unknown Item',
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
      staffName: `Staff-${transaction.staffPin}`
    };

    console.log('🖨️ Thermal Print API: Sending to LENGOLF printer...');

    // Print to thermal printer
    await lengolfThermalPrinter.printReceipt(receiptData);

    console.log('✅ Thermal Print API: Receipt printed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Receipt printed to LENGOLF thermal printer successfully!',
      receiptNumber: transaction.receiptNumber,
      printerName: 'LENGOLF',
      itemCount: receiptData.items.length,
      total: receiptData.total
    });

  } catch (error) {
    console.error('❌ Thermal Print API: Error:', error);
    return NextResponse.json({
      error: 'Print failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}