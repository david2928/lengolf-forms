'use client';

import React, { useState, useEffect } from 'react';
import { Discount } from '@/types/discount';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export function AdminDiscountList() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    actionLabel: string;
    actionVariant?: 'default' | 'destructive';
  }>({ open: false, title: '', description: '', action: () => {}, actionLabel: '' });
  const { toast } = useToast();

  const showConfirmDialog = (title: string, description: string, action: () => void, actionLabel: string, actionVariant: 'default' | 'destructive' = 'default') => {
    setConfirmDialog({
      open: true,
      title,
      description,
      action,
      actionLabel,
      actionVariant
    });
  };

  const handleConfirmAction = () => {
    confirmDialog.action();
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/admin/discounts');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscountStatus = async (discountId: string, currentStatus: boolean) => {
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...discount,
          is_active: !currentStatus 
        })
      });

      if (response.ok) {
        fetchDiscounts(); // Refresh list
        toast({
          title: 'Success',
          description: `Discount "${discount.title}" has been ${!currentStatus ? 'activated' : 'deactivated'}.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update discount status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error toggling discount status:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    }
  };

  const deleteDiscount = async (discountId: string) => {
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDiscounts(); // Refresh list
        toast({
          title: 'Success',
          description: `Discount "${discount.title}" has been deleted.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete discount',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    }
  };

  const filteredDiscounts = discounts.filter(discount => {
    if (filter === 'active') return discount.is_active;
    if (filter === 'inactive') return !discount.is_active;
    return true;
  });

  const isExpired = (discount: Discount) => {
    if (discount.availability_type === 'always') return false;
    return discount.valid_until && new Date(discount.valid_until) < new Date();
  };

  if (loading) {
    return <div className="text-center py-4">Loading discounts...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter discounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Discounts</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Validity</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiscounts.map((discount) => {
              const isInactive = !discount.is_active || isExpired(discount);
              return (
              <tr key={discount.id} className={`border-t ${isInactive ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3">
                  <div>
                    <div className={`font-medium ${isInactive ? 'text-gray-400' : ''}`}>
                      {discount.title}
                      {isInactive && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
                    </div>
                    {discount.description && (
                      <div className={`text-sm ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>{discount.description}</div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 ${isInactive ? 'text-gray-400' : ''}`}>
                  <span className="capitalize">{discount.discount_type.replace('_', ' ')}</span>
                </td>
                <td className={`px-4 py-3 ${isInactive ? 'text-gray-400' : ''}`}>
                  {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `$${discount.discount_value}`}
                </td>
                <td className={`px-4 py-3 ${isInactive ? 'text-gray-400' : ''}`}>
                  <span className="capitalize">{discount.application_scope}</span>
                  {discount.application_scope === 'item' && discount.discount_product_eligibility && (
                    <div className={`text-xs ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                      {discount.discount_product_eligibility.length} products
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    discount.is_active && !isExpired(discount)
                      ? 'bg-green-100 text-green-800' 
                      : isExpired(discount)
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isExpired(discount) ? 'Expired' : discount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {discount.availability_type === 'always' ? (
                    'Always'
                  ) : (
                    <div className="text-sm">
                      <div>From: {new Date(discount.valid_from!).toLocaleDateString()}</div>
                      <div>Until: {new Date(discount.valid_until!).toLocaleDateString()}</div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/admin/discounts/${discount.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-800"
                      onClick={() => showConfirmDialog(
                        `${discount.is_active ? 'Deactivate' : 'Activate'} Discount`,
                        `Are you sure you want to ${discount.is_active ? 'deactivate' : 'activate'} the discount "${discount.title}"?${discount.is_active ? ' This will prevent it from being applied to new orders.' : ''}`,
                        () => toggleDiscountStatus(discount.id, discount.is_active),
                        discount.is_active ? 'Deactivate' : 'Activate'
                      )}
                    >
                      {discount.is_active ? 'Deactivate' : 'Activate'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => showConfirmDialog(
                        'Delete Discount',
                        `Are you sure you want to permanently delete the discount "${discount.title}"? This action cannot be undone.${discount.is_active ? '\n\n⚠️ Warning: This discount is currently active and may be in use.' : ''}`,
                        () => deleteDiscount(discount.id),
                        'Delete Permanently',
                        'destructive'
                      )}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredDiscounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No discounts found
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.actionVariant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
            >
              {confirmDialog.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}