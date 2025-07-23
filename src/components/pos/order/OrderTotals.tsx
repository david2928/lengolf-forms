'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Order } from '@/types/pos';
import { Tag, Percent, ChevronDown, ChevronUp } from 'lucide-react';

export interface OrderTotalsProps {
  order: Order | null;
  onDiscountApply?: (discountAmount: number) => void;
  showDiscountButton?: boolean;
  vatRate?: number;
  currency?: string;
  showBreakdown?: boolean;
  className?: string;
}

export const OrderTotals: React.FC<OrderTotalsProps> = ({
  order,
  onDiscountApply,
  showDiscountButton = false,
  vatRate = 0.07, // 7% VAT for Thailand
  currency = 'THB',
  showBreakdown = true,
  className = ''
}) => {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');

  // Calculate order totals
  const calculations = useMemo(() => {
    if (!order || !order.items || order.items.length === 0) {
      return {
        subtotal: 0,
        itemCount: 0,
        totalQuantity: 0,
        modifiersTotal: 0,
        discountAmount: 0,
        subtotalAfterDiscount: 0,
        vatAmount: 0,
        total: 0,
        itemBreakdown: []
      };
    }

    const itemCount = order.items.length;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate base subtotal and modifiers
    let subtotal = 0;
    let modifiersTotal = 0;
    const itemBreakdown = order.items.map(item => {
      const basePrice = item.unitPrice * item.quantity;
      const itemModifiersTotal = item.totalPrice - basePrice;
      
      subtotal += basePrice;
      modifiersTotal += itemModifiersTotal;
      
      return {
        id: item.id,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        basePrice,
        modifiersTotal: itemModifiersTotal,
        totalPrice: item.totalPrice
      };
    });

    // Apply discount
    const discountAmount = order.discountAmount || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal + modifiersTotal - discountAmount);
    
    // Calculate VAT
    const vatAmount = subtotalAfterDiscount * vatRate;
    const total = subtotalAfterDiscount + vatAmount;

    return {
      subtotal,
      itemCount,
      totalQuantity,
      modifiersTotal,
      discountAmount,
      subtotalAfterDiscount,
      vatAmount,
      total,
      itemBreakdown
    };
  }, [order, vatRate]);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }, [currency]);

  // Handle discount application
  const handleDiscountApply = useCallback(() => {
    const inputValue = parseFloat(discountInput);
    if (isNaN(inputValue) || inputValue < 0) {
      return;
    }

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (calculations.subtotal + calculations.modifiersTotal) * (inputValue / 100);
    } else {
      discountAmount = inputValue;
    }

    onDiscountApply?.(discountAmount);
    setShowDiscountModal(false);
    setDiscountInput('');
  }, [discountInput, discountType, calculations, onDiscountApply]);

  // Toggle detailed breakdown
  const toggleDetailedBreakdown = useCallback(() => {
    setShowDetailedBreakdown(!showDetailedBreakdown);
  }, [showDetailedBreakdown]);

  if (!order || calculations.itemCount === 0) {
    return null;
  }

  return (
    <div className={`order-totals bg-white ${className}`}>
      <div className="p-6 space-y-4">
        {/* Quick Summary */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <span className="text-base text-gray-600">
              {calculations.totalQuantity} items
            </span>
            {showBreakdown && (
              <button
                onClick={toggleDetailedBreakdown}
                className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700"
              >
                <span>{showDetailedBreakdown ? 'Hide' : 'Show'} details</span>
                {showDetailedBreakdown ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(calculations.total)}
            </span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {showBreakdown && showDetailedBreakdown && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            {/* Item Breakdown */}
            {calculations.itemBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-600 truncate">
                    {item.name} × {item.quantity}
                  </span>
                  {item.modifiersTotal > 0 && (
                    <span className="text-gray-500 ml-1">
                      (+{formatCurrency(item.modifiersTotal)})
                    </span>
                  )}
                </div>
                <span className="text-gray-700 font-medium">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-3 space-y-2">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-base py-1">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-700">
                  {formatCurrency(calculations.subtotal)}
                </span>
              </div>

              {/* Modifiers Total */}
              {calculations.modifiersTotal > 0 && (
                <div className="flex items-center justify-between text-base py-1">
                  <span className="text-gray-600">Customizations</span>
                  <span className="text-gray-700">
                    {formatCurrency(calculations.modifiersTotal)}
                  </span>
                </div>
              )}

              {/* Discount */}
              {calculations.discountAmount > 0 && (
                <div className="flex items-center justify-between text-base py-1">
                  <span className="text-green-600">Discount</span>
                  <span className="text-green-600">
                    -{formatCurrency(calculations.discountAmount)}
                  </span>
                </div>
              )}

              {/* VAT */}
              <div className="flex items-center justify-between text-base py-1">
                <span className="text-gray-600">
                  VAT ({(vatRate * 100).toFixed(0)}%)
                </span>
                <span className="text-gray-700">
                  {formatCurrency(calculations.vatAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Discount Button */}
        {showDiscountButton && onDiscountApply && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowDiscountModal(true)}
              className="flex items-center space-x-2 text-base text-indigo-600 hover:text-indigo-700 font-medium py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Tag className="h-4 w-4" />
              <span>Apply Discount</span>
            </button>
          </div>
        )}
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowDiscountModal(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Apply Discount
                </h3>
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="amount"
                        checked={discountType === 'amount'}
                        onChange={(e) => setDiscountType(e.target.value as 'amount')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Fixed Amount</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="percentage"
                        checked={discountType === 'percentage'}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Percentage</span>
                    </label>
                  </div>
                </div>

                {/* Discount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {discountType === 'amount' ? 'Discount Amount' : 'Discount Percentage'}
                  </label>
                  <div className="relative">
                    {discountType === 'amount' && (
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        ฿
                      </span>
                    )}
                    <input
                      type="number"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder={discountType === 'amount' ? '0.00' : '0'}
                      min="0"
                      max={discountType === 'percentage' ? '100' : undefined}
                      step={discountType === 'amount' ? '0.01' : '1'}
                      className={`
                        w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                        ${discountType === 'amount' ? 'pl-8' : ''}
                      `}
                      autoFocus
                    />
                    {discountType === 'percentage' && (
                      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Preview */}
                {discountInput && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Preview:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(calculations.subtotal + calculations.modifiersTotal)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>
                          -{formatCurrency(
                            discountType === 'percentage'
                              ? (calculations.subtotal + calculations.modifiersTotal) * (parseFloat(discountInput) / 100)
                              : parseFloat(discountInput) || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>New Total:</span>
                        <span>
                          {formatCurrency(
                            Math.max(0, 
                              calculations.subtotal + calculations.modifiersTotal - 
                              (discountType === 'percentage'
                                ? (calculations.subtotal + calculations.modifiersTotal) * (parseFloat(discountInput) / 100)
                                : parseFloat(discountInput) || 0
                              )
                            ) * (1 + vatRate)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscountApply}
                  disabled={!discountInput || parseFloat(discountInput) <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};