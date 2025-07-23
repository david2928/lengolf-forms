import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { PaymentProcessingRequest, PaymentProcessingResponse, PaymentError } from '@/types/payment';
import { paymentCompleter } from '@/services/PaymentCompleter';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: PaymentProcessingRequest = await request.json();
    console.log('🔍 Payment processing request received:', JSON.stringify(body, null, 2));
    
    const { orderId, tableSessionId, paymentMethods, staffPin, staffId, staffName, customerName, tableNumber, closeTableSession = true } = body;

    // Debug validation inputs
    console.log('🔍 Validation check:');
    console.log('  - tableSessionId:', tableSessionId);
    console.log('  - paymentMethods:', paymentMethods);
    console.log('  - staffPin:', staffPin ? '***' : 'undefined');
    console.log('  - staffId:', staffId);
    console.log('  - staffName:', staffName);

    // Validate required fields
    if (!tableSessionId || !paymentMethods || paymentMethods.length === 0) {
      console.log('❌ Validation failed: Missing required fields');
      return NextResponse.json({
        success: false,
        errors: ['Table session ID and payment methods are required']
      }, { status: 400 });
    }

    // Validate staff authentication (either PIN or ID/name)
    const hasValidStaffPin = staffPin && staffPin.trim().length > 0;
    const hasValidStaffIdName = staffId && staffName;
    
    if (!hasValidStaffPin && !hasValidStaffIdName) {
      console.log('❌ Validation failed: Staff re-authentication required');
      console.log('  - hasValidStaffPin:', hasValidStaffPin);
      console.log('  - hasValidStaffIdName:', hasValidStaffIdName);
      
      return NextResponse.json({
        success: false,
        requiresStaffAuth: true,
        errors: ['Staff authentication required for payment processing. Please enter your PIN.']
      }, { status: 400 });
    }

    console.log('✅ Basic validation passed, proceeding to payment completion...');
    console.log('🔍 Payment API: closeTableSession flag:', closeTableSession);

    // Complete payment using PaymentCompleter service
    const result = await paymentCompleter.completePayment(
      orderId,
      tableSessionId,
      paymentMethods,
      staffPin || `${staffId}`, // Use staffPin or convert staffId to string
      {
        customerName,
        tableNumber,
        closeTableSession,
        staffId,
        staffName
      }
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        errors: result.errors || ['Payment processing failed']
      }, { status: 400 });
    }

    // Return successful response
    const response: PaymentProcessingResponse = {
      success: true,
      transaction: result.transaction,
      receiptNumber: result.transaction.receiptNumber,
      message: 'Payment processed successfully',
      redirectToTables: result.redirectToTables
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payment processing error:', error);
    
    if (error instanceof PaymentError) {
      return NextResponse.json({
        success: false,
        errors: [error.message]
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      errors: ['Internal server error during payment processing']
    }, { status: 500 });
  }
}