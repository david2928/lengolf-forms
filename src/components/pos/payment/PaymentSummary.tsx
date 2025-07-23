'use client';

import React from 'react';
import { Order } from '@/types/pos';
import { PaymentAllocation } from '@/types/payment';
import { PAYMENT_METHOD_CONFIGS } from '@/config/payment-methods';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Receipt, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PaymentSummaryProps {
  order: Order;
  paymentAllocations: PaymentAllocation[];
  customerName?: string;
  tableNumber?: string;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing?: boolean;
  error?: string | null;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  order,
  paymentAllocations,
  customerName,
  tableNumber,
  onConfirm,
  onBack,
  isProcessing = false,
  error = null
}) => {
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTotalPaymentAmount = (): number => {
    return paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  };

  const isValidPayment = (): boolean => {
    const totalPayment = getTotalPaymentAmount();
    const difference = Math.abs(totalPayment - order.totalAmount);
    return difference < 0.01; // Allow 1 satang difference due to rounding
  };

  const getPaymentMethodIcon = (method: string) => {
    // Simple icon mapping based on payment method
    if (method.includes('Cash')) return '💵';
    if (method.includes('Visa')) return '💳';
    if (method.includes('Mastercard')) return '💳';
    if (method.includes('PromptPay')) return '📱';
    if (method.includes('Alipay')) return '📱';
    return '💳';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="rounded-full bg-blue-600 p-3 text-white">
          <Receipt className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Payment Summary</h3>
          <p className="text-sm text-gray-600">Review and confirm payment details</p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-900">Order Details</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Order Number:</span>
            <span className="font-medium">#{order.orderNumber}</span>
          </div>
          
          {tableNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Table:</span>
              <span className="font-medium">{tableNumber}</span>
            </div>
          )}
          
          {customerName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium">{customerName}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Items:</span>
            <span className="font-medium">{order.items.length} items</span>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Items</h4>
        <div className="border rounded-lg divide-y divide-gray-200">
          {order.items.map((item, index) => (
            <div key={index} className="p-3 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium text-sm">{item.productName}</div>
                <div className="text-xs text-gray-500">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </div>
              </div>
              <div className="text-sm font-medium">
                {formatCurrency(item.totalPrice)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-blue-900">Financial Summary</h4>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-800">Subtotal:</span>
            <span className="text-blue-900 font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-800">VAT (7%):</span>
            <span className="text-blue-900 font-medium">{formatCurrency(order.vatAmount)}</span>
          </div>
          
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-blue-800">Discount:</span>
              <span className="text-blue-900 font-medium">-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          
          <Separator className="my-2" />
          
          <div className="flex justify-between text-base font-semibold">
            <span className="text-blue-900">Total Amount:</span>
            <span className="text-blue-900">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Payment Method{paymentAllocations.length > 1 ? 's' : ''}</h4>
        
        <div className="border rounded-lg divide-y divide-gray-200">
          {paymentAllocations.map((allocation, index) => {
            const config = PAYMENT_METHOD_CONFIGS[allocation.method];
            return (
              <div key={index} className="p-3 flex items-center space-x-3">
                <div className={`rounded-full p-2 text-white text-sm ${config.color}`}>
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{config.displayName}</div>
                  {allocation.percentage && (
                    <div className="text-xs text-gray-500">
                      {allocation.percentage.toFixed(1)}% of total
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(allocation.amount)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment validation */}
        <div className="flex items-center space-x-2 text-sm">
          {isValidPayment() ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Payment amount matches order total</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600">
                Payment amount ({formatCurrency(getTotalPaymentAmount())}) does not match order total
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!isValidPayment() || isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            'Confirm & Process Payment'
          )}
        </Button>
      </div>

      {/* Final Confirmation Notice */}
      <div className="bg-yellow-50 rounded-lg p-3">
        <h4 className="font-medium text-yellow-900 mb-1">Before You Confirm</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Verify all payment processing is complete</li>
          <li>• Ensure customer has provided payment</li>
          <li>• Check payment amounts are correct</li>
          <li>• This action will close the table session</li>
        </ul>
      </div>
    </div>
  );
};