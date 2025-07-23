'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod, PaymentAllocation } from '@/types/payment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePromptPayQR, usePromptPayQRStatus } from '@/hooks/usePromptPayQR';
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PromptPayFormProps {
  totalAmount: number;
  onSubmit: (allocations: PaymentAllocation[], staffPin: string) => void;
  onCancel: () => void;
}

export const PromptPayForm: React.FC<PromptPayFormProps> = ({
  totalAmount,
  onSubmit,
  onCancel
}) => {
  const [staffPin, setStaffPin] = useState<string>('');
  const [isPaymentReceived, setIsPaymentReceived] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const {
    qrData,
    isGenerating,
    error: qrError,
    isConfigured,
    generateQR,
    regenerateQR,
    clearQR
  } = usePromptPayQR();

  const {
    isExpired,
    timeRemaining,
    timeRemainingFormatted
  } = usePromptPayQRStatus(qrData);

  // Generate QR code on component mount
  useEffect(() => {
    if (isConfigured) {
      generateQR(totalAmount);
    }
  }, [totalAmount, isConfigured, generateQR]);

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

    // Validate payment is received
    if (!isPaymentReceived) {
      setError('Please confirm that the payment has been received');
      return;
    }

    // Create payment allocation
    const allocation: PaymentAllocation = {
      method: PaymentMethod.PROMPTPAY_MANUAL,
      amount: totalAmount
    };

    onSubmit([allocation], staffPin);
  };

  const handleRegenerateQR = () => {
    setError(null);
    regenerateQR();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Show configuration error if PromptPay is not configured
  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-purple-600 p-3 text-white">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">PromptPay Payment</h3>
            <p className="text-sm text-gray-600">QR code payment via Thai banks</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h4 className="font-medium text-red-900">PromptPay Not Configured</h4>
            <p className="text-sm text-red-800">
              PromptPay payment method is not properly configured. Please contact system administrator.
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Choose Different Payment Method
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="rounded-full bg-purple-600 p-3 text-white">
          <QrCode className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">PromptPay Payment</h3>
          <p className="text-sm text-gray-600">Show QR code to customer for payment</p>
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Payment Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">PromptPay QR Code</h4>
          {qrData && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className={`${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                {isExpired ? 'Expired' : `${timeRemainingFormatted} left`}
              </span>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="text-gray-600">Generating QR code...</p>
            </div>
          ) : qrError ? (
            <div className="flex flex-col items-center space-y-3">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-600">Failed to generate QR code</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerateQR}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              <img
                src={qrData.qrCodeDataURL}
                alt="PromptPay QR Code"
                className="mx-auto w-48 h-48 border border-gray-300 rounded"
              />
              <div className="text-sm text-gray-600">
                Scan with any Thai banking app
              </div>
              {isExpired && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRegenerateQR}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Regenerate QR Code</span>
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Customer Instructions</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Open any Thai banking app (Krung Thai, SCB, Kbank, etc.)</li>
          <li>2. Select PromptPay or QR code payment</li>
          <li>3. Scan the QR code displayed above</li>
          <li>4. Verify the amount: {formatCurrency(totalAmount)}</li>
          <li>5. Confirm payment in the banking app</li>
          <li>6. Show payment confirmation to staff</li>
        </ol>
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
          placeholder="Reference from customer's banking app"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Customer can provide transaction ID from their banking app
        </p>
      </div>

      {/* Payment Confirmation */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Payment Confirmation</h4>
        
        <div className="flex items-start space-x-3">
          <Checkbox
            id="payment-received"
            checked={isPaymentReceived}
            onCheckedChange={(checked) => {
              setIsPaymentReceived(checked as boolean);
              setError(null);
            }}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label
              htmlFor="payment-received"
              className="text-sm font-medium cursor-pointer"
            >
              Customer has completed payment and shown confirmation
            </Label>
            <p className="text-xs text-gray-500">
              Verify payment notification in customer&apos;s banking app before checking this box
            </p>
          </div>
        </div>

        {isPaymentReceived && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Payment confirmed</span>
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
          disabled={!isPaymentReceived || !staffPin.trim() || isExpired}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          Confirm PromptPay Payment
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 rounded-lg p-3">
        <h4 className="font-medium text-yellow-900 mb-1">Tips</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• QR code expires after 5 minutes for security</li>
          <li>• Customer should show successful payment screen</li>
          <li>• Transaction will appear in business account immediately</li>
          <li>• If payment fails, regenerate QR code and try again</li>
        </ul>
      </div>
    </div>
  );
};