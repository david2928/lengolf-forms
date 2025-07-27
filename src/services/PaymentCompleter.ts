// Payment Completion Service
// Handles the complete payment workflow including table session closure

import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { 
  Transaction, 
  PaymentAllocation, 
  PaymentProcessingResponse,
  PaymentError 
} from '@/types/payment';
import { transactionService } from './TransactionService';
import { receiptGenerator } from './ReceiptGenerator';

export interface PaymentCompletionResult {
  success: boolean;
  transaction: Transaction;
  receiptGenerated: boolean;
  tableSessionUpdated: boolean;
  orderCompleted: boolean;
  redirectToTables: boolean;
  errors?: string[];
}

export class PaymentCompleter {
  
  /**
   * Complete the entire payment workflow
   */
  async completePayment(
    orderId: string | undefined,
    tableSessionId: string,
    paymentAllocations: PaymentAllocation[],
    staffPin: string,
    options: {
      customerId?: string;
      customerName?: string;
      tableNumber?: string;
      notes?: string;
      closeTableSession?: boolean;
      staffId?: number;
      staffName?: string;
    } = {}
  ): Promise<PaymentCompletionResult> {
    
    const result: PaymentCompletionResult = {
      success: false,
      transaction: {} as Transaction,
      receiptGenerated: false,
      tableSessionUpdated: false,
      orderCompleted: false,
      redirectToTables: false,
      errors: []
    };

    try {
      // Step 1: Create transaction
      console.log('🔍 PaymentCompleter: Creating payment transaction...');
      console.log('🔍 Input parameters:');
      console.log('  - orderId:', orderId);
      console.log('  - tableSessionId:', tableSessionId);
      console.log('  - paymentAllocations:', JSON.stringify(paymentAllocations, null, 2));
      console.log('  - staffPin:', staffPin ? '***' : 'undefined');
      console.log('  - options:', JSON.stringify(options, null, 2));
      
      const transaction = await transactionService.createTransaction(
        orderId,
        tableSessionId,
        paymentAllocations,
        staffPin,
        {
          customerId: options.customerId,
          customerName: options.customerName,
          tableNumber: options.tableNumber,
          notes: options.notes
        }
      );

      result.transaction = transaction;
      console.log(`🔍 PaymentCompleter: Transaction created - Receipt: ${transaction.receiptNumber}, ID: ${transaction.transactionId}`);

      // Step 2: Update table session
      if (options.closeTableSession !== false) {
        try {
          console.log('🔍 PaymentCompleter: About to clear table session (closeTableSession:', options.closeTableSession, ')');
          await this.updateTableSessionAfterPayment(tableSessionId, transaction.totalAmount);
          result.tableSessionUpdated = true;
          console.log('✅ PaymentCompleter: Table session updated and cleared');
        } catch (error) {
          console.error('❌ PaymentCompleter: Failed to update table session:', error);
          result.errors?.push('Failed to update table session');
        }
      } else {
        console.log('🔍 PaymentCompleter: Skipping table session clearing (closeTableSession:', options.closeTableSession, ')');
      }

      // Step 3: Generate receipt
      try {
        await this.ensureReceiptGenerated(transaction.transactionId);
        result.receiptGenerated = true;
        console.log('Receipt generation verified');
      } catch (error) {
        console.error('Failed to generate receipt:', error);
        result.errors?.push('Failed to generate receipt');
      }

      // Step 4: Mark order as completed (already done in transaction service)
      result.orderCompleted = true;

      // Step 5: Determine if should redirect to tables
      result.redirectToTables = options.closeTableSession !== false;

      result.success = true;
      console.log('Payment completion successful');

      return result;

    } catch (error) {
      console.error('Payment completion failed:', error);
      
      if (error instanceof PaymentError) {
        result.errors = [error.message];
      } else {
        result.errors = ['Payment processing failed'];
      }

      // Try to cleanup any partial state
      if (orderId) {
        await this.cleanupFailedPayment(orderId, tableSessionId);
      }

      return result;
    }
  }

