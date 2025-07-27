// Transaction Service
// Handles payment processing business logic and database operations

import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { 
  Transaction, 
  TransactionItem, 
  PaymentAllocation, 
  PaymentError, 
  PaymentValidationError 
} from '@/types/payment';
import { formatPaymentMethodString, validatePaymentAmount, validateSplitPayments } from '@/config/payment-methods';
import { PaymentMethod } from '@/types/payment';
import { getStaffIdFromPin, getCustomerIdFromBooking } from '@/lib/staff-helpers';

export class TransactionService {
  // Cache for staff lookup to avoid redundant PIN verification
  private staffCache = new Map<string, { id: number; name: string; timestamp: number }>();
  private readonly STAFF_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Map frontend/legacy payment method to database format using the enum table
   */
  private async mapPaymentMethodToDatabase(method: string): Promise<string> {
    try {
      // First try to get from the payment methods enum table
      const { data: paymentMethod, error } = await supabase
        .schema('pos')
        .from('payment_methods_enum')
        .select('database_value')
        .or(`code.eq.${method},legacy_names.cs.{${method}}`)
        .eq('is_active', true)
        .single();

      if (!error && paymentMethod) {
        return paymentMethod.database_value;
      }

      // Fallback to hardcoded mapping for backward compatibility
      const methodMap: Record<string, string> = {
        [PaymentMethod.CASH]: 'cash',
        [PaymentMethod.VISA_MANUAL]: 'credit_card',
        [PaymentMethod.MASTERCARD_MANUAL]: 'credit_card',
        [PaymentMethod.PROMPTPAY_MANUAL]: 'qr_code',
        [PaymentMethod.ALIPAY]: 'other',
        'Cash_Legacy': 'cash',
        'Visa_Manual_Legacy': 'credit_card',
        'Mastercard_Manual_Legacy': 'credit_card',
        'PromptPay_Manual_Legacy': 'qr_code',
        'Alipay1_Legacy': 'other',
        'QR Payment': 'qr_code'
      };
      
      return methodMap[method] || 'other';
    } catch (error) {
      console.error('Error mapping payment method:', error);
      return 'other';
    }
  }
  
