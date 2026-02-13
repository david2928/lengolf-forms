import type {
  BankStatementParsed,
  BankDayData,
  MerchantSettlement,
  DailyClosing,
  DailySalesData,
  CashCheck,
  ComparisonResult,
  ComparisonStatus,
  DailyReconciliation,
  ReconciliationSummary,
  ReconciliationDataResponse,
} from '../types/bank-reconciliation';

const TOLERANCE = 0.01; // THB

const CARD_MERCHANT_ID = '401016061365001';
const EWALLET_MERCHANT_ID = '401016061373001';

/** Round to 2 decimal places to avoid floating-point accumulation errors */
const r2 = (n: number) => Math.round(n * 100) / 100;

function compare(expected: number | null, actual: number | null, label: string): ComparisonResult {
  if (expected === null && actual === null) {
    return { status: 'not_applicable', expected, actual, variance: 0, label };
  }
  if (expected === null || actual === null) {
    return { status: 'missing', expected, actual, variance: 0, label };
  }
  const variance = Math.abs(expected - actual);
  const status: ComparisonStatus = variance <= TOLERANCE ? 'matched' : 'variance';
  return { status, expected, actual, variance: actual - expected, label };
}

/**
 * Run reconciliation: compare parsed bank statement against DB sources.
 * Returns per-day reconciliation results and an overall summary.
 */