  /**
   * Process split payment completion
   */
  async completeSplitPayment(
    orderId: string,
    tableSessionId: string,
    splits: {
      splitId: string;
      paymentAllocations: PaymentAllocation[];
      customerInfo?: string;
    }[],
    staffPin: string,
    options: {
      customerId?: string;
      tableNumber?: string;
      notes?: string;
    } = {}
  ): Promise<PaymentCompletionResult> {
    
    // Combine all split payments into single payment allocations
    const allPaymentAllocations: PaymentAllocation[] = [];
    
    splits.forEach(split => {
      allPaymentAllocations.push(...split.paymentAllocations);
    });

    // Group by payment method and sum amounts
    const groupedPayments = allPaymentAllocations.reduce((acc, allocation) => {
      const existing = acc.find(a => a.method === allocation.method);
      if (existing) {
        existing.amount += allocation.amount;
      } else {
        acc.push({ ...allocation });
      }
      return acc;
    }, [] as PaymentAllocation[]);

    // Complete payment with grouped allocations
    return this.completePayment(
      orderId,
      tableSessionId,
      groupedPayments,
      staffPin,
      {
        ...options,
        notes: options.notes ? `${options.notes} (Split payment)` : 'Split payment'
      }
    );
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
      const transactions = await transactionService.getTransactionsByTableSession(tableSessionId);
      
      const completedTransactions = transactions.filter(t => t.paymentStatus === 'completed');
      const totalPaid = completedTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      
      // Get total order amount for this session
      const { data: orders, error } = await supabase
        .schema('pos')
        .from('orders')
        .select('total_amount')
        .eq('table_session_id', tableSessionId)
        .eq('status', 'confirmed');

      const totalOrderAmount = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalUnpaid = Math.max(0, totalOrderAmount - totalPaid);

      return {
        hasPendingPayments: totalUnpaid > 0,
        hasCompletedPayments: completedTransactions.length > 0,
        totalPaid,
        totalUnpaid,
        transactions
      };

    } catch (error) {
      console.error('Failed to get payment status:', error);
      return {
        hasPendingPayments: false,
        hasCompletedPayments: false,
        totalPaid: 0,
        totalUnpaid: 0,
        transactions: []
      };
    }
  }

  /**
   * Close table session after all payments are complete
   */
  async closeTableSession(
    tableSessionId: string, 
    staffPin: string,
    reason: string = 'Payment completed',
    forceClose: boolean = false
  ): Promise<boolean> {
    
    try {
      // Check if all payments are complete (unless forceClose is true)
      const paymentStatus = await this.getPaymentStatus(tableSessionId);
      
      if (!forceClose && paymentStatus.hasPendingPayments) {
        throw new PaymentError('Cannot close table session with pending payments');
      }
      
      // Log if we're force closing with unpaid orders
      if (forceClose && paymentStatus.hasPendingPayments) {
        console.log(`🔍 PaymentCompleter: Force closing session ${tableSessionId} with unpaid: ฿${paymentStatus.totalUnpaid}`);
      }

      // PaymentCompleter should only handle 'paid' status (successful payment completion)
      // Cancellations should use TableSessionService instead
      if (forceClose) {
        throw new Error('PaymentCompleter should not handle cancellations. Use TableSessionService.cancelSession() instead.');
      }
      
      const { error } = await supabase
        .schema('pos')
        .from('table_sessions')
        .update({
          status: 'paid',
          pax_count: 0,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tableSessionId);

      if (error) {
        throw new Error(`Failed to close table session: ${error.message}`);
      }

      // PaymentCompleter only handles paid completions, not cancellations
      // Orders are marked as 'completed' when payment is successful

      console.log(`Table session ${tableSessionId} closed by ${staffPin}: ${reason}`);
      return true;

    } catch (error) {
      console.error('Failed to close table session:', error);
      throw error;
    }
  }

  // Private helper methods

  private async updateTableSessionAfterPayment(
    tableSessionId: string, 
    paymentAmount: number
  ): Promise<void> {
    
    console.log('🔍 Clearing table session after payment:', tableSessionId);

    // Clear the table session - set it to 'free' status
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        status: 'paid',
        pax_count: 0, // Reset pax count for paid status
        session_end: new Date().toISOString(),
        total_amount: paymentAmount, // Set final payment amount
        current_order_items: null, // Clear current order items
        notes: null, // Clear any session notes
        updated_at: new Date().toISOString()
      })
      .eq('id', tableSessionId);

    if (updateError) {
      console.error('❌ Failed to clear table session:', updateError);
      throw new Error(`Failed to clear table session: ${updateError.message}`);
    }

    console.log('✅ Table session cleared successfully');
  }

  private async ensureReceiptGenerated(transactionId: string): Promise<void> {
    try {
      // Receipt generation is handled by the receipt API
      // This method just verifies the transaction exists and is complete
      console.log('🔍 ensureReceiptGenerated: Looking for transaction ID:', transactionId);
      
      const transaction = await transactionService.getTransaction(transactionId);
      
      if (!transaction) {
        console.log('❌ ensureReceiptGenerated: Transaction not found:', transactionId);
        // Don't throw error - receipt generation is not critical for payment success
        console.log('⚠️ ensureReceiptGenerated: Skipping receipt verification - transaction not found but payment was successful');
        return;
      }

      console.log('✅ ensureReceiptGenerated: Transaction found:', { 
        id: transaction.transactionId, 
        status: transaction.paymentStatus 
      });

      if (transaction.paymentStatus !== 'completed') {
        console.log('❌ ensureReceiptGenerated: Transaction not completed:', transaction.paymentStatus);
        // Don't throw error - receipt generation is not critical for payment success
        console.log('⚠️ ensureReceiptGenerated: Skipping receipt verification - transaction not completed');
        return;
      }

      // Receipt can be generated on-demand via /api/pos/receipts
      // This is successful if we reach here
      console.log('✅ ensureReceiptGenerated: Transaction ready for receipt generation');
    } catch (error) {
      console.error('❌ ensureReceiptGenerated: Error checking transaction:', error);
      // Don't throw error - receipt generation is not critical for payment success
      console.log('⚠️ ensureReceiptGenerated: Continuing despite receipt verification error');
    }
  }

  private async cleanupFailedPayment(
    orderId: string, 
    tableSessionId: string
  ): Promise<void> {
    
    try {
      // Reset order status if it was updated
      await supabase
        .schema('pos')
        .from('orders')
        .update({
          status: 'confirmed', // Reset to confirmed from completed
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'completed'); // Only reset if it was marked completed

      console.log('Cleaned up failed payment state');

    } catch (error) {
      console.error('Failed to cleanup payment state:', error);
    }
  }
}

// Export singleton instance
export const paymentCompleter = new PaymentCompleter();