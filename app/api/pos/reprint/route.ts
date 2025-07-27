import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionService } from '@/services/TransactionService';
import { receiptGenerator } from '@/services/ReceiptGenerator';
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
      format = 'html',
      language = 'en',
      width = '80mm'
    } = body as {
      transactionId?: string;
      receiptNumber?: string;
      format?: 'html' | 'thermal' | 'thermal80';
      language?: 'en' | 'th';
      width?: '58mm' | '80mm';
    };

    if (!transactionId && !receiptNumber) {
      return NextResponse.json({
        error: 'Either transactionId or receiptNumber is required'
      }, { status: 400 });
    }

    console.log('🔄 Reprint API: Looking up transaction:', { transactionId, receiptNumber });

    let transaction;

    if (transactionId) {
      // Look up by transaction ID
      transaction = await transactionService.getTransaction(transactionId);
      if (!transaction) {
        return NextResponse.json({ 
          error: 'Transaction not found' 
        }, { status: 404 });
      }
    } else {
      // Look up by receipt number
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
      if (!transaction) {
        return NextResponse.json({ 
          error: 'Transaction not found' 
        }, { status: 404 });
      }
    }

    console.log('✅ Reprint API: Transaction found:', transaction.receiptNumber);

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

    // Create receipt data
    const receiptData = {
      transactionId: transaction.transactionId,
      receiptNumber: transaction.receiptNumber,
      businessInfo: {
        name: "Lengolf Golf Club",
        address: "123 Golf Course Road, Bangkok 10120",
        taxId: "1234567890123",
        phone: "02-123-4567"
      },
      transaction: {
        date: transaction.transactionDate,
        tableNumber: transaction.tableNumber || 'N/A',
        staffName: `Staff-${transaction.staffPin}`,
        customerName: transaction.customerName || 'Guest',
        items: (order.order_items || []).map((item: any) => ({
          name: item.product_name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || 0,
          totalPrice: item.total_price || 0,
          notes: item.notes
        })),
        subtotal: transaction.subtotal,
        vatAmount: transaction.vatAmount,
        totalAmount: transaction.totalAmount,
        paymentMethods: transaction.paymentMethods || [
          {
            method: 'Cash',
            amount: transaction.totalAmount
          }
        ]
      },
      footer: {
        thankYouMessage: "Thank you for dining with us!",
        returnPolicy: "Returns accepted within 24 hours with receipt."
      }
    };

    console.log('✅ Reprint API: Receipt data prepared for format:', format);

    // Return appropriate format
    switch (format) {
      case 'html':
        const htmlContent = receiptGenerator.generateHTMLReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="reprint-${transaction.receiptNumber}.html"`
          }
        });

      case 'thermal':
        const thermalContent = width === '80mm' 
          ? receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en')
          : receiptGenerator.generateThermalReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(thermalContent, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="reprint-${width}-${transaction.receiptNumber}.txt"`
          }
        });

      case 'thermal80':
        const thermal80Content = receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en');
        return new NextResponse(thermal80Content, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="reprint-80mm-${transaction.receiptNumber}.txt"`
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Receipt data prepared',
          receiptNumber: transaction.receiptNumber,
          transactionId: transaction.transactionId,
          summary: receiptGenerator.generateReceiptSummary(receiptData)
        });
    }

  } catch (error) {
    console.error('❌ Reprint API: Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}