export function runReconciliation(
  bankData: BankStatementParsed,
  dbData: ReconciliationDataResponse
): { days: DailyReconciliation[]; summary: ReconciliationSummary } {
  // Index DB data by date
  const merchantByDate = groupBy(dbData.merchantSettlements, s => s.report_date);
  const closingByDate = groupBy(dbData.dailyClosings, c => c.closing_date);
  const salesByDate = groupBy(dbData.dailySales, s => s.date);
  const cashByDate = groupCashChecks(dbData.cashChecks);

  // Collect all unique dates from bank + DB
  const allDates = new Set<string>();
  bankData.dayData.forEach((_val, date) => allDates.add(date));
  for (const s of dbData.merchantSettlements) allDates.add(s.report_date);
  for (const c of dbData.dailyClosings) allDates.add(c.closing_date);
  for (const s of dbData.dailySales) allDates.add(s.date);

  const sortedDates = Array.from(allDates).sort();

  // Pre-pass: eWallet settles T+1. Map each POS date → settlement date.
  // Process in order so consecutive eWallet days chain correctly
  // (Jan 6 claims Jan 7's settlement, Jan 7 then claims Jan 8's, etc.)
  const ewalletT1Map = new Map<string, string>(); // posDate -> settlementDate
  const consumedEwalletDates = new Set<string>();  // settlement dates already claimed
  for (const date of sortedDates) {
    const sArr = salesByDate.get(date) || [];
    const ds = sArr.length > 0 ? sArr[0] : null;
    const posEw = Number(ds?.ewalletPayment ?? 0);
    if (posEw > 0) {
      // Check same-day merchant (only if not already consumed by a previous day)
      const sameDayMerchant = (merchantByDate.get(date) || []).filter(m => m.merchant_id === EWALLET_MERCHANT_ID);
      if (sameDayMerchant.length > 0 && !consumedEwalletDates.has(date)) {
        // Same-day match — no T+1 needed
      } else {
        // No available same-day merchant → look at T+1
        const nextDate = getNextDate(date);
        const nextDayMerchant = (merchantByDate.get(nextDate) || []).filter(m => m.merchant_id === EWALLET_MERCHANT_ID);
        if (nextDayMerchant.length > 0 && !consumedEwalletDates.has(nextDate)) {
          ewalletT1Map.set(date, nextDate);
          consumedEwalletDates.add(nextDate);
        }
      }
    }
  }

  const days: DailyReconciliation[] = [];

  for (const date of sortedDates) {
    const bankDay = bankData.dayData.get(date) || null;
    const allMerchant = merchantByDate.get(date) || [];
    const merchantCard = allMerchant.filter(m => m.merchant_id === CARD_MERCHANT_ID);
    const merchantEwallet = allMerchant.filter(m => m.merchant_id === EWALLET_MERCHANT_ID);
    const closings = closingByDate.get(date) || [];
    const dailyClosing = closings.length > 0 ? closings[0] : null;
    const salesArr = salesByDate.get(date) || [];
    const dailySales = salesArr.length > 0 ? salesArr[0] : null;
    const cashChecks = cashByDate.get(date) || [];

    // Card flow - use POS edcPayment (card-only via group_code=CREDIT_CARD)
    const posCard = dailySales?.edcPayment ?? 0;
    const merchantGross = sumField(merchantCard, 'total_amount');
    const cardCommission = sumField(merchantCard, 'total_fee_commission_amount');
    const cardVat = sumField(merchantCard, 'vat_on_fee_amount');
    const merchantFees = r2(cardCommission + cardVat);
    const merchantNet = sumField(merchantCard, 'net_credit_amount');
    const bankCardDeposit = bankDay?.cardSettlements ?? 0;

    const hasCardData = merchantCard.length > 0 || bankCardDeposit > 0 || posCard > 0;
    const posVsMerchantGross = hasCardData
      ? compare(posCard || null, merchantGross || null, 'POS Card vs Merchant Gross')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'POS Card vs Merchant Gross' };
    const merchantNetVsBank = hasCardData
      ? compare(merchantNet || null, bankCardDeposit || null, 'Merchant Net vs Bank Card')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'Merchant Net vs Bank Card' };

    // eWallet flow — attribute settlement to POS date (T+1 aware)
    const posEwallet = dailySales?.ewalletPayment ?? 0;
    const t1SettlementDate = ewalletT1Map.get(date); // this POS date claims T+1 settlement
    const isConsumedByPrevDay = consumedEwalletDates.has(date); // this date's settlement was claimed by T-1

    let effectiveMerchantEwallet: MerchantSettlement[];
    let effectiveBankEwalletDeposit: number;

    if (t1SettlementDate) {
      // This POS date has eWallet → use T+1 merchant & bank data
      effectiveMerchantEwallet = (merchantByDate.get(t1SettlementDate) || []).filter(m => m.merchant_id === EWALLET_MERCHANT_ID);
      const nextBankDay = bankData.dayData.get(t1SettlementDate);
      effectiveBankEwalletDeposit = nextBankDay?.ewalletSettlements ?? 0;
    } else if (isConsumedByPrevDay && posEwallet === 0) {
      // This date's merchant/bank eWallet was consumed by previous day's T+1 — skip
      effectiveMerchantEwallet = [];
      effectiveBankEwalletDeposit = 0;
    } else {
      // Normal same-day match
      effectiveMerchantEwallet = merchantEwallet;
      effectiveBankEwalletDeposit = bankDay?.ewalletSettlements ?? 0;
    }

    const ewalletGross = sumField(effectiveMerchantEwallet, 'total_amount');
    const ewalletCommission = sumField(effectiveMerchantEwallet, 'total_fee_commission_amount');
    const ewalletVat = sumField(effectiveMerchantEwallet, 'vat_on_fee_amount');
    const ewalletFees = r2(ewalletCommission + ewalletVat);
    const ewalletNet = sumField(effectiveMerchantEwallet, 'net_credit_amount');

    const hasEwalletData = effectiveMerchantEwallet.length > 0 || effectiveBankEwalletDeposit > 0 || posEwallet > 0;
    const posVsMerchantEwallet = hasEwalletData
      ? compare(posEwallet || null, ewalletGross || null, 'POS eWallet vs Merchant Gross')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'POS eWallet vs Merchant Gross' };
    const merchantVsBank = hasEwalletData
      ? compare(ewalletNet || null, effectiveBankEwalletDeposit || null, 'Merchant Net vs Bank eWallet')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'Merchant Net vs Bank eWallet' };

    // Cash flow
    const posCash = dailySales?.cashPayment ?? 0;
    const closingExpected = dailyClosing?.expected_cash ?? 0;
    const closingActual = dailyClosing?.actual_cash ?? null;
    const cashVariance = dailyClosing?.cash_variance ?? 0;

    const hasCashData = posCash > 0 || closingActual !== null;
    const posVsActualCash = hasCashData
      ? compare(posCash || null, closingActual, 'POS Cash vs Cash Count')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'POS Cash vs Cash Count' };

    let cashStatus: ComparisonStatus = 'not_applicable';
    if (dailyClosing) {
      cashStatus = closingActual !== null && Math.abs(cashVariance) <= TOLERANCE ? 'matched' : 'variance';
    } else if (posCash > 0) {
      cashStatus = 'missing'; // POS has cash but no closing record
    }

    // QR flow
    // closingQr (qr_payments_total) includes PromptPay + Alipay/WeChat, so compare against posQr + posEwallet
    const posQr = dailySales?.qrPayment ?? 0;
    const posQrPlusEwallet = r2(posQr + posEwallet);
    const closingQr = dailyClosing?.qr_payments_total ?? 0;
    const bankTransfers = bankDay?.transferDeposits ?? 0;

    const hasQrData = posQr > 0 || posEwallet > 0 || closingQr > 0 || bankTransfers > 0;
    const posVsClosingQr = hasQrData
      ? compare(posQrPlusEwallet || null, closingQr || null, 'POS QR+eWallet vs Closing QR')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'POS QR+eWallet vs Closing QR' };
    const posVsBankTransfers = hasQrData
      ? compare(posQr || null, bankTransfers || null, 'POS QR vs Bank Transfers')
      : { status: 'not_applicable' as ComparisonStatus, expected: null, actual: null, variance: 0, label: 'POS QR vs Bank Transfers' };

    let qrStatus: ComparisonStatus = 'not_applicable';
    if (hasQrData) {
      qrStatus = 'partial'; // QR can't match exactly - multiple transfers per QR
      if (posQr > 0 && bankTransfers > 0) qrStatus = 'matched';
      else if (posQr > 0 && bankTransfers === 0) qrStatus = 'variance';
    }

    // Reconcile individual bank transactions
    let unreconciledCount = 0;
    if (bankDay) {
      for (const txn of bankDay.transactions) {
        switch (txn.category) {
          case 'card_settlement': {
            if (merchantCard.length > 0 && Math.abs(merchantNet - txn.deposit) <= TOLERANCE) {
              txn.reconciliationStatus = 'reconciled';
              txn.reconciliationNote = 'Matched to K-Merchant card settlement';
              txn.matchedSource = 'merchant_card';
            } else if (merchantCard.length > 0) {
              txn.reconciliationStatus = 'partial';
              txn.reconciliationNote = `Amount variance: bank ${txn.deposit.toFixed(2)} vs merchant net ${merchantNet.toFixed(2)}`;
              txn.matchedSource = 'merchant_card';
            } else {
              txn.reconciliationStatus = 'unreconciled';
              txn.reconciliationNote = 'No matching merchant settlement record';
              unreconciledCount++;
            }
            break;
          }
          case 'ewallet_settlement': {
            if (merchantEwallet.length > 0 && Math.abs(ewalletNet - txn.deposit) <= TOLERANCE) {
              txn.reconciliationStatus = 'reconciled';
              txn.reconciliationNote = 'Matched to eWallet merchant settlement';
              txn.matchedSource = 'merchant_ewallet';
            } else if (merchantEwallet.length > 0) {
              txn.reconciliationStatus = 'partial';
              txn.reconciliationNote = `Amount variance: bank ${txn.deposit.toFixed(2)} vs merchant net ${ewalletNet.toFixed(2)}`;
              txn.matchedSource = 'merchant_ewallet';
            } else {
              txn.reconciliationStatus = 'unreconciled';
              txn.reconciliationNote = 'No matching eWallet merchant record';
              unreconciledCount++;
            }
            break;
          }
          case 'transfer_deposit': {
            if (posQr > 0 || closingQr > 0) {
              txn.reconciliationStatus = 'partial';
              txn.reconciliationNote = 'Transfer on day with POS QR/bank transfer sales';
              txn.matchedSource = 'pos_qr';
            } else {
              txn.reconciliationStatus = 'unreconciled';
              txn.reconciliationNote = 'No POS data for this date';
              unreconciledCount++;
            }
            break;
          }
          case 'withdrawal': {
            txn.reconciliationStatus = 'reconciled';
            txn.reconciliationNote = 'Withdrawal (informational)';
            break;
          }
          default: {
            txn.reconciliationStatus = 'unreconciled';
            txn.reconciliationNote = 'Unknown transaction type';
            unreconciledCount++;
          }
        }
      }
    }

    // POS Total gap (include both card and eWallet merchant fees, use T+1 eWallet data)
    const posTotal = dailySales?.totalSales ?? dailyClosing?.total_sales ?? 0;
    const bankDeposits = r2(bankCardDeposit + effectiveBankEwalletDeposit + bankTransfers);
    const cashForAccounting = closingActual ?? posCash;
    const accountedTotal = r2(bankDeposits + cashForAccounting + merchantFees + ewalletFees);
    const totalGap = posTotal > 0 ? r2(posTotal - accountedTotal) : 0;

    // Overall status
    const statuses = [
      posVsMerchantGross.status,
      merchantNetVsBank.status,
      posVsMerchantEwallet.status,
      merchantVsBank.status,
      cashStatus,
    ].filter(s => s !== 'not_applicable');

    let overallStatus: ComparisonStatus = 'not_applicable';
    if (statuses.length > 0) {
      if (statuses.some(s => s === 'missing')) overallStatus = 'missing';
      else if (statuses.some(s => s === 'variance')) overallStatus = 'variance';
      else overallStatus = 'matched';
    }
    if (unreconciledCount > 0 && overallStatus === 'matched') {
      overallStatus = 'variance';
    }
    // Gap overrides matched status
    if (Math.abs(totalGap) > TOLERANCE && overallStatus === 'matched') {
      overallStatus = 'variance';
    }

    days.push({
      date,
      bankDay,
      merchantCard,
      merchantEwallet,
      dailyClosing,
      dailySales,
      cashChecks,
      cardFlow: {
        posCard,
        merchantGross,
        merchantFees,
        merchantCommission: cardCommission,
        merchantVat: cardVat,
        merchantNet,
        bankCardDeposit,
        posVsMerchantGross,
        merchantNetVsBank,
      },
      ewalletFlow: {
        posEwallet,
        merchantGross: ewalletGross,
        merchantNet: ewalletNet,
        merchantFees: ewalletFees,
        merchantCommission: ewalletCommission,
        merchantVat: ewalletVat,
        bankEwalletDeposit: effectiveBankEwalletDeposit,
        posVsMerchantGross: posVsMerchantEwallet,
        merchantNetVsBank: merchantVsBank,
      },
      cashFlow: {
        posCash,
        closingExpected,
        closingActual,
        cashVariance,
        posVsActual: posVsActualCash,
        status: cashStatus,
      },
      qrFlow: {
        posQr,
        closingQr,
        bankTransfers,
        posVsClosingQr,
        posVsBankTransfers,
        status: qrStatus,
      },
      posTotal,
      accountedTotal,
      totalGap,
      overallStatus,
      unreconciledCount,
    });
  }

  // Build summary
  const summary = buildSummary(days);

  return { days, summary };
}

