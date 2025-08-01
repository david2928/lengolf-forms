'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceiptFormatter, type ReceiptData } from '@/lib/receipt-formatter';
import { Printer, Download, Eye, EyeOff, FileText } from 'lucide-react';

// Simple HTML receipt generator for preview component
function generateHTMLReceipt(receiptData: ReceiptData, language: 'th' | 'en' = 'en'): string {
  const receiptType = receiptData.isTaxInvoice ? 'TAX INVOICE (ORIGINAL)' : 'TAX INVOICE (ABB)';
  const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${receiptType} - ${receiptData.receiptNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .receipt-type { font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 5px; }
    .details { margin: 20px 0; }
    .items { margin: 20px 0; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 20px; text-align: right; }
    .total-line { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 5px; }
    .footer { margin-top: 30px; text-align: center; font-style: italic; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">LENGOLF CO. LTD.</div>
    <div>540 Mercury Tower, 4th Floor, Unit 407</div>
    <div>Ploenchit Road, Lumpini, Pathumwan</div>
    <div>Bangkok 10330</div>
    <div>TAX ID: 0105566207013</div>
    <br>
    <div class="receipt-type">${receiptType}</div>
  </div>
  
  <div class="details">
    <strong>Receipt No:</strong> ${receiptData.receiptNumber}<br>
    <strong>Date:</strong> ${transactionDate.toLocaleDateString('en-GB')} ${transactionDate.toLocaleTimeString('en-GB', { hour12: false })}<br>
    ${receiptData.staffName ? `<strong>Staff:</strong> ${receiptData.staffName}<br>` : ''}
    <strong>Guests:</strong> ${receiptData.paxCount || 1}
  </div>
  
  <div class="items">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${receiptData.items.map(item => `
          <tr>
            <td>${item.name}${item.notes ? `<br><small><em>${item.notes}</em></small>` : ''}</td>
            <td>${item.qty}</td>
            <td>฿${item.price.toFixed(2)}</td>
            <td>฿${(item.price * item.qty).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="totals">
    <div>Subtotal: ฿${receiptData.subtotal.toFixed(2)}</div>
    ${receiptData.receiptDiscountAmount && receiptData.receiptDiscountAmount > 0 ? `<div>Discount: -฿${receiptData.receiptDiscountAmount.toFixed(2)}</div>` : ''}
    <div>VAT (7%): ฿${receiptData.tax.toFixed(2)}</div>
    <div class="total-line">Total: ฿${receiptData.total.toFixed(2)}</div>
    
    <div style="margin-top: 20px;">
      <strong>Payment:</strong><br>
      ${receiptData.paymentMethods.map(payment => 
        `${payment.method}: ฿${payment.amount.toFixed(2)}`
      ).join('<br>')}
    </div>
  </div>
  
  <div class="footer">
    <p>You're tee-rific. Come back soon!</p>
    <p>Tel: 096-668-2335 | @lengolf</p>
    <p>www.len.golf</p>
    <p><small>Generated: ${new Date().toLocaleString('th-TH')}<br>
    Powered by Lengolf POS System</small></p>
  </div>
</body>
</html>
  `.trim();
}

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
    const htmlContent = generateHTMLReceipt(receiptData, language);
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
    const htmlContent = generateHTMLReceipt(receiptData, language);
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
      // Generate ESC/POS thermal content and convert to text
      const escposData = ReceiptFormatter.generateESCPOSData(receiptData);
      const thermalContent = Array.from(escposData)
        .map(byte => String.fromCharCode(byte))
        .join('');
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
          <h2 className="text-lg font-bold">LENGOLF CO. LTD.</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div>540 Mercury Tower, 4th Floor, Unit 407</div>
            <div>Ploenchit Road, Lumpini, Pathumwan</div>
            <div>Bangkok 10330</div>
            <div>Tax ID: 0105566207013</div>
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
            <span>{receiptData.transactionDate ? formatDateTime(new Date(receiptData.transactionDate)) : formatDateTime(new Date())}</span>
          </div>
          {receiptData.tableNumber && (
            <div className="flex justify-between">
              <span>Table:</span>
              <span>{receiptData.tableNumber}</span>
            </div>
          )}
          {receiptData.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{receiptData.customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Staff:</span>
            <span>{receiptData.staffName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-gray-300 pt-3 mb-4">
          <div className="space-y-3">
            {receiptData.items.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-600">
                      {item.qty} × {formatCurrency(item.price)}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(item.price * item.qty)}
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
            <span>{formatCurrency(receiptData.subtotal)}</span>
          </div>
          {receiptData.receiptDiscountAmount && receiptData.receiptDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount:</span>
              <span>-{formatCurrency(receiptData.receiptDiscountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>VAT (7%):</span>
            <span>{formatCurrency(receiptData.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(receiptData.total)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-300 pt-3 mb-4">
          <div className="font-medium text-sm mb-2">Payment:</div>
          <div className="space-y-1">
            {receiptData.paymentMethods.map((payment, index) => (
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
            You&apos;re tee-rific. Come back soon!
          </div>
          <div className="text-xs text-gray-600 mb-1">
            Tel: 096-668-2335 | @lengolf
          </div>
          <div className="text-xs text-gray-600 mb-2">
            www.len.golf
          </div>
          <div className="text-xs text-gray-500">
            Generated: {formatDateTime(new Date())}<br/>
            Powered by Lengolf POS System
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
              {formatCurrency(receiptData.total)}
            </div>
            <div className="text-sm text-blue-700">Total Amount</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {receiptData.items.length}
            </div>
            <div className="text-sm text-blue-700">Items</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {receiptData.paymentMethods.length}
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