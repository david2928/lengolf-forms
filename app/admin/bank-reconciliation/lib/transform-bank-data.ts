import type {
  BankStatementDbRow,
  BankTransaction,
  BankDayData,
  BankStatementParsed,
} from '../types/bank-reconciliation';

/** Round to 2 decimal places to avoid floating-point accumulation errors */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Transform DB rows from finance.bank_statement_transactions
 * into the same BankStatementParsed format the reconciliation engine expects.
 */
export function transformBankTransactions(
  rows: BankStatementDbRow[],
  accountNumber: string,
  startDate: string,
  endDate: string
): BankStatementParsed {
  const allTransactions: BankTransaction[] = [];
  const dayDataMap = new Map<string, BankDayData>();

  rows.forEach((row) => {
    const deposit = row.deposit || 0;
    const withdrawal = row.withdrawal || 0;

    const txn: BankTransaction = {
      date: row.transaction_date,
      time: row.transaction_time || '',
      description: row.description,
      withdrawal,
      deposit,
      balance: row.balance || 0,
      channel: row.channel || '',
      details: row.details || '',
      category: row.category,
      reconciliationStatus: 'pending',
      reconciliationNote: '',
      matchedSource: null,
    };

    allTransactions.push(txn);

    // Group by date
    const date = row.transaction_date;
    if (!dayDataMap.has(date)) {
      dayDataMap.set(date, {
        date,
        transactions: [],
        cardSettlements: 0,
        ewalletSettlements: 0,
        transferDeposits: 0,
        withdrawals: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
      });
    }

    const day = dayDataMap.get(date)!;
    day.transactions.push(txn);
    day.totalDeposits = r2(day.totalDeposits + deposit);
    day.totalWithdrawals = r2(day.totalWithdrawals + withdrawal);

    switch (row.category) {
      case 'card_settlement':
        day.cardSettlements = r2(day.cardSettlements + deposit);
        break;
      case 'ewallet_settlement':
        day.ewalletSettlements = r2(day.ewalletSettlements + deposit);
        break;
      case 'transfer_deposit':
        day.transferDeposits = r2(day.transferDeposits + deposit);
        break;
      case 'withdrawal':
        day.withdrawals = r2(day.withdrawals + withdrawal);
        break;
    }
  });

  const accountName = rows.length > 0 ? (rows[0].account_name || 'LENGOLF CO.,LTD.') : 'LENGOLF CO.,LTD.';

  return {
    accountName,
    accountNumber,
    period: `${startDate} to ${endDate}`,
    dayData: dayDataMap,
    allTransactions,
    startDate,
    endDate,
  };
}
