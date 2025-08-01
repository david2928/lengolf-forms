// Bill Data Service
// Fetches active table session data for pre-payment bill printing
// Used for generating bills before payment processing

import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { ReceiptData } from './receipt-formatter';

export interface BillData {
  tableSessionId: string;
  tableNumber: string | null;
  customerName: string | null;
  staffName: string | null;
  sessionStart: string;
  paxCount: number;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  isBill: true; // Flag to indicate this is a bill, not a receipt
}

export interface BillItem {
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export class BillDataService {
  /**
   * Get current bill data for an active table session using RPC function
   */
  static async getBillData(tableSessionId: string): Promise<BillData> {
    console.log('📄 BillDataService: Fetching bill data for table session', tableSessionId);

    // Call the PostgreSQL function to get bill data
    const { data, error } = await supabase
      .rpc('get_bill_data', { 
        p_table_session_id: tableSessionId 
      });

    if (error) {
      console.error('❌ BillDataService: RPC error:', error);
      throw new Error(`Failed to fetch bill data: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No bill data returned for table session: ${tableSessionId}`);
    }

    // Parse the JSON response from the RPC function
    const billData: BillData = {
      tableSessionId: data.tableSessionId,
      tableNumber: data.tableNumber,
      customerName: data.customerName,
      staffName: data.staffName,
      sessionStart: data.sessionStart,
      paxCount: data.paxCount,
      items: data.items || [],
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      total: parseFloat(data.total) || 0,
      isBill: true
    };

    console.log('✅ BillDataService: Bill data prepared', {
      tableSessionId: billData.tableSessionId,
      tableNumber: billData.tableNumber,
      itemCount: billData.items.length,
      total: billData.total
    });

    return billData;
  }

  /**
   * Convert BillData to ReceiptData format for printing
   */
  static convertBillToReceiptData(billData: BillData): ReceiptData {
    return {
      receiptNumber: `BILL-${billData.tableSessionId}`,
      items: billData.items,
      subtotal: billData.subtotal,
      tax: billData.tax,
      total: billData.total,
      paymentMethods: [], // No payment methods for bills
      tableNumber: billData.tableNumber || undefined,
      customerName: billData.customerName || undefined,
      staffName: billData.staffName || undefined,
      transactionDate: billData.sessionStart,
      paxCount: billData.paxCount,
      isTaxInvoice: false,
      // Add bill-specific flag
      isBill: true
    };
  }

  /**
   * Validate table session ID format
   */
  static isValidTableSessionId(tableSessionId: string): boolean {
    if (!tableSessionId || typeof tableSessionId !== 'string') {
      return false;
    }
    
    // Should be a valid number string or UUID
    return /^[0-9a-fA-F-]+$/.test(tableSessionId) && tableSessionId.length > 0;
  }

  /**
   * Get bill summary for logging/debugging
   */
  static getBillSummary(billData: BillData): {
    tableSessionId: string;
    tableNumber: string | null;
    itemCount: number;
    total: number;
    paxCount: number;
  } {
    return {
      tableSessionId: billData.tableSessionId,
      tableNumber: billData.tableNumber,
      itemCount: billData.items.length,
      total: billData.total,
      paxCount: billData.paxCount
    };
  }
}