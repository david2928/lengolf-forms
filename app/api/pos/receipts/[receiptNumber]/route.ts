import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionService } from '@/services/TransactionService';
import { receiptGenerator } from '@/services/ReceiptGenerator';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { receiptNumber: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { receiptNumber } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, html, thermal, thermal80
    const language = searchParams.get('language') || 'en'; // en, th
    const width = searchParams.get('width') || '58mm'; // 58mm, 80mm

    if (!receiptNumber) {
      return NextResponse.json({
        error: 'Receipt number is required'
      }, { status: 400 });
    }

    console.log('🔍 Receipt API: Looking for receipt:', receiptNumber);

    // Look up transaction by receipt number
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('transaction_id')
      .eq('receipt_number', receiptNumber)
      .single();

    if (error || !data) {
      console.log('❌ Receipt API: Transaction not found for receipt:', receiptNumber, error);
      return NextResponse.json({ 
        error: 'Receipt not found' 
      }, { status: 404 });
    }

    console.log('✅ Receipt API: Found transaction ID:', data.transaction_id);

    const transaction = await transactionService.getTransaction(data.transaction_id);
    if (!transaction) {
      console.log('❌ Receipt API: Transaction service returned null for ID:', data.transaction_id);
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    console.log('✅ Receipt API: Transaction loaded:', {
      id: transaction.transactionId,
      receipt: transaction.receiptNumber,
      orderId: transaction.orderId,
      tableSessionId: transaction.tableSessionId
    });

    // For table session payments (orderId is null), get the order from table session relationship
    let order;
    if (transaction.orderId) {
      // Regular order payment - get order by ID
      const { data: orderData, error: orderError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', transaction.orderId)
        .single();

      if (orderError || !orderData) {
        console.log('❌ Receipt API: Order not found for transaction order ID:', transaction.orderId);
        return NextResponse.json({ 
          error: 'Order not found' 
        }, { status: 404 });
      }
      order = orderData;
    } else {
      // Table session payment - get order by table session ID  
      const { data: orderData, error: orderError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_session_id', transaction.tableSessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (orderError || !orderData) {
        console.log('❌ Receipt API: Order not found for table session ID:', transaction.tableSessionId);
        return NextResponse.json({ 
          error: 'Order not found for table session' 
        }, { status: 404 });
      }
      order = orderData;
    }

    console.log('✅ Receipt API: Order loaded:', {
      id: order.id,
      orderNumber: order.order_number,
      itemCount: order.order_items?.length || 0
    });

    // Generate receipt data
    const orderForReceipt = {
      id: order.id,
      orderNumber: order.order_number || 'N/A',
      tableSessionId: order.table_session_id,
      customerId: order.customer_id,
      staffPin: order.confirmed_by || transaction.staffPin,
      items: order.order_items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        modifiers: item.modifiers || [],
        notes: item.notes,
        categoryId: item.category_id,
        categoryName: item.category_name
      })),
      subtotal: order.subtotal_amount || 0,
      vatAmount: order.tax_amount || 0,
      totalAmount: order.total_amount,
      discountAmount: 0,
      status: order.status,
      notes: order.notes,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at)
    };

    // Create receipt data manually to avoid structure issues
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
        items: orderForReceipt.items.map((item: any) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
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

    console.log('✅ Receipt API: Receipt data generated for format:', format);

    // Return different formats based on request
    switch (format) {
      case 'html':
        const htmlContent = receiptGenerator.generateHTMLReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="receipt-${transaction.receiptNumber}.html"`
          }
        });

      case 'thermal':
        const thermalContent = width === '80mm' 
          ? receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en')
          : receiptGenerator.generateThermalReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(thermalContent, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="receipt-${width}-${transaction.receiptNumber}.txt"`
          }
        });

      case 'thermal80':
        const thermal80Content = receiptGenerator.generateThermalReceipt80mm(receiptData, language as 'th' | 'en');
        return new NextResponse(thermal80Content, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="receipt-80mm-${transaction.receiptNumber}.txt"`
          }
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          receipt: receiptData,
          summary: receiptGenerator.generateReceiptSummary(receiptData)
        });
    }

  } catch (error) {
    console.error('❌ Receipt API: Error generating receipt:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}