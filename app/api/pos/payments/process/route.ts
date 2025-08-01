import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { PaymentProcessingRequest, PaymentProcessingResponse, PaymentError } from '@/types/payment';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
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


    // Step 1: Create POS transaction using optimized database function
    const paymentStartTime = Date.now();
    
    // Helper function to get payment method ID
    const getPaymentMethodId = async (method: string): Promise<number> => {
      const { data, error } = await supabase
        .schema('pos')
        .from('payment_methods_enum')
        .select('id')
        .or(`legacy_names.cs.{${method}},display_name.eq.${method}`)
        .limit(1)
        .single();

      if (error || !data) {
        // Fallback to Other method if not found
        const { data: fallback } = await supabase
          .schema('pos')
          .from('payment_methods_enum')
          .select('id')
          .eq('code', 'OTHER')
          .single();
        
        return fallback?.id || 7; // Default to ID 7 (Other)
      }

      return data.id;
    };

    // Format payment allocations for the database function using normalized payment method IDs
    const paymentAllocations = await Promise.all(
      paymentMethods.map(async method => ({
        method_id: await getPaymentMethodId(method.method),
        amount: method.amount,
        reference: method.reference || null
      }))
    );

    // Use the optimized database function instead of multiple queries
    console.log('🔍 Calling create_complete_transaction with:', {
      p_table_session_id: tableSessionId,
      p_payment_allocations: paymentAllocations,
      p_staff_id: validatedStaffId!,
      p_customer_id: null,
      p_booking_id: null
    });
    
    const { data: transactionResult, error: transactionError } = await supabase
      .rpc('create_complete_transaction', {
        p_table_session_id: tableSessionId,
        p_payment_allocations: paymentAllocations,
        p_staff_id: validatedStaffId!,
        p_customer_id: null, // Let function use session customer
        p_booking_id: null   // Let function use session booking
      });
      
    console.log('🔍 Database function result:', { transactionResult, transactionError });

    if (transactionError) {
      throw new PaymentError(`Transaction creation failed: ${transactionError.message}`);
    }

    if (!transactionResult?.success) {
      throw new PaymentError('Transaction creation failed: Unknown error');
    }

    const paymentEndTime = Date.now();
    console.log(`💡 Optimized payment processing took ${paymentEndTime - paymentStartTime}ms`);

    // Create transaction object for response (matching original interface)
    const transaction = {
      id: transactionResult.transaction_db_id,
      transactionId: transactionResult.transaction_id,
      receiptNumber: transactionResult.receipt_number,
      subtotal: transactionResult.total_amount,
      vatAmount: transactionResult.total_amount * 0.07 / 1.07,
      totalAmount: transactionResult.total_amount,
      discountAmount: transactionResult.discount_amount,
      paymentMethods: paymentMethods,
      paymentStatus: 'completed' as const,
      tableSessionId: tableSessionId,
      orderId: '',
      staffPin: '',
      customerId: undefined,
      tableNumber: tableNumber,
      transactionDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: []
    };

    // Table session is automatically closed by the database function
    // No additional table session processing needed


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