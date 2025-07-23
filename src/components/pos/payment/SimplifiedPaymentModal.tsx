'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Order } from '@/types/pos';
import { PaymentMethod, PaymentProcessingResponse } from '@/types/payment';
import { generatePromptPayQR } from '@/services/PromptPayQRGenerator';
import { usePOSStaffAuth } from '@/hooks/use-pos-staff-auth';
import { AlertTriangle, X, Printer, User } from 'lucide-react';

interface SimplifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  tableNumber?: string;
  customerName?: string;
  onPaymentComplete: (result: PaymentProcessingResponse) => void;
}

type PaymentStep = 'method-selection' | 'payment-screen' | 'processing' | 'success';

export const SimplifiedPaymentModal: React.FC<SimplifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  tableNumber,
  customerName,
  onPaymentComplete
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentProcessingResponse | null>(null);
  const [requiresAdditionalAuth, setRequiresAdditionalAuth] = useState(false);
  const [additionalPin, setAdditionalPin] = useState<string>('');

  const { currentStaff } = usePOSStaffAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('method-selection');
      setSelectedMethod(null);
      setIsProcessing(false);
      setQrCodeData(null);
      setPaymentResult(null);
      setRequiresAdditionalAuth(false);
      setAdditionalPin('');
    }
  }, [isOpen]);

  const formatCurrency = (amount: number): string => {
    return `฿${amount.toFixed(2)}`;
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method === PaymentMethod.PROMPTPAY_MANUAL) {
      try {
        const qrResponse = await generatePromptPayQR(order.totalAmount);
        setQrCodeData(qrResponse.qrCodeDataURL);
      } catch (error) {
        console.error('Failed to generate PromptPay QR:', error);
      }
    }
    
    setCurrentStep('payment-screen');
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod || !currentStaff) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/pos/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          tableSessionId: order.tableSessionId,
          paymentMethods: [{
            method: selectedMethod,
            amount: order.totalAmount,
            percentage: 100
          }],
          staffId: currentStaff.id,
          staffName: currentStaff.staff_name,
          customerName,
          tableNumber,
          closeTableSession: true
        })
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      const result = await response.json();
      setPaymentResult(result);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (paymentResult?.receiptNumber) {
      // Open receipt in new window for printing
      const receiptUrl = `/api/pos/receipts/${paymentResult.receiptNumber}`;
      window.open(receiptUrl, '_blank', 'width=300,height=600');
    }
  };

  const handleFinish = () => {
    if (paymentResult) {
      onPaymentComplete(paymentResult);
    }
    onClose();
  };

  const renderMethodSelection = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <h2 className="text-lg font-semibold">Select Payment Method</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Total */}
      <div className="p-6 text-center bg-white border-b">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          Total: {formatCurrency(order.totalAmount)}
        </div>
        {tableNumber && (
          <div className="text-sm text-gray-600">Table: {tableNumber}</div>
        )}
        {customerName && (
          <div className="text-sm text-gray-600">{customerName}</div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="flex-1 p-6 space-y-4">
        <Button
          className="w-full h-20 text-xl font-semibold bg-green-600 hover:bg-green-700"
          onClick={() => handleMethodSelect(PaymentMethod.CASH)}
        >
          💵 Cash
        </Button>
        
        <Button
          className="w-full h-20 text-xl font-semibold bg-blue-600 hover:bg-blue-700"
          onClick={() => handleMethodSelect(PaymentMethod.VISA_MANUAL)}
        >
          💳 Visa
        </Button>
        
        <Button
          className="w-full h-20 text-xl font-semibold bg-orange-600 hover:bg-orange-700"
          onClick={() => handleMethodSelect(PaymentMethod.MASTERCARD_MANUAL)}
        >
          💳 Mastercard
        </Button>
        
        <Button
          className="w-full h-20 text-xl font-semibold bg-purple-600 hover:bg-purple-700"
          onClick={() => handleMethodSelect(PaymentMethod.PROMPTPAY_MANUAL)}
        >
          📱 PromptPay
        </Button>
        
        <Button
          className="w-full h-20 text-xl font-semibold bg-cyan-600 hover:bg-cyan-700"
          onClick={() => handleMethodSelect(PaymentMethod.ALIPAY)}
        >
          💰 Alipay
        </Button>
      </div>
    </div>
  );

  const renderPaymentScreen = () => {
    const getPaymentIcon = () => {
      switch (selectedMethod) {
        case PaymentMethod.VISA_MANUAL:
          return (
            <div className="w-32 h-20 bg-white rounded-lg flex items-center justify-center mb-8 mx-auto border-2 border-blue-300">
              <div className="text-blue-600 font-bold text-2xl">VISA</div>
            </div>
          );
        case PaymentMethod.MASTERCARD_MANUAL:
          return (
            <div className="w-32 h-20 bg-white rounded-lg flex items-center justify-center mb-8 mx-auto border-2 border-orange-300">
              <div className="text-orange-600 font-bold text-xl">MasterCard</div>
            </div>
          );
        case PaymentMethod.PROMPTPAY_MANUAL:
          return (
            <div className="text-center mb-8">
              <div className="text-blue-600 font-bold text-2xl mb-4">PROMPTPAY</div>
              {qrCodeData && (
                <div className="w-64 h-64 mx-auto bg-white p-4 rounded-lg border-2 border-gray-300">
                  <img src={qrCodeData} alt="PromptPay QR Code" className="w-full h-full" />
                </div>
              )}
            </div>
          );
        case PaymentMethod.CASH:
          return (
            <div className="w-32 h-20 bg-green-100 rounded-lg flex items-center justify-center mb-8 mx-auto border-2 border-green-300">
              <div className="text-green-600 font-bold text-2xl">💵</div>
            </div>
          );
        case PaymentMethod.ALIPAY:
          return (
            <div className="w-32 h-20 bg-cyan-100 rounded-lg flex items-center justify-center mb-8 mx-auto border-2 border-cyan-300">
              <div className="text-cyan-600 font-bold text-xl">Alipay</div>
            </div>
          );
        default:
          return null;
      }
    };

    const getInstructionText = () => {
      switch (selectedMethod) {
        case PaymentMethod.VISA_MANUAL:
          return 'Please prompt customer to pay by Visa';
        case PaymentMethod.MASTERCARD_MANUAL:
          return 'Please prompt customer to pay by Mastercard';
        case PaymentMethod.PROMPTPAY_MANUAL:
          return 'Please prompt customer to pay by PromptPay';
        case PaymentMethod.CASH:
          return 'Please collect cash from customer';
        case PaymentMethod.ALIPAY:
          return 'Please prompt customer to pay by Alipay';
        default:
          return 'Processing payment...';
      }
    };

    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep('method-selection')}>
            ← Back
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Payment Icon */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {getPaymentIcon()}

          {/* Total */}
          <div className="text-4xl font-bold text-gray-900 mb-6">
            Total: {formatCurrency(order.totalAmount)}
          </div>

          {/* Instructions */}
          <div className="text-lg text-gray-700 text-center mb-12">
            {getInstructionText()}
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 mx-4 max-w-md">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-red-800">
                <div className="font-semibold text-red-900 mb-1">Warning:</div>
                <div className="text-sm">
                  Please verify and confirm the payment has been approved before pressing the &apos;Confirm&apos; button below.
                </div>
              </div>
            </div>
          </div>

          {/* Staff Information */}
          {currentStaff && (
            <div className="mx-4 max-w-md">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">
                      {currentStaff.staff_name}
                    </div>
                    {currentStaff.staff_id && (
                      <div className="text-sm text-blue-700">
                        Staff ID: {currentStaff.staff_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Button */}
        <div className="p-6 bg-white border-t">
          <Button
            className="w-full h-16 text-2xl font-bold bg-green-600 hover:bg-green-700"
            onClick={handleConfirmPayment}
            disabled={isProcessing || !currentStaff}
          >
            {isProcessing ? 'PROCESSING...' : 'CONFIRM'}
          </Button>
        </div>
      </div>
    );
  };

  const renderSuccessScreen = () => (
    <div className="flex flex-col h-full bg-green-50">
      {/* Success Message */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mb-6">
          <div className="text-white text-4xl">✓</div>
        </div>
        
        <div className="text-2xl font-bold text-green-800 mb-4">Payment Successful!</div>
        
        <div className="text-center text-gray-700 mb-8">
          <div className="text-lg mb-2">Amount: {formatCurrency(order.totalAmount)}</div>
          <div className="text-sm">Receipt: {paymentResult?.receiptNumber}</div>
          {tableNumber && <div className="text-sm">Table: {tableNumber}</div>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-4 bg-white border-t">
        <Button
          className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
          onClick={handlePrintReceipt}
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Receipt
        </Button>
        
        <Button
          className="w-full h-14 text-lg font-semibold bg-gray-600 hover:bg-gray-700"
          onClick={handleFinish}
        >
          Finish
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 w-full h-full max-w-none max-h-none m-0 p-0 rounded-none border-none bg-white">
        {currentStep === 'method-selection' && renderMethodSelection()}
        {currentStep === 'payment-screen' && renderPaymentScreen()}
        {currentStep === 'success' && renderSuccessScreen()}
      </DialogContent>
    </Dialog>
  );
};