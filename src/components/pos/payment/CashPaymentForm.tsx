'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod, PaymentAllocation } from '@/types/payment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { roundCashAmount, validatePaymentAmount } from '@/config/payment-methods';
import { Banknote, Calculator } from 'lucide-react';

interface CashPaymentFormProps {
  totalAmount: number;
  onSubmit: (allocations: PaymentAllocation[], staffPin: string) => void;
  onCancel: () => void;
}

export const CashPaymentForm: React.FC<CashPaymentFormProps> = ({
  totalAmount,
  onSubmit,
  onCancel
}) => {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [staffPin, setStaffPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Calculate change
  const receivedAmount = parseFloat(amountReceived) || 0;
  const changeAmount = receivedAmount - totalAmount;
  const isValidAmount = receivedAmount >= totalAmount;

  // Quick amount buttons
  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 100) * 100, // Round up to nearest 100
    Math.ceil(totalAmount / 500) * 500, // Round up to nearest 500
    Math.ceil(totalAmount / 1000) * 1000, // Round up to nearest 1000
  ].filter((amount, index, arr) => arr.indexOf(amount) === index); // Remove duplicates

  useEffect(() => {
    // Auto-fill with exact amount initially
    setAmountReceived(totalAmount.toFixed(2));
  }, [totalAmount]);

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmountReceived(value);
      setError(null);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toFixed(2));
    setError(null);
  };

  const handleSubmit = () => {
    // Validate staff PIN
    if (!staffPin.trim()) {
      setError('Staff PIN is required');
      return;
    }

    if (staffPin.length < 4) {
      setError('Staff PIN must be at least 4 digits');
      return;
    }

    // Validate amount
    const validation = validatePaymentAmount(receivedAmount);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid amount');
      return;
    }

    if (!isValidAmount) {
      setError('Amount received must be at least the total amount');
      return;
    }

    // Create payment allocation
    const allocation: PaymentAllocation = {
      method: PaymentMethod.CASH,
      amount: totalAmount
    };

    onSubmit([allocation], staffPin);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="rounded-full bg-green-500 p-3 text-white">
          <Banknote className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Cash Payment</h3>
          <p className="text-sm text-gray-600">Enter amount received from customer</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="amount-received" className="text-base font-medium">
            Amount Received
          </Label>
          <div className="mt-1 relative">
            <Input
              id="amount-received"
              type="text"
              value={amountReceived}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="text-lg pl-8 pr-4 py-3"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              ฿
            </span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Quick Amounts
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="text-sm"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </div>

        {/* Change Calculation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Calculator className="h-4 w-4 text-gray-600" />
            <span className="font-medium">Change Calculation</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Received:</span>
              <span className="font-medium">{formatCurrency(receivedAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">Change:</span>
              <span className={`font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.max(0, changeAmount))}
              </span>
            </div>
          </div>

          {changeAmount < 0 && (
            <div className="mt-2 text-sm text-red-600">
              Insufficient amount received
            </div>
          )}
        </div>

        {/* Staff PIN */}
        <div>
          <Label htmlFor="staff-pin" className="text-base font-medium">
            Staff PIN
          </Label>
          <Input
            id="staff-pin"
            type="password"
            value={staffPin}
            onChange={(e) => setStaffPin(e.target.value)}
            placeholder="Enter your PIN"
            className="mt-1"
            maxLength={10}
          />
          <p className="text-xs text-gray-500 mt-1">
            Required for payment authorization
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValidAmount || !staffPin.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Confirm Cash Payment
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-1">Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Enter the amount of cash received from customer</li>
          <li>2. Verify the change amount is correct</li>
          <li>3. Enter your staff PIN for authorization</li>
          <li>4. Confirm to complete the cash payment</li>
        </ul>
      </div>
    </div>
  );
};