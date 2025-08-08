// Shared Receipt Data Service
// Consolidates database queries and receipt data preparation
// Used by both Bluetooth and USB printing API endpoints

import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { ReceiptData, TaxInvoiceData } from './receipt-formatter';

export interface TransactionDetails {
  receiptNumber: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  tableNumber: string | null;
  customerName: string | null;
  staffName: string | null;
  tableSessionId: string;
  salesTimestampBkk: string;
  paxCount: number | null;
  transactionId: string;
}

export class ReceiptDataService {
  /**
   * Get complete receipt data for printing
   */
  static async getReceiptData(receiptNumber: string): Promise<ReceiptData> {
    console.log('📄 ReceiptDataService: Fetching receipt data for', receiptNumber);

    // Look up transaction using the transaction_details view
    const { data: transaction, error: transactionError } = await supabase
      .schema('pos')
      .from('transaction_details')
      .select('*')
      .eq('receipt_number', receiptNumber)
      .single();

    // Also get the full transaction record for discount information
    const { data: fullTransaction } = await supabase
      .schema('pos')
      .from('transactions')
      .select('discount_amount, applied_discount_id, subtotal_amount')
      .eq('receipt_number', receiptNumber)
      .single();

    if (transactionError || !transaction) {
      throw new Error(`Receipt not found: ${receiptNumber}`);
    }

    // Get payment methods from transaction_payments table with display names
    // Note: transaction_payments.transaction_id references the database ID, not the logical transaction_id
    const { data: paymentMethods, error: paymentError } = await supabase
      .schema('pos')
      .from('transaction_payments')
      .select(`
        payment_amount,
        payment_method_id,
        payment_method_enum:payment_methods_enum!inner(display_name)
      `)
      .eq('transaction_id', transaction.id)  // Use database ID instead of logical transaction_id
      .order('payment_sequence');

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Payment methods for receipt:', receiptNumber, {
        transactionDbId: transaction.id,
        transactionLogicalId: transaction.transaction_id,
        paymentMethods,
        paymentCount: paymentMethods?.length || 0,
        paymentError
      });
    }

    // Get ALL orders data using table session ID with discount information
    const { data: ordersData, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .select(`
        *, 
        order_items (
          *, 
          applied_discount:discounts(id, title, discount_type, discount_value)
        )
      `)
      .eq('table_session_id', transaction.table_session_id)
      .order('created_at', { ascending: true }); // Sort by creation time to maintain order sequence

    if (orderError || !ordersData || ordersData.length === 0) {
      throw new Error(`Order not found for table session: ${transaction.table_session_id}`);
    }

    // Combine all order items from all orders
    let allOrderItems = ordersData.flatMap((order: any) => order.order_items || []);

    // If no order items found, fall back to transaction_items table using the database ID
    if (allOrderItems.length === 0) {
      console.log('⚠️ No order items found, checking transaction_items table');
      
      // Important: Use transaction.id (the database ID) not transaction.transaction_id (the logical ID)
      const { data: transactionItems } = await supabase
        .schema('pos')
        .from('transaction_items')
        .select(`
          *,
          applied_discount:discounts(id, title, discount_type, discount_value)
        `)
        .eq('transaction_id', transaction.id) // Use the database ID
        .order('line_number');

      if (transactionItems && transactionItems.length > 0) {
        console.log(`✅ Found ${transactionItems.length} items in transaction_items table`);
        // Map transaction_items to match order_items structure
        allOrderItems = transactionItems.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.item_cnt || 1,
          unit_price: parseFloat(item.unit_price_incl_vat || item.item_price_incl_vat),
          total_price: parseFloat(item.line_total_incl_vat || item.item_price_incl_vat),
          discount_amount: parseFloat(item.line_discount || item.item_discount || 0),
          notes: item.item_notes,
          applied_discount: item.applied_discount
        }));
      }
    }

    // Get product names for all items
    const productIds = allOrderItems.map((item: any) => item.product_id).filter(Boolean);
    const { data: products } = productIds.length > 0 ? await supabase
      .schema('products')
      .from('products')
      .select('id, name')
      .in('id', productIds) : { data: [] };

    const productMap = new Map(products?.map((p: any) => [p.id, p.name]) || []);

    // Get discount information if available
    let receiptDiscountInfo = null;
    if (fullTransaction?.applied_discount_id) {
      const { data: discountData } = await supabase
        .schema('pos')
        .from('discounts')
        .select('id, title, discount_type, discount_value')
        .eq('id', fullTransaction.applied_discount_id)
        .single();
      
      if (discountData) {
        receiptDiscountInfo = {
          id: discountData.id,
          title: discountData.title,
          type: discountData.discount_type,
          value: discountData.discount_value,
          amount: fullTransaction.discount_amount || 0
        };
      }
    }

    // Prepare receipt data
    const receiptData: ReceiptData = {
      receiptNumber: transaction.receipt_number,
      items: allOrderItems.map((item: any) => {
        const finalPrice = item.total_price || (item.unit_price * item.quantity);
        const discountAmount = item.discount_amount || 0;
        const originalPrice = finalPrice + discountAmount; // Calculate correct original price
        
        return {
          name: productMap.get(item.product_id) || 'Unknown Item',
          price: finalPrice, // Final price after item discount
          qty: item.quantity || 1,
          notes: item.notes,
          // Item discount fields
          originalPrice: originalPrice,
          itemDiscount: item.applied_discount ? {
            title: item.applied_discount.title,
            type: item.applied_discount.discount_type,
            value: item.applied_discount.discount_value
          } : undefined,
          itemDiscountAmount: discountAmount
        };
      }),
      subtotal: transaction.subtotal,
      tax: transaction.vat_amount,
      total: transaction.total_amount,
      paymentMethods: (paymentMethods && paymentMethods.length > 0 && paymentMethods[0].payment_method_id) 
        ? paymentMethods.map((pm: any) => ({
            method: pm.payment_method_enum?.display_name || 'Unknown',
            amount: pm.payment_amount
          }))
        : [{
            method: 'Cash',
            amount: transaction.total_amount
          }],
      tableNumber: transaction.table_number,
      customerName: transaction.customer_name,
      staffName: transaction.staff_name || 'Unknown Staff',
      transactionDate: transaction.sales_timestamp_bkk,
      paxCount: transaction.pax_count || 1,
      isTaxInvoice: false,
      // Add discount information
      receiptDiscount: receiptDiscountInfo || undefined,
      receiptDiscountAmount: fullTransaction?.discount_amount || 0,
      orderItemsTotal: fullTransaction?.subtotal_amount ? 
        fullTransaction.subtotal_amount + (fullTransaction.discount_amount || 0) : 
        transaction.subtotal
    };

    console.log('✅ ReceiptDataService: Receipt data prepared', {
      receiptNumber: receiptData.receiptNumber,
      itemCount: receiptData.items.length,
      total: receiptData.total
    });

    return receiptData;
  }

  /**
   * Get tax invoice receipt data for printing
   */
  static async getTaxInvoiceData(receiptNumber: string, taxInvoiceData?: TaxInvoiceData): Promise<ReceiptData> {
    console.log('📄 ReceiptDataService: Fetching tax invoice data for', receiptNumber);

    // Get base receipt data first
    const receiptData = await this.getReceiptData(receiptNumber);

    // Fetch the stored customer tax information from the database
    const { data: transaction, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('customer_tax_info, tax_invoice_issued, tax_invoice_number, tax_invoice_date')
      .eq('receipt_number', receiptNumber)
      .single();

    if (error) {
      console.error('❌ ReceiptDataService: Error fetching tax invoice data:', error);
      throw new Error(`Failed to fetch tax invoice data: ${error.message}`);
    }

    // Convert to tax invoice
    receiptData.isTaxInvoice = true;

    // Use stored customer tax info if available, otherwise use provided data
    if (transaction?.customer_tax_info) {
      receiptData.taxInvoiceData = {
        customerName: transaction.customer_tax_info.name,
        customerAddress: transaction.customer_tax_info.address,
        customerTaxId: transaction.customer_tax_info.taxId,
        isCompany: transaction.customer_tax_info.isCompany || false,
        invoiceDate: transaction.tax_invoice_date || new Date().toISOString(),
        dueDate: undefined
      };
    } else {
      // Fallback to provided data or defaults
      receiptData.taxInvoiceData = taxInvoiceData || {
        customerTaxId: undefined,
        customerAddress: undefined,
        invoiceDate: new Date().toISOString(),
        dueDate: undefined
      };
    }

    console.log('✅ ReceiptDataService: Tax invoice data prepared', {
      receiptNumber: receiptData.receiptNumber,
      isTaxInvoice: receiptData.isTaxInvoice,
      hasCustomerTaxInfo: !!transaction?.customer_tax_info
    });

    return receiptData;
  }

  /**
   * Validate receipt number format
   */
  static isValidReceiptNumber(receiptNumber: string): boolean {
    if (!receiptNumber || typeof receiptNumber !== 'string') {
      return false;
    }
    
    // Expected format: R20250127-0001 or similar
    const receiptPattern = /^R\d{8}-\d{4}$/;
    return receiptPattern.test(receiptNumber);
  }

  /**
   * Get receipt summary for logging/debugging
   */
  static getReceiptSummary(receiptData: ReceiptData): {
    receiptNumber: string;
    itemCount: number;
    total: number;
    isTaxInvoice: boolean;
    staffName: string;
  } {
    return {
      receiptNumber: receiptData.receiptNumber,
      itemCount: receiptData.items.length,
      total: receiptData.total,
      isTaxInvoice: receiptData.isTaxInvoice || false,
      staffName: receiptData.staffName || 'Unknown'
    };
  }
}