'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface ExpensePageHeaderProps {
  selectedPeriod: string;
  totalExpenses: number;
  expenseCount: number;
}

export default function ExpensePageHeader({ 
  selectedPeriod, 
  totalExpenses, 
  expenseCount 
}: ExpensePageHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Operating Expenses
      </h1>
      <p className="text-muted-foreground">
        Manage monthly operating expenses and budget allocations
      </p>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(selectedPeriod + '-01').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </span>
        <span>•</span>
        <span>{expenseCount} expenses</span>
        <span>•</span>
        <span className="font-medium">
          Total: ฿{totalExpenses.toLocaleString()}
        </span>
      </div>
    </div>
  );
}