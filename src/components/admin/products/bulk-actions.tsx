'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Settings, 
  DollarSign, 
  Archive, 
  Trash2, 
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  Package,
  Eye,
  EyeOff
} from 'lucide-react';
import { Category } from '@/types/product-management';
import { useBulkOperations } from '@/hooks/use-products';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface BulkActionsProps {
  selectedProducts: string[];
  categories: Category[];
  onClearSelection: () => void;
  onRefresh: () => void;
  className?: string;
}

interface PriceUpdateDialogProps {
  selectedProducts: string[];
  onUpdate: (updates: any, reason?: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

function PriceUpdateDialog({ 
  selectedProducts, 
  onUpdate, 
  isOpen, 
  onClose, 
  isLoading 
}: PriceUpdateDialogProps) {
  const [updateType, setUpdateType] = useState<'percentage' | 'fixed' | 'set'>('percentage');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value || isNaN(parseFloat(value))) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number",
        variant: "destructive"
      });
      return;
    }

    try {
      let updates: any = {};
      
      if (updateType === 'set') {
        updates.price = parseFloat(value);
      } else {
        updates.price_adjustment = {
          type: updateType,
          value: parseFloat(value)
        };
      }

      await onUpdate(updates, reason || undefined);
      toast({
        title: "Prices updated",
        description: `Successfully updated ${selectedProducts.length} products`,
      });
      onClose();
      setValue('');
      setReason('');
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update prices",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Prices</DialogTitle>
          <DialogDescription>
            Update prices for {selectedProducts.length} selected products.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Update Type</Label>
            <Select value={updateType} onValueChange={(value: any) => setUpdateType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Change</SelectItem>
                <SelectItem value="fixed">Fixed Amount Change</SelectItem>
                <SelectItem value="set">Set Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {updateType === 'percentage' ? 'Percentage (%)' :
               updateType === 'fixed' ? 'Amount (฿)' : 'New Price (฿)'}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                updateType === 'percentage' ? '10' :
                updateType === 'fixed' ? '50' : '299'
              }
              step="0.01"
              required
            />
            {updateType === 'percentage' && (
              <p className="text-xs text-gray-500">
                Positive values increase price, negative values decrease
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Price adjustment due to..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Prices'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryUpdateDialogProps {
  selectedProducts: string[];
  categories: Category[];
  onUpdate: (categoryId: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

function CategoryUpdateDialog({ 
  selectedProducts, 
  categories, 
  onUpdate, 
  isOpen, 
  onClose, 
  isLoading 
}: CategoryUpdateDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      toast({
        title: "No category selected",
        description: "Please select a category",
        variant: "destructive"
      });
      return;
    }

    try {
      await onUpdate(selectedCategory);
      toast({
        title: "Category updated",
        description: `Successfully updated ${selectedProducts.length} products`,
      });
      onClose();
      setSelectedCategory('');
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const subCategories = categories.filter(c => c.parent_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Category</DialogTitle>
          <DialogDescription>
            Move {selectedProducts.length} selected products to a new category.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {subCategories
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedCategory}>
              {isLoading ? 'Updating...' : 'Change Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BulkActions({ 
  selectedProducts, 
  categories, 
  onClearSelection, 
  onRefresh,
  className 
}: BulkActionsProps) {
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { 
    bulkUpdatePrices, 
    bulkUpdateCategory, 
    bulkUpdate,
    bulkDelete, 
    isProcessing 
  } = useBulkOperations();

  if (selectedProducts.length === 0) {
    return null;
  }

  const handlePriceUpdate = async (updates: any, reason?: string) => {
    await bulkUpdatePrices(selectedProducts, updates, reason);
    onRefresh();
  };

  const handleCategoryUpdate = async (categoryId: string) => {
    await bulkUpdateCategory(selectedProducts, categoryId);
    onRefresh();
  };

  const handleStatusUpdate = async (isActive: boolean) => {
    try {
      await bulkUpdate({
        product_ids: selectedProducts,
        updates: { is_active: isActive },
        reason: `Bulk ${isActive ? 'activation' : 'deactivation'}`
      });
      toast({
        title: `Products ${isActive ? 'activated' : 'deactivated'}`,
        description: `Successfully updated ${selectedProducts.length} products`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleVisibilityUpdate = async (showInStaffUI: boolean) => {
    try {
      await bulkUpdate({
        product_ids: selectedProducts,
        updates: { show_in_staff_ui: showInStaffUI },
        reason: `Bulk visibility ${showInStaffUI ? 'show' : 'hide'}`
      });
      toast({
        title: `Products ${showInStaffUI ? 'shown' : 'hidden'}`,
        description: `Successfully updated ${selectedProducts.length} products`,
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update visibility",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await bulkDelete(selectedProducts);
      toast({
        title: "Products deleted",
        description: `Successfully deleted ${selectedProducts.length} products`,
      });
      onRefresh();
      onClearSelection();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete products",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className={cn('border-blue-200 bg-blue-50/50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-sm">
                {selectedProducts.length} selected
              </Badge>
              <span className="text-sm text-gray-600">
                Bulk actions available
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPriceDialogOpen(true)}
                disabled={isProcessing}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Update Prices
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryDialogOpen(true)}
                disabled={isProcessing}
              >
                <Archive className="h-4 w-4 mr-1" />
                Change Category
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isProcessing}>
                    <Settings className="h-4 w-4 mr-1" />
                    More Actions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleStatusUpdate(true)}>
                    <Package className="mr-2 h-4 w-4" />
                    Activate Products
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusUpdate(false)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Deactivate Products
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleVisibilityUpdate(true)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Show in Staff UI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleVisibilityUpdate(false)}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide from Staff UI
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Products
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PriceUpdateDialog
        selectedProducts={selectedProducts}
        onUpdate={handlePriceUpdate}
        isOpen={priceDialogOpen}
        onClose={() => setPriceDialogOpen(false)}
        isLoading={isProcessing}
      />

      <CategoryUpdateDialog
        selectedProducts={selectedProducts}
        categories={categories}
        onUpdate={handleCategoryUpdate}
        isOpen={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        isLoading={isProcessing}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Products
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProducts.length} selected products? 
              This will deactivate them but preserve the data for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete Products'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}