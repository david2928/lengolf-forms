'use client';

import React, { useState } from 'react';
import { PaymentMethod, PaymentAllocation } from '@/types/payment';
import { PAYMENT_METHOD_CONFIGS } from '@/config/payment-methods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

interface CardPaymentFormProps {
  paymentMethod: PaymentMethod;
  totalAmount: number;
  onSubmit: (allocations: PaymentAllocation[], staffPin: string) => void;
  onCancel: () => void;
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  paymentMethod,
  totalAmount,
  onSubmit,
  onCancel
}) => {
  const [staffPin, setStaffPin] = useState<string>('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const config = PAYMENT_METHOD_CONFIGS[paymentMethod];
  
  const getIcon = () => {
    switch (paymentMethod) {
      case PaymentMethod.VISA_MANUAL:
      case PaymentMethod.MASTERCARD_MANUAL:
        return <CreditCard className="h-6 w-6" />;
      case PaymentMethod.ALIPAY:
        return <Smartphone className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getInstructions = () => {
    switch (paymentMethod) {
      case PaymentMethod.VISA_MANUAL:
        return [
          '1. Insert or swipe customer\'s Visa card in EDC machine',
          '2. Enter amount: ฿' + totalAmount.toFixed(2),
          '3. Have customer enter PIN or sign receipt',
          '4. Wait for approval message',
          '5. Note the transaction reference number',
          '6. Check the box below when transaction is approved'
        ];
      
      case PaymentMethod.MASTERCARD_MANUAL:
        return [
          '1. Insert or swipe customer\'s Mastercard in EDC machine',
          '2. Enter amount: ฿' + totalAmount.toFixed(2),
          '3. Have customer enter PIN or sign receipt',
          '4. Wait for approval message',
          '5. Note the transaction reference number',
          '6. Check the box below when transaction is approved'
        ];
      
      case PaymentMethod.ALIPAY:
        return [
          '1. Ask customer to open Alipay app',
          '2. Customer scans QR code or shows payment code',
          '3. Enter amount: ฿' + totalAmount.toFixed(2),
          '4. Confirm payment details with customer',
          '5. Wait for payment confirmation',
          '6. Note the transaction ID',
          '7. Check the box below when payment is confirmed'
        ];
      
      default:
        return [];
    }
  };

  const getProcessingSteps = () => {
    switch (paymentMethod) {
      case PaymentMethod.VISA_MANUAL:
      case PaymentMethod.MASTERCARD_MANUAL:
        return [
          'Transaction sent to bank',
          'Awaiting bank approval',
          'Customer authentication',
          'Transaction approved'
        ];
      
      case PaymentMethod.ALIPAY:
        return [
          'Payment code scanned',
          'Amount confirmed',
          'Awaiting customer confirmation',
          'Payment completed'
        ];
      
      default:
        return [];
    }
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

    // Validate transaction is processed
    if (!isProcessed) {
      setError('Please confirm that the transaction has been processed successfully');
      return;
    }

    // Create payment allocation
    const allocation: PaymentAllocation = {
      method: paymentMethod,
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
        <div className={`rounded-full p-3 text-white ${config.color}`}>
          {getIcon()}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{config.displayName}</h3>
          <p className="text-sm text-gray-600">{config.instructions}</p>
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Transaction Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Processing Instructions */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Processing Instructions</h4>
        <div className="bg-blue-50 rounded-lg p-4">
          <ol className="text-sm text-blue-800 space-y-2">
            {getInstructions().map((instruction, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="font-medium">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Transaction Reference */}
      <div>
        <Label htmlFor="transaction-ref" className="text-base font-medium">
          Transaction Reference (Optional)
        </Label>
        <Input
          id="transaction-ref"
          type="text"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="Enter transaction reference number"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          For record keeping and dispute resolution
        </p>
      </div>

      {/* Processing Confirmation */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Transaction Status</h4>
        
        <div className="flex items-start space-x-3">
          <Checkbox
            id="processed-confirmation"
            checked={isProcessed}
            onCheckedChange={(checked) => {
              setIsProcessed(checked as boolean);
              setError(null);
            }}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label
              htmlFor="processed-confirmation"
              className="text-sm font-medium cursor-pointer"
            >
              Transaction has been processed successfully
            </Label>
            <p className="text-xs text-gray-500">
              Check this box only after receiving approval/confirmation from the payment system
            </p>
          </div>
        </div>

        {isProcessed && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Transaction confirmed</span>
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
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isProcessed || !staffPin.trim()}
          className={`flex-1 ${config.color.replace('bg-', 'bg-').replace('-500', '-600')} hover:${config.color.replace('bg-', 'bg-').replace('-500', '-700')}`}
        >
          Confirm Payment
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 rounded-lg p-3">
        <h4 className="font-medium text-yellow-900 mb-1">Tips</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Ensure customer signature matches ID (if required)</li>
          <li>• Keep transaction receipt for reconciliation</li>
          <li>• If transaction fails, try again or use alternative payment</li>
          <li>• Double-check the amount before processing</li>
        </ul>
      </div>
    </div>
  );
};