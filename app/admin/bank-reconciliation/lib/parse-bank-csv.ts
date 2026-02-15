import { parse } from 'csv-parse/sync';
import type {
  BankTransaction,
  BankTransactionCategory,
  BankDayData,
  BankStatementParsed,
} from '../types/bank-reconciliation';

/**
 * Parse a KBank CSV bank statement into structured data.
 *
 * KBank CSV format:
 * - First ~14 rows are headers/metadata
 * - Data rows have 13 columns: empty, Date, Time, Description, Withdrawal, empty, Deposit, empty, Balance, empty, Channel, empty, Details
 * - Dates: DD-MM-YY
 * - Amounts: "1,769.18" (quoted with commas) or 30.00
 */
export function parseBankCSV(csvText: string): BankStatementParsed {
  // Extract metadata from header area
  const lines = csvText.split('\n');
  let accountName = '';
  let accountNumber = '';
  let period = '';

  for (const line of lines.slice(0, 14)) {
    if (line.includes('Account Number')) {
      const match = line.match(/(\d{3}-\d-\d{5}-\d)/);
      if (match) accountNumber = match[1];
    }
    if (line.includes('Period')) {
      const match = line.match(/(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4})/);
      if (match) period = match[1];
    }
    if (line.includes('LENGOLF')) {
      const match = line.match(/"(LENGOLF[^"]*?)(?:\\n|\n|")/);
      if (match) accountName = match[1].trim();
    }
  }

  if (!accountName) accountName = 'LENGOLF CO.,LTD.';

  // Find data start: look for "Beginning Balance" row
  let dataStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Beginning Balance')) {
      dataStartIdx = i;
      break;
    }
  }

  if (dataStartIdx === -1) {
    throw new Error('Could not find "Beginning Balance" row in CSV. Please check the file format.');
  }

  // Extract data section and parse
  const dataSection = lines.slice(dataStartIdx).join('\n');
  const records: string[][] = parse(dataSection, {
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const allTransactions: BankTransaction[] = [];
  const dayDataMap = new Map<string, BankDayData>();

  for (const row of records) {
    if (row.length < 9) continue;

    const dateRaw = (row[1] || '').trim();
    if (!dateRaw || dateRaw === '') continue;

    const date = parseKBankDate(dateRaw);
    if (!date) continue;

    const time = (row[2] || '').trim();
    const description = (row[3] || '').trim();
    const withdrawal = parseAmount(row[4]);
    const deposit = parseAmount(row[6]);
    const balance = parseAmount(row[8]);
    const channel = (row[10] || '').trim();
    const details = (row[12] || '').trim();

    // Skip the beginning balance row
    if (description === 'Beginning Balance') continue;

    const rawCategory = categorizeTransaction(description);
    // Auto-detect GoWabi payouts from transfer_deposit category
    const category = rawCategory === 'transfer_deposit' && isGowabiPayout(details)
      ? 'gowabi_payout' as const
      : rawCategory;

    const txn: BankTransaction = {
      date,
      time,
      description,
      withdrawal,
      deposit,
      balance,
      channel,
      details,
      category,
      reconciliationStatus: 'pending',
      reconciliationNote: '',
      matchedSource: null,
    };

    allTransactions.push(txn);

    // Group by date
    if (!dayDataMap.has(date)) {
      dayDataMap.set(date, {
        date,
        transactions: [],
        cardSettlements: 0,
        ewalletSettlements: 0,
        transferDeposits: 0,
        gowabiPayouts: 0,
        withdrawals: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
      });
    }

    const day = dayDataMap.get(date)!;
    day.transactions.push(txn);
    day.totalDeposits = r2(day.totalDeposits + deposit);
    day.totalWithdrawals = r2(day.totalWithdrawals + withdrawal);

    switch (category) {
      case 'card_settlement':
        day.cardSettlements = r2(day.cardSettlements + deposit);
        break;
      case 'ewallet_settlement':
        day.ewalletSettlements = r2(day.ewalletSettlements + deposit);
        break;
      case 'transfer_deposit':
        day.transferDeposits = r2(day.transferDeposits + deposit);
        break;
      case 'gowabi_payout':
        day.gowabiPayouts = r2(day.gowabiPayouts + deposit);
        break;
      case 'withdrawal':
        day.withdrawals = r2(day.withdrawals + withdrawal);
        break;
    }
  }

  // Determine date range
  const dates = Array.from(dayDataMap.keys()).sort();
  const startDate = dates[0] || '';
  const endDate = dates[dates.length - 1] || '';

  return {
    accountName,
    accountNumber,
    period,
    dayData: dayDataMap,
    allTransactions,
    startDate,
    endDate,
  };
}

/** Round to 2 decimal places to avoid floating-point accumulation errors */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Detect GoWabi marketplace payout from bank transaction details */
function isGowabiPayout(details: string): boolean {
  const lower = details.toLowerCase();
  return lower.includes('gowabi') || details.includes('โกวาบิ');
}

/** Parse DD-MM-YY to YYYY-MM-DD */
function parseKBankDate(raw: string): string | null {
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const year = 2000 + parseInt(yy, 10);
  return `${year}-${mm}-${dd}`;
}

/** Parse amount string: remove commas, quotes, handle empty */
function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[",\s]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Categorize bank transaction based on description */
function categorizeTransaction(description: string): BankTransactionCategory {
  if (description.includes('Payment Received: FullPay') ||
      description.includes('Payment Received: Install') ||
      description.includes('Payment Received: Redemp')) {
    return 'card_settlement';
  }
  if (description.includes('Payment Received: Alipay') ||
      description.includes('Payment Received: WeChat')) {
    return 'ewallet_settlement';
  }
  if (description.includes('Transfer Deposit')) {
    return 'transfer_deposit';
  }
  if (description.includes('Transfer Withdrawal') || description.includes('Withdrawal')) {
    return 'withdrawal';
  }
  return 'other';
}

/** Get summary stats for display after parsing */
export function getParseStats(parsed: BankStatementParsed) {
  const totalDays = parsed.dayData.size;
  let cardSettlementCount = 0;
  let ewalletCount = 0;
  let transferCount = 0;
  let gowabiCount = 0;
  let withdrawalCount = 0;

  for (const txn of parsed.allTransactions) {
    switch (txn.category) {
      case 'card_settlement': cardSettlementCount++; break;
      case 'ewallet_settlement': ewalletCount++; break;
      case 'transfer_deposit': transferCount++; break;
      case 'gowabi_payout': gowabiCount++; break;
      case 'withdrawal': withdrawalCount++; break;
    }
  }

  return {
    totalDays,
    totalTransactions: parsed.allTransactions.length,
    cardSettlementCount,
    ewalletCount,
    transferCount,
    gowabiCount,
    withdrawalCount,
    dateRange: `${parsed.startDate} to ${parsed.endDate}`,
  };
}
