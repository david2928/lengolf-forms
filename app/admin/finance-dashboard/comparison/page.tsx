'use client';

import { useState } from 'react';
import PLComparisonView from '@/components/finance-dashboard/PLComparisonView';
import { usePLComparison, useDefaultComparisonMonths, getCurrentMonth } from '@/hooks/usePLComparison';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function PLComparisonPage() {
  const defaultMonths = useDefaultComparisonMonths();
  const currentMonth = getCurrentMonth();
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>(defaultMonths);
  
  const { data, isLoading, error } = usePLComparison({
    months: selectedMonths,
    includeRunRate: true,
    enabled: true
  });

  const handleMonthsChange = (months: string[]) => {
    setSelectedMonths(months);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load P&L comparison data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">P&L Monthly Comparison</h1>
        <p className="text-muted-foreground">
          Compare profit & loss statements across multiple months side by side
        </p>
      </div>

      <PLComparisonView
        data={data}
        loading={isLoading}
        selectedMonths={selectedMonths}
        onMonthsChange={handleMonthsChange}
        currentMonth={currentMonth}
        showRunRate={false}
      />
    </div>
  );
}