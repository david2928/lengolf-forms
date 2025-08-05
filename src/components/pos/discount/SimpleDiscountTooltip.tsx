'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SimpleDiscountTooltipProps {
  children: React.ReactNode;
  discountAmount: number;
  originalAmount: number;
  className?: string;
}

export function SimpleDiscountTooltip({ 
  children, 
  discountAmount, 
  originalAmount,
  className 
}: SimpleDiscountTooltipProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const finalAmount = originalAmount - discountAmount;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger 
          asChild 
          className="cursor-pointer"
        >
          <span className={className}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-sm p-4 text-base" 
          side="top" 
          sideOffset={8}
        >
          <div className="space-y-2">
            <div className="font-semibold text-base">Discount Applied</div>
            
            <div className="border-t border-gray-200 pt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Original Amount:</span>
                <span className="font-medium">{formatCurrency(originalAmount)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount Amount:</span>
                <span className="font-medium">-{formatCurrency(discountAmount)}</span>
              </div>
              
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                <span>Final Amount:</span>
                <span className="text-green-700">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}