import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Receipt } from 'lucide-react';
import { useManualEntries } from '@/hooks/useFinanceDashboard';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'revenue' | 'expense';
  category: string;
  month: string;
  existingEntry?: any;
  onSuccess?: () => void;
}

const REVENUE_CATEGORIES = [
  'Events',
  'ClassPass', 
  'Gowabi',
  'Coaching',
  'Special Promotions',
  'Other Revenue'
];

const EXPENSE_CATEGORIES = [
  'Catering',
  'Drinks', 
  'TikTok',
  'LINE',
  'KOL+Video',
  'Pre-Order Food',
  'Marketing Agency',
  'Coaching',
  'Mind',
  'Graphic Designer',
  'Graphics (Zac)',
  'Rent',
  'Building Tax',
  'Insurance',
  'Golf Balls',
  'Bay Material & Maintenance',
  'Utilities',
  'Staff Salaries',
  'Operational Support (Bank)',
  'Service Tax (Staff Payout)'
];

export default function ManualEntryModal({
  isOpen,
  onClose,
  type,
  category,
  month,
  existingEntry,
  onSuccess
}: ManualEntryModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: category || '',
    subcategory: ''
  });

  // Update form data when existingEntry changes
  React.useEffect(() => {
    if (existingEntry) {
      setFormData({
        amount: existingEntry.amount?.toString() || '',
        description: existingEntry.description || '',
        category: existingEntry.category || category || '',
        subcategory: existingEntry.subcategory || ''
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: ''
      });
    }
  }, [existingEntry, category]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEditMode = !!existingEntry;

  const { addEntry } = useManualEntries(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.amount || !formData.category) {
        throw new Error('Please fill in all required fields');
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }

      const entryData = {
        type,
        amount: amount,
        description: formData.description,
        category: formData.category,
        date: `${month}-01`, // Always use first day of the month
        subcategory: type === 'expense' ? formData.subcategory : undefined
      };

      await addEntry(entryData);

      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: ''
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to add manual entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    if (existingEntry) {
      setFormData({
        amount: existingEntry.amount?.toString() || '',
        description: existingEntry.description || '',
        category: existingEntry.category || category || '',
        subcategory: existingEntry.subcategory || ''
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: ''
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/manual-entries?type=${type}&month=${month}&category=${encodeURIComponent(formData.category)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete entry');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete manual entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvailableCategories = () => {
    return type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'revenue' ? (
              <DollarSign className="h-5 w-5 text-green-600" />
            ) : (
              <Receipt className="h-5 w-5 text-red-600" />
            )}
{isEditMode ? 'Edit' : 'Add'} {type === 'revenue' ? 'Revenue' : 'Expense'} Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="text"
              value={new Date(month + '-01').toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
              })}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCategories().map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'expense' && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="Optional subcategory"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (THB) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="pl-8"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={`Describe this ${type} entry...`}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete</>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{isEditMode ? 'Update' : 'Add'} {type === 'revenue' ? 'Revenue' : 'Expense'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}