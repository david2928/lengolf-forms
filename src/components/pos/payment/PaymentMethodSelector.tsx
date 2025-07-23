'use client';

import React from 'react';
import { PaymentMethod } from '@/types/payment';
import { PAYMENT_METHOD_CONFIGS } from '@/config/payment-methods';
import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, QrCode, Smartphone } from 'lucide-react';

interface PaymentMethodSelectorProps {
  availableMethods: PaymentMethod[];
  onMethodSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  availableMethods,
  onMethodSelect,
  disabled = false
}) => {
  
  const getMethodIcon = (method: PaymentMethod) => {
    const config = PAYMENT_METHOD_CONFIGS[method];
    const className = "h-8 w-8";
    
    switch (config.icon) {
      case 'Banknote':
        return <Banknote className={className} />;
      case 'CreditCard':
        return <CreditCard className={className} />;
      case 'QrCode':
        return <QrCode className={className} />;
      case 'Smartphone':
        return <Smartphone className={className} />;
      default:
        return <CreditCard className={className} />;
    }
  };

  const getMethodColor = (method: PaymentMethod) => {
    const config = PAYMENT_METHOD_CONFIGS[method];
    return config.color;
  };

  const getMethodDescription = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH:
        return 'Cash payment with change calculation';
      case PaymentMethod.VISA_MANUAL:
        return 'Process via EDC machine';
      case PaymentMethod.MASTERCARD_MANUAL:
        return 'Process via EDC machine';
      case PaymentMethod.PROMPTPAY_MANUAL:
        return 'QR code payment via Thai banks';
      case PaymentMethod.ALIPAY:
        return 'Scan customer QR code';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">
          Choose how the customer will pay for this order
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableMethods.map((method) => {
          const config = PAYMENT_METHOD_CONFIGS[method];
          
          return (
            <Button
              key={method}
              variant="outline"
              className={`
                h-auto p-6 flex flex-col items-center space-y-3 
                border-2 transition-all duration-200
                hover:border-blue-300 hover:bg-blue-50
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${disabled ? 'pointer-events-none' : ''}
              `}
              onClick={() => onMethodSelect(method)}
              disabled={disabled}
            >
              <div className={`
                rounded-full p-4 text-white transition-colors
                ${getMethodColor(method)}
              `}>
                {getMethodIcon(method)}
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-lg">
                  {config.displayName}
                </h3>
                <p className="text-sm text-gray-600">
                  {getMethodDescription(method)}
                </p>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Payment Method Features */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Payment Features</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Split payments available for groups</li>
          <li>• Automatic receipt generation</li>
          <li>• Real-time payment tracking</li>
          <li>• Integration with existing analytics</li>
        </ul>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">5</div>
          <div className="text-sm text-gray-600">Payment Methods</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">✓</div>
          <div className="text-sm text-gray-600">Split Payments</div>
        </div>
      </div>
    </div>
  );
};