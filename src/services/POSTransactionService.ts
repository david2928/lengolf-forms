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
          id, total_amount,
          order_items(id, product_id, quantity, unit_price, total_price, notes)
        `)
        .eq('table_session_id', tableSessionId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1);
      
      
      if (ordersError || !orders || orders.length === 0) {
        throw new PaymentError('No orders found for payment');
      }
      
      orderData = {
        ...orders[0]
        // Order-level tax and subtotal removed - calculated at session/transaction level
      };
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
  
  private async getSessionDiscountData(tableSessionId: string) {
    const { data: sessionData, error } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('subtotal_amount, receipt_discount_amount, applied_receipt_discount_id')
      .eq('id', tableSessionId)
      .single();
    
    if (error) {
      console.warn('Could not fetch session discount data:', error);
      return {
        receiptDiscountAmount: 0,
        receiptDiscountPercentage: 0,
        appliedReceiptDiscountId: null
      };
    }
    
    return {
      receiptDiscountAmount: sessionData?.receipt_discount_amount || 0,
      receiptDiscountPercentage: sessionData?.subtotal_amount > 0 
        ? (sessionData?.receipt_discount_amount || 0) / sessionData.subtotal_amount 
        : 0,
      appliedReceiptDiscountId: sessionData?.applied_receipt_discount_id || null
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
    
    // Get session discount data
    const sessionDiscountData = await this.getSessionDiscountData(tableSessionId);
    
    // Calculate amounts correctly with discount data
    const vatRate = 0.07;
    // subtotal_amount should be VAT-inclusive amount after all discounts (final amount paid)
    const subtotalAmount = totalAmount; // Final amount paid (VAT-inclusive)
    const netAmount = subtotalAmount / (1 + vatRate); // Amount excluding VAT
    const vatAmount = subtotalAmount - netAmount; // VAT portion of final amount
    
    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .schema('pos')
      .from('transactions')
      .insert({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        subtotal_amount: subtotalAmount, // VAT-inclusive final amount
        discount_amount: sessionDiscountData.receiptDiscountAmount,
        applied_discount_id: sessionDiscountData.appliedReceiptDiscountId,
        net_amount: netAmount,
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
    // Get session discount data for calculating line-level receipt discount distribution
    const sessionDiscountData = await this.getSessionDiscountData(tableSessionId);
    
    const transactionItems = context.order.order_items.map((item: any, index: number) => {
      const unitPriceInclVat = item.unit_price;
      const unitPriceExclVat = unitPriceInclVat / 1.07;
      
      // Calculate item discount (item-level discount from order_items)
      const itemDiscount = item.discount_amount || 0;
      
      // Calculate item total after item-level discount
      const itemTotalAfterItemDiscount = (item.quantity * unitPriceInclVat) - itemDiscount;
      
      // Calculate proportional receipt discount for this line
      const receiptDiscountForThisLine = item.total_price > 0 && sessionDiscountData.receiptDiscountPercentage > 0
        ? item.total_price * sessionDiscountData.receiptDiscountPercentage
        : 0;
      
      // Total line discount = item discount + proportional receipt discount
      const totalLineDiscount = itemDiscount + receiptDiscountForThisLine;
      
      // Final line totals after all discounts
      const lineTotalInclVat = (item.quantity * unitPriceInclVat) - totalLineDiscount;
      const lineTotalExclVat = lineTotalInclVat / 1.07;
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
        item_price_incl_vat: unitPriceInclVat * item.quantity,
        item_price_excl_vat: unitPriceExclVat * item.quantity,
        unit_price_incl_vat: unitPriceInclVat,
        unit_price_excl_vat: unitPriceExclVat,
        line_discount: totalLineDiscount, // Total discount (item + receipt proportion)
        line_total_incl_vat: lineTotalInclVat,
        line_total_excl_vat: lineTotalExclVat,
        line_vat_amount: lineVatAmount,
        applied_discount_id: item.applied_discount_id || null, // Item-level discount ID
        item_discount: itemDiscount, // Item-level discount amount
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
    // Get payment method IDs for all payment methods - normalized storage
    const paymentRecords = await Promise.all(
      paymentAllocations.map(async (payment, index) => {
        const paymentMethodId = await this.getPaymentMethodId(payment.method);
        return {
          transaction_id: transactionId,
          payment_sequence: index + 1,
          payment_method_id: paymentMethodId,
          payment_amount: payment.amount,
          payment_reference: payment.reference || null,
          payment_status: 'completed',
          processed_by: staffId,
          processed_at: new Date().toISOString()
        };
      })
    );
    
    const { error } = await supabase
      .schema('pos')
      .from('transaction_payments')
      .insert(paymentRecords);
    
    if (error) {
      throw new PaymentError(`Failed to create payment records: ${error.message}`);
    }
  }
  
  private static methodIdCache = new Map<string, number>();
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private async getPaymentMethodId(method: string): Promise<number> {
    // Check cache first
    if (this.isCacheValid() && POSTransactionService.methodIdCache.has(method)) {
      return POSTransactionService.methodIdCache.get(method)!;
    }

    // Query the payment_methods_enum table
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
      
      const result = fallback?.id || 7; // Default to ID 7 (Other)
      POSTransactionService.methodIdCache.set(method, result);
      POSTransactionService.cacheTimestamp = Date.now();
      return result;
    }

    // Cache the result
    POSTransactionService.methodIdCache.set(method, data.id);
    POSTransactionService.cacheTimestamp = Date.now();
    
    return data.id;
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