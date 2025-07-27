// Table Session Management Service
// Handles table session lifecycle: completion, cancellation, status updates

import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { getStaffIdFromPin } from '@/lib/staff-helpers';
import { paymentCompleter } from './PaymentCompleter';

export interface SessionCloseResult {
  success: boolean;
  sessionId: string;
  finalStatus: 'paid' | 'closed';
  message: string;
  errors?: string[];
}

export class TableSessionService {
  
  /**
   * Complete a session with full payment
   */
  async completeSessionWithPayment(
    sessionId: string,
    staffPin: string,
    reason: string = 'Payment completed'
  ): Promise<SessionCloseResult> {
    
    try {
      // Use PaymentCompleter for actual payment completion
      const success = await paymentCompleter.closeTableSession(
        sessionId,
        staffPin,
        reason,
        false // Not force close - requires payment
      );

      return {
        success,
        sessionId,
        finalStatus: 'paid',
        message: 'Session completed with payment'
      };

    } catch (error) {
      console.error('Failed to complete session with payment:', error);
      return {
        success: false,
        sessionId,
        finalStatus: 'closed',
        message: 'Failed to complete session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Cancel a session (force close without payment)
   */
  async cancelSession(
    sessionId: string,
    staffPin: string,
    reason: string
  ): Promise<SessionCloseResult> {
    
    try {
      console.log(`🔍 TableSessionService: Cancelling session ${sessionId} with reason: ${reason}`);
      
      // Get staff ID for tracking
      const staffId = await getStaffIdFromPin(staffPin);
      if (!staffId) {
        throw new Error('Invalid staff PIN or inactive staff');
      }

      // Update session to closed status with cancellation tracking
      const { error } = await supabase
        .schema('pos')
        .from('table_sessions')
        .update({
          status: 'closed',
          pax_count: 0,
          session_end: new Date().toISOString(),
          cancelled_by: staffId,
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(`Failed to cancel session: ${error.message}`);
      }

      // Cancel all related orders
      const { error: ordersError } = await supabase
        .schema('pos')
        .from('orders')
        .update({
          status: 'cancelled'
        })
        .eq('table_session_id', sessionId)
        .in('status', ['confirmed', 'preparing', 'ready']);

      if (ordersError) {
        console.error('Failed to cancel orders:', ordersError);
        // Don't throw - session cancellation is more important
      } else {
        console.log(`Orders for session ${sessionId} marked as cancelled`);
      }

      console.log(`✅ Session ${sessionId} cancelled by staff ${staffId}: ${reason}`);
      
      return {
        success: true,
        sessionId,
        finalStatus: 'closed',
        message: `Session cancelled: ${reason}`
      };

    } catch (error) {
      console.error('Failed to cancel session:', error);
      return {
        success: false,
        sessionId,
        finalStatus: 'closed',
        message: 'Failed to cancel session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get session status and payment information
   */
  async getSessionStatus(sessionId: string): Promise<{
    status: string;
    hasPendingPayments: boolean;
    totalPaid: number;
    totalUnpaid: number;
  }> {
    
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .schema('pos')
        .from('table_sessions')
        .select('status, total_amount')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Use PaymentCompleter to get payment status
      const paymentStatus = await paymentCompleter.getPaymentStatus(sessionId);
      
      return {
        status: session.status,
        hasPendingPayments: paymentStatus.hasPendingPayments,
        totalPaid: paymentStatus.totalPaid,
        totalUnpaid: paymentStatus.totalUnpaid
      };

    } catch (error) {
      console.error('Failed to get session status:', error);
      return {
        status: 'unknown',
        hasPendingPayments: false,
        totalPaid: 0,
        totalUnpaid: 0
      };
    }
  }
}

// Export singleton instance
export const tableSessionService = new TableSessionService();