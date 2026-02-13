'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

type PeriodPreset = 'mtd' | 'last_month' | 'custom';

interface PeriodSelection {
  startDate: string;
  endDate: string;
  accountNumber: string;
}

interface PeriodSelectorProps {
  onRun: (selection: PeriodSelection) => void;
  loading: boolean;
  /** Info string shown after data loads, e.g. "Feb 1 - Feb 7, 2026 | 156 transactions" */
  activeInfo?: string;
}

const ACCOUNTS = [
  { value: '170-3-26995-4', label: '170-3-26995-4 (Main Ops)' },
  { value: '170-3-27029-4', label: '170-3-27029-4 (Expense)' },
];

function getMTDRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${day}`,
  };
}

function getLastMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const year = lastMonth.getFullYear();
  const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
  const endDay = String(lastDay.getDate()).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${endDay}`,
  };
}

export default function PeriodSelector({ onRun, loading, activeInfo }: PeriodSelectorProps) {
  const [preset, setPreset] = useState<PeriodPreset>('mtd');
  const [accountNumber, setAccountNumber] = useState(ACCOUNTS[0].value);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [hasAutoRun, setHasAutoRun] = useState(false);

  const getDateRange = useCallback(() => {
    if (preset === 'mtd') return getMTDRange();
    if (preset === 'last_month') return getLastMonthRange();
    return { startDate: customStart, endDate: customEnd };
  }, [preset, customStart, customEnd]);

  const handleRun = useCallback(() => {
    const { startDate, endDate } = getDateRange();
    if (!startDate || !endDate) return;
    onRun({ startDate, endDate, accountNumber });
  }, [getDateRange, accountNumber, onRun]);

  // Auto-run MTD on mount
  useEffect(() => {
    if (!hasAutoRun) {
      setHasAutoRun(true);
      const { startDate, endDate } = getMTDRange();
      onRun({ startDate, endDate, accountNumber: ACCOUNTS[0].value });
    }
  }, [hasAutoRun, onRun]);

  const handlePresetChange = useCallback((newPreset: PeriodPreset) => {
    setPreset(newPreset);
    // Auto-run for non-custom presets
    if (newPreset !== 'custom') {
      const range = newPreset === 'mtd' ? getMTDRange() : getLastMonthRange();
      onRun({ startDate: range.startDate, endDate: range.endDate, accountNumber });
    }
  }, [accountNumber, onRun]);

  const isCustomValid = preset !== 'custom' || (customStart && customEnd && customStart <= customEnd);

  return (
    <div className="bg-white border rounded-lg p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period presets */}
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
          {(['mtd', 'last_month', 'custom'] as PeriodPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              disabled={loading}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                preset === p
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {p === 'mtd' ? 'MTD' : p === 'last_month' ? 'Last Month' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
              disabled={loading}
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
              disabled={loading}
            />
          </div>
        )}

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200 mx-1" />

        {/* Account selector */}
        <div className="relative">
          <select
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            disabled={loading}
            className="appearance-none bg-gray-50 border rounded px-3 py-1.5 pr-7 text-sm text-gray-700 disabled:opacity-50"
          >
            {ACCOUNTS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Run button (only for custom or re-run) */}
        {preset === 'custom' && (
          <button
            onClick={handleRun}
            disabled={loading || !isCustomValid}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Run
          </button>
        )}
      </div>

      {/* Active info */}
      {activeInfo && !loading && (
        <p className="text-xs text-gray-500 pl-6">{activeInfo}</p>
      )}
    </div>
  );
}
