import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { PaymentProcessingRequest, PaymentProcessingResponse, PaymentError } from '@/types/payment';
import { posTransactionService } from '@/services/POSTransactionService';
import { tableSessionService } from '@/services/TableSessionService';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const body: PaymentProcessingRequest = await request.json();
    
    const { orderId, tableSessionId, paymentMethods, staffPin, staffId, staffName, customerName, tableNumber, closeTableSession = true } = body;


    // Validate required fields
    if (!tableSessionId || !paymentMethods || paymentMethods.length === 0) {
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
      
      
      if (!verifyResult.success) {
        return NextResponse.json({
          success: false,
          requiresStaffAuth: true,
          errors: ['Invalid staff PIN. Please try again.']
        }, { status: 400 });
      }
      
      validatedStaffId = verifyResult.staff?.id;
      validatedStaffName = verifyResult.staff?.staff_name;
    } else {
      // No PIN provided - require staff authentication
      return NextResponse.json({
        success: false,
        requiresStaffAuth: true,
        errors: ['Staff PIN required for payment authorization. Please enter your PIN.']
      }, { status: 400 });
    }


    // Step 1: Create POS transaction
    const paymentStartTime = Date.now();
    const transaction = await posTransactionService.createTransaction(
      tableSessionId,
      paymentMethods,
      validatedStaffId!, // Use validated staff ID directly
      {
        customerName,
        tableNumber
      }
    );

    // Step 2: Close table session if requested
    if (closeTableSession !== false) {
      try {
        const staffPin = body.staffPin!; // We already validated this above
        await tableSessionService.completeSessionWithPayment(
          tableSessionId,
          staffPin,
          'Payment completed via POS'
        );
      } catch (error) {
        // Don't fail the whole payment if table closing fails
      }
    }


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