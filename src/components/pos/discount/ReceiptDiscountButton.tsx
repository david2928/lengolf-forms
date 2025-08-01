'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Receipt, Tag, Percent } from 'lucide-react';
import { OrderItem } from '@/types/pos';
import { Discount } from '@/types/discount';

interface ReceiptDiscountButtonProps {
  orderItems: OrderItem[];
  appliedDiscountId?: string | null;
  discountAmount?: number;
  onDiscountApplied: (discountId: string) => void;
  onDiscountRemoved: () => void;
  className?: string;
}

export function ReceiptDiscountButton({ 
  orderItems, 
  appliedDiscountId,
  discountAmount = 0,
  onDiscountApplied, 
  onDiscountRemoved, 
  className = '' 
}: ReceiptDiscountButtonProps) {
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch available receipt-level discounts
  useEffect(() => {
    if (dialogOpen) {
      fetchAvailableDiscounts();
    }
  }, [dialogOpen]);

  // Fetch applied discount details when appliedDiscountId changes
  useEffect(() => {
    if (appliedDiscountId && !appliedDiscount) {
      fetchAppliedDiscountDetails(appliedDiscountId);
    } else if (!appliedDiscountId) {
      setAppliedDiscount(null);
    }
  }, [appliedDiscountId]);

  const fetchAvailableDiscounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/discounts/available?scope=receipt');
      if (response.ok) {
        const data = await response.json();
        setAvailableDiscounts(data.discounts || []);
        
        // If we have an applied discount ID but no applied discount details, find it
        if (appliedDiscountId && !appliedDiscount) {
          const applied = (data.discounts || []).find((d: Discount) => d.id === appliedDiscountId);
          if (applied) {
            setAppliedDiscount(applied);
          }
        }
      } else {
        console.error('Failed to fetch discounts');
        setAvailableDiscounts([]);
      }
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setAvailableDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedDiscountDetails = async (discountId: string) => {
    try {
      const response = await fetch('/api/pos/discounts/available?scope=receipt');
      if (response.ok) {
        const data = await response.json();
        const discount = (data.discounts || []).find((d: Discount) => d.id === discountId);
        if (discount) {
          setAppliedDiscount(discount);
        }
      }
    } catch (error) {
      console.error('Error fetching applied discount details:', error);
    }
  };

  const applyDiscount = async (discountId: string) => {
    try {
      const response = await fetch('/api/pos/discounts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discountId,
          application_scope: 'receipt',
          order_items: orderItems.map(item => ({
            id: item.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Find and store the applied discount details
        const discount = availableDiscounts.find(d => d.id === discountId);
        setAppliedDiscount(discount || null);
        onDiscountApplied(discountId);
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
    setAppliedDiscount(null);
    onDiscountRemoved();
    setDialogOpen(false);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateDiscountAmount = (discount: Discount) => {
    const subtotal = calculateSubtotal();
    if (discount.discount_type === 'percentage') {
      return (subtotal * discount.discount_value) / 100;
    } else {
      return Math.min(discount.discount_value, subtotal);
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}%`;
    } else {
      return `฿${discount.discount_value}`;
    }
  };

  const hasDiscount = !!appliedDiscountId;
  const subtotal = calculateSubtotal();
  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  if (orderItems.length === 0) {
    return null; // Don't show if no items
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasDiscount ? "default" : "outline"}
          size="sm"
          className={`w-full ${hasDiscount ? 'bg-green-600 hover:bg-green-700' : ''} ${className}`}
        >
          {hasDiscount ? (
            <>
              <Tag className="h-4 w-4 mr-2" />
              <span>Receipt Discount Applied</span>
              {appliedDiscount && (
                <span className="ml-2">
                  ({appliedDiscount.discount_type === 'percentage' ? 
                    `${appliedDiscount.discount_value}%` : 
                    `฿${appliedDiscount.discount_value}`})
                </span>
              )}
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4 mr-2" />
              Apply Receipt Discount
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {hasDiscount && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-green-800">Receipt Discount Applied</span>
                  {appliedDiscount && (
                    <div className="text-sm text-green-600 mt-1">
                      {appliedDiscount.discount_type === 'percentage' ? (
                        <span>{appliedDiscount.discount_value}% off total</span>
                      ) : (
                        <span>฿{appliedDiscount.discount_value} off</span>
                      )}
                      {discountAmount > 0 && (
                        <span className="ml-2">(-฿{discountAmount.toFixed(0)})</span>
                      )}
                    </div>
                  )}
                </div>
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
              No receipt discounts available
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