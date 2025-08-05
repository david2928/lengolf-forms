'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OrderItem } from '@/types/pos';

interface DiscountDetails {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  application_scope: 'item' | 'receipt';
}

interface TouchFriendlyDiscountTooltipProps {
  children: React.ReactNode;
  orderItem: OrderItem;
  className?: string;
}

export function TouchFriendlyDiscountTooltip({ children, orderItem, className }: TouchFriendlyDiscountTooltipProps) {
  const [discountDetails, setDiscountDetails] = useState<DiscountDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDiscountDetails = async () => {
    if (!orderItem.applied_discount_id || discountDetails) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pos/discounts/${orderItem.applied_discount_id}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiscountDetails(data.discount);
      } else {
        setError('Failed to load discount details');
      }
    } catch (err) {
      console.error('Error fetching discount details:', err);
      setError('Error loading discount details');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerClick = () => {
    setIsOpen(true);
    fetchDiscountDetails();
  };

  const formatDiscountValue = (discount: DiscountDetails) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}%`;
    } else {
      return `฿${discount.discount_value}`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateOriginalAmount = () => {
    return orderItem.unitPrice * orderItem.quantity;
  };

  const getDiscountAmount = () => {
    return orderItem.discount_amount || 0;
  };

  // Don't render if no discount is applied
  if (!orderItem.applied_discount_id) {
    return <>{children}</>;
  }

  return (
    <>
      <span 
        className={`${className} cursor-pointer touch-manipulation`}
        onClick={handleTriggerClick}
      >
        {children}
      </span>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6">
          {loading ? (
            <div className="text-center py-4">Loading discount details...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">{error}</div>
          ) : discountDetails ? (
            <div className="space-y-3">
              <div>
                <div className="font-semibold text-base">{discountDetails.title}</div>
                {discountDetails.description && (
                  <div className="text-sm text-gray-600 mt-1">{discountDetails.description}</div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div className="flex justify-between text-base">
                  <span>Discount Type:</span>
                  <span className="font-medium">
                    {discountDetails.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                  </span>
                </div>
                
                <div className="flex justify-between text-base">
                  <span>Discount Value:</span>
                  <span className="font-medium text-blue-600">{formatDiscountValue(discountDetails)}</span>
                </div>
                
                <div className="flex justify-between text-base">
                  <span>Original Amount:</span>
                  <span className="font-medium">{formatCurrency(calculateOriginalAmount())}</span>
                </div>
                
                <div className="flex justify-between text-base text-green-600">
                  <span>Discount Amount:</span>
                  <span className="font-medium">-{formatCurrency(getDiscountAmount())}</span>
                </div>
                
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-3">
                  <span>Final Amount:</span>
                  <span className="text-green-700">{formatCurrency(orderItem.totalPrice)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="font-semibold text-base mb-2">Discount Applied</div>
              <div className="text-sm">
                Discount Amount: -{formatCurrency(getDiscountAmount())}
              </div>
              <div className="text-sm">
                Final Amount: {formatCurrency(orderItem.totalPrice)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}