'use client';

import React from 'react';
import { DollarSign, Edit, MoreVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OperatingExpense {
  id: number;
  amount: number;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expense_type_id: number;
  cost_type: string;
  expense_type: {
    id: number;
    name: string;
    sort_order?: number;
    expense_subcategory: {
      id: number;
      name: string;
      expense_category: {
        id: number;
        name: string;
      };
    };
  };
}

interface ExpenseTableProps {
  expenses: OperatingExpense[];
  totalExpenses: number;
  selectedPeriod?: string; // Add selected period for context-aware status
  isLoading?: boolean;
  onEdit: (expense: OperatingExpense) => void;
  onDelete: (id: number) => void;
  onReorder?: (expenseId: number, direction: 'up' | 'down') => void;
}

export default function ExpenseTable({ 
  expenses, 
  totalExpenses,
  selectedPeriod,
  isLoading = false,
  onEdit, 
  onDelete, 
  onReorder
}: ExpenseTableProps) {
  // Helper functions
  const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`;
  
  const isRedundantNote = (expense: OperatingExpense): boolean => {
    if (!expense.notes) return false;
    
    const note = expense.notes.toLowerCase().trim();
    const expenseName = getExpenseName(expense).toLowerCase();
    const costType = getCostType(expense);
    
    // List of specific redundant notes we've seen
    const exactRedundantNotes = [
      'monthly office rent',
      'monthly insurance premium', 
      'monthly utilities (variable)',
      'annual building tax (prorated monthly)',
      'base staff salaries',
      'golf ball restocking',
      'bay maintenance costs',
      'banking and operational support',
      'service tax on staff payouts'
    ];
    
    // Check exact matches first
    if (exactRedundantNotes.includes(note)) {
      return true;
    }
    
    // Check if note just repeats information we already know
    const redundantPatterns = [
      // Monthly + expense name variations
      `monthly ${expenseName}`,
      `${expenseName} monthly`,
      `monthly ${expenseName} premium`,
      `monthly ${expenseName} cost`,
      `monthly ${expenseName} payment`,
      `${expenseName} (monthly)`,
      
      // Annual + expense name variations  
      `annual ${expenseName}`,
      `${expenseName} annual`,
      `annual ${expenseName} (prorated monthly)`,
      
      // Generic patterns
      `${expenseName} expense`,
      `${expenseName} fee`,
      `${expenseName} costs`,
      `${expenseName} restocking`,
    ];
    
    // For recurring expenses, mentioning frequency is redundant
    if (costType === 'recurring') {
      return redundantPatterns.some(pattern => note.includes(pattern)) ||
             note.includes('monthly') || 
             note.includes('per month') ||
             (note.includes('annual') && note.includes('prorated'));
    }
    
    return false;
  };
  
  const getCostType = (expense: OperatingExpense): 'one_time' | 'recurring' => {
    return expense.cost_type as 'one_time' | 'recurring';
  };

  const getBusinessCategory = (expense: OperatingExpense): string => {
    return expense.expense_type?.expense_subcategory?.expense_category?.name || 'Other';
  };

  const getExpenseName = (expense: OperatingExpense): string => {
    return expense.expense_type?.name || 'Unknown';
  };

  const getSubcategoryName = (expense: OperatingExpense): string => {
    return expense.expense_type?.expense_subcategory?.name || '';
  };

  const isActiveForPeriod = (expense: OperatingExpense, period?: string) => {
    // If no period specified, use today's date for "currently active" logic
    const referenceDate = period ? `${period}-15` : new Date().toISOString().split('T')[0];
    return expense.effective_date <= referenceDate && (!expense.end_date || expense.end_date >= referenceDate);
  };

  const getStatusText = (expense: OperatingExpense) => {
    // Just show "Active" or "Inactive" - much cleaner
    return isActiveForPeriod(expense, selectedPeriod) ? 'Active' : 'Inactive';
  };

  const formatPeriod = (expense: OperatingExpense) => {
    const startDate = new Date(expense.effective_date);
    const costType = getCostType(expense);
    
    if (costType === 'one_time') {
      return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else {
      const startMonth = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (expense.end_date) {
        const endDate = new Date(expense.end_date);
        const endMonth = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        return `${startMonth} - ${endMonth}`;
      } else {
        return `${startMonth} - Ongoing`;
      }
    }
  };

  if (expenses.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Expenses Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                No expenses found for the selected period
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-xl text-gray-900">
                No expenses for this period
              </p>
              <p className="text-muted-foreground max-w-md">
                Get started by adding your first operating expense for this period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Expenses Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Currently active expenses for the selected period
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {expenses.length} items
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1 font-mono">
              ฿{totalExpenses.toLocaleString()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">
                  Expense Name
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">
                  Category
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%] text-center">
                  Order
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-right">
                  Amount
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%]">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">
                  Active Period
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%]">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                  {/* Expense Name */}
                  <TableCell className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 text-base">
                        {getExpenseName(expense)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getSubcategoryName(expense)}
                      </p>
                      {expense.notes && !isRedundantNote(expense) && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Category */}
                  <TableCell className="px-4 py-4">
                    <Badge 
                      variant="outline" 
                      className={`px-3 py-1 text-xs font-medium ${
                        getBusinessCategory(expense) === 'Marketing Expenses' 
                          ? 'border-blue-200 text-blue-700 bg-blue-50' 
                          : 'border-green-200 text-green-700 bg-green-50'
                      }`}
                    >
                      {getBusinessCategory(expense) === 'Marketing Expenses' ? 'Marketing' : 'Operations'}
                    </Badge>
                  </TableCell>
                  
                  {/* Sort Order */}
                  <TableCell className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-mono text-gray-600">
                        {expense.expense_type?.sort_order || 0}
                      </span>
                      {onReorder && (
                        <div className="flex flex-col gap-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-gray-100"
                            onClick={() => onReorder(expense.id, 'up')}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-gray-100"
                            onClick={() => onReorder(expense.id, 'down')}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Amount */}
                  <TableCell className="px-4 py-4 text-right">
                    <div className="space-y-1">
                      <div className="font-mono text-lg font-bold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getCostType(expense) === 'recurring' ? 'per month' : 'one-time'}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell className="px-4 py-4">
                    <Badge 
                      variant={getCostType(expense) === 'one_time' ? 'default' : 'secondary'}
                      className="px-3 py-1 text-xs font-medium"
                    >
                      {getCostType(expense) === 'one_time' ? 'One-time' : 'Recurring'}
                    </Badge>
                  </TableCell>
                  
                  {/* Active Period */}
                  <TableCell className="px-4 py-4">
                    <div className="text-sm text-gray-700 font-medium">
                      {formatPeriod(expense)}
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell className="px-4 py-4">
                    <Badge 
                      variant={isActiveForPeriod(expense, selectedPeriod) ? 'default' : 'secondary'}
                      className={`px-2 py-1 text-xs font-medium ${
                        isActiveForPeriod(expense, selectedPeriod) 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {getStatusText(expense)}
                    </Badge>
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
                        onClick={() => onEdit(expense)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onDelete(expense.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Expense
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}