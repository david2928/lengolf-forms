// ============================================================
// Bank Statement (parsed from KBank CSV)
// ============================================================

export type BankTransactionCategory =
  | 'card_settlement'    // "Payment Received: FullPay/Install/Redemp"
  | 'ewallet_settlement' // "Payment Received: Alipay/WeChat"
  | 'transfer_deposit'   // "Transfer Deposit"
  | 'withdrawal'         // "Transfer Withdrawal"
  | 'other';

export interface BankTransaction {
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm or empty for beginning balance
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  channel: string;
  details: string;
  category: BankTransactionCategory;
  // Reconciliation status (set by engine)
  reconciliationStatus: 'reconciled' | 'partial' | 'unreconciled' | 'pending';
  reconciliationNote: string;
  matchedSource?: 'merchant_card' | 'merchant_ewallet' | 'pos_qr' | null;
}

export interface BankDayData {
  date: string; // YYYY-MM-DD
  transactions: BankTransaction[];
  cardSettlements: number;      // sum of card_settlement deposits
  ewalletSettlements: number;   // sum of ewallet_settlement deposits
  transferDeposits: number;     // sum of transfer_deposit deposits
  withdrawals: number;          // sum of withdrawal amounts
  totalDeposits: number;
  totalWithdrawals: number;
}

export interface BankStatementParsed {
  accountName: string;
  accountNumber: string;
  period: string;
  dayData: Map<string, BankDayData>;
  allTransactions: BankTransaction[];
  startDate: string;
  endDate: string;
}

// ============================================================
// Database source types
// ============================================================

export interface MerchantSettlement {
  id: number;
  merchant_id: string;
  report_date: string;    // YYYY-MM-DD
  process_date: string;
  trans_item_description: string;
  total_amount: number;   // gross
  total_fee_commission_amount: number;
  vat_on_fee_amount: number;
  net_credit_amount: number;
  wht_tax_amount: number;
  report_source_type: string; // 'KMERCHANT_ZIP' | 'EWALLET_CSV'
}

export interface DailyClosing {
  id: string;
  closing_date: string;
  shift_identifier: string | null;
  expected_cash: number;
  expected_credit_card: number;
  qr_payments_total: number;
  other_payments_total: number;
  actual_cash: number | null;
  actual_credit_card: number | null;
  cash_variance: number | null;
  credit_card_variance: number | null;
  transaction_count: number;
  total_sales: number;
  closed_by_staff_name: string | null;
}

export interface DailySalesData {
  date: string;
  totalSales: number;
  grossSales: number;
  netSales: number;
  cashPayment: number;
  qrPayment: number;
  edcPayment: number;
  ewalletPayment: number;
  salesTransactions: number;
  numberOfPax: number;
}

export interface CashCheck {
  id: string;
  timestamp: string;
  staff: string;
  amount: number;
}

// ============================================================
// Reconciliation output types
// ============================================================

export type ComparisonStatus = 'matched' | 'variance' | 'missing' | 'not_applicable' | 'partial';

export interface ComparisonResult {
  status: ComparisonStatus;
  expected: number | null;
  actual: number | null;
  variance: number;
  label: string;
}

export interface DailyReconciliation {
  date: string;

  // Source data
  bankDay: BankDayData | null;
  merchantCard: MerchantSettlement[];   // card settlements for this date
  merchantEwallet: MerchantSettlement[]; // ewallet settlements for this date
  dailyClosing: DailyClosing | null;
  dailySales: DailySalesData | null;
  cashChecks: CashCheck[];

  // Comparisons
  cardFlow: {
    posCard: number;                  // POS edcPayment (card-only via group_code=CREDIT_CARD)
    merchantGross: number;            // sum(total_amount)
    merchantFees: number;             // sum(fee + vat)
    merchantNet: number;              // sum(net_credit_amount)
    bankCardDeposit: number;          // bank card_settlement deposits
    posVsMerchantGross: ComparisonResult;
    merchantNetVsBank: ComparisonResult;
  };

  ewalletFlow: {
    posEwallet: number;
    merchantGross: number;
    merchantNet: number;
    merchantFees: number;
    bankEwalletDeposit: number;
    posVsMerchantGross: ComparisonResult;
    merchantNetVsBank: ComparisonResult;
  };

  cashFlow: {
    posCash: number;
    closingExpected: number;
    closingActual: number | null;
    cashVariance: number;
    posVsActual: ComparisonResult;      // POS Cash vs Closing Actual (staff count)
    status: ComparisonStatus;
  };

  qrFlow: {
    posQr: number;
    closingQr: number;
    bankTransfers: number;
    posVsClosingQr: ComparisonResult;   // POS QR vs Closing QR
    posVsBankTransfers: ComparisonResult; // POS QR vs Bank Transfers (approximate)
    status: ComparisonStatus;
  };

  // Overall reconciliation
  posTotal: number;           // POS total sales
  accountedTotal: number;     // bank deposits + cash + fees
  totalGap: number;           // posTotal - accountedTotal
  overallStatus: ComparisonStatus;
  unreconciledCount: number;
}

export interface ReconciliationSummary {
  totalDays: number;
  matchedDays: number;
  varianceDays: number;
  missingDays: number;

  totalCardMerchantGross: number;
  totalCardMerchantNet: number;
  totalCardBankDeposit: number;
  totalCardFees: number;

  totalPosEwallet: number;
  totalEwalletMerchantNet: number;
  totalEwalletFees: number;
  totalEwalletBankDeposit: number;

  totalPosCash: number;
  totalClosingCash: number;
  cashAccurateDays: number;

  totalPosQr: number;
  totalBankTransfers: number;

  totalUnreconciledRecords: number;

  // Overall gap
  totalPosTotal: number;
  totalAccountedTotal: number;
  totalGap: number;
  daysWithGap: number;
}

// ============================================================
// API types
// ============================================================

export interface ReconciliationDataRequest {
  startDate: string;
  endDate: string;
}

export interface ReconciliationDataResponse {
  merchantSettlements: MerchantSettlement[];
  dailyClosings: DailyClosing[];
  dailySales: DailySalesData[];
  cashChecks: CashCheck[];
}
