'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Order, OrderItem } from '@/types/pos';
import { PaymentMethod, PaymentAllocation, PaymentProcessingResponse } from '@/types/payment';
import { PAYMENT_METHOD_CONFIGS, PAYMENT_METHOD_ORDER } from '@/config/payment-methods';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CashPaymentForm } from './CashPaymentForm';
import { CardPaymentForm } from './CardPaymentForm';
import { PromptPayForm } from './PromptPayForm';
import { PaymentSummary } from './PaymentSummary';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, Check } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  tableNumber?: string;
  customerName?: string;
  onPaymentComplete: (result: PaymentProcessingResponse) => void;
}

type PaymentStep = 'method-selection' | 'payment-form' | 'confirmation' | 'processing' | 'success';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  tableNumber,
  customerName,
  onPaymentComplete
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffPin, setStaffPin] = useState<string>('');

  // Calculate totals
  const subtotal = order.subtotal;
  const vatAmount = order.vatAmount;
  const totalAmount = order.totalAmount;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('method-selection');
      setSelectedMethod(null);
      setPaymentAllocations([]);
      setIsProcessing(false);
      setError(null);
      setStaffPin('');
    }
  }, [isOpen]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setCurrentStep('payment-form');
    setError(null);
  };

  const handlePaymentFormSubmit = (allocations: PaymentAllocation[], pin: string) => {
    setPaymentAllocations(allocations);
    setStaffPin(pin);
    setCurrentStep('confirmation');
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod || paymentAllocations.length === 0) {
      setError('Payment method and amount are required');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');
    setError(null);

    try {
      // Call payment processing API
      const response = await fetch('/api/pos/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          tableSessionId: order.tableSessionId,
          paymentMethods: paymentAllocations,
          staffPin,
          customerName,
          tableNumber
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const result: PaymentProcessingResponse = await response.json();

      if (result.success) {
        setCurrentStep('success');
        setTimeout(() => {
          onPaymentComplete(result);
          onClose();
        }, 2000);
      } else {
        throw new Error(result.errors?.join(', ') || 'Payment failed');
      }

    } catch (error) {
      console.error('Payment processing failed:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed');
      setCurrentStep('confirmation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'payment-form') {
      setCurrentStep('method-selection');
      setSelectedMethod(null);
    } else if (currentStep === 'confirmation') {
      setCurrentStep('payment-form');
    }
    setError(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'method-selection':
        return (
          <PaymentMethodSelector
            availableMethods={PAYMENT_METHOD_ORDER}
            onMethodSelect={handleMethodSelect}
          />
        );

      case 'payment-form':
        if (!selectedMethod) return null;

        switch (selectedMethod) {
          case PaymentMethod.CASH:
            return (
              <CashPaymentForm
                totalAmount={totalAmount}
                onSubmit={handlePaymentFormSubmit}
                onCancel={handleBack}
              />
            );

          case PaymentMethod.VISA_MANUAL:
          case PaymentMethod.MASTERCARD_MANUAL:
            return (
              <CardPaymentForm
                paymentMethod={selectedMethod}
                totalAmount={totalAmount}
                onSubmit={handlePaymentFormSubmit}
                onCancel={handleBack}
              />
            );

          case PaymentMethod.PROMPTPAY_MANUAL:
            return (
              <PromptPayForm
                totalAmount={totalAmount}
                onSubmit={handlePaymentFormSubmit}
                onCancel={handleBack}
              />
            );

          case PaymentMethod.ALIPAY:
            return (
              <CardPaymentForm
                paymentMethod={selectedMethod}
                totalAmount={totalAmount}
                onSubmit={handlePaymentFormSubmit}
                onCancel={handleBack}
              />
            );

          default:
            return <div>Payment method not implemented</div>;
        }

      case 'confirmation':
        return (
          <PaymentSummary
            order={order}
            paymentAllocations={paymentAllocations}
            customerName={customerName}
            tableNumber={tableNumber}
            onConfirm={handleConfirmPayment}
            onBack={handleBack}
            isProcessing={isProcessing}
            error={error}
          />
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg font-medium">Processing payment...</p>
            <p className="text-sm text-gray-600">Please wait while we process your payment</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">Payment Successful!</p>
            <p className="text-sm text-gray-600">Transaction completed successfully</p>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'method-selection':
        return 'Select Payment Method';
      case 'payment-form':
        return `${selectedMethod ? PAYMENT_METHOD_CONFIGS[selectedMethod].displayName : 'Payment'} Details`;
      case 'confirmation':
        return 'Confirm Payment';
      case 'processing':
        return 'Processing Payment';
      case 'success':
        return 'Payment Complete';
      default:
        return 'Payment';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {currentStep !== 'method-selection' && currentStep !== 'success' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-xl font-semibold">
              {getStepTitle()}
            </DialogTitle>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Order Summary - Always visible */}
        {currentStep !== 'success' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Order Total</span>
              <span className="text-lg font-bold">฿{totalAmount.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>฿{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (7%):</span>
                <span>฿{vatAmount.toFixed(2)}</span>
              </div>
              {tableNumber && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>{tableNumber}</span>
                </div>
              )}
              {customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{customerName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};