'use client';

import { ExpenseTrackerRow } from './ExpenseTrackerRow';
import type { AnnotatedTransaction, Vendor, AnnotationUpsert } from '@/types/expense-tracker';
import type { MatchResult } from '@/lib/receipt-matching-engine';

interface ExpenseTrackerTableProps {
  transactions: AnnotatedTransaction[];
  onAnnotationSaved: (bankTxId: number, annotation: AnnotationUpsert) => void;
  onVendorUpdated: (vendor: Vendor) => void;
  onReceiptLinked?: (bankTxId: number, receiptId: string, source?: 'receipt' | 'invoice') => Promise<void>;
  onReceiptUnlinked?: (bankTxId: number) => Promise<void>;
  receiptMatches?: Record<number, MatchResult[]>;
  loading: boolean;
}

export function ExpenseTrackerTable({
  transactions,
  onAnnotationSaved,
  onVendorUpdated,
  onReceiptLinked,
  onReceiptUnlinked,
  receiptMatches,
  loading,
}: ExpenseTrackerTableProps) {

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No transactions found for this period.
      </div>
    );
  }

  const th = 'px-2 py-2 text-xs font-medium text-muted-foreground';

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-sm table-fixed">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className={`${th} text-left sticky left-0 bg-muted/50 z-10 w-[70px]`}>Date</th>
              <th className={`${th} text-left sticky left-[70px] bg-muted/50 z-10 w-[200px]`}>Description</th>
              <th className={`${th} text-left w-[200px]`}>Vendor</th>
              <th className={`${th} text-center w-[75px]`}>Type</th>
              <th className={`${th} text-left w-[145px]`}>Month</th>
              <th className={`${th} text-right w-[95px]`}>Amount</th>
              <th className={`${th} text-right w-[85px]`}>Tax Base</th>
              <th className={`${th} text-right w-[80px]`}>WHT</th>
              <th className={`${th} text-right w-[80px]`}>VAT</th>
              <th className={`${th} text-right w-[110px]`}>Balance</th>
              <th className={`${th} text-center w-[40px]`}>Doc#</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => (
              <ExpenseTrackerRow
                key={row.transaction.id}
                row={row}
                onAnnotationSaved={onAnnotationSaved}
                onVendorUpdated={onVendorUpdated}
                receiptMatches={receiptMatches?.[row.transaction.id]}
                onReceiptLinked={onReceiptLinked}
                onReceiptUnlinked={onReceiptUnlinked}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
