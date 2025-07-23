import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionService } from '@/services/TransactionService';
import { receiptGenerator } from '@/services/ReceiptGenerator';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const receiptNumber = searchParams.get('receiptNumber');
    const format = searchParams.get('format') || 'json'; // json, html, thermal
    const language = searchParams.get('language') || 'en'; // en, th

    if (!transactionId && !receiptNumber) {
      return NextResponse.json({
        error: 'Either transactionId or receiptNumber is required'
      }, { status: 400 });
    }

    // Get transaction data
    let transaction;
    if (transactionId) {
      transaction = await transactionService.getTransaction(transactionId);
    } else if (receiptNumber) {
      // Look up transaction by receipt number
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', transaction.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Generate receipt data
    const receiptData = receiptGenerator.generateReceiptData(transaction, {
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
    }, {
      customerName: transaction.customerName,
      tableNumber: transaction.tableNumber,
      staffName: `Staff-${transaction.staffPin}`
    });

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
        const thermalContent = receiptGenerator.generateThermalReceipt(receiptData, language as 'th' | 'en');
        return new NextResponse(thermalContent, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="receipt-${transaction.receiptNumber}.txt"`
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
    console.error('Error generating receipt:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, transactionId, receiptNumber, format = 'html', language = 'en' } = await request.json();

    if (action === 'regenerate') {
      // Regenerate receipt for existing transaction
      if (!transactionId && !receiptNumber) {
        return NextResponse.json({
          error: 'Either transactionId or receiptNumber is required'
        }, { status: 400 });
      }

      // This would use the same logic as GET but allow for different parameters
      // For now, redirect to GET endpoint
      const queryParams = new URLSearchParams({
        ...(transactionId && { transactionId }),
        ...(receiptNumber && { receiptNumber }),
        format,
        language
      });

      return NextResponse.redirect(`/api/pos/receipts?${queryParams}`);
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Error processing receipt request:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}