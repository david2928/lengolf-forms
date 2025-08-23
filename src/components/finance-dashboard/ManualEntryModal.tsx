import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Receipt, Calendar, Repeat } from 'lucide-react';
import { useManualEntries } from '@/hooks/useFinanceDashboard';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'revenue' | 'cogs';
  category: string;
  month: string;
  existingEntry?: any;
  onSuccess?: () => void;
}

// P&L Category Structure based on existing data
const P_AND_L_STRUCTURE = {
  'Fixed Cost': {
    'Facilities': ['Rent', 'Insurance', 'Building Tax'],
    'Equipment': ['Golf Balls', 'Bay Material & Maintenance'],
    'Other': ['Other Fixed Cost']
  },
  'Variable Cost': {
    'Marketing': ['Google Ads', 'Meta Ads', 'TikTok', 'KOL+Video', 'Graphics (Zac)', 'Mind', 'Marketing Agency', 'Graphic Designer'],
    'Operations': ['Utilities', 'Pre-Order Food', 'Coaching'],
    'Other': ['Other Variable Cost']
  },
  'Salaries': {
    'Base Salaries': ['Staff Salaries'],
    'Support & Tax': ['Operational Support (Bank)', 'Service Tax (Staff Payout)'],
    'Other': ['Other Personnel Cost']
  }
};

const REVENUE_CATEGORIES = [
  'Events',
  'ClassPass', 
  'Gowabi',
  'Coaching',
  'Special Promotions',
  'Other Revenue'
];

const COGS_CATEGORIES = [
  'Catering',
  'Drinks',
  'Others'
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
    subcategory: '',
    isRecurring: false,
    startDate: month + '-01',
    endDate: '',
    targetMonth: month,
    notes: ''
  });

  // Update form data when existingEntry changes
  React.useEffect(() => {
    if (existingEntry) {
      setFormData({
        amount: existingEntry.amount?.toString() || '',
        description: existingEntry.description || '',
        category: existingEntry.category || category || '',
        subcategory: existingEntry.subcategory || '',
        isRecurring: existingEntry.isRecurring || false,
        startDate: existingEntry.startDate || (month + '-01'),
        endDate: existingEntry.endDate || '',
        targetMonth: month,
        notes: existingEntry.notes || ''
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: '',
        isRecurring: false,
        startDate: month + '-01',
        endDate: '',
        targetMonth: month,
        notes: ''
      });
    }
  }, [existingEntry, category, month]);
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
      if (isNaN(amount) || amount === 0) {
        throw new Error('Please enter a valid non-zero amount');
      }

      const entryData = {
        type: type === 'cogs' ? 'expense' : type, // COGS entries are stored as expenses in the database
        amount: amount,
        description: formData.description,
        category: formData.category,
        subcategory: (type as string) === 'expense' ? formData.subcategory : undefined,
        isRecurring: formData.isRecurring,
        date: formData.isRecurring ? formData.startDate : `${formData.targetMonth}-01`,
        startDate: formData.isRecurring ? formData.startDate : undefined,
        endDate: formData.isRecurring && formData.endDate ? formData.endDate : undefined
      };

      await addEntry(entryData);

      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: '',
        isRecurring: false,
        startDate: month + '-01',
        endDate: '',
        targetMonth: month,
        notes: ''
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
        subcategory: existingEntry.subcategory || '',
        isRecurring: existingEntry.isRecurring || false,
        startDate: existingEntry.startDate || (month + '-01'),
        endDate: existingEntry.endDate || '',
        targetMonth: month,
        notes: existingEntry.notes || ''
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        category: category || '',
        subcategory: '',
        isRecurring: false,
        startDate: month + '-01',
        endDate: '',
        targetMonth: month,
        notes: ''
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    
    setIsDeleting(true);
    setError(null);

    try {
      const apiType = type === 'cogs' ? 'expense' : type; // COGS entries are stored as expenses
      const response = await fetch(`/api/finance/manual-entries?type=${apiType}&month=${month}&category=${encodeURIComponent(formData.category)}`, {
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
    if (type === 'revenue') return REVENUE_CATEGORIES;
    if (type === 'cogs') return COGS_CATEGORIES;
    return Object.keys(P_AND_L_STRUCTURE);
  };

  const getAvailableSubcategories = () => {
    if (type === 'revenue' || type === 'cogs' || !formData.category) return [];
    const categoryData = P_AND_L_STRUCTURE[formData.category as keyof typeof P_AND_L_STRUCTURE];
    return categoryData ? Object.keys(categoryData) : [];
  };

  const getAvailableDescriptions = () => {
    if (type === 'revenue' || type === 'cogs' || !formData.category || !formData.subcategory) return [];
    const categoryData = P_AND_L_STRUCTURE[formData.category as keyof typeof P_AND_L_STRUCTURE];
    return categoryData?.[formData.subcategory as keyof typeof categoryData] || [];
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
{isEditMode ? 'Edit' : 'Add'} {type === 'revenue' ? 'Revenue' : 'COGS'} Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cost Type Toggle */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Label htmlFor="cost-type" className="font-medium">Cost Type</Label>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${!formData.isRecurring ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  One-time
                </span>
                <Switch
                  id="cost-type"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
                />
                <Repeat className="h-4 w-4 text-gray-600" />
                <span className={`text-sm ${formData.isRecurring ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  Recurring
                </span>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          {formData.isRecurring ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target-month">Target Month *</Label>
              <Input
                id="target-month"
                type="month"
                value={formData.targetMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, targetMonth: e.target.value }))}
                required
              />
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                category: value, 
                subcategory: '', // Reset subcategory when category changes
                description: '' // Reset description when category changes
              }))}
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

          {/* Subcategory Selection (for expenses only - not for revenue or cogs) */}
          {type !== 'revenue' && type !== 'cogs' && formData.category && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory *</Label>
              <Select
                value={formData.subcategory}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  subcategory: value,
                  description: '' // Reset description when subcategory changes
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubcategories().map((subcat) => (
                    <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description Selection (for expenses with subcategory) */}
          {type !== 'revenue' && type !== 'cogs' && formData.category && formData.subcategory && (
            <div className="space-y-2">
              <Label htmlFor="description-select">Description *</Label>
              <Select
                value={formData.description}
                onValueChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select description" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableDescriptions().map((desc: string) => (
                    <SelectItem key={desc} value={desc}>{desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="pl-8"
                placeholder="0.00"
                required
              />
            </div>
            {type === 'cogs' && (
              <p className="text-xs text-muted-foreground">
                Use negative values for cost reductions, refunds, or credits.
              </p>
            )}
          </div>

          {/* Notes/Additional Description */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={`Optional additional notes about this ${type === 'revenue' ? 'revenue' : 'COGS'}...`}
              className="min-h-[60px]"
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
                <>{isEditMode ? 'Update' : 'Add'} {type === 'revenue' ? 'Revenue' : 'COGS'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}