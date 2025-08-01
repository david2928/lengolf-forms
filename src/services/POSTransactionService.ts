// POS Transaction Service - Creates complete transactions from table sessions
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { PaymentAllocation, PaymentError, Transaction } from '@/types/payment';

interface TransactionContext {
  staffId: number;
  customerIdBigint: string | null;
  bookingId: string | null;
  order: any;
}

export class POSTransactionService {
  
  async createTransaction(
    tableSessionId: string,
    paymentAllocations: PaymentAllocation[],
    staffId: number, // Pre-validated staff ID
    options: {
      customerName?: string;
      tableNumber?: string;
      generateReceipt?: boolean;
    } = {}
  ): Promise<Transaction> {
    
    // Calculate total from payment allocations (frontend already calculated this)
    const totalAmount = paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Get transaction context to retrieve order items
    let context: TransactionContext;
    try {
      context = await this.getTransactionContext(tableSessionId, staffId);
    } catch (error) {
      console.error('❌ Failed to get transaction context:', error);
      throw new PaymentError(`Failed to retrieve transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Generate receipt number and create transaction
    const receiptNumber = await this.generateReceiptNumber();
    
    const transaction = await this.createTransactionRecord(
      receiptNumber,
      paymentAllocations,
      staffId,
      tableSessionId,
      totalAmount,
      options,
      context
    );
    
    // Generate receipt if requested
    if (options.generateReceipt !== false) {
      try {
        await this.ensureReceiptGenerated(transaction.transactionId);
      } catch (error) {
      }
    }
    
    return transaction;
  }
  
  private async getTransactionContext(tableSessionId: string, staffId: number): Promise<TransactionContext> {
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
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || item.unit_price || 0,
          total_price: item.totalPrice || item.total_price || 0,
          notes: item.notes || null
        }))
      };
    } else {
      // Get latest order with items
      const { data: orders, error: ordersError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          id, total_amount, tax_amount, subtotal_amount,
          order_items(id, product_id, quantity, unit_price, total_price, notes)
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
  
  private async createTransactionRecord(
    receiptNumber: string,
    paymentAllocations: PaymentAllocation[],
    staffId: number,
    tableSessionId: string,
    totalAmount: number,
    options: any,
    context: TransactionContext
  ): Promise<Transaction> {
    
    const transactionId = crypto.randomUUID();
    const vatRate = 0.07;
    const subtotalAmountExclVat = totalAmount / (1 + vatRate);
    const vatAmount = totalAmount - subtotalAmountExclVat;
    
    // Create transaction record
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
        customer_id: context.customerIdBigint,
        booking_id: context.bookingId,
        transaction_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (txError) {
      throw new PaymentError(`Failed to create transaction: ${txError.message}`);
    }
    
    // Create payment records
    await this.createPaymentRecords(transaction.id, paymentAllocations, staffId);
    
    // Create transaction items from order items - fixed context structure check
    const orderItems = context.order?.order_items || [];
    if (orderItems.length > 0) {
      await this.createTransactionItems(transaction.id, context, tableSessionId);
    } else {
    }
    
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
  
  private async createTransactionItems(transactionId: string, context: TransactionContext, tableSessionId: string): Promise<void> {
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
        item_notes: item.notes || null,
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
  
  private async createPaymentRecords(transactionId: string, paymentAllocations: PaymentAllocation[], staffId: number): Promise<void> {
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
  
  private static methodCache = new Map<string, string>();
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private mapPaymentMethodToDatabase(method: string): string {
    // Check cache first
    if (this.isCacheValid() && POSTransactionService.methodCache.has(method)) {
      return POSTransactionService.methodCache.get(method)!;
    }

    const methodMap: Record<string, string> = {
      'Cash': 'cash',
      'Visa Manual': 'credit_card',
      'Mastercard Manual': 'credit_card',
      'PromptPay Manual': 'qr_code',
      'Alipay1': 'other'
    };
    
    const result = methodMap[method] || 'other';
    
    // Cache the result
    POSTransactionService.methodCache.set(method, result);
    POSTransactionService.cacheTimestamp = Date.now();
    
    return result;
  }

  private isCacheValid(): boolean {
    return Date.now() - POSTransactionService.cacheTimestamp < POSTransactionService.CACHE_TTL;
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
  

  private async ensureReceiptGenerated(transactionId: string): Promise<void> {
    // Receipt generation is handled by the receipt API
    // This method just verifies the transaction exists and is complete
    
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('transaction_id, receipt_number, status')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error || !data) {
      // Don't throw error - receipt generation is not critical for payment success
      return;
    }
    
    if (data.status !== 'paid') {
      return;
    }
    
  }
}

export const posTransactionService = new POSTransactionService();