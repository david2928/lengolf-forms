'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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

interface ExpenseCategory {
  id: number;
  name: string;
  expense_subcategories: {
    id: number;
    name: string;
  }[];
}

interface ExpenseSubcategory {
  id: number;
  name: string;
}

interface OperatingExpense {
  id: number;
  amount: number;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
  expense_type_id: number;
  cost_type: string;
  expense_type: {
    id: number;
    name: string;
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

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: OperatingExpense | null;
  expenseTypes: ExpenseType[];
  onSubmit: (data: any) => Promise<void>;
}

interface FormData {
  expense_type_id: string;
  expense_type_name: string;
  category_id: string;
  subcategory_id: string;
  sort_order: string;
  amount: string;
  effective_date: string;
  end_date: string;
  notes: string;
  cost_type: 'one_time' | 'recurring';
  target_month: string;
}

export default function ExpenseModal({ 
  isOpen, 
  onClose, 
  expense, 
  expenseTypes, 
  onSubmit 
}: ExpenseModalProps) {
  const [formData, setFormData] = useState<FormData>({
    expense_type_id: '',
    expense_type_name: '',
    category_id: '',
    subcategory_id: '',
    sort_order: '',
    amount: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    cost_type: 'one_time', // Default to one-time for new expenses
    target_month: new Date().toISOString().slice(0, 7)
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<ExpenseSubcategory[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories for new expenses
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/finance/expense-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Update subcategories when category changes
  useEffect(() => {
    const selectedCategory = categories.find(cat => cat.id.toString() === formData.category_id);
    setSelectedSubcategories(selectedCategory?.expense_subcategories || []);
    
    // Reset subcategory when category changes
    if (formData.category_id && !selectedCategory?.expense_subcategories.find(sub => sub.id.toString() === formData.subcategory_id)) {
      setFormData(prev => ({ ...prev, subcategory_id: '', sort_order: '' }));
    }
  }, [formData.category_id, categories]);

  // Auto-suggest sort order when subcategory changes
  useEffect(() => {
    if (formData.subcategory_id && !expense) { // Only for new expenses
      // Find existing expense types in this subcategory to suggest next sort order
      const existingTypes = expenseTypes.filter(type => 
        type.expense_subcategory.id.toString() === formData.subcategory_id
      );
      const maxSortOrder = Math.max(...existingTypes.map(type => type.sort_order || 0), 0);
      const suggestedOrder = maxSortOrder + 1;
      
      setFormData(prev => ({ ...prev, sort_order: suggestedOrder.toString() }));
    }
  }, [formData.subcategory_id, expenseTypes, expense]);

  // REMOVED: Auto-suggest cost type logic that was overriding user selection

  // Fetch categories when modal opens for new expenses
  useEffect(() => {
    if (isOpen && !expense) {
      fetchCategories();
    }
  }, [isOpen, expense]);

  // Reset form when modal opens/closes or expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        // Editing existing expense
        const hasEndDate = !!expense.end_date;
        const isOneTime = hasEndDate && expense.effective_date.slice(0, 7) === expense.end_date?.slice(0, 7);
        const costType = isOneTime ? 'one_time' : 'recurring';
        
        setFormData({
          expense_type_id: expense.expense_type_id.toString(),
          expense_type_name: expense.expense_type?.name || '',
          category_id: '',
          subcategory_id: '',
          sort_order: '',
          amount: expense.amount.toString(),
          effective_date: expense.effective_date,
          end_date: expense.end_date || '',
          notes: expense.notes || '',
          cost_type: costType,
          target_month: expense.effective_date.slice(0, 7)
        });
      } else {
        // Adding new expense
        setFormData({
          expense_type_id: '',
          expense_type_name: '',
          category_id: '',
          subcategory_id: '',
          sort_order: '',
          amount: '',
          effective_date: new Date().toISOString().split('T')[0],
          end_date: '',
          notes: '',
          cost_type: 'one_time', // Default to one-time for new expenses
          target_month: new Date().toISOString().slice(0, 7)
        });
      }
    }
  }, [isOpen, expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for new vs editing expense
    if (expense) {
      // Editing: require amount and expense name
      if (!formData.amount || !formData.expense_type_name) {
        toast.error('Please enter an amount and expense name');
        return;
      }
    } else {
      // New: require category, subcategory, name, and amount
      if (!formData.category_id || !formData.subcategory_id || !formData.expense_type_name || !formData.amount) {
        toast.error('Please fill in category, subcategory, expense name, and amount');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // For one-time expenses, use target_month for effective_date
      const effectiveDate = formData.cost_type === 'one_time' 
        ? `${formData.target_month}-01` 
        : formData.effective_date;

      // For one-time expenses, set end_date to last day of target month
      let endDate = formData.end_date || null;
      if (formData.cost_type === 'one_time') {
        const year = parseInt(formData.target_month.split('-')[0]);
        const month = parseInt(formData.target_month.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${formData.target_month}-${lastDay.toString().padStart(2, '0')}`;
      }

      const payload = expense ? {
        // Editing existing expense - allow updating expense type name
        expense_type_id: expense.expense_type_id,
        expense_type_name: formData.expense_type_name, // Allow name changes
        amount: parseFloat(formData.amount),
        effective_date: effectiveDate,
        end_date: endDate,
        notes: formData.notes,
        cost_type: formData.cost_type,
        id: expense.id
      } : {
        // Creating new expense with new expense type
        expense_type_name: formData.expense_type_name,
        subcategory_id: parseInt(formData.subcategory_id),
        sort_order: parseInt(formData.sort_order) || 0,
        amount: parseFloat(formData.amount),
        effective_date: effectiveDate,
        end_date: endDate,
        notes: formData.notes,
        cost_type: formData.cost_type
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {expense ? 'Edit Operating Expense' : 'Add Operating Expense'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cost Type Toggle */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Label htmlFor="cost-type" className="font-medium">Cost Type</Label>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${formData.cost_type === 'one_time' ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  One-time
                </span>
                <Switch
                  id="cost-type"
                  checked={formData.cost_type === 'recurring'}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    cost_type: checked ? 'recurring' : 'one_time' 
                  }))}
                />
                <span className={`text-sm ${formData.cost_type === 'recurring' ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  Recurring
                </span>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          {formData.cost_type === 'recurring' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_month">Start Month *</Label>
                <Input
                  id="start_month"
                  type="month"
                  value={formData.effective_date.slice(0, 7)}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_date: `${e.target.value}-01` }))}
                  min="2024-04"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_month">End Month</Label>
                <Input
                  id="end_month"
                  type="month"
                  value={formData.end_date ? formData.end_date.slice(0, 7) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Get the last day of the selected month
                      const year = parseInt(e.target.value.split('-')[0]);
                      const month = parseInt(e.target.value.split('-')[1]);
                      const lastDay = new Date(year, month, 0).getDate();
                      setFormData(prev => ({ 
                        ...prev, 
                        end_date: `${e.target.value}-${lastDay.toString().padStart(2, '0')}`
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, end_date: '' }));
                    }
                  }}
                  min="2024-04"
                  placeholder="Optional"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for ongoing expenses
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target_month">Target Month *</Label>
              <Input
                id="target_month"
                type="month"
                value={formData.target_month}
                onChange={(e) => setFormData(prev => ({ ...prev, target_month: e.target.value }))}
                min="2024-04"
                required
              />
            </div>
          )}

