'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Landmark, AlertCircle } from 'lucide-react';
import BankStatementUpload from './components/BankStatementUpload';
import ReconciliationSummaryCards from './components/ReconciliationSummaryCards';
import DailyReconciliationTable from './components/DailyReconciliationTable';
import BankTransactionsTable from './components/BankTransactionsTable';
import ExportButton from './components/ExportButton';
import { runReconciliation } from './lib/reconciliation-engine';
import type {
  BankStatementParsed,
  ReconciliationDataResponse,
  DailyReconciliation,
  ReconciliationSummary,
} from './types/bank-reconciliation';

export default function BankReconciliationPage() {
  const [bankData, setBankData] = useState<BankStatementParsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationDays, setReconciliationDays] = useState<DailyReconciliation[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);

  const fetchDbDataAndReconcile = useCallback(async (parsed: BankStatementParsed) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bank-reconciliation/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: parsed.startDate,
          endDate: parsed.endDate,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data: ReconciliationDataResponse = await response.json();

      // Run reconciliation
      const result = runReconciliation(parsed, data);
      setReconciliationDays(result.days);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleParsed = useCallback((parsed: BankStatementParsed) => {
    setBankData(parsed);
    fetchDbDataAndReconcile(parsed);
  }, [fetchDbDataAndReconcile]);

  const handleClear = useCallback(() => {
    setBankData(null);
    setReconciliationDays([]);
    setSummary(null);
    setError(null);
  }, []);

  const hasResults = reconciliationDays.length > 0 && summary !== null;

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-gray-700" />
          <div>
            <h1 className="text-xl font-bold">Bank Reconciliation</h1>
            <p className="text-sm text-gray-500">
              Compare KBank statement against POS, merchant settlements, and daily closings
            </p>
          </div>
        </div>
        {hasResults && <ExportButton days={reconciliationDays} />}
      </div>

      {/* Upload */}
      <BankStatementUpload
        onParsed={handleParsed}
        currentData={bankData}
        onClear={handleClear}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Fetching data and running reconciliation...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {hasResults && (
        <>
          <ReconciliationSummaryCards summary={summary} />

          <Tabs defaultValue="daily" className="space-y-3">
            <TabsList>
              <TabsTrigger value="daily">Daily Overview</TabsTrigger>
              <TabsTrigger value="transactions">
                Bank Transactions
                {summary.totalUnreconciledRecords > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {summary.totalUnreconciledRecords}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <DailyReconciliationTable days={reconciliationDays} />
            </TabsContent>

            <TabsContent value="transactions">
              <BankTransactionsTable transactions={bankData?.allTransactions ?? []} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty state */}
      {!bankData && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Landmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Upload a KBank statement to begin</p>
          <p className="text-sm mt-1">
            Supports KBank CSV deposit statements with card/eWallet settlements
          </p>
        </div>
      )}
    </div>
  );
}
