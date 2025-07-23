'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/pos';
import { PaymentMethod, PaymentProcessingResponse } from '@/types/payment';
import { generatePromptPayQR } from '@/services/PromptPayQRGenerator';
import { StaffPinModal } from './StaffPinModal';

interface PaymentInterfaceProps {
  order?: Order;
  tableSessionId?: string;
  tableNumber?: string;
  customerName?: string;
  totalAmount: number;
  onBack: () => void;
  onPaymentComplete: (result: PaymentProcessingResponse) => void;
}

type PaymentStep = 'method-selection' | 'payment-screen' | 'processing' | 'success';

export const PaymentInterface: React.FC<PaymentInterfaceProps> = ({
  order,
  tableSessionId,
  tableNumber,
  customerName,
  totalAmount,
  onBack,
  onPaymentComplete
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentProcessingResponse | null>(null);
  const [showStaffPinModal, setShowStaffPinModal] = useState(false);
  const [staffPin, setStaffPin] = useState<string>('');

  const formatCurrency = (amount: number): string => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const paymentMethods = [
    {
      id: PaymentMethod.CASH,
      name: 'Cash',
      description: 'Cash payment',
      icon: (
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 6h20v2H2zm0 5v6h20v-6H2zm2 2h4v2H4v-2z"/>
          </svg>
        </div>
      )
    },
    {
      id: PaymentMethod.VISA_MANUAL,
      name: 'Visa',
      description: 'Credit card payment',
      icon: (
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <div className="text-slate-700 font-bold text-sm">VISA</div>
        </div>
      )
    },
    {
      id: PaymentMethod.MASTERCARD_MANUAL,
      name: 'Mastercard',
      description: 'Credit card payment',
      icon: (
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <div className="text-slate-700 font-bold text-xs">MC</div>
        </div>
      )
    },
    {
      id: PaymentMethod.PROMPTPAY_MANUAL,
      name: 'PromptPay',
      description: 'QR code payment',
      icon: (
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h6v6H3zm2 2v2h2V5zm10-2h6v6h-6zm2 2v2h2V5zM3 15h6v6H3zm2 2v2h2v-2zm13 0h3v3h-3z"/>
          </svg>
        </div>
      )
    },
    {
      id: PaymentMethod.ALIPAY,
      name: 'Alipay',
      description: 'Digital wallet payment',
      icon: (
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <div className="text-slate-700 font-bold text-xs">AP</div>
        </div>
      )
    }
  ];

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method === PaymentMethod.PROMPTPAY_MANUAL) {
      try {
        const qrResponse = await generatePromptPayQR(totalAmount);
        setQrCodeData(qrResponse.qrCodeDataURL);
      } catch (error) {
        console.error('Failed to generate PromptPay QR:', error);
      }
    }
    
    setCurrentStep('payment-screen');
  };

  const handleStaffPinSuccess = (pin: string) => {
    console.log('🔍 PaymentInterface: Staff PIN success, retrying payment with closeTableSession: true');
    setStaffPin(pin);
    setShowStaffPinModal(false);
    // Retry payment with the PIN
    handleConfirmPayment(pin);
  };

  const handleStaffPinCancel = () => {
    setShowStaffPinModal(false);
    setIsProcessing(false);
  };

  const handleConfirmPayment = async (providedPinOrEvent?: string | React.MouseEvent) => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    
    // Extract PIN from parameter - if it's a string, use it; if it's an event, ignore it
    const providedPin = typeof providedPinOrEvent === 'string' ? providedPinOrEvent : undefined;
    
    try {
      const paymentRequest = {
        tableSessionId: tableSessionId || order?.tableSessionId,
        paymentMethods: [{
          method: selectedMethod,
          amount: totalAmount,
          percentage: 100
        }],
        staffPin: providedPin || staffPin || order?.staffPin || '',
        customerName,
        tableNumber,
        closeTableSession: true
      };
      
      console.log('🔍 PaymentInterface: Sending payment request:', JSON.stringify(paymentRequest, null, 2));
      
      const response = await fetch('/api/pos/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Check if staff authentication is required
        if (result.requiresStaffAuth) {
          console.log('Staff authentication required, triggering PIN entry');
          setShowStaffPinModal(true);
          return;
        }
        
        // Handle other errors
        const errorMessage = result.errors?.join(', ') || 'Payment processing failed';
        throw new Error(errorMessage);
      }

      setPaymentResult(result);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Payment failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (paymentResult?.receiptNumber) {
      const receiptUrl = `/api/pos/receipts/${paymentResult.receiptNumber}`;
      window.open(receiptUrl, '_blank', 'width=300,height=600');
    }
  };

  const handleFinish = () => {
    if (paymentResult) {
      onPaymentComplete(paymentResult);
    }
    onBack();
  };

  const renderMethodSelection = () => (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Payment</h1>
            <div className="text-sm text-slate-500">
              {tableNumber && `Table ${tableNumber}`}
              {customerName && ` • ${customerName}`}
            </div>
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-slate-50 border-b border-slate-200 p-6">
        <div className="text-center">
          <div className="text-sm text-slate-600 mb-1">Total Amount</div>
          <div className="text-4xl font-bold text-slate-900">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="flex-1 p-6 space-y-3">
        <div className="text-sm font-medium text-slate-700 mb-4">Select Payment Method</div>
        {paymentMethods.map((method) => (
          <Button
            key={method.id}
            variant="outline"
            className="w-full h-16 justify-start p-4 border-2 hover:border-slate-400 hover:bg-slate-50"
            onClick={() => handleMethodSelect(method.id)}
          >
            <div className="flex items-center space-x-4">
              {method.icon}
              <div className="text-left">
                <div className="font-medium text-slate-900">{method.name}</div>
                <div className="text-sm text-slate-600">{method.description}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </>
  );

  const renderPaymentScreen = () => {
    const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
    
    return (
      <>
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setCurrentStep('method-selection')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{selectedMethodData?.name} Payment</h1>
              <div className="text-sm text-slate-500">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>

        {/* Payment Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
          {selectedMethod === PaymentMethod.PROMPTPAY_MANUAL ? (
            <div className="text-center max-w-sm w-full flex flex-col">
              <div className="text-xl font-semibold text-slate-900 mb-1">PromptPay</div>
              <div className="text-slate-600 mb-4 text-sm">Scan QR code to pay</div>
              
              {qrCodeData && (
                <div className="w-64 h-64 mx-auto bg-white p-4 rounded-lg border border-slate-200 mb-4 flex-shrink-0">
                  <img src={qrCodeData} alt="PromptPay QR Code" className="w-full h-full" />
                </div>
              )}
              
              <div className="text-2xl font-bold text-slate-900 mb-4">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
                {selectedMethodData?.icon}
              </div>
              
              <div className="text-2xl font-semibold text-slate-900 mb-2">
                {selectedMethodData?.name}
              </div>
              
              <div className="text-3xl font-bold text-slate-900 mb-6">
                {formatCurrency(totalAmount)}
              </div>
              
              <div className="text-slate-600 mb-8">
                Please process the {selectedMethodData?.name.toLowerCase()} payment with the customer
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm mb-4 mx-4">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="text-white text-xs font-bold">!</div>
              </div>
              <div className="text-amber-800 text-xs">
                <div className="font-medium mb-1">Verify Payment</div>
                <div>Please confirm the payment has been approved before pressing confirm.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleConfirmPayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </>
    );
  };

  const renderSuccessScreen = () => (
    <>
      {/* Success Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        
        <div className="text-2xl font-semibold text-slate-900 mb-2">Payment Successful</div>
        
        <div className="text-center text-slate-600 mb-8 max-w-md">
          <div className="text-lg mb-2">{formatCurrency(totalAmount)}</div>
          <div className="text-sm">Receipt: {paymentResult?.receiptNumber}</div>
          {tableNumber && <div className="text-sm">Table: {tableNumber}</div>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-3 bg-white border-t border-slate-200">
        <Button
          variant="outline"
          className="w-full h-12"
          onClick={handlePrintReceipt}
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Receipt
        </Button>
        
        <Button
          className="w-full h-12"
          onClick={handleFinish}
        >
          Finish
        </Button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50">
      {currentStep === 'method-selection' && renderMethodSelection()}
      {currentStep === 'payment-screen' && renderPaymentScreen()}
      {currentStep === 'success' && renderSuccessScreen()}
      
      {/* Staff PIN Modal */}
      <StaffPinModal
        isOpen={showStaffPinModal}
        onSuccess={handleStaffPinSuccess}
        onCancel={handleStaffPinCancel}
        title="Payment Authorization Required"
        description="Please enter your staff PIN to complete the payment"
      />
    </div>
  );
};