  /**
   * Create a new transaction with items
   */
  async createTransaction(
    orderId: string | undefined,
    tableSessionId: string,
    paymentAllocations: PaymentAllocation[],
    staffPin: string,
    options: {
      customerId?: string;
      customerName?: string;
      tableNumber?: string;
      notes?: string;
      staffId?: number;
      staffName?: string;
      preResolvedStaffId?: number;
    } = {}
  ): Promise<Transaction> {
    
    const txStartTime = Date.now();
    
    // Validate inputs
    this.validateTransactionInputs(orderId, tableSessionId, paymentAllocations, staffPin);
    
    // Use pre-resolved staff ID if available, otherwise resolve from PIN
    const staffLookupStartTime = Date.now();
    const preResolvedStaffId = options.preResolvedStaffId;
    console.log('🔍 Debug - preResolvedStaffId:', preResolvedStaffId, 'type:', typeof preResolvedStaffId);
    
    let resolvedStaffId: number;
    if (preResolvedStaffId && typeof preResolvedStaffId === 'number') {
      resolvedStaffId = preResolvedStaffId;
      console.log('✅ Using pre-resolved staff ID:', resolvedStaffId);
    } else {
      const staffIdFromPin = await this.getStaffIdFromPin(staffPin);
      if (!staffIdFromPin) {
        throw new PaymentError('Invalid staff PIN or inactive staff');
      }
      resolvedStaffId = staffIdFromPin;
      console.log('🔍 Resolved staff ID from PIN:', resolvedStaffId);
    }
    
    console.log(`⏱️ Staff lookup took: ${Date.now() - staffLookupStartTime}ms (${preResolvedStaffId ? 'cached' : 'database'})`);
    
    // Get order details or table session data
    const orderStartTime = Date.now();
    let order: any;
    if (orderId) {
      order = await this.getOrderWithItems(orderId);
    } else {
      order = await this.getTableSessionForPayment(tableSessionId);
    }
    console.log(`⏱️ Order/session fetch took: ${Date.now() - orderStartTime}ms`);
    
    // Validate payment amounts
    this.validatePaymentAmounts(paymentAllocations, order.total_amount);
    
    // Generate transaction identifiers
    const receiptStartTime = Date.now();
    const transactionId = crypto.randomUUID();
    const receiptNumber = await this.generateReceiptNumber();
    console.log(`⏱️ Receipt generation took: ${Date.now() - receiptStartTime}ms`);
    
    try {
      // Get customer ID only once to avoid redundant lookups
      const customerLookupStartTime = Date.now();
      let customerIdBigint: string | null = null;
      if (order.booking?.id) {
        customerIdBigint = await this.getCustomerIdFromBooking(order.booking.id);
      } else if (options.customerId && typeof options.customerId === 'string') {
        customerIdBigint = options.customerId;
      }
      console.log(`⏱️ Customer lookup took: ${Date.now() - customerLookupStartTime}ms`);
      
      // Create transaction record
      const txRecordStartTime = Date.now();
      const transaction = await this.createTransactionRecordOptimized(
        transactionId,
        receiptNumber,
        order,
        paymentAllocations,
        tableSessionId,
        resolvedStaffId,
        customerIdBigint,
        {
          ...options,
          customerId: options.customerId || order.customer_id,
          customerName: options.customerName || order.customer_name
        }
      );
      console.log(`⏱️ Transaction record creation took: ${Date.now() - txRecordStartTime}ms`);
      
      // Create transaction items  
      const txItemsStartTime = Date.now();
      await this.createTransactionItemsOptimized(
        transaction.id, // Use the actual primary key from the created transaction
        order,
        tableSessionId,
        resolvedStaffId, // Use pre-resolved staff ID
        customerIdBigint,
        order.booking?.id || null
      );
      console.log(`⏱️ Transaction items creation took: ${Date.now() - txItemsStartTime}ms`);
      
      // Update order status if orderId exists
      if (orderId) {
        await this.updateOrderStatus(orderId, 'completed');
      }
      
      console.log(`⏱️ Total transaction creation took: ${Date.now() - txStartTime}ms`);
      return transaction;
      
    } catch (error) {
      console.error('Transaction creation failed:', error);
      // Cleanup any partial transaction data
      await this.cleanupFailedTransaction(transactionId);
      throw error;
    }
  }
  
  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    console.log('🔍 TransactionService.getTransaction: Looking for transaction ID:', transactionId);
    
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error) {
      console.log('❌ TransactionService.getTransaction: Database error:', error);
      return null;
    }
    
    if (!data) {
      console.log('❌ TransactionService.getTransaction: No transaction found for ID:', transactionId);
      return null;
    }
    
    console.log('✅ TransactionService.getTransaction: Transaction found:', { 
      id: data.transaction_id, 
      receipt: data.receipt_number 
    });
    
    // Return transaction with view data
    return {
      ...this.mapDatabaseTransactionToType(data),
      items: [] // Transaction items loaded separately if needed
    };
  }
  
  /**
   * Get transactions for a table session
   */
  async getTransactionsByTableSession(tableSessionId: string): Promise<Transaction[]> {
    // Query transactions from base table
    const { data: transactions, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('*')
      .eq('table_session_id', tableSessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new PaymentError(`Failed to fetch transactions: ${error.message}`);
    }
    
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    // Map transactions with view data
    return transactions.map(transaction => ({
      ...this.mapDatabaseTransactionToType(transaction),
      items: [] // Transaction items loaded separately if needed
    }));
  }
  
  /**
   * Void a transaction
   */
  async voidTransaction(
    transactionId: string, 
    reason: string, 
    staffPin: string
  ): Promise<boolean> {
    const { error } = await supabase
      .schema('pos')
      .from('transaction_items')
      .update({
        is_voided: true,
        voided_at: new Date().toISOString(),
        voided_by: `Staff-${staffPin}`,
        item_notes: reason
      })
      .eq('transaction_id', transactionId);
    
    if (error) {
      throw new PaymentError(`Failed to void transaction: ${error.message}`);
    }
    
    return true;
  }
  
  // Private methods

  private async getStaffIdFromPin(staffPin: string): Promise<number | null> {
    // Check cache first
    const cached = this.staffCache.get(staffPin);
    if (cached && (Date.now() - cached.timestamp) < this.STAFF_CACHE_TTL) {
      return cached.id;
    }
    
    // Use the centralized helper function
    const staffId = await getStaffIdFromPin(staffPin);
    
    // Cache the result if found
    if (staffId) {
      this.staffCache.set(staffPin, {
        id: staffId,
        name: 'Staff', // We don't need the name for caching
        timestamp: Date.now()
      });
    }
    
    return staffId;
  }

  private async getCustomerIdFromBooking(bookingId: string): Promise<string | null> {
    // Use the centralized helper function that returns BIGINT
    return await getCustomerIdFromBooking(bookingId);
  }
  
  private validateTransactionInputs(
    orderId: string | undefined,
    tableSessionId: string,
    paymentAllocations: PaymentAllocation[],
    staffPin: string
  ): void {
    console.log('🔍 validateTransactionInputs - tableSessionId:', tableSessionId);
    if (!tableSessionId) {
      throw new PaymentValidationError('Table session ID is required');
    }
    
    console.log('🔍 validateTransactionInputs - paymentAllocations:', paymentAllocations);
    if (!paymentAllocations || paymentAllocations.length === 0) {
      throw new PaymentValidationError('At least one payment method is required');
    }
    
    console.log('🔍 validateTransactionInputs - staffPin length:', staffPin?.length);
    if (!staffPin || staffPin.trim().length < 4) {
      throw new PaymentValidationError('Valid staff PIN is required (minimum 4 characters)');
    }
    
    // Validate individual payment amounts
    console.log('🔍 validateTransactionInputs - validating individual amounts...');
    for (const allocation of paymentAllocations) {
      console.log('🔍 validateTransactionInputs - checking allocation:', allocation);
      const validation = validatePaymentAmount(allocation.amount);
      if (!validation.isValid) {
        console.log('❌ validateTransactionInputs - invalid amount:', validation.error);
        throw new PaymentValidationError(validation.error || 'Invalid payment amount');
      }
    }
    console.log('✅ validateTransactionInputs - all individual amounts valid');
  }
  
  private validatePaymentAmounts(paymentAllocations: PaymentAllocation[], orderTotal: number): void {
    console.log('🔍 validatePaymentAmounts - orderTotal:', orderTotal);
    console.log('🔍 validatePaymentAmounts - paymentAllocations:', paymentAllocations);
    
    const totalPaymentAmount = paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    console.log('🔍 validatePaymentAmounts - totalPaymentAmount:', totalPaymentAmount);
    
    // Allow small rounding differences (1 satang)
    const difference = Math.abs(totalPaymentAmount - orderTotal);
    console.log('🔍 validatePaymentAmounts - difference:', difference);
    
    if (difference > 0.01) {
      const errorMsg = `Payment amount (฿${totalPaymentAmount.toFixed(2)}) does not match order total (฿${orderTotal.toFixed(2)})`;
      console.log('❌ validatePaymentAmounts - amount mismatch:', errorMsg);
      throw new PaymentValidationError(errorMsg);
    }
    
    // Validate split payments if multiple methods
    if (paymentAllocations.length > 1) {
      console.log('🔍 validatePaymentAmounts - validating split payments...');
      const validation = validateSplitPayments(paymentAllocations, orderTotal);
      if (!validation.isValid) {
        console.log('❌ validatePaymentAmounts - split payment validation failed:', validation.error);
        throw new PaymentValidationError(validation.error || 'Invalid split payment configuration');
      }
    }
  }
  
  private async getOrderWithItems(orderId: string): Promise<any> {
    const { data: order, error } = await supabase
      .schema('pos')
      .from('orders')
      .select(`
        *,
        order_items (
          id, product_id, product_name, category_id, category_name,
          quantity, unit_price, total_price, modifiers, notes
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      throw new PaymentError(`Order not found: ${orderId}`);
    }
    
    if (!order.order_items || order.order_items.length === 0) {
      throw new PaymentError('Order has no items');
    }
    
    return order;
  }

  private async getTableSessionForPayment(tableSessionId: string): Promise<any> {
    console.log('🔍 getTableSessionForPayment - fetching table session:', tableSessionId);
    
    const { data: tableSession, error } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', tableSessionId)
      .single();
    
    if (error || !tableSession) {
      console.log('❌ getTableSessionForPayment - table session not found:', error);
      throw new PaymentError(`Table session not found: ${tableSessionId}`);
    }

    // Manually fetch booking data if booking_id exists
    let bookingData = null;
    if (tableSession.booking_id) {
      console.log('🔍 getTableSessionForPayment - fetching booking data:', tableSession.booking_id);
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, name, phone_number, customer_id')
        .eq('id', tableSession.booking_id)
        .single();
      
      if (!bookingError && booking) {
        bookingData = booking;
        console.log('✅ getTableSessionForPayment - booking data retrieved');
      } else {
        console.log('⚠️ getTableSessionForPayment - booking not found or error:', bookingError);
      }
    }
    
    console.log('🔍 getTableSessionForPayment - table session data:', {
      id: tableSession.id,
      total_amount: tableSession.total_amount,
      current_order_items: tableSession.current_order_items
    });
    
    // Check if we have current_order_items with data
    let orderItems: any[] = [];
    let totalAmount = tableSession.total_amount ? parseFloat(tableSession.total_amount) : 0;
    
    if (tableSession.current_order_items && Array.isArray(tableSession.current_order_items) && tableSession.current_order_items.length > 0) {
      console.log('🔍 getTableSessionForPayment - using current_order_items');
      
      // Get product details for all items
      const productIds = tableSession.current_order_items.map((item: any) => item.productId || item.product_id).filter(Boolean);
      let productDetails: any = {};
      
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .schema('products')
          .from('products')
          .select('id, name, category_id')
          .in('id', productIds);
        
        if (!productsError && products) {
          productDetails = products.reduce((acc: any, product: any) => {
            acc[product.id] = product;
            return acc;
          }, {});
        }
      }
      
      orderItems = tableSession.current_order_items.map((item: any, index: number) => {
        const productId = item.productId || item.product_id;
        const product = productDetails[productId];
        
        return {
          id: item.id || crypto.randomUUID(),
          product_id: productId,
          product_name: product?.name || item.product_name || 'Unknown Item',
          category_id: product?.category_id || item.categoryId || item.category_id,
          category_name: item.category_name || 'Unknown Category',
          parent_category_name: item.parent_category_name || null,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || item.unit_price || 0, // Handle both camelCase and snake_case
          total_price: item.totalPrice || item.total_price || ((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)),
          modifiers: item.modifiers || [],
        };
      });
      
      // Recalculate total from items if needed
      if (totalAmount <= 0) {
        totalAmount = orderItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
      }
    } else {
      console.log('🔍 getTableSessionForPayment - no current_order_items, checking for actual orders');
      
      // Check if there are actual orders for this table session
      const { data: orders, error: ordersError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_session_id', tableSessionId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });
        
      if (ordersError) {
        console.log('❌ getTableSessionForPayment - error fetching orders:', ordersError);
        throw new PaymentError(`Failed to fetch orders for table session: ${ordersError.message}`);
      }
      
      console.log('🔍 getTableSessionForPayment - found orders:', orders?.length || 0);
      
      if (orders && orders.length > 0) {
        // Use the most recent order's items
        const latestOrder = orders[0];
        console.log('🔍 getTableSessionForPayment - using latest order items:', latestOrder.order_items?.length || 0);
        
        if (latestOrder.order_items && latestOrder.order_items.length > 0) {
          // Get product details for all items in the order
          const productIds = latestOrder.order_items.map((item: any) => item.product_id).filter(Boolean);
          let productDetails: any = {};
          
          if (productIds.length > 0) {
            const { data: products, error: productsError } = await supabase
              .schema('products')
              .from('products')
              .select('id, name, category_id')
              .in('id', productIds);
            
            if (!productsError && products) {
              productDetails = products.reduce((acc: any, product: any) => {
                acc[product.id] = product;
                return acc;
              }, {});
            }
          }
          
          orderItems = latestOrder.order_items.map((item: any) => {
            const product = productDetails[item.product_id];
            
            return {
              id: item.id,
              product_id: item.product_id,
              product_name: product?.name || item.product_name || 'Unknown Item',
              category_id: product?.category_id || null,
              category_name: 'Order',
              parent_category_name: null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              modifiers: item.modifiers || [],
              notes: item.notes
            };
          });
          
          // Use the order's total amount
          totalAmount = parseFloat(latestOrder.total_amount) || totalAmount;
        }
      }
    }
    
    // If still no items found, this is an error condition
    if (orderItems.length === 0) {
      console.log('❌ getTableSessionForPayment - no order items found');
      console.log('🔍 Debug info:');
      console.log('  - current_order_items:', tableSession.current_order_items);
      console.log('  - total_amount:', totalAmount);
      throw new PaymentError('No order items found for payment. Table session must have actual product items to process payment.');
    }
    
    console.log('🔍 getTableSessionForPayment - final order items:', orderItems.length, 'total:', totalAmount);
    
    return {
      id: crypto.randomUUID(),
      table_session_id: tableSessionId,
      total_amount: totalAmount,
      order_items: orderItems,
      notes: tableSession.notes || 'Table session payment',
      booking: bookingData,
      customer_id: bookingData?.customer_id,
      customer_name: bookingData?.name
    };
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
  
  private async createTransactionRecordOptimized(
    transactionId: string,
    receiptNumber: string,
    order: any,
    paymentAllocations: PaymentAllocation[],
    tableSessionId: string,
    staffId: number,
    customerIdBigint: string | null,
    options: any
  ): Promise<Transaction> {
    
    // Calculate VAT amounts correctly (7% VAT system where total_amount includes VAT)
    const totalAmountInclVat = order.total_amount;
    const vatRate = 0.07;
    const subtotalAmountExclVat = totalAmountInclVat / (1 + vatRate);
    const vatAmount = totalAmountInclVat - subtotalAmountExclVat;
    
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .insert({
        id: crypto.randomUUID(), // Primary key
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        subtotal_amount: subtotalAmountExclVat,
        discount_amount: 0,
        net_amount: subtotalAmountExclVat, // Net amount is subtotal minus discounts
        vat_amount: vatAmount,
        total_amount: totalAmountInclVat,
        status: 'paid',
        table_session_id: tableSessionId,
        staff_id: staffId, // Required foreign key to backoffice.staff
        customer_id: customerIdBigint, // UUID foreign key to public.customers
        booking_id: order.booking?.id || null, // UUID foreign key to bookings
        transaction_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new PaymentError(`Failed to create transaction: ${error.message}`);
    }
    
    // Create payment records for split payment tracking
    await this.createTransactionPayments(data.id, paymentAllocations, staffId);
    
    return this.mapDatabaseTransactionToType(data);
  }
  
  private async createTransactionPayments(
    transactionId: string,
    paymentAllocations: PaymentAllocation[],
    staffId: number
  ): Promise<void> {
    // Batch lookup all unique payment methods in a single query
    const uniqueMethods = Array.from(new Set(paymentAllocations.map(p => p.method)));
    const methodMappings: Record<string, string> = {};
    
    if (uniqueMethods.length > 0) {
      try {
        const { data: paymentMethods } = await supabase
          .schema('pos')
          .from('payment_methods_enum')
          .select('code, database_value, legacy_names')
          .eq('is_active', true);
        
        // Create mapping for each unique method
        for (const method of uniqueMethods) {
          const found = paymentMethods?.find(pm => 
            pm.code === method || 
            (pm.legacy_names && pm.legacy_names.includes(method))
          );
          methodMappings[method] = found?.database_value || 'other';
        }
      } catch (error) {
        console.error('Error batch mapping payment methods:', error);
        // Fallback to individual mapping
        for (const method of uniqueMethods) {
          methodMappings[method] = await this.mapPaymentMethodToDatabase(method);
        }
      }
    }
    
    const paymentRecords = paymentAllocations.map((payment, index) => ({
      transaction_id: transactionId,
      payment_sequence: index + 1,
      payment_method: methodMappings[payment.method] || 'other',
      payment_amount: payment.amount,
      payment_reference: payment.reference || null,
      payment_status: 'completed',
      processed_by: staffId,
      processed_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .schema('pos')
      .from('transaction_payments')
      .insert(paymentRecords)
      .select();
    
    if (error) {
      console.log('❌ createTransactionPayments: Database error:', error);
      throw new PaymentError(`Failed to create payment records: ${error.message}`);
    }
    
    console.log('✅ createTransactionPayments: Successfully created', data?.length || 0, 'payment records');
  }
  
  private async createTransactionItemsOptimized(
    transactionId: string,
    order: any,
    tableSessionId: string,
    staffId: number | null,
    customerIdBigint: string | null,
    bookingId: string | null
  ): Promise<void> {
    if (!order.order_items || order.order_items.length === 0) {
      throw new PaymentError('No order items found to create transaction items');
    }

    try {
      const transactionItems = order.order_items.map((item: any, index: number) => {
        const unitPriceInclVat = item.unit_price;
        const unitPriceExclVat = unitPriceInclVat / 1.07; // Remove 7% VAT
        const lineDiscount = 0; // No discounts for now
        const lineTotalInclVat = (item.quantity * unitPriceInclVat) - lineDiscount;
        const lineTotalExclVat = (item.quantity * unitPriceExclVat) - lineDiscount;
        const lineVatAmount = lineTotalInclVat - lineTotalExclVat;
        
        return {
          transaction_id: transactionId,
          line_number: index + 1,
          table_session_id: tableSessionId,
          product_id: item.product_id,
          staff_id: staffId,
          customer_id: customerIdBigint,
          booking_id: bookingId,
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
      
      // Insert all transaction items in a single batch operation
      
      const { data, error } = await supabase
        .schema('pos')
        .from('transaction_items')
        .insert(transactionItems)
        .select();
      
      if (error) {
        console.log('❌ createTransactionItems: Database error:', error);
        throw new PaymentError(`Failed to create transaction items: ${error.message}`);
      }
      
      console.log('✅ createTransactionItems: Successfully created', data?.length || 0, 'transaction items');
      
    } catch (error) {
      console.log('❌ createTransactionItems: Unexpected error:', error);
      throw error;
    }
  }
  
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .schema('pos')
      .from('orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('Failed to update order status:', error);
      // Don't throw error - transaction was successful
    }
  }
  
  private async cleanupFailedTransaction(transactionId: string): Promise<void> {
    try {
      // Delete transaction items first (foreign key constraint)
      await supabase
        .schema('pos')
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId);
      
      // Delete transaction
      await supabase
        .schema('pos')
        .from('transactions')
        .delete()
        .eq('transaction_id', transactionId);
        
    } catch (error) {
      console.error('Failed to cleanup failed transaction:', error);
    }
  }
  
  private mapDatabaseTransactionToType(data: any): Transaction {
    return {
      id: data.id,
      transactionId: data.transaction_id,
      receiptNumber: data.receipt_number,
      subtotal: data.subtotal_amount,
      vatAmount: data.vat_amount,
      totalAmount: data.total_amount,
      discountAmount: data.discount_amount,
      paymentMethods: typeof data.payment_methods === 'string' 
        ? JSON.parse(data.payment_methods) 
        : data.payment_methods,
      paymentStatus: data.payment_status,
      tableSessionId: data.table_session_id,
      orderId: '', // order_id removed from transactions table
      staffPin: data.staff_pin || '',
      customerId: data.customer_id,
      tableNumber: data.table_number,
      transactionDate: new Date(data.transaction_date),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      items: data.transaction_items?.map(this.mapDatabaseTransactionItemToType) || []
    };
  }
  
  private mapDatabaseTransactionItemToType(data: any): TransactionItem {
    return {
      id: data.id,
      transactionId: data.transaction_id,
      itemSequence: data.item_sequence,
      orderId: '', // order_id removed from transactions table
      tableSessionId: data.table_session_id,
      productId: data.product_id,
      productName: data.product_name,
      productCategory: data.product_category,
      productParentCategory: data.product_parent_category,
      skuNumber: data.sku_number,
      itemCount: data.item_cnt,
      itemPriceInclVat: data.item_price_incl_vat,
      itemPriceExclVat: data.item_price_excl_vat,
      itemDiscount: data.item_discount,
      salesTotal: data.sales_total,
      salesNet: data.sales_net,
      paymentMethod: data.payment_method,
      paymentAmountAllocated: data.payment_amount_allocated,
      staffPin: data.staff_pin,
      customerId: data.customer_id,
      customerName: data.customer_name,
      tableNumber: data.table_number,
      isSimUsage: data.is_sim_usage,
      itemNotes: data.item_notes,
      isVoided: data.is_voided,
      voidedAt: data.voided_at ? new Date(data.voided_at) : undefined,
      voidedBy: data.voided_by,
      salesTimestamp: new Date(data.sales_timestamp),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Export singleton instance
export const transactionService = new TransactionService();