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

    if (transactionError || !transaction) {
      throw new Error(`Receipt not found: ${receiptNumber}`);
    }

    // Get payment methods from transaction_payments table
    const { data: paymentMethods } = await supabase
      .schema('pos')
      .from('transaction_payments')
      .select('payment_method, payment_amount')
      .eq('transaction_id', transaction.transaction_id)
      .order('payment_sequence');

    // Get order data using table session ID
    const { data: orderData, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('table_session_id', transaction.table_session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError || !orderData) {
      throw new Error(`Order not found for table session: ${transaction.table_session_id}`);
    }

    // Get product names
    const productIds = orderData.order_items.map((item: any) => item.product_id);
    const { data: products } = await supabase
      .schema('products')
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const productMap = new Map(products?.map((p: any) => [p.id, p.name]) || []);

    // Prepare receipt data
    const receiptData: ReceiptData = {
      receiptNumber: transaction.receipt_number,
      items: (orderData.order_items || []).map((item: any) => ({
        name: productMap.get(item.product_id) || 'Unknown Item',
        price: item.unit_price || 0,
        qty: item.quantity || 1,
        notes: item.notes
      })),
      subtotal: transaction.subtotal,
      tax: transaction.vat_amount,
      total: transaction.total_amount,
      paymentMethods: paymentMethods?.map((pm: any) => ({
        method: pm.payment_method,
        amount: pm.payment_amount
      })) || [{
        method: 'Cash',
        amount: transaction.total_amount
      }],
      tableNumber: transaction.table_number,
      customerName: transaction.customer_name,
      staffName: transaction.staff_name || 'Unknown Staff',
      transactionDate: transaction.sales_timestamp_bkk,
      paxCount: transaction.pax_count || 1,
      isTaxInvoice: false
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