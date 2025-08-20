'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Settings,
  DollarSign,
  Loader2,
  AlertTriangle,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from "sonner";

interface OperatingExpense {
  id: number;
  expense_category: string;
  expense_subcategory: string | null;
  amount: number;
  effective_date: string;
  end_date: string | null;
  is_fixed: boolean;
  notes: string | null;
  display_category: string;
  display_order: number;
  show_in_pl: boolean;
  created_at: string;
  updated_at: string;
}

interface OperatingExpenseFormData {
  expense_category: string;
  expense_subcategory: string;
  amount: string;
  effective_date: string;
  end_date: string;
  is_fixed: boolean;
  notes: string;
  display_category: string;
  display_order: string;
  show_in_pl: boolean;
}

export default function OperatingExpensesManager() {
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<OperatingExpenseFormData>({
    expense_category: '',
    expense_subcategory: '',
    amount: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_fixed: true,
    notes: '',
    display_category: 'Fixed Cost',
    display_order: '999',
    show_in_pl: true
  });

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = viewMode === 'active' 
        ? '/api/finance/operating-expenses?effectiveDate=' + new Date().toISOString().split('T')[0]
        : '/api/finance/operating-expenses';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch operating expenses');
      }
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch operating expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [viewMode]);

  const resetForm = () => {
    setFormData({
      expense_category: '',
      expense_subcategory: '',
      amount: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_fixed: true,
      notes: '',
      display_category: 'Fixed Cost',
      display_order: '999',
      show_in_pl: true
    });
    setEditingExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_category || !formData.amount || !formData.effective_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        end_date: formData.end_date || null,
        display_order: parseInt(formData.display_order),
        ...(editingExpense && { id: editingExpense.id })
      };

      const response = await fetch('/api/finance/operating-expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingExpense ? 'Expense updated successfully' : 'Expense created successfully');
        setIsModalOpen(false);
        resetForm();
        fetchExpenses();
      } else {
        throw new Error('Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleEdit = (expense: OperatingExpense) => {
    setEditingExpense(expense);
    setFormData({
      expense_category: expense.expense_category,
      expense_subcategory: expense.expense_subcategory || '',
      amount: expense.amount.toString(),
      effective_date: expense.effective_date,
      end_date: expense.end_date || '',
      is_fixed: expense.is_fixed,
      notes: expense.notes || '',
      display_category: expense.display_category || 'Fixed Cost',
      display_order: expense.display_order?.toString() || '999',
      show_in_pl: expense.show_in_pl !== undefined ? expense.show_in_pl : true
    });
    setIsModalOpen(true);
  };

  const handleToggleVisibility = async (expense: OperatingExpense, showInPL: boolean) => {
    try {
      const payload = {
        ...expense,
        show_in_pl: showInPL,
        display_order: expense.display_order,
        id: expense.id
      };

      const response = await fetch('/api/finance/operating-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(showInPL ? 'Expense activated for P&L' : 'Expense hidden from P&L');
        fetchExpenses();
      } else {
        throw new Error('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/finance/operating-expenses?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } else {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleCreateIncrease = (expense: OperatingExpense) => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];

    setFormData({
      expense_category: expense.expense_category,
      expense_subcategory: expense.expense_subcategory || '',
      amount: (expense.amount * 1.1).toFixed(2), // 10% increase as default
      effective_date: nextMonthStr,
      end_date: '',
      is_fixed: expense.is_fixed,
      notes: `Rate increase from ฿${expense.amount.toLocaleString()}`,
      display_category: expense.display_category || 'Fixed Cost',
      display_order: expense.display_order?.toString() || '999',
      show_in_pl: expense.show_in_pl !== undefined ? expense.show_in_pl : true
    });
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isActive = (expense: OperatingExpense) => {
    const today = new Date().toISOString().split('T')[0];
    return expense.effective_date <= today && (!expense.end_date || expense.end_date >= today) && expense.show_in_pl;
  };

  const getExpenseStatus = (expense: OperatingExpense) => {
    const today = new Date().toISOString().split('T')[0];
    const dateActive = expense.effective_date <= today && (!expense.end_date || expense.end_date >= today);
    
    if (!expense.show_in_pl) return 'hidden';
    if (!dateActive) return 'expired';
    return 'active';
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.expense_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.expense_subcategory && expense.expense_subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const status = getExpenseStatus(expense);
    const matchesView = viewMode === 'all' || 
                       (viewMode === 'active' && status === 'active') ||
                       (viewMode === 'inactive' && (status === 'hidden' || status === 'expired'));
    
    return matchesSearch && matchesView;
  });

  const getTotalMonthlyExpenses = () => {
    return filteredExpenses
      .filter(expense => viewMode === 'all' || isActive(expense))
      .reduce((total, expense) => total + expense.amount, 0);
  };

  // Mobile Card Component
  const ExpenseCard = ({ expense }: { expense: OperatingExpense }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-base">{expense.expense_category}</h3>
              {expense.expense_subcategory && (
                <p className="text-sm text-gray-500">{expense.expense_subcategory}</p>
              )}
              
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-gray-900">
                  {formatCurrency(expense.amount)}
                </span>
                <Badge variant={expense.is_fixed ? 'default' : 'secondary'}>
                  {expense.is_fixed ? 'Fixed' : 'Variable'}
                </Badge>
                {(() => {
                  const status = getExpenseStatus(expense);
                  return (
                    <Badge variant={
                      status === 'active' ? 'default' : 
                      status === 'hidden' ? 'secondary' : 
                      'destructive'
                    }>
                      {status === 'active' ? 'Active' : 
                       status === 'hidden' ? 'Hidden' : 
                       'Expired'}
                    </Badge>
                  );
                })()}
              </div>
              
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(expense.effective_date)}</span>
                  {expense.end_date && (
                    <span>to {formatDate(expense.end_date)}</span>
                  )}
                </div>
                {expense.notes && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {expense.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleEdit(expense)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                
                {getExpenseStatus(expense) === 'active' ? (
                  <DropdownMenuItem
                    onClick={() => handleToggleVisibility(expense, false)}
                    className="text-orange-600"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Hide from P&L
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleToggleVisibility(expense, true)}
                    className="text-green-600"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Show in P&L
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => handleCreateIncrease(expense)}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Create Increase
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(expense.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading operating expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter(e => isActive(e)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalMonthlyExpenses())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Operating Expenses</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full md:w-64"
                />
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('active')}
                >
                  Active
                </Button>
                <Button
                  variant={viewMode === 'inactive' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('inactive')}
                >
                  Inactive
                </Button>
                <Button
                  variant={viewMode === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('all')}
                >
                  All
                </Button>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Edit Operating Expense' : 'Add Operating Expense'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          value={formData.expense_category}
                          onChange={(e) => setFormData(prev => ({ ...prev, expense_category: e.target.value }))}
                          placeholder="e.g., Rent, Insurance, Utilities"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Input
                          id="subcategory"
                          value={formData.expense_subcategory}
                          onChange={(e) => setFormData(prev => ({ ...prev, expense_subcategory: e.target.value }))}
                          placeholder="Optional subcategory"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="display_category">P&L Display Category *</Label>
                        <select
                          id="display_category"
                          value={formData.display_category}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_category: e.target.value }))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="Fixed Cost">Fixed Cost</option>
                          <option value="Variable Cost">Variable Cost</option>
                          <option value="Salaries">Salaries</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_order: e.target.value }))}
                          placeholder="10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Lower numbers appear first in P&L
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="show_in_pl" className="flex items-center gap-2">
                          <Switch
                            id="show_in_pl"
                            checked={formData.show_in_pl}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_pl: checked }))}
                          />
                          Show in P&L
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Include this expense in P&L statement
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Monthly Amount (THB) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="25000"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="is_fixed" className="flex items-center gap-2">
                          <Switch
                            id="is_fixed"
                            checked={formData.is_fixed}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_fixed: checked }))}
                          />
                          Fixed Monthly Cost
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Fixed costs apply fully each month. Variable costs are prorated by days elapsed.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="effective_date">Effective Date *</Label>
                        <Input
                          id="effective_date"
                          type="date"
                          value={formData.effective_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          placeholder="Leave empty for ongoing"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional notes about this expense..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingExpense ? 'Update Expense' : 'Add Expense'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Mobile Card View (md and below) */}
          <div className="block md:hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="flex flex-col items-center gap-3">
                  <Settings className="h-12 w-12 text-gray-300" />
                  <div>
                    <p className="font-medium text-lg">
                      {searchTerm ? 'No expenses found matching your search.' : 'No operating expenses yet.'}
                    </p>
                    {!searchTerm && (
                      <p className="text-sm text-gray-400 mt-1">Add your first expense to get started.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop Table View (md and above) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">Category</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%]">Type</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%]">Effective Period</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%]">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[13%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Settings className="h-8 w-8 text-gray-300" />
                        <p className="font-medium">
                          {searchTerm ? 'No expenses found matching your search.' : 'No operating expenses yet.'}
                        </p>
                        {!searchTerm && (
                          <p className="text-sm text-gray-400">Add your first expense to get started.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-green-700" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-base">{expense.expense_category}</p>
                            {expense.expense_subcategory && (
                              <p className="text-sm text-gray-500 mt-1">{expense.expense_subcategory}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="font-mono text-base font-semibold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <Badge variant={expense.is_fixed ? 'default' : 'secondary'}>
                          {expense.is_fixed ? 'Fixed' : 'Variable'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3" />
                            {formatDate(expense.effective_date)}
                          </div>
                          {expense.end_date && (
                            <div className="text-gray-500 mt-1">
                              to {formatDate(expense.end_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <Badge variant={isActive(expense) ? 'default' : 'secondary'}>
                          {isActive(expense) ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                            title="Edit expense"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          
                          {getExpenseStatus(expense) === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleVisibility(expense, false)}
                              className="h-8 px-3 hover:bg-orange-50 text-orange-600 border-orange-200"
                              title="Hide from P&L"
                            >
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Hide
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleVisibility(expense, true)}
                              className="h-8 px-3 hover:bg-green-50 text-green-600 border-green-200"
                              title="Show in P&L"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Show
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            className="h-8 px-3 hover:bg-red-50 text-red-600 border-red-200"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}