          {/* Expense Type Selection - Different UI for new vs editing */}
          {expense ? (
            /* Editing existing expense - allow name editing */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense_type_name">Expense Name *</Label>
                <Input
                  id="expense_type_name"
                  type="text"
                  value={formData.expense_type_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, expense_type_name: e.target.value }))}
                  placeholder={expense.expense_type?.name || 'Enter expense name'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category & Subcategory</Label>
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  {expense.expense_type?.expense_subcategory?.expense_category?.name} {' > '} {expense.expense_type?.expense_subcategory?.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  Category and subcategory cannot be changed when editing.
                </p>
              </div>
            </div>
          ) : (
            /* Adding new expense - show category/subcategory selector and name input */
            <div className="space-y-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <select
                  id="category_id"
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    category_id: e.target.value,
                    subcategory_id: '' // Reset subcategory when category changes
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Selection */}
              <div className="space-y-2">
                <Label htmlFor="subcategory_id">Subcategory *</Label>
                <select
                  id="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    subcategory_id: e.target.value
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={!formData.category_id}
                >
                  <option value="">Select subcategory</option>
                  {selectedSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Type Name */}
              <div className="space-y-2">
                <Label htmlFor="expense_type_name">Expense Name *</Label>
                <Input
                  id="expense_type_name"
                  type="text"
                  value={formData.expense_type_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, expense_type_name: e.target.value }))}
                  placeholder="e.g., Office Rent, Software License, etc."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will create a new expense type for future use
                </p>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label htmlFor="sort_order">Display Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first. Suggested: {formData.sort_order || 'Select subcategory first'}
                </p>
              </div>
            </div>
          )}

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {formData.cost_type === 'one_time' ? 'Amount (THB) *' : 'Monthly Amount (THB) *'}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="25000"
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.cost_type === 'one_time' 
                ? 'Full amount will be applied to the selected month only'
                : 'Monthly amount will be prorated based on days elapsed in current month'
              }
            </p>
          </div>

          {/* Notes */}
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

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}