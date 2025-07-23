'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/pos';
import { BillSplit, BillSplitType, PaymentAllocation } from '@/types/payment';
import { useBillSplitting } from '@/hooks/useBillSplitting';
import { SplitTypeSelector } from './SplitTypeSelector';
import { ItemAllocationGrid } from './ItemAllocationGrid';
import { SplitSummary } from './SplitSummary';
import { X, ArrowLeft, Users, Calculator, Receipt } from 'lucide-react';

interface BillSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSplitComplete: (paymentAllocations: PaymentAllocation[], billSplit: BillSplit) => void;
}

type SplitStep = 'type-selection' | 'configuration' | 'review' | 'payment-allocation';

export const BillSplitModal: React.FC<BillSplitModalProps> = ({
  isOpen,
  onClose,
  order,
  onSplitComplete
}) => {
  const [currentStep, setCurrentStep] = useState<SplitStep>('type-selection');
  const [selectedSplitType, setSelectedSplitType] = useState<BillSplitType | null>(null);

  const {
    billSplit,
    createEvenSplit,
    createItemBasedSplit,
    createCustomAmountSplit,
    updateSplitPaymentMethod,
    clearSplit,
    isValid,
    errors,
    canProcessPayment,
    getPaymentAllocations
  } = useBillSplitting(order.items, order.totalAmount);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep('type-selection');
      setSelectedSplitType(null);
      clearSplit();
    }
  }, [isOpen, clearSplit]);

  const handleSplitTypeSelect = (splitType: BillSplitType) => {
    setSelectedSplitType(splitType);
    setCurrentStep('configuration');
  };

  const handleSplitConfiguration = (config: any) => {
    switch (selectedSplitType) {
      case BillSplitType.EVEN:
        createEvenSplit(config.numberOfPeople, config.defaultPaymentMethod);
        break;
      case BillSplitType.BY_ITEM:
        createItemBasedSplit(config.itemAllocations, config.defaultPaymentMethod);
        break;
      case BillSplitType.BY_AMOUNT:
        createCustomAmountSplit(config.customAmounts, config.defaultPaymentMethod);
        break;
    }
    setCurrentStep('review');
  };

  const handleReviewComplete = () => {
    setCurrentStep('payment-allocation');
  };

  const handlePaymentComplete = () => {
    if (!billSplit || !canProcessPayment) return;
    
    const paymentAllocations = getPaymentAllocations();
    onSplitComplete(paymentAllocations, billSplit);
    onClose();
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'configuration':
        setCurrentStep('type-selection');
        setSelectedSplitType(null);
        clearSplit();
        break;
      case 'review':
        setCurrentStep('configuration');
        break;
      case 'payment-allocation':
        setCurrentStep('review');
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'type-selection':
        return 'Split Bill';
      case 'configuration':
        return `Configure ${selectedSplitType === BillSplitType.EVEN ? 'Even' : selectedSplitType === BillSplitType.BY_ITEM ? 'Item-Based' : 'Custom Amount'} Split`;
      case 'review':
        return 'Review Split';
      case 'payment-allocation':
        return 'Payment Methods';
      default:
        return 'Split Bill';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'type-selection':
        return <Users className="h-6 w-6" />;
      case 'configuration':
        return <Calculator className="h-6 w-6" />;
      case 'review':
      case 'payment-allocation':
        return <Receipt className="h-6 w-6" />;
      default:
        return <Users className="h-6 w-6" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type-selection':
        return (
          <SplitTypeSelector
            totalAmount={order.totalAmount}
            itemCount={order.items.length}
            onSplitTypeSelect={handleSplitTypeSelect}
          />
        );

      case 'configuration':
        return (
          <div className="space-y-6">
            {selectedSplitType === BillSplitType.EVEN && (
              <EvenSplitConfiguration
                totalAmount={order.totalAmount}
                onComplete={handleSplitConfiguration}
                onCancel={handleBack}
              />
            )}
            
            {selectedSplitType === BillSplitType.BY_ITEM && (
              <ItemAllocationGrid
                orderItems={order.items}
                totalAmount={order.totalAmount}
                onComplete={handleSplitConfiguration}
                onCancel={handleBack}
              />
            )}
            
            {selectedSplitType === BillSplitType.BY_AMOUNT && (
              <CustomAmountConfiguration
                totalAmount={order.totalAmount}
                onComplete={handleSplitConfiguration}
                onCancel={handleBack}
              />
            )}
          </div>
        );

      case 'review':
        return (
          <SplitSummary
            billSplit={billSplit}
            order={order}
            isValid={isValid}
            errors={errors}
            onConfirm={handleReviewComplete}
            onBack={handleBack}
            onUpdatePaymentMethod={updateSplitPaymentMethod}
          />
        );

      case 'payment-allocation':
        return (
          <PaymentAllocationView
            billSplit={billSplit}
            onComplete={handlePaymentComplete}
            onBack={handleBack}
            canProcessPayment={canProcessPayment}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {currentStep !== 'type-selection' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div className="rounded-full bg-blue-600 p-2 text-white">
              {getStepIcon()}
            </div>
            
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
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Order Total</span>
            <span className="text-lg font-bold">฿{order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="text-sm text-gray-600 grid grid-cols-3 gap-4">
            <div>Items: {order.items.length}</div>
            <div>Subtotal: ฿{order.subtotal.toFixed(2)}</div>
            <div>VAT: ฿{order.vatAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <h4 className="font-medium text-red-900 mb-1">Issues Found:</h4>
            <ul className="text-red-600 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Sub-components for different split configurations
const EvenSplitConfiguration: React.FC<{
  totalAmount: number;
  onComplete: (config: any) => void;
  onCancel: () => void;
}> = ({ totalAmount, onComplete, onCancel }) => {
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  
  const amountPerPerson = totalAmount / numberOfPeople;
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Number of People</label>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNumberOfPeople(Math.max(2, numberOfPeople - 1))}
            disabled={numberOfPeople <= 2}
          >
            -
          </Button>
          <span className="text-xl font-bold w-12 text-center">{numberOfPeople}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNumberOfPeople(Math.min(10, numberOfPeople + 1))}
            disabled={numberOfPeople >= 10}
          >
            +
          </Button>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Split Preview</h4>
        <div className="text-blue-800">
          <div>Each person pays: <span className="font-bold">฿{amountPerPerson.toFixed(2)}</span></div>
          <div className="text-sm mt-1">Total: ฿{totalAmount.toFixed(2)} ÷ {numberOfPeople} people</div>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => onComplete({ numberOfPeople })}
          className="flex-1"
        >
          Create Even Split
        </Button>
      </div>
    </div>
  );
};

const CustomAmountConfiguration: React.FC<{
  totalAmount: number;
  onComplete: (config: any) => void;
  onCancel: () => void;
}> = ({ totalAmount, onComplete, onCancel }) => {
  const [customAmounts, setCustomAmounts] = useState([
    { personId: 'person-1', amount: 0, customerInfo: 'Person 1' },
    { personId: 'person-2', amount: 0, customerInfo: 'Person 2' }
  ]);
  
  const totalAllocated = customAmounts.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalAllocated;
  const isValid = Math.abs(remaining) < 0.01;
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {customAmounts.map((person, index) => (
          <div key={person.personId} className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                {person.customerInfo}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">฿</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={person.amount}
                  onChange={(e) => {
                    const newAmounts = [...customAmounts];
                    newAmounts[index].amount = parseFloat(e.target.value) || 0;
                    setCustomAmounts(newAmounts);
                  }}
                  className="pl-8 pr-4 py-2 border rounded-lg w-full"
                />
              </div>
            </div>
            {customAmounts.length > 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomAmounts(customAmounts.filter((_, i) => i !== index));
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <Button
        variant="outline"
        onClick={() => {
          const newPerson = {
            personId: `person-${customAmounts.length + 1}`,
            amount: 0,
            customerInfo: `Person ${customAmounts.length + 1}`
          };
          setCustomAmounts([...customAmounts, newPerson]);
        }}
        disabled={customAmounts.length >= 10}
      >
        Add Person
      </Button>
      
      <div className={`rounded-lg p-4 ${isValid ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex justify-between items-center">
          <span>Total Allocated:</span>
          <span className="font-bold">฿{totalAllocated.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Remaining:</span>
          <span className={`font-bold ${remaining > 0 ? 'text-orange-600' : remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ฿{remaining.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => onComplete({ customAmounts })}
          disabled={!isValid}
          className="flex-1"
        >
          Create Custom Split
        </Button>
      </div>
    </div>
  );
};

const PaymentAllocationView: React.FC<{
  billSplit: BillSplit | null;
  onComplete: () => void;
  onBack: () => void;
  canProcessPayment: boolean;
}> = ({ billSplit, onComplete, onBack, canProcessPayment }) => {
  if (!billSplit) return null;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Ready to Process Split Payment</h3>
        <p className="text-gray-600">
          The bill has been split into {billSplit.splits.length} parts. 
          Each person can pay using their preferred method.
        </p>
      </div>
      
      <div className="space-y-3">
        {billSplit.splits.map((split, index) => (
          <div key={split.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{split.customerInfo}</div>
                <div className="text-sm text-gray-600">{split.paymentMethod}</div>
              </div>
              <div className="text-lg font-bold">
                ฿{split.amount.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={onComplete}
          disabled={!canProcessPayment}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Process Split Payment
        </Button>
      </div>
    </div>
  );
};