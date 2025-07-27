import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { PaymentProcessingRequest, PaymentProcessingResponse, PaymentError } from '@/types/payment';
import { fastPaymentProcessor } from '@/services/FastPaymentProcessor';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();
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

    // Validate staff authentication - ALWAYS require PIN verification for payments
    let validatedStaffId: number | undefined;
    let validatedStaffName: string | undefined;
    
    if (staffPin && staffPin.trim().length > 0) {
      // ALWAYS verify PIN against database for payment authorization
      const pinStartTime = Date.now();
      console.log('🔍 Verifying staff PIN for payment authorization...');
      
      // Direct database verification instead of HTTP call for better performance
      const { getStaffIdFromPin } = await import('@/lib/staff-helpers');
      const staffIdFromPin = await getStaffIdFromPin(staffPin);
      
      const verifyResult = staffIdFromPin ? { 
        success: true, 
        staff: { id: staffIdFromPin, staff_name: staffName || 'Staff' } 
      } : { 
        success: false, 
        error: 'Invalid PIN or inactive staff' 
      };
      
      console.log(`⏱️ PIN verification took: ${Date.now() - pinStartTime}ms`);
      
      if (!verifyResult.success) {
        console.log('❌ Staff PIN verification failed');
        return NextResponse.json({
          success: false,
          requiresStaffAuth: true,
          errors: ['Invalid staff PIN. Please try again.']
        }, { status: 400 });
      }
      
      validatedStaffId = verifyResult.staff?.id;
      validatedStaffName = verifyResult.staff?.staff_name;
      console.log('✅ Staff PIN verified for payment:', { id: validatedStaffId, name: validatedStaffName });
    } else {
      // No PIN provided - require staff authentication
      console.log('❌ Validation failed: Staff PIN required for payment authorization');
      return NextResponse.json({
        success: false,
        requiresStaffAuth: true,
        errors: ['Staff PIN required for payment authorization. Please enter your PIN.']
      }, { status: 400 });
    }

    console.log('✅ Basic validation passed, proceeding to payment completion...');
    console.log('🔍 Payment API: closeTableSession flag:', closeTableSession);

    // Process payment using simplified processor
    const paymentStartTime = Date.now();
    const transaction = await fastPaymentProcessor.processPayment(
      tableSessionId,
      paymentMethods,
      validatedStaffId!, // Use validated staff ID directly
      {
        customerName,
        tableNumber
      }
    );

    console.log(`⏱️ Payment completion took: ${Date.now() - paymentStartTime}ms`);
    console.log(`⏱️ Total API processing time: ${Date.now() - startTime}ms`);

    // Return successful response
    const response: PaymentProcessingResponse = {
      success: true,
      transaction: transaction,
      receiptNumber: transaction.receiptNumber,
      message: 'Payment processed successfully',
      redirectToTables: true
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