function buildSummary(days: DailyReconciliation[]): ReconciliationSummary {
  let matchedDays = 0;
  let varianceDays = 0;
  let missingDays = 0;
  let totalPosCard = 0;
  let totalCardMerchantGross = 0;
  let totalCardMerchantNet = 0;
  let totalCardBankDeposit = 0;
  let totalCardFees = 0;
  let totalPosEwallet = 0;
  let totalEwalletMerchantNet = 0;
  let totalEwalletFees = 0;
  let totalEwalletBankDeposit = 0;
  let totalCommission = 0;
  let totalVat = 0;
  let totalPosCash = 0;
  let totalClosingCash = 0;
  let cashAccurateDays = 0;
  let totalPosQr = 0;
  let totalBankTransfers = 0;
  let totalUnreconciledRecords = 0;
  let sumPosTotal = 0;
  let sumAccountedTotal = 0;
  let daysWithGap = 0;

  for (const day of days) {
    if (day.overallStatus === 'matched') matchedDays++;
    else if (day.overallStatus === 'variance') varianceDays++;
    else if (day.overallStatus === 'missing') missingDays++;

    totalPosCard = r2(totalPosCard + day.cardFlow.posCard);
    totalCardMerchantGross = r2(totalCardMerchantGross + day.cardFlow.merchantGross);
    totalCardMerchantNet = r2(totalCardMerchantNet + day.cardFlow.merchantNet);
    totalCardBankDeposit = r2(totalCardBankDeposit + day.cardFlow.bankCardDeposit);
    totalCardFees = r2(totalCardFees + day.cardFlow.merchantFees);

    totalPosEwallet = r2(totalPosEwallet + day.ewalletFlow.posEwallet);
    totalEwalletMerchantNet = r2(totalEwalletMerchantNet + day.ewalletFlow.merchantNet);
    totalEwalletFees = r2(totalEwalletFees + day.ewalletFlow.merchantFees);
    totalEwalletBankDeposit = r2(totalEwalletBankDeposit + day.ewalletFlow.bankEwalletDeposit);

    totalCommission = r2(totalCommission + day.cardFlow.merchantCommission + day.ewalletFlow.merchantCommission);
    totalVat = r2(totalVat + day.cardFlow.merchantVat + day.ewalletFlow.merchantVat);

    totalPosCash = r2(totalPosCash + day.cashFlow.posCash);
    totalClosingCash = r2(totalClosingCash + day.cashFlow.closingExpected);
    if (day.cashFlow.status === 'matched') cashAccurateDays++;

    totalPosQr = r2(totalPosQr + day.qrFlow.posQr);
    totalBankTransfers = r2(totalBankTransfers + day.qrFlow.bankTransfers);

    totalUnreconciledRecords += day.unreconciledCount;

    sumPosTotal = r2(sumPosTotal + day.posTotal);
    sumAccountedTotal = r2(sumAccountedTotal + day.accountedTotal);
    if (Math.abs(day.totalGap) > 0.01) daysWithGap++;
  }

  return {
    totalDays: days.length,
    matchedDays,
    varianceDays,
    missingDays,
    totalPosCard,
    totalCardMerchantGross,
    totalCardMerchantNet,
    totalCardBankDeposit,
    totalCardFees,
    totalPosEwallet,
    totalEwalletMerchantNet,
    totalEwalletFees,
    totalEwalletBankDeposit,
    totalCommission,
    totalVat,
    totalPosCash,
    totalClosingCash,
    cashAccurateDays,
    totalPosQr,
    totalBankTransfers,
    totalUnreconciledRecords,
    totalPosTotal: sumPosTotal,
    totalAccountedTotal: sumAccountedTotal,
    totalGap: r2(sumPosTotal - sumAccountedTotal),
    daysWithGap,
  };
}

// Helpers

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function groupCashChecks(checks: CashCheck[]): Map<string, CashCheck[]> {
  const map = new Map<string, CashCheck[]>();
  for (const check of checks) {
    // timestamp is ISO string, extract date
    const date = check.timestamp.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(check);
  }
  return map;
}

function sumField(items: MerchantSettlement[], field: keyof MerchantSettlement): number {
  return r2(items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0));
}

/** Get the next calendar date as YYYY-MM-DD (timezone-safe) */
function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
