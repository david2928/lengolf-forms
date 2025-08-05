'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrderItem } from '@/types/pos';

interface DiscountDetails {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  application_scope: 'item' | 'receipt';
}

interface DiscountTooltipProps {
  children: React.ReactNode;
  orderItem: OrderItem;
  className?: string;
}

export function DiscountTooltip({ children, orderItem, className }: DiscountTooltipProps) {
  const [discountDetails, setDiscountDetails] = useState<DiscountDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscountDetails = async () => {
    if (!orderItem.applied_discount_id || discountDetails) {
      return; // Don't fetch if no discount applied or already loaded
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch discount details from the database
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

  // Don't render tooltip if no discount is applied
  if (!orderItem.applied_discount_id) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger 
          asChild 
          onMouseEnter={fetchDiscountDetails}
          onClick={fetchDiscountDetails}
          className="cursor-pointer"
        >
          <span className={`${className} touch-manipulation`}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-3 text-sm bg-white border border-gray-300 shadow-lg z-[9999]" 
          side="left" 
          sideOffset={12}
          align="start"
          forceMount
        >
          {loading ? (
            <div className="text-sm">Loading discount details...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : discountDetails ? (
            <div className="space-y-2">
              <div>
                <div className="font-semibold text-sm">{discountDetails.title}</div>
                {discountDetails.description && (
                  <div className="text-xs text-gray-600 mt-1">{discountDetails.description}</div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Discount Type:</span>
                  <span className="font-medium">
                    {discountDetails.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span>Discount Value:</span>
                  <span className="font-medium text-blue-600">{formatDiscountValue(discountDetails)}</span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span>Original Amount:</span>
                  <span className="font-medium">{formatCurrency(calculateOriginalAmount())}</span>
                </div>
                
                <div className="flex justify-between text-xs text-green-600">
                  <span>Discount Amount:</span>
                  <span className="font-medium">-{formatCurrency(getDiscountAmount())}</span>
                </div>
                
                <div className="flex justify-between text-xs font-semibold border-t border-gray-200 pt-1">
                  <span>Final Amount:</span>
                  <span className="text-green-700">{formatCurrency(orderItem.totalPrice)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              Discount applied: -{formatCurrency(getDiscountAmount())}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}