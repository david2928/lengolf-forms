'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Import our new components
import ExpensePageHeader from './components/ExpensePageHeader';
import ExpenseControls from './components/ExpenseControls';
import ExpenseTable from './components/ExpenseTable';
import ExpenseModal from './components/ExpenseModal';

// Types
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

interface ExpenseType {
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
}

interface HierarchicalFilterOption {
  value: string;
  label: string;
  type: 'all' | 'category' | 'subcategory';
}

export default function OperatingExpensesManager() {
  // State
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [costTypeFilter, setCostTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data fetching
  const fetchExpenseTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/expense-types');
      if (!response.ok) throw new Error('Failed to fetch expense types');
      const data = await response.json();
      setExpenseTypes(data);
    } catch (err) {
      console.error('Error fetching expense types:', err);
    }
  }, []);

  const fetchExpenses = useCallback(async (period?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the selected period for filtering, or current period if not specified
      const filterPeriod = period || selectedPeriod;
      const periodDate = `${filterPeriod}-15`; // Use middle of month for filtering
      
      const url = '/api/finance/operating-expenses?effectiveDate=' + periodDate;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch operating expenses');
      
      const data = await response.json();
      // Sort by sort_order then by name
      const sortedData = data.sort((a: OperatingExpense, b: OperatingExpense) => {
        const aOrder = a.expense_type?.sort_order || 0;
        const bOrder = b.expense_type?.sort_order || 0;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        // Secondary sort by name
        const aName = a.expense_type?.name || '';
        const bName = b.expense_type?.name || '';
        return aName.localeCompare(bName);
      });
      setExpenses(sortedData);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch operating expenses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Initialize data
  useEffect(() => {
    fetchExpenseTypes();
    fetchExpenses();
  }, [fetchExpenseTypes, fetchExpenses]);

  // Refetch expenses when selected period changes
  useEffect(() => {
    if (selectedPeriod) {
      fetchExpenses(selectedPeriod);
    }
  }, [selectedPeriod, fetchExpenses]);

  // Helper functions
  const getBusinessCategory = (expense: OperatingExpense): string => {
    return expense.expense_type?.expense_subcategory?.expense_category?.name || 'Other';
  };

  const getExpenseName = (expense: OperatingExpense): string => {
    return expense.expense_type?.name || 'Unknown';
  };

  const getSubcategoryName = (expense: OperatingExpense): string => {
    return expense.expense_type?.expense_subcategory?.name || '';
  };

  const getCostType = (expense: OperatingExpense): 'one_time' | 'recurring' => {
    return expense.cost_type as 'one_time' | 'recurring';
  };

  const isActiveInPeriod = (expense: OperatingExpense, period: string) => {
    const periodStart = `${period}-01`;
    const periodEnd = `${period}-31`;
    const expenseStart = expense.effective_date;
    const expenseEnd = expense.end_date || '9999-12-31';
    return expenseStart <= periodEnd && expenseEnd >= periodStart;
  };

  // Get hierarchical filter options
  const getHierarchicalFilterOptions = (): HierarchicalFilterOption[] => {
    const options: HierarchicalFilterOption[] = [
      { value: 'all', label: 'All Categories', type: 'all' }
    ];
    
    const categoryMap = new Map<string, Set<string>>();
    
    // Group subcategories by category
    expenses.forEach(expense => {
      const category = getBusinessCategory(expense);
      const subcategory = getSubcategoryName(expense);
      
      if (category && subcategory) {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, new Set());
        }
        categoryMap.get(category)!.add(subcategory);
      }
    });

    // Add category and subcategory options
    Array.from(categoryMap.keys()).sort().forEach(category => {
      // Add main category option
      options.push({
        value: `category:${category}`,
        label: category,
        type: 'category'
      });
      
      // Add subcategory options under this category
      const subcategories = Array.from(categoryMap.get(category)!).sort();
      subcategories.forEach(subcategory => {
        options.push({
          value: `subcategory:${subcategory}`,
          label: `  └ ${subcategory}`,
          type: 'subcategory'
        });
      });
    });

    return options;
  };

  // Handle hierarchical filter changes
  const handleHierarchicalFilterChange = (value: string) => {
    if (value === 'all') {
      setCategoryFilter('all');
      setSubcategoryFilter('all');
    } else if (value.startsWith('category:')) {
      const category = value.replace('category:', '');
      setCategoryFilter(category);
      setSubcategoryFilter('all');
    } else if (value.startsWith('subcategory:')) {
      const subcategory = value.replace('subcategory:', '');
      setSubcategoryFilter(subcategory);
      // Find the category that contains this subcategory
      const expense = expenses.find(e => getSubcategoryName(e) === subcategory);
      if (expense) {
        setCategoryFilter(getBusinessCategory(expense));
      }
    }
  };

  // Get current hierarchical filter value
  const getCurrentHierarchicalValue = () => {
    if (subcategoryFilter !== 'all') {
      return `subcategory:${subcategoryFilter}`;
    } else if (categoryFilter !== 'all') {
      return `category:${categoryFilter}`;
    } else {
      return 'all';
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    // Period filter
    if (!isActiveInPeriod(expense, selectedPeriod)) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && getBusinessCategory(expense) !== categoryFilter) return false;
    
    // Subcategory filter
    if (subcategoryFilter !== 'all' && getSubcategoryName(expense) !== subcategoryFilter) return false;
    
    // Cost type filter  
    if (costTypeFilter !== 'all' && getCostType(expense) !== costTypeFilter) return false;
    
    // Search filter
    if (searchTerm && 
        !getExpenseName(expense).toLowerCase().includes(searchTerm.toLowerCase()) && 
        !getSubcategoryName(expense).toLowerCase().includes(searchTerm.toLowerCase()) &&
        !expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((total, expense) => total + expense.amount, 0);

  // Event handlers
  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expense: OperatingExpense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/finance/operating-expenses?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Expense deleted successfully');
        fetchExpenses(selectedPeriod);
      } else {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };


  const handleSubmitExpense = async (data: any) => {
    try {
      const method = editingExpense && editingExpense.id > 0 ? 'PUT' : 'POST';
      
      const response = await fetch('/api/finance/operating-expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success(editingExpense && editingExpense.id > 0 ? 'Expense updated successfully' : 'Expense created successfully');
        fetchExpenses(selectedPeriod);
      } else {
        throw new Error('Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleReorder = async (expenseId: number, direction: 'up' | 'down') => {
    try {
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) return;

      // Find expenses in the same subcategory
      const sameSubcategoryExpenses = expenses
        .filter(e => e.expense_type?.expense_subcategory?.id === expense.expense_type?.expense_subcategory?.id)
        .sort((a, b) => (a.expense_type?.sort_order || 0) - (b.expense_type?.sort_order || 0));

      const currentIndex = sameSubcategoryExpenses.findIndex(e => e.id === expenseId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sameSubcategoryExpenses.length) return;

      const currentExpense = sameSubcategoryExpenses[currentIndex];
      const targetExpense = sameSubcategoryExpenses[targetIndex];

      // Swap sort orders
      const response = await fetch('/api/finance/expense-types/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense1: { id: currentExpense.expense_type_id, sort_order: targetExpense.expense_type?.sort_order },
          expense2: { id: targetExpense.expense_type_id, sort_order: currentExpense.expense_type?.sort_order }
        })
      });

      if (response.ok) {
        toast.success('Order updated successfully');
        fetchExpenses(selectedPeriod); // Refresh to show new order
      } else {
        throw new Error('Failed to update order');
      }
    } catch (error) {
      console.error('Error reordering expense:', error);
      toast.error('Failed to update order');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-36" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading expenses...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      <ExpensePageHeader
        selectedPeriod={selectedPeriod}
        totalExpenses={totalExpenses}
        expenseCount={filteredExpenses.length}
      />

      {/* Controls */}
      <ExpenseControls
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        hierarchicalFilterValue={getCurrentHierarchicalValue()}
        onHierarchicalFilterChange={handleHierarchicalFilterChange}
        hierarchicalFilterOptions={getHierarchicalFilterOptions()}
        costTypeFilter={costTypeFilter}
        onCostTypeFilterChange={setCostTypeFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddExpense={handleAddExpense}
      />

      {/* Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        totalExpenses={totalExpenses}
        selectedPeriod={selectedPeriod}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        expense={editingExpense}
        expenseTypes={expenseTypes}
        onSubmit={handleSubmitExpense}
      />
    </div>
  );
}