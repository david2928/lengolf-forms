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

export class TransactionService {
  
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
    } = {}
  ): Promise<Transaction> {
    
    console.log('🔍 TransactionService: Starting transaction creation...');
    
    try {
      // Validate inputs
      console.log('🔍 TransactionService: Validating inputs...');
      this.validateTransactionInputs(orderId, tableSessionId, paymentAllocations, staffPin);
      console.log('✅ TransactionService: Input validation passed');
    } catch (error) {
      console.log('❌ TransactionService: Input validation failed:', error);
      throw error;
    }
    
    // Get order details or table session data
    console.log('🔍 TransactionService: Fetching order/session data...');
    let order: any;
    try {
      if (orderId) {
        console.log('🔍 TransactionService: Fetching order by ID:', orderId);
        order = await this.getOrderWithItems(orderId);
      } else {
        console.log('🔍 TransactionService: Fetching table session:', tableSessionId);
        order = await this.getTableSessionForPayment(tableSessionId);
      }
      console.log('✅ TransactionService: Order/session data retrieved:', { total_amount: order?.total_amount });
    } catch (error) {
      console.log('❌ TransactionService: Failed to fetch order/session data:', error);
      throw error;
    }
    
    // Validate payment amounts
    try {
      console.log('🔍 TransactionService: Validating payment amounts...');
      this.validatePaymentAmounts(paymentAllocations, order.total_amount);
      console.log('✅ TransactionService: Payment amount validation passed');
    } catch (error) {
      console.log('❌ TransactionService: Payment amount validation failed:', error);
      throw error;
    }
    
    // Generate transaction identifiers
    const transactionId = crypto.randomUUID();
    const receiptNumber = await this.generateReceiptNumber();
    
    try {
      // Create transaction record
      const transaction = await this.createTransactionRecord(
        transactionId,
        receiptNumber,
        order,
        paymentAllocations,
        tableSessionId,
        staffPin,
        options,
        orderId // Pass the original order ID parameter
      );
      
      // Create transaction items
      await this.createTransactionItems(
        transactionId,
        order,
        paymentAllocations,
        tableSessionId,
        staffPin,
        options
      );
      
      // Update order status if orderId exists
      if (orderId) {
        await this.updateOrderStatus(orderId, 'completed');
      }
      
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
      .select('*') // Avoid complex relationship joins to prevent schema cache issues
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
    
    // Return transaction with empty items array to avoid relationship issues
    return {
      ...this.mapDatabaseTransactionToType(data),
      items: [] // Skip transaction items to avoid relationship errors
    };
  }
  
  /**
   * Get transactions for a table session
   */
  async getTransactionsByTableSession(tableSessionId: string): Promise<Transaction[]> {
    // Query transactions without the complex relationship join to avoid schema cache issues
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
    
    // Map transactions and set empty items array to avoid relationship issues
    return transactions.map(transaction => ({
      ...this.mapDatabaseTransactionToType(transaction),
      items: [] // Skip transaction items for now to avoid relationship errors
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
      orderItems = tableSession.current_order_items.map((item: any, index: number) => ({
        id: crypto.randomUUID(),
        product_id: item.product_id || crypto.randomUUID(),
        product_name: item.product_name || 'Unknown Item',
        category_id: item.category_id || crypto.randomUUID(),
        category_name: item.category_name || 'Unknown Category',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: (item.quantity || 1) * (item.unit_price || 0),
        modifiers: item.modifiers || [],
      }));
      
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
          orderItems = latestOrder.order_items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            category_id: item.category_id,
            category_name: item.category_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            modifiers: item.modifiers || [],
            notes: item.notes
          }));
          
          // Use the order's total amount
          totalAmount = parseFloat(latestOrder.total_amount) || totalAmount;
        }
      }
    }
    
    // If still no items, create a generic session total item
    if (orderItems.length === 0) {
      if (totalAmount <= 0) {
        console.log('❌ getTableSessionForPayment - no items and no amount to pay');
        throw new PaymentError('Table session has no items or amount to pay');
      }
      
      console.log('🔍 getTableSessionForPayment - creating generic session total item');
      orderItems = [{
        id: crypto.randomUUID(),
        product_id: crypto.randomUUID(),
        product_name: 'Table Session Total',
        category_id: crypto.randomUUID(),
        category_name: 'Table Session',
        quantity: 1,
        unit_price: totalAmount,
        total_price: totalAmount,
        modifiers: [],
      }];
    }
    
    console.log('🔍 getTableSessionForPayment - final order items:', orderItems.length, 'total:', totalAmount);
    
    return {
      id: crypto.randomUUID(),
      table_session_id: tableSessionId,
      total_amount: totalAmount,
      order_items: orderItems,
      notes: tableSession.notes || 'Table session payment'
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
  
  private async createTransactionRecord(
    transactionId: string,
    receiptNumber: string,
    order: any,
    paymentAllocations: PaymentAllocation[],
    tableSessionId: string,
    staffPin: string,
    options: any,
    originalOrderId?: string
  ): Promise<Transaction> {
    
    console.log('🔍 createTransactionRecord: originalOrderId type:', typeof originalOrderId);
    console.log('🔍 createTransactionRecord: originalOrderId value:', originalOrderId);
    
    const finalOrderId = (originalOrderId && originalOrderId !== 'undefined') ? originalOrderId : null;
    console.log('🔍 createTransactionRecord: final order_id for DB:', finalOrderId);
    
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .insert({
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        subtotal: order.subtotal_amount || 0,
        vat_amount: order.tax_amount || 0,
        total_amount: order.total_amount,
        discount_amount: 0,
        payment_methods: JSON.stringify(paymentAllocations),
        payment_status: 'completed',
        table_session_id: tableSessionId,
        order_id: finalOrderId, // Only use order_id if it's a valid string
        staff_pin: staffPin,
        customer_id: options.customerId,
        table_number: options.tableNumber
      })
      .select()
      .single();
    
    if (error) {
      throw new PaymentError(`Failed to create transaction: ${error.message}`);
    }
    
    return this.mapDatabaseTransactionToType(data);
  }
  
  private async createTransactionItems(
    transactionId: string,
    order: any,
    paymentAllocations: PaymentAllocation[],
    tableSessionId: string,
    staffPin: string,
    options: any
  ): Promise<void> {
    console.log('🔍 createTransactionItems: Starting transaction items creation...');
    console.log('🔍 createTransactionItems: transactionId:', transactionId);
    console.log('🔍 createTransactionItems: order.order_items length:', order.order_items?.length);
    
    if (!order.order_items || order.order_items.length === 0) {
      console.log('❌ createTransactionItems: No order items to create transaction items from');
      throw new PaymentError('No order items found to create transaction items');
    }
    
    const paymentMethodString = formatPaymentMethodString(paymentAllocations);
    console.log('🔍 createTransactionItems: paymentMethodString:', paymentMethodString);
    
    // For table session payments, order.id is a generated UUID that doesn't exist in orders table
    const isTableSessionPayment = order.table_session_id && !order.id?.startsWith('order_');
    const orderIdForItems = isTableSessionPayment ? null : order.id;
    
    console.log('🔍 createTransactionItems: isTableSessionPayment:', isTableSessionPayment);
    console.log('🔍 createTransactionItems: order.id:', order.id);
    console.log('🔍 createTransactionItems: orderIdForItems:', orderIdForItems);
    
    try {
      const transactionItems = order.order_items.map((item: any, index: number) => {
        console.log(`🔍 createTransactionItems: Processing item ${index + 1}:`, {
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
        
        return {
          transaction_id: transactionId,
          item_sequence: index + 1,
          order_id: orderIdForItems,
          table_session_id: tableSessionId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.category_name,
          sku_number: null,
          item_cnt: item.quantity,
          item_price_incl_vat: item.unit_price,
          item_price_excl_vat: item.unit_price / 1.07, // Remove 7% VAT
          item_discount: 0,
          sales_total: item.total_price,
          sales_net: item.total_price,
          payment_method: paymentMethodString,
          payment_amount_allocated: item.total_price,
          staff_pin: staffPin,
          customer_id: options.customerId,
          customer_name: options.customerName,
          table_number: options.tableNumber,
          is_sim_usage: false,
          item_notes: item.notes,
          is_voided: false
        };
      });
      
      console.log('🔍 createTransactionItems: Inserting', transactionItems.length, 'transaction items');
      
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
      subtotal: data.subtotal,
      vatAmount: data.vat_amount,
      totalAmount: data.total_amount,
      discountAmount: data.discount_amount,
      paymentMethods: typeof data.payment_methods === 'string' 
        ? JSON.parse(data.payment_methods) 
        : data.payment_methods,
      paymentStatus: data.payment_status,
      tableSessionId: data.table_session_id,
      orderId: data.order_id,
      staffPin: data.staff_pin,
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
      orderId: data.order_id,
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