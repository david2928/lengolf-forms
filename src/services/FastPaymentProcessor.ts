// Fast Payment Processor - Simplified, optimized payment processing
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { PaymentAllocation, PaymentError, Transaction } from '@/types/payment';

interface PaymentContext {
  staffId: number;
  customerIdBigint: string | null;
  bookingId: string | null;
  order: any;
}

export class FastPaymentProcessor {
  
  async processPayment(
    tableSessionId: string,
    paymentAllocations: PaymentAllocation[],
    staffId: number, // Pre-validated staff ID
    options: {
      customerName?: string;
      tableNumber?: string;
    } = {}
  ): Promise<Transaction> {
    
    // Calculate total from payment allocations (frontend already calculated this)
    const totalAmount = paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Just generate receipt number and create transaction - no database queries needed!
    const receiptNumber = await this.generateReceiptNumber();
    
    const transaction = await this.createSimpleTransaction(
      receiptNumber,
      paymentAllocations,
      staffId,
      tableSessionId,
      totalAmount,
      options
    );
    
    // Clear table session
    await this.clearTableSession(tableSessionId, totalAmount);
    
    return transaction;
  }
  
  private async getPaymentContext(tableSessionId: string, staffId: number): Promise<PaymentContext> {
    // Get table session first
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', tableSessionId)
      .single();
    
    if (sessionError || !tableSession) {
      throw new PaymentError(`Table session not found: ${tableSessionId}`);
    }
    
    // Get customer data if booking exists
    let customerIdBigint: string | null = null;
    let bookingId: string | null = null;
    
    if (tableSession.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, customer_id')
        .eq('id', tableSession.booking_id)
        .single();
      
      if (booking) {
        customerIdBigint = booking.customer_id;
        bookingId = booking.id;
      }
    }
    
    // Get order data - try current_order_items first, then actual orders
    let orderData: any;
    
    if (tableSession.current_order_items && Array.isArray(tableSession.current_order_items) && tableSession.current_order_items.length > 0) {
      // Use current order items from session
      orderData = {
        id: crypto.randomUUID(),
        total_amount: tableSession.total_amount || 0,
        tax_amount: 0,
        subtotal_amount: 0,
        order_items: tableSession.current_order_items.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          product_id: item.productId || item.product_id,
          product_name: item.product_name || 'Order Item',
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || item.unit_price || 0,
          total_price: item.totalPrice || item.total_price || 0
        }))
      };
    } else {
      // Get latest order with items
      const { data: orders, error: ordersError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          id, total_amount, tax_amount, subtotal_amount,
          order_items(id, product_id, product_name, quantity, unit_price, total_price)
        `)
        .eq('table_session_id', tableSessionId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (ordersError || !orders || orders.length === 0) {
        throw new PaymentError('No orders found for payment');
      }
      
      orderData = orders[0];
      if (!orderData.order_items || orderData.order_items.length === 0) {
        throw new PaymentError('No order items found for payment');
      }
    }
    
    return {
      staffId,
      customerIdBigint,
      bookingId,
      order: orderData
    };
  }
  
  private validatePaymentAmounts(paymentAllocations: PaymentAllocation[], orderTotal: number): void {
    const totalPaymentAmount = paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const difference = Math.abs(totalPaymentAmount - orderTotal);
    
    if (difference > 0.01) {
      throw new PaymentError(`Payment amount (฿${totalPaymentAmount.toFixed(2)}) does not match order total (฿${orderTotal.toFixed(2)})`);
    }
  }
  
  private async createSimpleTransaction(
    receiptNumber: string,
    paymentAllocations: PaymentAllocation[],
    staffId: number,
    tableSessionId: string,
    totalAmount: number,
    options: any
  ): Promise<Transaction> {
    
    const transactionId = crypto.randomUUID();
    const vatRate = 0.07;
    const subtotalAmountExclVat = totalAmount / (1 + vatRate);
    const vatAmount = totalAmount - subtotalAmountExclVat;
    
    // Create transaction record only - no complex queries
    const { data: transaction, error: txError } = await supabase
      .schema('pos')
      .from('transactions')
      .insert({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        subtotal_amount: subtotalAmountExclVat,
        discount_amount: 0,
        net_amount: subtotalAmountExclVat,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        status: 'paid',
        table_session_id: tableSessionId,
        staff_id: staffId,
        customer_id: null, // Can be set later if needed
        booking_id: null,  // Can be set later if needed
        transaction_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (txError) {
      throw new PaymentError(`Failed to create transaction: ${txError.message}`);
    }
    
    // Create payment records
    await this.createTransactionPayments(transaction.id, paymentAllocations, staffId);
    
    return {
      id: transaction.id,
      transactionId: transaction.transaction_id,
      receiptNumber: transaction.receipt_number,
      subtotal: transaction.subtotal_amount,
      vatAmount: transaction.vat_amount,
      totalAmount: transaction.total_amount,
      discountAmount: transaction.discount_amount,
      paymentMethods: paymentAllocations,
      paymentStatus: 'completed',
      tableSessionId: transaction.table_session_id,
      orderId: '',
      staffPin: '',
      customerId: transaction.customer_id,
      tableNumber: options.tableNumber,
      transactionDate: new Date(transaction.transaction_date),
      createdAt: new Date(transaction.created_at),
      updatedAt: new Date(transaction.updated_at),
      items: []
    };
  }
  
  private async createTransactionItems(transactionId: string, context: PaymentContext, tableSessionId: string): Promise<void> {
    const transactionItems = context.order.order_items.map((item: any, index: number) => {
      const unitPriceInclVat = item.unit_price;
      const unitPriceExclVat = unitPriceInclVat / 1.07;
      const lineDiscount = 0;
      const lineTotalInclVat = (item.quantity * unitPriceInclVat) - lineDiscount;
      const lineTotalExclVat = (item.quantity * unitPriceExclVat) - lineDiscount;
      const lineVatAmount = lineTotalInclVat - lineTotalExclVat;
      
      return {
        transaction_id: transactionId,
        line_number: index + 1,
        table_session_id: tableSessionId,
        product_id: item.product_id,
        staff_id: context.staffId,
        customer_id: context.customerIdBigint,
        booking_id: context.bookingId,
        item_cnt: item.quantity,
        item_price_incl_vat: unitPriceInclVat,
        item_price_excl_vat: unitPriceExclVat,
        unit_price_incl_vat: unitPriceInclVat,
        unit_price_excl_vat: unitPriceExclVat,
        line_discount: lineDiscount,
        line_total_incl_vat: lineTotalInclVat,
        line_total_excl_vat: lineTotalExclVat,
        line_vat_amount: lineVatAmount,
        item_notes: item.notes,
        is_voided: false
      };
    });
    
    const { error } = await supabase
      .schema('pos')
      .from('transaction_items')
      .insert(transactionItems);
    
    if (error) {
      throw new PaymentError(`Failed to create transaction items: ${error.message}`);
    }
  }
  
  private async createTransactionPayments(transactionId: string, paymentAllocations: PaymentAllocation[], staffId: number): Promise<void> {
    const paymentRecords = paymentAllocations.map((payment, index) => ({
      transaction_id: transactionId,
      payment_sequence: index + 1,
      payment_method: this.mapPaymentMethodToDatabase(payment.method),
      payment_amount: payment.amount,
      payment_reference: payment.reference || null,
      payment_status: 'completed',
      processed_by: staffId,
      processed_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .schema('pos')
      .from('transaction_payments')
      .insert(paymentRecords);
    
    if (error) {
      throw new PaymentError(`Failed to create payment records: ${error.message}`);
    }
  }
  
  private mapPaymentMethodToDatabase(method: string): string {
    const methodMap: Record<string, string> = {
      'Cash': 'cash',
      'Visa Manual': 'credit_card',
      'Mastercard Manual': 'credit_card',
      'PromptPay Manual': 'qr_code',
      'Alipay1': 'other'
    };
    return methodMap[method] || 'other';
  }
  
  private async generateReceiptNumber(): Promise<string> {
    const { data, error } = await supabase
      .schema('pos')
      .rpc('generate_receipt_number');
    
    if (error) {
      throw new PaymentError('Failed to generate receipt number');
    }
    
    return data;
  }
  
  private async clearTableSession(tableSessionId: string, paymentAmount: number): Promise<void> {
    const { error } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        status: 'paid',
        pax_count: 0,
        session_end: new Date().toISOString(),
        total_amount: paymentAmount,
        current_order_items: null,
        notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tableSessionId);
    
    if (error) {
      throw new PaymentError(`Failed to clear table session: ${error.message}`);
    }
  }
}

export const fastPaymentProcessor = new FastPaymentProcessor();