// Transaction Query Service - Reads transaction data from database
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { Transaction, PaymentError } from '@/types/payment';

export class TransactionQueryService {
  /**
   * Get transaction by ID - Used by PaymentCompleter and receipt functions
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapDatabaseToTransaction(data);
  }
  
  /**
   * Get all transactions for a table session - Used by PaymentCompleter
   */
  async getTransactionsByTableSession(tableSessionId: string): Promise<Transaction[]> {
    const { data: transactions, error } = await supabase
      .schema('pos')
      .from('transactions')
      .select('*')
      .eq('table_session_id', tableSessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new PaymentError(`Failed to fetch transactions: ${error.message}`);
    }
    
    return (transactions || []).map((transaction: any) => this.mapDatabaseToTransaction(transaction));
  }

  /**
   * Check payment status for a table session
   */
  async getPaymentStatus(tableSessionId: string): Promise<{
    hasPendingPayments: boolean;
    hasCompletedPayments: boolean;
    totalPaid: number;
    totalUnpaid: number;
    transactions: Transaction[];
  }> {
    
    try {
      const transactions = await this.getTransactionsByTableSession(tableSessionId);
      
      const completedTransactions = transactions.filter((t: Transaction) => t.paymentStatus === 'completed');
      const totalPaid = completedTransactions.reduce((sum: number, t: Transaction) => sum + t.totalAmount, 0);
      
      // For now, we don't track unpaid amounts separately since POSTransactionService only creates completed transactions
      const totalUnpaid = 0;
      
      return {
        hasPendingPayments: totalUnpaid > 0,
        hasCompletedPayments: completedTransactions.length > 0,
        totalPaid,
        totalUnpaid,
        transactions
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        hasPendingPayments: false,
        hasCompletedPayments: false,
        totalPaid: 0,
        totalUnpaid: 0,
        transactions: []
      };
    }
  }

  private mapDatabaseToTransaction(data: any): Transaction {
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
        : data.payment_methods || [],
      paymentStatus: 'completed', // POSTransactionService always creates completed transactions
      tableSessionId: data.table_session_id,
      orderId: '',
      staffPin: '',
      customerId: data.customer_id,
      tableNumber: data.table_number,
      transactionDate: new Date(data.transaction_date),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      items: [] // Items loaded separately if needed
    };
  }
}

// Export singleton instance
export const transactionQueryService = new TransactionQueryService();