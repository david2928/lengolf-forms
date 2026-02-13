import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { ReconciliationDataResponse } from '../types/bank-reconciliation';

export const DEFAULT_BANK_ACCOUNT_NUMBER = '170-3-26995-4';

/**
 * Fetch all 5 reconciliation data sources from Supabase in parallel.
 * Shared between the admin API route and the cron job.
 *
 * @throws Error if any query fails (caller handles HTTP / notification)
 */
export async function fetchReconciliationData(
  startDate: string,
  endDate: string,
  accountNumber?: string
): Promise<ReconciliationDataResponse> {
  const bankAccountNumber = accountNumber || DEFAULT_BANK_ACCOUNT_NUMBER;

  const [merchantResult, closingResult, salesResult, cashResult, bankResult] = await Promise.all([
    // 1. Merchant transaction summaries (card + ewallet settlements)
    refacSupabaseAdmin
      .schema('finance')
      .from('merchant_transaction_summaries')
      .select('*')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true }),

    // 2. POS daily closings
    refacSupabaseAdmin
      .schema('pos')
      .from('daily_reconciliations')
      .select('*')
      .gte('closing_date', startDate)
      .lte('closing_date', endDate)
      .order('closing_date', { ascending: true }),

    // 3. POS daily sales via RPC
    refacSupabaseAdmin.rpc('get_daily_sales_report', {
      p_start_date: startDate,
      p_end_date: endDate,
    }),

    // 4. Cash checks
    refacSupabaseAdmin
      .from('cash_checks')
      .select('*')
      .gte('timestamp', `${startDate}T00:00:00`)
      .lte('timestamp', `${endDate}T23:59:59`)
      .order('timestamp', { ascending: true }),

    // 5. Bank statement transactions
    refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('*')
      .eq('account_number', bankAccountNumber)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: true })
      .order('transaction_time', { ascending: true }),
  ]);

  // Check for errors - throw so caller can handle appropriately
  if (merchantResult.error) {
    throw new Error(`Failed to fetch merchant settlements: ${merchantResult.error.message}`);
  }
  if (closingResult.error) {
    throw new Error(`Failed to fetch daily closings: ${closingResult.error.message}`);
  }
  if (salesResult.error) {
    throw new Error(`Failed to fetch daily sales: ${salesResult.error.message}`);
  }
  if (cashResult.error) {
    throw new Error(`Failed to fetch cash checks: ${cashResult.error.message}`);
  }
  if (bankResult.error) {
    throw new Error(`Failed to fetch bank transactions: ${bankResult.error.message}`);
  }

  return {
    merchantSettlements: merchantResult.data || [],
    dailyClosings: closingResult.data || [],
    dailySales: salesResult.data || [],
    cashChecks: cashResult.data || [],
    bankTransactions: bankResult.data || [],
  };
}
