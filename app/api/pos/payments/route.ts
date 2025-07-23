import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionService } from '@/services/TransactionService';
import { PaymentInitializationRequest, PaymentError } from '@/types/payment';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: PaymentInitializationRequest = await request.json();
    const { orderId, tableSessionId, totalAmount, items, customerId, staffPin, tableNumber } = body;

    // Validate required fields
    if (!orderId || !tableSessionId || !totalAmount || !staffPin) {
      return NextResponse.json({
        error: 'Order ID, table session ID, total amount, and staff PIN are required'
      }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        error: 'Order must have at least one item'
      }, { status: 400 });
    }

    // Initialize payment session (for now, just return payment readiness)
    return NextResponse.json({
      success: true,
      paymentSession: {
        orderId,
        tableSessionId,
        totalAmount,
        itemCount: items.length,
        readyForPayment: true
      },
      message: 'Payment session initialized'
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    
    if (error instanceof PaymentError) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tableSessionId = searchParams.get('tableSessionId');
    const transactionId = searchParams.get('transactionId');

    if (transactionId) {
      // Get specific transaction
      const transaction = await transactionService.getTransaction(transactionId);
      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      return NextResponse.json({ transaction });
    }

    if (tableSessionId) {
      // Get all transactions for table session
      const transactions = await transactionService.getTransactionsByTableSession(tableSessionId);
      return NextResponse.json({ transactions });
    }

    return NextResponse.json({
      error: 'Either transactionId or tableSessionId parameter is required'
    }, { status: 400 });

  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}