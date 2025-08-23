'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/pos';
import { PaymentMethod, PaymentProcessingResponse, PaymentAllocation } from '@/types/payment';
import useSWR from 'swr';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { generatePromptPayQR } from '@/services/PromptPayQRGenerator';
import { StaffPinModal } from './StaffPinModal';
import { bluetoothThermalPrinter, BluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { unifiedPrintService, PrintType } from '@/services/UnifiedPrintService';

interface PaymentInterfaceProps {
  order?: Order;
  tableSessionId?: string;
  tableNumber?: string;
  customerName?: string;
  totalAmount: number;
  onBack: () => void;
  onPaymentComplete: (result: PaymentProcessingResponse) => void;
}

type PaymentStep = 'method-selection' | 'split-management' | 'payment-screen' | 'processing' | 'success';

export const PaymentInterface: React.FC<PaymentInterfaceProps> = ({
  order,
  tableSessionId,
  tableNumber,
  customerName,
  totalAmount: initialTotalAmount,
  onBack,
  onPaymentComplete
}) => {
  const { staff } = useStaffAuth();
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentProcessingResponse | null>(null);
  const [showStaffPinModal, setShowStaffPinModal] = useState(false);
  const [staffPin, setStaffPin] = useState<string>('');
  const [splitPayments, setSplitPayments] = useState<PaymentAllocation[]>([]);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [selectedSplitMethod, setSelectedSplitMethod] = useState<PaymentMethod | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [isBluetoothSupported, setIsBluetoothSupported] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);

  // Fetch current session data to get updated total amount
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: sessionData } = useSWR(
    tableSessionId ? `/api/pos/table-sessions/${tableSessionId}` : null,
    fetcher,
    { refreshInterval: 2000 } // Refresh every 2 seconds to catch discount changes
  );

  // Calculate current total amount from session data (includes applied discounts)
  const totalAmount = useMemo(() => {
    // Use live session data if available (most up-to-date with discounts)
    if (sessionData?.totalAmount !== undefined) {
      return sessionData.totalAmount;
    }
    
    // If order has items, calculate from current order state
    if (order?.items?.length) {
      const subtotal = order.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
      const modifiersTotal = order.items.reduce((total, item) => {
        const modifierCost = item.modifiers?.reduce((sum, mod) => {
          let modPrice = 0;
          if (mod.priceType === 'fixed') {
            modPrice = mod.price * mod.quantity;
          } else if (mod.priceType === 'percentage') {
            modPrice = (item.unitPrice * (mod.price / 100)) * mod.quantity;
          }
          mod.selectedOptions?.forEach(option => {
            modPrice += option.priceAdjustment * mod.quantity;
          });
          return sum + (modPrice * item.quantity);
        }, 0) || 0;
        return total + modifierCost;
      }, 0);
      
      // Use order.totalAmount if available (includes session-level discounts), otherwise calculate
      return order.totalAmount || (subtotal + modifiersTotal);
    }
    
    // Fallback to initial total amount (from table session)
    return initialTotalAmount;
  }, [sessionData, order, initialTotalAmount]);

  // Check for Bluetooth support on component mount
  useEffect(() => {
    const checkBluetoothSupport = () => {
      const supported = BluetoothThermalPrinter.isSupported();
      setIsBluetoothSupported(supported);
      console.log('📱 Bluetooth support detected:', supported);
    };
    
    checkBluetoothSupport();
  }, []);

  const formatCurrency = (amount: number): string => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const paymentMethods = useMemo(() => {
    const allMethods = [
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

  // For 0 baht transactions, only show Cash payment method
  if (totalAmount === 0) {
    return allMethods.filter(method => method.id === PaymentMethod.CASH);
  }

  return allMethods;
}, [totalAmount]);

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

  const handleSplitPayment = () => {
    setIsSplitPayment(true);
    setCurrentStep('split-management');
  };

  const addSplitPayment = (method: PaymentMethod, amount: number) => {
    const newPayment: PaymentAllocation = {
      method,
      amount,
      percentage: (amount / totalAmount) * 100
    };
    setSplitPayments(prev => [...prev, newPayment]);
  };

  const handleSplitMethodSelect = (method: PaymentMethod) => {
    setSelectedSplitMethod(method);
    setInputAmount('');
    setShowAmountInput(true);
  };

  const handleAmountConfirm = () => {
    const amount = parseFloat(inputAmount);
    const editingIndex = (window as any).editingPaymentIndex;
    
    if (editingIndex !== undefined) {
      // Editing existing payment
      if (amount > 0 && selectedSplitMethod) {
        const updatedPayments = [...splitPayments];
        const oldAmount = updatedPayments[editingIndex].amount;
        const availableAmount = getRemainingAmount() + oldAmount; // Add back the old amount
        
        if (amount <= availableAmount) {
          updatedPayments[editingIndex] = {
            method: selectedSplitMethod,
            amount: amount,
            percentage: (amount / totalAmount) * 100
          };
          setSplitPayments(updatedPayments);
          setShowAmountInput(false);
          setSelectedSplitMethod(null);
          setInputAmount('');
          (window as any).editingPaymentIndex = undefined;
        }
      }
    } else {
      // Adding new payment
      if (amount > 0 && amount <= getRemainingAmount() && selectedSplitMethod) {
        addSplitPayment(selectedSplitMethod, amount);
        setShowAmountInput(false);
        setSelectedSplitMethod(null);
        setInputAmount('');
      }
    }
  };

  const handleAmountCancel = () => {
    setShowAmountInput(false);
    setSelectedSplitMethod(null);
    setInputAmount('');
    (window as any).editingPaymentIndex = undefined;
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalSplitAmount = () => {
    return splitPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRemainingAmount = () => {
    return totalAmount - getTotalSplitAmount();
  };

  const completeSplitPayment = async (providedPin?: string) => {
    // Check if we have a PIN - if not, show the PIN modal
    if (!providedPin && !staffPin) {
      console.log('🔍 PaymentInterface: No PIN provided for split payment, showing staff PIN modal');
      setShowStaffPinModal(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const paymentRequest = {
        tableSessionId: tableSessionId || order?.tableSessionId,
        paymentMethods: splitPayments,
        staffId: staff?.id,
        staffName: staff?.staff_name,
        staffPin: providedPin || staffPin,
        customerName,
        tableNumber,
        closeTableSession: true
      };
      
      console.log('🔍 Split Payment Request:', JSON.stringify(paymentRequest, null, 2));
      
      const response = await fetch('/api/pos/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest)
      });
      
      const result = await response.json();
      console.log('🔍 Split Payment Response:', JSON.stringify(result, null, 2));
      
      if (!response.ok) {
        // Check if staff authentication is required
        if (result.requiresStaffAuth) {
          console.log('🔍 PaymentInterface: Staff authentication required for split payment, showing PIN modal');
          setShowStaffPinModal(true);
          setIsProcessing(false);
          return;
        }
        
        // Handle errors
        const errorMessage = result.errors?.join(', ') || 'Split payment processing failed';
        throw new Error(errorMessage);
      }
      
      setPaymentResult(result);
      setIsProcessing(false); // Ensure processing state is reset on success
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Split payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Split payment failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStaffPinSuccess = (pin: string) => {
    console.log('🔍 PaymentInterface: Staff PIN success, retrying payment with PIN');
    setStaffPin(pin);
    setShowStaffPinModal(false);
    
    // Retry payment with PIN
    if (isSplitPayment) {
      completeSplitPayment(pin);
    } else {
      handleConfirmPayment(pin);
    }
  };

  const handleStaffPinCancel = () => {
    setShowStaffPinModal(false);
    setIsProcessing(false);
  };

  const handleConfirmPayment = async (providedPinOrEvent?: string | React.MouseEvent) => {
    if (!selectedMethod) return;
    
    // Extract PIN from parameter - if it's a string, use it; if it's an event, ignore it
    const providedPin = typeof providedPinOrEvent === 'string' ? providedPinOrEvent : undefined;
    
    // Check if we have a PIN - if not, show the PIN modal
    if (!providedPin && !staffPin) {
      console.log('🔍 PaymentInterface: No PIN provided, showing staff PIN modal');
      setShowStaffPinModal(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const paymentRequest = {
        tableSessionId: tableSessionId || order?.tableSessionId,
        paymentMethods: isSplitPayment ? splitPayments : [{
          method: selectedMethod,
          amount: totalAmount,
          percentage: 100
        }],
        staffId: staff?.id,
        staffName: staff?.staff_name,
        staffPin: providedPin || staffPin,
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
      setIsProcessing(false); // Ensure processing state is reset on success
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Payment failed: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!paymentResult?.receiptNumber) return;
    
    console.log('🖨️ Print receipt clicked:', {
      receiptNumber: paymentResult.receiptNumber,
      isBluetoothSupported,
      userAgent: navigator.userAgent,
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    });
    
    try {
      setIsProcessing(true);
      
      // Use unified print service for smart printer selection
      console.log('🖨️ Using unified print service with smart selection');
      const result = await unifiedPrintService.print(PrintType.TAX_INV_ABB, paymentResult.receiptNumber);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        throw new Error(result.error || result.message);
      }
      
    } catch (error) {
      console.error('Print error:', error);
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('🖨️ Print operation finished, resetting isProcessing');
      setIsProcessing(false);
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
          <div className="text-base text-slate-600 mb-1">Total Amount</div>
          <div className="text-5xl font-bold text-slate-900">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="flex-1 p-6 space-y-3">
        <div className="text-base font-medium text-slate-700 mb-4">Select Payment Method</div>
        {paymentMethods.map((method) => (
          <Button
            key={method.id}
            variant="outline"
            className="w-full h-20 justify-start p-4 border-2 hover:border-slate-400 hover:bg-slate-50"
            onClick={() => handleMethodSelect(method.id)}
          >
            <div className="flex items-center space-x-4">
              {method.icon}
              <div className="text-left">
                <div className="text-lg font-medium text-slate-900">{method.name}</div>
                <div className="text-base text-slate-600">{method.description}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Split Payment Action Button - Only show for non-zero amounts */}
      {totalAmount > 0 && (
        <div className="p-4 bg-white border-t border-slate-200">
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold border-2 border-dashed border-slate-300 hover:border-slate-400"
            onClick={handleSplitPayment}
          >
            Split Payment
          </Button>
        </div>
      )}
    </>
  );

  const renderSplitManagement = () => (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentStep('method-selection')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Split Payment</h1>
            <div className="text-sm text-slate-500">
              {tableNumber && `Table ${tableNumber}`}
              {customerName && ` • ${customerName}`}
            </div>
          </div>
        </div>
      </div>

      {/* Total and Progress */}
      <div className="bg-slate-50 border-b border-slate-200 p-6">
        <div className="text-center mb-4">
          <div className="text-sm text-slate-600 mb-1">Total Amount</div>
          <div className="text-3xl font-bold text-slate-900 mb-2">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-sm text-slate-600">
            Remaining: {formatCurrency(getRemainingAmount())}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((getTotalSplitAmount() / totalAmount) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Split Payments List */}
      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {splitPayments.map((payment, index) => (
          <div key={index} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">Payment {index + 1}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSplitPayment(index)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
            
            {/* Payment Method Selection */}
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant={payment.method === method.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const updatedPayments = [...splitPayments];
                    updatedPayments[index].method = method.id;
                    setSplitPayments(updatedPayments);
                  }}
                  className="h-12 text-sm"
                >
                  {method.name}
                </Button>
              ))}
            </div>
            
            {/* Amount Display and Edit */}
            <div className="flex items-center justify-between">
              <div className="text-slate-600">
                Amount: {formatCurrency(payment.amount)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSplitMethod(payment.method);
                  setInputAmount(payment.amount.toString());
                  setShowAmountInput(true);
                  // Store the index for editing
                  (window as any).editingPaymentIndex = index;
                }}
                className="text-xs"
              >
                Edit Amount
              </Button>
            </div>
          </div>
        ))}
        
        {splitPayments.length === 0 && (
          <>
            <div className="text-center py-2">
              <div className="text-sm text-slate-600 font-medium">Quick Split</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                variant="outline"
                className="h-12 flex items-center justify-center hover:bg-slate-50"
                onClick={() => {
                  const half = totalAmount / 2;
                  setSplitPayments([
                    { method: PaymentMethod.CASH, amount: half, percentage: 50 },
                    { method: PaymentMethod.CASH, amount: half, percentage: 50 }
                  ]);
                }}
              >
                <div className="font-medium text-slate-700">2-Way Split (50/50)</div>
              </Button>
              
              <Button
                variant="outline"
                className="h-12 flex items-center justify-center hover:bg-slate-50"
                onClick={() => {
                  const third = totalAmount / 3;
                  setSplitPayments([
                    { method: PaymentMethod.CASH, amount: third, percentage: 33.33 },
                    { method: PaymentMethod.CASH, amount: third, percentage: 33.33 },
                    { method: PaymentMethod.CASH, amount: third, percentage: 33.34 }
                  ]);
                }}
              >
                <div className="font-medium text-slate-700">3-Way Split</div>
              </Button>
            </div>
            
            <div className="text-center py-2">
              <div className="text-sm text-slate-600 font-medium">Custom Split</div>
            </div>
          </>
        )}
        
        {(splitPayments.length === 0 || getRemainingAmount() > 0) && (
          <>
            {getRemainingAmount() > 0 && (
              <div className="text-center py-2">
                <div className="text-sm text-slate-600">Add payment for remaining {formatCurrency(getRemainingAmount())}</div>
              </div>
            )}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-slate-50"
                  onClick={() => handleSplitMethodSelect(PaymentMethod.CASH)}
                >
                  <div className="text-base font-medium text-slate-700">Cash</div>
                  <div className="text-sm text-slate-600">Enter Amount</div>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-slate-50"
                  onClick={() => handleSplitMethodSelect(PaymentMethod.VISA_MANUAL)}
                >
                  <div className="text-base font-medium text-slate-700">Visa</div>
                  <div className="text-sm text-slate-600">Enter Amount</div>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-slate-50"
                  onClick={() => handleSplitMethodSelect(PaymentMethod.MASTERCARD_MANUAL)}
                >
                  <div className="text-base font-medium text-slate-700">Mastercard</div>
                  <div className="text-sm text-slate-600">Enter Amount</div>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-slate-50"
                  onClick={() => handleSplitMethodSelect(PaymentMethod.PROMPTPAY_MANUAL)}
                >
                  <div className="text-base font-medium text-slate-700">PromptPay</div>
                  <div className="text-sm text-slate-600">Enter Amount</div>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-slate-50"
                  onClick={() => handleSplitMethodSelect(PaymentMethod.ALIPAY)}
                >
                  <div className="text-base font-medium text-slate-700">Alipay</div>
                  <div className="text-sm text-slate-600">Enter Amount</div>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Complete Button */}
      <div className="p-4 bg-white border-t border-slate-200">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => completeSplitPayment()}
          disabled={isProcessing || getRemainingAmount() !== 0 || splitPayments.length === 0}
        >
          {isProcessing ? 'Processing...' : `Complete Payment (${formatCurrency(getTotalSplitAmount())})`}
        </Button>
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
              <div className="text-2xl font-semibold text-slate-900 mb-1">PromptPay</div>
              <div className="text-slate-600 mb-4 text-base">Scan QR code to pay</div>
              
              {qrCodeData && (
                <div className="w-[28rem] h-[28rem] mx-auto bg-white p-8 rounded-lg border border-slate-200 mb-4 flex-shrink-0">
                  <img src={qrCodeData} alt="PromptPay QR Code" className="w-full h-full" />
                </div>
              )}
              
              <div className="text-3xl font-bold text-slate-900 mb-4">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
                {selectedMethodData?.icon}
              </div>
              
              <div className="text-3xl font-semibold text-slate-900 mb-2">
                {selectedMethodData?.name}
              </div>
              
              <div className="text-4xl font-bold text-slate-900 mb-6">
                {formatCurrency(totalAmount)}
              </div>
              
              <div className="text-slate-600 mb-8">
                Please process the {selectedMethodData?.name.toLowerCase()} payment with the customer
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-lg mb-4 mx-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="text-white text-sm font-bold">!</div>
              </div>
              <div className="text-amber-800 text-base">
                <div className="font-semibold mb-2 text-lg">Verify Payment</div>
                <div className="leading-relaxed">Please confirm the payment has been approved before pressing confirm.</div>
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

  const renderSuccessScreen = () => {
    console.log('🔍 Success screen render - state check:', {
      isProcessing,
      isBluetoothSupported,
      bluetoothConnected,
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
      receiptNumber: paymentResult?.receiptNumber,
      isSplitPayment,
      splitPaymentsCount: splitPayments.length
    });
    
    return (
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
            {isSplitPayment && <div className="text-sm">Split Payment ({splitPayments.length} methods)</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 bg-white border-t border-slate-200">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handlePrintReceipt}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Connecting...' : 'Printing...'}
              </>
            ) : (
              <>
                <Printer className="w-5 h-5 mr-2" />
                {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Print via Bluetooth' : 'Print Receipt'}
                {bluetoothConnected && <span className="ml-2 text-xs text-green-600">• Connected</span>}
              </>
            )}
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
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50">
      {currentStep === 'method-selection' && renderMethodSelection()}
      {currentStep === 'split-management' && renderSplitManagement()}
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
      
      {/* Amount Input Modal */}
      <Dialog open={showAmountInput} onOpenChange={handleAmountCancel}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {(window as any).editingPaymentIndex !== undefined ? 'Edit' : 'Enter'} {selectedSplitMethod} Amount
            </h2>
            <div className="text-sm text-slate-600 mb-4">
              Maximum: {formatCurrency(
                (window as any).editingPaymentIndex !== undefined 
                  ? getRemainingAmount() + (splitPayments[(window as any).editingPaymentIndex]?.amount || 0)
                  : getRemainingAmount()
              )}
            </div>
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-semibold text-slate-700">฿</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="pl-8 text-lg h-12"
                  step="0.01"
                  min="0"
                  max={
                    (window as any).editingPaymentIndex !== undefined 
                      ? getRemainingAmount() + (splitPayments[(window as any).editingPaymentIndex]?.amount || 0)
                      : getRemainingAmount()
                  }
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleAmountCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAmountConfirm}
                  className="flex-1"
                  disabled={!inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > (
                    (window as any).editingPaymentIndex !== undefined 
                      ? getRemainingAmount() + (splitPayments[(window as any).editingPaymentIndex]?.amount || 0)
                      : getRemainingAmount()
                  )}
                >
                  {(window as any).editingPaymentIndex !== undefined ? 'Update Payment' : 'Add Payment'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};