'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BillSplit, PaymentMethod } from '@/types/payment';
import { Order } from '@/types/pos';
import { PAYMENT_METHOD_CONFIGS, PAYMENT_METHOD_ORDER } from '@/config/payment-methods';
import { Check, AlertCircle, Users, Receipt, CreditCard } from 'lucide-react';

interface SplitSummaryProps {
  billSplit: BillSplit | null;
  order: Order;
  isValid: boolean;
  errors: string[];
  onConfirm: () => void;
  onBack: () => void;
  onUpdatePaymentMethod: (splitId: string, method: PaymentMethod) => void;
}

export const SplitSummary: React.FC<SplitSummaryProps> = ({
  billSplit,
  order,
  isValid,
  errors,
  onConfirm,
  onBack,
  onUpdatePaymentMethod
}) => {
  
  if (!billSplit) {
    return (
      <div className="text-center text-gray-500">
        No split configuration found
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getSplitTypeDisplay = () => {
    switch (billSplit.type) {
      case 'even':
        return 'Even Split';
      case 'by_item':
        return 'Split by Items';
      case 'by_amount':
        return 'Custom Amount Split';
      default:
        return 'Unknown Split Type';
    }
  };

  const getItemDetails = (itemId: string) => {
    return order.items.find(item => item.id === itemId);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const config = PAYMENT_METHOD_CONFIGS[method];
    return config.displayName;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Bill Split</h3>
        <p className="text-gray-600">
          Review the split details and payment methods before proceeding
        </p>
      </div>

      {/* Split Type and Summary */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">{getSplitTypeDisplay()}</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-900">{billSplit.splits.length}</div>
            <div className="text-sm text-blue-700">People</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">{formatCurrency(billSplit.totalAmount)}</div>
            <div className="text-sm text-blue-700">Total Amount</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {new Set(billSplit.splits.map(s => s.paymentMethod)).size}
            </div>
            <div className="text-sm text-blue-700">Payment Methods</div>
          </div>
        </div>
      </div>

      {/* Split Details */}
      <div className="space-y-4">
        <h4 className="font-medium flex items-center space-x-2">
          <Receipt className="h-4 w-4" />
          <span>Split Details</span>
        </h4>

        <div className="space-y-3">
          {billSplit.splits.map((split, index) => (
            <div key={split.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{split.customerInfo}</div>
                    <div className="text-sm text-gray-600">
                      {split.items.length > 0 ? `${split.items.length} items` : 'Custom amount'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{formatCurrency(split.amount)}</div>
                  <div className="text-sm text-gray-600">
                    {((split.amount / billSplit.totalAmount) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="flex items-center space-x-3">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Payment Method
                  </label>
                  <Select
                    value={split.paymentMethod}
                    onValueChange={(value) => onUpdatePaymentMethod(split.id, value as PaymentMethod)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_ORDER.map(method => {
                        const config = PAYMENT_METHOD_CONFIGS[method];
                        return (
                          <SelectItem key={method} value={method}>
                            {config.displayName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items (for item-based splits) */}
              {split.items.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Items:</div>
                  <div className="space-y-1">
                    {split.items.map(itemId => {
                      const item = getItemDetails(itemId);
                      if (!item) return null;

                      return (
                        <div
                          key={itemId}
                          className="flex justify-between items-center bg-gray-50 rounded p-2 text-sm"
                        >
                          <div>
                            <span className="font-medium">{item.productName}</span>
                            <span className="text-gray-600 ml-2">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Payment Method Summary</h4>
        <div className="space-y-2">
          {Object.entries(
            billSplit.splits.reduce((acc, split) => {
              const method = split.paymentMethod;
              if (!acc[method]) {
                acc[method] = { amount: 0, count: 0 };
              }
              acc[method].amount += split.amount;
              acc[method].count += 1;
              return acc;
            }, {} as Record<PaymentMethod, { amount: number; count: number }>)
          ).map(([method, data]) => (
            <div key={method} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${PAYMENT_METHOD_CONFIGS[method as PaymentMethod].color}`} />
                <span className="text-sm font-medium">
                  {getPaymentMethodIcon(method as PaymentMethod)}
                </span>
                <span className="text-sm text-gray-600">
                  ({data.count} {data.count === 1 ? 'person' : 'people'})
                </span>
              </div>
              <span className="font-medium">{formatCurrency(data.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Status */}
      <div className={`rounded-lg p-4 ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-start space-x-3">
          {isValid ? (
            <Check className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            {isValid ? (
              <div>
                <div className="font-medium text-green-900">Split is ready to process</div>
                <div className="text-sm text-green-700 mt-1">
                  All amounts are properly allocated and payment methods are selected.
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium text-red-900">Issues found with split</div>
                <div className="space-y-1 mt-2">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Configuration
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={!isValid}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Proceed to Payment
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 rounded-lg p-3">
        <h4 className="font-medium text-yellow-900 mb-1">Next Steps</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Each person will pay using their selected payment method</li>
          <li>• You can process payments individually or together</li>
          <li>• Split details will be included in the receipt</li>
          <li>• All payment methods support the split amounts shown</li>
        </ul>
      </div>
    </div>
  );
};