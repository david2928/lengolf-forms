'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, DollarSign, CreditCard, QrCode, AlertTriangle, CheckCircle, Printer, X, Calendar } from 'lucide-react';
import { StaffPinModal } from '../payment/StaffPinModal';

interface ClosingSummary {
  closing_date: string;
  expected_cash: string;
  expected_credit_card: string;
  qr_payments_total: string;
  other_payments_total: string;
  transaction_count: number;
  voided_count: number;
  voided_amount: string;
  total_sales: string;
}

interface ExistingReconciliation {
  id: string;
  closing_date: string;
  expected_cash: string;
  expected_credit_card: string;
  qr_payments_total: string;
  actual_cash: string;
  actual_credit_card: string;
  credit_card_batch_reference: string | null;
  cash_variance: string;
  credit_card_variance: string;
  transaction_count: number;
  voided_count: number;
  voided_amount: string;
  total_sales: string;
  closed_by_staff_name: string;
  variance_notes: string | null;
  created_at: string;
}

interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reconciliationId: string) => void;
  date?: string;
}

type Step = 'summary' | 'cash' | 'credit' | 'review' | 'pin' | 'complete';

export const DailyClosingModal: React.FC<DailyClosingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  date: initialDate = new Date().toISOString().split('T')[0]
}) => {
  const [step, setStep] = useState<Step>('summary');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ClosingSummary | null>(null);
  const [existingReconciliation, setExistingReconciliation] = useState<ExistingReconciliation | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [actualCash, setActualCash] = useState('');
  const [actualCreditCard, setActualCreditCard] = useState('');
  const [batchReference, setBatchReference] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [reconciliationId, setReconciliationId] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExistingReconciliation(null);

    try {
      // First check if this date has already been closed
      const historyResponse = await fetch(`/api/pos/closing/history?start_date=${selectedDate}&end_date=${selectedDate}&limit=1`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.reconciliations && historyData.reconciliations.length > 0) {
          // Day is already closed
          setExistingReconciliation(historyData.reconciliations[0]);
          setReconciliationId(historyData.reconciliations[0].id);
          setLoading(false);
          return;
        }
      }

      // Day not closed yet, fetch the summary for new closing
      const response = await fetch(`/api/pos/closing/summary?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch summary');

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError('Failed to load closing summary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch summary on open
  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, fetchSummary]);

  // Format number with thousand separators
  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateVariance = (actual: string, expected: string): number => {
    return parseFloat(actual || '0') - parseFloat(expected || '0');
  };

  const cashVariance = summary ? calculateVariance(actualCash, summary.expected_cash) : 0;
  const creditVariance = summary ? calculateVariance(actualCreditCard, summary.expected_credit_card) : 0;
  const hasVariance = Math.abs(cashVariance) > 0.01 || Math.abs(creditVariance) > 0.01;

  const handleNext = () => {
    if (step === 'summary') setStep('cash');
    else if (step === 'cash') setStep('credit');
    else if (step === 'credit') setStep('review');
    else if (step === 'review') setShowPinModal(true);
  };

  const handleBack = () => {
    if (step === 'cash') setStep('summary');
    else if (step === 'credit') setStep('cash');
    else if (step === 'review') setStep('credit');
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Reset form when changing date
    setStep('summary');
    setActualCash('');
    setActualCreditCard('');
    setBatchReference('');
    setVarianceNotes('');
    setError(null);
  };

  const handlePinSuccess = async (pin: string) => {
    setShowPinModal(false);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pos/closing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          actual_cash: parseFloat(actualCash),
          actual_credit_card: parseFloat(actualCreditCard),
          credit_card_batch_reference: batchReference,
          variance_notes: varianceNotes,
          staff_pin: pin
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit closing');
      }

      const data = await response.json();
      setReconciliationId(data.reconciliation.id);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit closing');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (reconciliationId) {
      // TODO: Implement print functionality
      console.log('Print reconciliation:', reconciliationId);
      onComplete(reconciliationId);
      // Don't auto-close - let user decide when to close
    }
  };

  const resetAndClose = () => {
    setStep('summary');
    setSelectedDate(initialDate);
    setActualCash('');
    setActualCreditCard('');
    setBatchReference('');
    setVarianceNotes('');
    setError(null);
    setReconciliationId(null);
    onClose();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#265020] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center md:p-4">
        <div className="bg-white md:rounded-lg shadow-2xl md:max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#265020] to-green-700 text-white p-6 md:rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Daily Closing</h2>

                {/* Date Selector */}
                <div className="flex items-center gap-2 mt-3">
                  <Calendar className="h-4 w-4 text-green-100" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={step !== 'summary'}
                    className="bg-white bg-opacity-20 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-green-100 text-xs">
                    {step !== 'summary' && '(Date locked during process)'}
                  </span>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-6 text-xs">
              {['Summary', 'Cash', 'Credit', 'Review', 'Complete'].map((stepName, index) => {
                const stepKeys: Step[] = ['summary', 'cash', 'credit', 'review', 'complete'];
                const currentIndex = stepKeys.indexOf(step);
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;

                return (
                  <React.Fragment key={stepName}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          isActive
                            ? 'bg-white text-[#265020]'
                            : isCompleted
                            ? 'bg-green-300 text-[#265020]'
                            : 'bg-green-800 bg-opacity-50 text-green-200'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className={`mt-1 ${isActive ? 'font-semibold' : 'opacity-75'}`}>
                        {stepName}
                      </span>
                    </div>
                    {index < 4 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded ${
                          isCompleted ? 'bg-green-300' : 'bg-green-800 bg-opacity-50'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="p-6">
            {/* Existing Reconciliation View */}
            {existingReconciliation && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Day Already Closed</h3>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    This day was closed by {existingReconciliation.closed_by_staff_name} on{' '}
                    {new Date(existingReconciliation.created_at).toLocaleString()}
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-gray-900">Reconciliation Summary</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">฿{formatCurrency(existingReconciliation.total_sales)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{existingReconciliation.transaction_count}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">Cash</span>
                      <span className={`text-sm font-semibold ${
                        Math.abs(parseFloat(existingReconciliation.cash_variance)) < 0.01
                          ? 'text-green-700'
                          : 'text-yellow-700'
                      }`}>
                        Variance: {parseFloat(existingReconciliation.cash_variance) > 0 ? '+' : ''}
                        ฿{formatCurrency(Math.abs(parseFloat(existingReconciliation.cash_variance)))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Expected: ฿{formatCurrency(existingReconciliation.expected_cash)}</span>
                      <span>Actual: ฿{formatCurrency(existingReconciliation.actual_cash)}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">Credit Card</span>
                      <span className={`text-sm font-semibold ${
                        Math.abs(parseFloat(existingReconciliation.credit_card_variance)) < 0.01
                          ? 'text-green-700'
                          : 'text-yellow-700'
                      }`}>
                        Variance: {parseFloat(existingReconciliation.credit_card_variance) > 0 ? '+' : ''}
                        ฿{formatCurrency(Math.abs(parseFloat(existingReconciliation.credit_card_variance)))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Expected: ฿{formatCurrency(existingReconciliation.expected_credit_card)}</span>
                      <span>Actual: ฿{formatCurrency(existingReconciliation.actual_credit_card)}</span>
                    </div>
                    {existingReconciliation.credit_card_batch_reference && (
                      <p className="text-xs text-gray-500 mt-2">
                        Batch: {existingReconciliation.credit_card_batch_reference}
                      </p>
                    )}
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">QR Payments (Info Only)</span>
                      <span className="text-lg font-bold text-gray-900">฿{formatCurrency(existingReconciliation.qr_payments_total)}</span>
                    </div>
                  </div>
                </div>

                {existingReconciliation.variance_notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-medium text-yellow-900 mb-1">Variance Notes:</p>
                    <p className="text-sm text-yellow-800">{existingReconciliation.variance_notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handlePrint}
                    className="flex-1 bg-[#265020] hover:bg-green-700 text-white"
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    Print Report
                  </Button>
                  <Button
                    onClick={resetAndClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Summary */}
            {!existingReconciliation && step === 'summary' && summary && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Daily Summary</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">฿{formatCurrency(summary.total_sales)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.transaction_count}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-700" />
                      <span className="font-medium text-gray-900">Expected Cash</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">฿{formatCurrency(summary.expected_cash)}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-700" />
                      <span className="font-medium text-gray-900">Expected Credit Card</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">฿{formatCurrency(summary.expected_credit_card)}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-5 w-5 text-purple-700" />
                      <span className="font-medium text-gray-900">QR Payments (Info Only)</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">฿{formatCurrency(summary.qr_payments_total)}</span>
                  </div>
                </div>

                {summary.voided_count > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      <strong>Voided Transactions:</strong> {summary.voided_count} (฿{formatCurrency(summary.voided_amount)})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Cash Count */}
            {step === 'cash' && summary && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Cash Reconciliation</h3>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Expected Cash</p>
                  <p className="text-3xl font-bold text-gray-900">฿{formatCurrency(summary.expected_cash)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Cash Counted
                  </label>
                  <input
                    type="number"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full text-2xl p-4 border-2 border-gray-300 rounded-lg focus:border-[#265020] focus:outline-none"
                  />
                </div>

                {actualCash && (
                  <div className={`p-4 rounded-lg ${
                    Math.abs(cashVariance) < 0.01
                      ? 'bg-green-50 border border-green-200'
                      : cashVariance > 0
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-sm font-medium">
                      Variance: {cashVariance > 0 ? '+' : ''}฿{formatCurrency(Math.abs(cashVariance))}
                    </p>
                    <p className="text-xs mt-1">
                      {Math.abs(cashVariance) < 0.01
                        ? '✓ Balanced'
                        : cashVariance > 0
                        ? 'Over (extra cash)'
                        : 'Short (missing cash)'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Credit Card */}
            {step === 'credit' && summary && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Credit Card Reconciliation</h3>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Expected Credit Card</p>
                  <p className="text-3xl font-bold text-gray-900">฿{formatCurrency(summary.expected_credit_card)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terminal Batch Total
                  </label>
                  <input
                    type="number"
                    value={actualCreditCard}
                    onChange={(e) => setActualCreditCard(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full text-2xl p-4 border-2 border-gray-300 rounded-lg focus:border-[#265020] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchReference}
                    onChange={(e) => setBatchReference(e.target.value)}
                    placeholder="BAT-20251016-001"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#265020] focus:outline-none"
                  />
                </div>

                {actualCreditCard && (
                  <div className={`p-4 rounded-lg ${
                    Math.abs(creditVariance) < 0.01
                      ? 'bg-green-50 border border-green-200'
                      : creditVariance > 0
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-sm font-medium">
                      Variance: {creditVariance > 0 ? '+' : ''}฿{formatCurrency(Math.abs(creditVariance))}
                    </p>
                    <p className="text-xs mt-1">
                      {Math.abs(creditVariance) < 0.01
                        ? '✓ Balanced'
                        : creditVariance > 0
                        ? 'Over'
                        : 'Short'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && summary && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Review & Confirm</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Cash Expected:</span>
                    <span className="font-semibold">฿{formatCurrency(summary.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Cash Actual:</span>
                    <span className="font-semibold">฿{formatCurrency(actualCash)}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded ${
                    Math.abs(cashVariance) < 0.01 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <span className="font-medium">Cash Variance:</span>
                    <span className="font-bold">{cashVariance > 0 ? '+' : ''}฿{formatCurrency(Math.abs(cashVariance))}</span>
                  </div>

                  <div className="my-4 border-t"></div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Credit Card Expected:</span>
                    <span className="font-semibold">฿{formatCurrency(summary.expected_credit_card)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Credit Card Actual:</span>
                    <span className="font-semibold">฿{formatCurrency(actualCreditCard)}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded ${
                    Math.abs(creditVariance) < 0.01 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <span className="font-medium">Credit Card Variance:</span>
                    <span className="font-bold">{creditVariance > 0 ? '+' : ''}฿{formatCurrency(Math.abs(creditVariance))}</span>
                  </div>

                  <div className="my-4 border-t"></div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="text-gray-700">QR Payments (Cannot verify):</span>
                    <span className="font-semibold">฿{formatCurrency(summary.qr_payments_total)}</span>
                  </div>
                </div>

                {hasVariance && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-900 mb-2">Variance Detected</p>
                        <textarea
                          value={varianceNotes}
                          onChange={(e) => setVarianceNotes(e.target.value)}
                          placeholder="Please explain the variance or note if you've verified your counts..."
                          className="w-full p-3 border border-yellow-300 rounded-lg focus:border-yellow-500 focus:outline-none resize-none"
                          rows={3}
                        />
                        <p className="text-xs text-yellow-700 mt-2">
                          If the variance is significant, you may want to contact a manager before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Closing Saved!</h3>
                    <p className="text-gray-600">Daily reconciliation has been recorded successfully.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      You can print the report now or close the window.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handlePrint}
                    className="flex-1 bg-[#265020] hover:bg-green-700 text-white"
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    Print Report
                  </Button>
                  <Button
                    onClick={resetAndClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          {!existingReconciliation && step !== 'complete' && (
            <div className="sticky bottom-0 bg-gray-50 p-6 md:rounded-b-lg flex items-center justify-between gap-4 border-t">
              {step !== 'summary' ? (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div></div>
              )}

              <Button
                onClick={handleNext}
                disabled={
                  (step === 'cash' && !actualCash) ||
                  (step === 'credit' && !actualCreditCard)
                }
                className="bg-[#265020] hover:bg-green-700 text-white flex items-center gap-2"
              >
                {step === 'review' ? 'Confirm & Submit' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Staff PIN Modal */}
      {showPinModal && (
        <StaffPinModal
          isOpen={showPinModal}
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
          title="Authorize Closing"
          description="Enter your PIN to complete the daily closing"
        />
      )}
    </>
  );
};
