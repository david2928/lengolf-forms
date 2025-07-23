'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceiptData } from '@/types/payment';
import { receiptGenerator } from '@/services/ReceiptGenerator';
import { Printer, Download, Eye, EyeOff, FileText } from 'lucide-react';

interface ReceiptPreviewProps {
  receiptData: ReceiptData;
  onPrint?: () => void;
  onDownload?: () => void;
  className?: string;
  showActions?: boolean;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receiptData,
  onPrint,
  onDownload,
  className = '',
  showActions = true
}) => {
  const [language, setLanguage] = useState<'th' | 'en'>('en');
  const [format, setFormat] = useState<'standard' | 'thermal'>('standard');
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrint = () => {
    const htmlContent = receiptGenerator.generateHTMLReceipt(receiptData, language);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    onPrint?.();
  };

  const handleDownload = () => {
    const htmlContent = receiptGenerator.generateHTMLReceipt(receiptData, language);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData.receiptNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderReceiptContent = () => {
    if (format === 'thermal') {
      const thermalContent = receiptGenerator.generateThermalReceipt(receiptData, language);
      return (
        <div className="bg-white border rounded-lg p-4">
          <div className="font-mono text-xs whitespace-pre-wrap bg-gray-50 p-4 rounded border">
            {thermalContent}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-lg p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
          <h2 className="text-lg font-bold">{receiptData.businessInfo.name}</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div>{receiptData.businessInfo.address}</div>
            <div>Tax ID: {receiptData.businessInfo.taxId}</div>
            <div>Tel: {receiptData.businessInfo.phone}</div>
          </div>
        </div>

        {/* Receipt Info */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Receipt No:</span>
            <span className="font-medium">{receiptData.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDateTime(receiptData.transaction.date)}</span>
          </div>
          {receiptData.transaction.tableNumber && (
            <div className="flex justify-between">
              <span>Table:</span>
              <span>{receiptData.transaction.tableNumber}</span>
            </div>
          )}
          {receiptData.transaction.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{receiptData.transaction.customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Staff:</span>
            <span>{receiptData.transaction.staffName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-gray-300 pt-3 mb-4">
          <div className="space-y-3">
            {receiptData.transaction.items.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-600">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
                {item.notes && (
                  <div className="text-xs text-gray-500 italic ml-2">
                    Note: {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-300 pt-3 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(receiptData.transaction.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT (7%):</span>
            <span>{formatCurrency(receiptData.transaction.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(receiptData.transaction.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-300 pt-3 mb-4">
          <div className="font-medium text-sm mb-2">Payment:</div>
          <div className="space-y-1">
            {receiptData.transaction.paymentMethods.map((payment, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{payment.method}:</span>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t-2 border-gray-300 pt-4 text-sm">
          <div className="font-medium mb-2">
            {receiptData.footer.thankYouMessage}
          </div>
          {receiptData.footer.returnPolicy && (
            <div className="text-xs text-gray-600 mb-2">
              Return Policy: {receiptData.footer.returnPolicy}
            </div>
          )}
          <div className="text-xs text-gray-500">
            Generated: {formatDateTime(new Date())}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      {showActions && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Receipt Preview</span>
            </div>
            
            <Select value={language} onValueChange={(value: 'th' | 'en') => setLanguage(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="th">ไทย</SelectItem>
              </SelectContent>
            </Select>

            <Select value={format} onValueChange={(value: 'standard' | 'thermal') => setFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="thermal">Thermal</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2"
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            
            <Button
              onClick={handlePrint}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
          </div>
        </div>
      )}

      {/* Receipt Summary (always visible) */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-900">{receiptData.receiptNumber}</div>
            <div className="text-sm text-blue-700">Receipt No</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(receiptData.transaction.totalAmount)}
            </div>
            <div className="text-sm text-blue-700">Total Amount</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {receiptData.transaction.items.length}
            </div>
            <div className="text-sm text-blue-700">Items</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {receiptData.transaction.paymentMethods.length}
            </div>
            <div className="text-sm text-blue-700">Payment Methods</div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      {(isExpanded || !showActions) && (
        <div className="border rounded-lg p-4 bg-gray-50">
          {renderReceiptContent()}
        </div>
      )}
    </div>
  );
};