'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Percent, Tag, X } from 'lucide-react';
import { OrderItem } from '@/types/pos';
import { Discount } from '@/types/discount';

interface ItemDiscountButtonProps {
  orderItem: OrderItem;
  onDiscountApplied: (itemId: string, discountId: string, discountDetails?: any) => void;
  onDiscountRemoved: (itemId: string) => void;
  className?: string;
}

export function ItemDiscountButton({ 
  orderItem, 
  onDiscountApplied, 
  onDiscountRemoved, 
  className = '' 
}: ItemDiscountButtonProps) {
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasCheckedEligibility, setHasCheckedEligibility] = useState(false);

  const fetchAvailableDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pos/discounts/available?scope=item&product_id=${orderItem.productId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableDiscounts(data.discounts || []);
      } else {
        console.error('Failed to fetch discounts');
        setAvailableDiscounts([]);
      }
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setAvailableDiscounts([]);
    } finally {
      setLoading(false);
      setHasCheckedEligibility(true);
    }
  }, [orderItem.productId]);

  // Fetch available item-level discounts for this product on mount
  useEffect(() => {
    fetchAvailableDiscounts();
  }, [fetchAvailableDiscounts]);

  // Refresh discounts when dialog opens (in case they changed)
  useEffect(() => {
    if (dialogOpen && hasCheckedEligibility) {
      fetchAvailableDiscounts();
    }
  }, [dialogOpen, hasCheckedEligibility, fetchAvailableDiscounts]);

  const applyDiscount = async (discountId: string) => {
    try {
      const response = await fetch('/api/pos/discounts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discountId,
          application_scope: 'item',
          target_item: {
            id: orderItem.id,
            product_id: orderItem.productId,
            quantity: orderItem.quantity,
            unit_price: orderItem.unitPrice
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Pass the discount calculation details to parent
        onDiscountApplied(orderItem.id, discountId, result);
        setDialogOpen(false);
      } else {
        const error = await response.json();
        alert(`Error applying discount: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('Network error occurred');
    }
  };

  const removeDiscount = () => {
    onDiscountRemoved(orderItem.id);
    if (dialogOpen) {
      setDialogOpen(false);
    }
  };

  const calculateDiscountAmount = (discount: Discount) => {
    const itemTotal = orderItem.unitPrice * orderItem.quantity;
    if (discount.discount_type === 'percentage') {
      return (itemTotal * discount.discount_value) / 100;
    } else {
      return Math.min(discount.discount_value, itemTotal);
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}%`;
    } else {
      return `฿${discount.discount_value}`;
    }
  };

  const hasDiscount = !!orderItem.applied_discount_id;
  const itemTotal = orderItem.unitPrice * orderItem.quantity;
  const hasAvailableDiscounts = availableDiscounts.length > 0;

  // Don't render anything if loading or no discounts available and no current discount
  if (loading) {
    return null; // Could show a small loading spinner if needed
  }
  
  if (!hasDiscount && !hasAvailableDiscounts) {
    return null; // Hide the button completely if no discounts available and none applied
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {hasDiscount ? (
        // When discount is applied, show remove button that directly removes discount
        <Button
          variant="outline"
          size="sm"
          className={`bg-red-50 hover:bg-red-100 text-red-700 border-red-300 ${className}`}
          onClick={removeDiscount}
        >
          <X className="h-3 w-3 mr-1" />
          <span className="text-xs font-medium">Remove</span>
        </Button>
      ) : (
        // When no discount, show add button that opens modal
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className={`bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 ${className}`}
          >
            <Percent className="h-3 w-3 mr-1" />
            <span className="font-medium">Add Discount</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Item Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {hasDiscount && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">Current Discount Applied</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={removeDiscount}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">Loading discounts...</div>
          ) : availableDiscounts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No discounts available for this item
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableDiscounts.map((discount) => (
                <div 
                  key={discount.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => applyDiscount(discount.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{discount.title}</div>
                    {discount.description && (
                      <div className="text-sm text-gray-500">{discount.description}</div>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {formatDiscountValue(discount)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}