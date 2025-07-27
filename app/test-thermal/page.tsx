'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, TestTube, Receipt, CheckCircle, XCircle } from 'lucide-react';

export default function ThermalTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('R20250726-0143');
  const [lastResult, setLastResult] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isUsingRealData, setIsUsingRealData] = useState(false);


  const generatePreview = async () => {
    try {
      setIsLoading(true);
      
      // Try to fetch actual receipt data first
      let receiptData = null;
      if (receiptNumber.trim()) {
        try {
          const response = await fetch('/api/pos/receipts/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiptNumber: receiptNumber.trim() })
          });
          
          if (response.ok) {
            receiptData = await response.json();
            setIsUsingRealData(true);
          }
        } catch (error) {
          console.log('No actual receipt found, using sample data');
          setIsUsingRealData(false);
        }
      } else {
        setIsUsingRealData(false);
      }
      
      // Generate preview with exact same formatting as thermal printer
      const preview = generateThermalPreview(receiptData);
      setPreviewContent(preview);
      
    } finally {
      setIsLoading(false);
    }
  };

  const generateThermalPreview = (data: any) => {
    const width = 48; // 80mm thermal printer width
    
    // Use actual data or fallback to sample, but clean up Unknown Items
    let receiptInfo;
    if (data && data.items && data.items.length > 0) {
      // Use real data but fix Unknown Items
      receiptInfo = {
        ...data,
        items: data.items.map((item: any, index: number) => ({
          ...item,
          name: item.name && item.name !== 'Unknown Item' ? item.name : `Menu Item ${index + 1}`
        }))
      };
    } else {
      // Use sample golf-themed data
      receiptInfo = {
        receiptNumber: receiptNumber || 'R20250726-0143',
        items: [
          { name: 'Golf Club Sandwich', price: 180.00, qty: 1 },
          { name: 'Tee Time Special', price: 250.00, qty: 2 },
          { name: 'Fairway Fresh Juice', price: 120.00, qty: 1 }
        ],
        subtotal: 542.99,
        tax: 38.01,
        total: 581.00,
        paymentMethods: [{ method: 'Cash', amount: 581.00 }],
        tableNumber: '12',
        customerName: 'Golf Member',
        staffName: 'Test Staff'
      };
    }

    const lines: string[] = [];
    
    // Company name (larger effect)
    lines.push(centerText('L E N G O L F   C O .   L T D .', width));
    lines.push('');
    
    // Business info
    lines.push(centerText('540 Mercury Tower, 4th Floor, Unit 407', width));
    lines.push(centerText('Ploenchit Road, Lumpini, Pathumwan', width));
    lines.push(centerText('Bangkok 10330', width));
    lines.push(centerText('TAX ID: 0105566207013', width));
    lines.push('');
    
    // TAX INVOICE (ABB) - Bold and prominent
    lines.push(centerText('TAX INVOICE (ABB)', width));
    lines.push('------------------------------------------------');
    
    // Receipt details - left aligned
    lines.push(`Receipt No: ${receiptInfo.receiptNumber}`);
    
    // Remove table number display
    if (receiptInfo.staffName) {
      lines.push(`Staff: ${receiptInfo.staffName}`);
    }
    
    // Guest count from actual data
    const guestCount = (data && data.paxCount) ? data.paxCount : (receiptInfo.paxCount || 1);
    lines.push(`Guests: ${guestCount}`);
    
    // Date on left, time on right (same line) - use transaction date if available
    const transactionDate = (data && data.transactionDate) ? new Date(data.transactionDate) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const totalLength = dateText.length + timeText.length;
    const spacing = ' '.repeat(Math.max(1, width - totalLength));
    lines.push(`${dateText}${spacing}${timeText}`);
    
    lines.push('------------------------------------------------');
    
    // Items - consistent 48-character width
    receiptInfo.items.forEach((item: any) => {
      const qty = item.qty || 1;
      const itemTotal = item.price * qty;
      const qtyStr = qty.toString();
      const priceStr = itemTotal.toFixed(2);
      const nameMaxLength = width - qtyStr.length - priceStr.length - 4;
      const itemName = item.name.length > nameMaxLength ? 
        item.name.substring(0, nameMaxLength - 3) + '...' : item.name;
      
      const spaces = ' '.repeat(Math.max(1, width - qtyStr.length - 4 - itemName.length - priceStr.length));
      lines.push(`${qtyStr}    ${itemName}${spaces}${priceStr}`);
    });
    
    lines.push('------------------------------------------------');
    
    // Items count
    const itemCount = receiptInfo.items.reduce((sum: number, item: any) => sum + (item.qty || 1), 0);
    lines.push(`Items: ${itemCount}`);
    lines.push('');
    
    // Totals section - labels aligned to left, amounts to right like restaurant example
    const leftAlign = 20; // Position where labels start
    
    // Subtotal
    const subtotalAmount = receiptInfo.subtotal.toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Subtotal:${' '.repeat(width - leftAlign - 9 - subtotalAmount.length)}${subtotalAmount}`);
    
    // VAT
    const vatAmount = receiptInfo.tax.toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}VAT(7%):${' '.repeat(width - leftAlign - 8 - vatAmount.length)}${vatAmount}`);
    
    // Double line under VAT (before Total) - full width to right
    lines.push(`${' '.repeat(leftAlign)}============================`);
    
    // Total
    const totalAmount = receiptInfo.total.toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Total:${' '.repeat(width - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    
    lines.push('');
    
    // Single line before payment
    lines.push('------------------------------------------------');
    
    // Payment methods - payment method on left, amount on right (like Master Card BBL style)
    receiptInfo.paymentMethods.forEach((payment: any, index: number) => {
      const methodText = payment.method;
      const amountText = payment.amount.toFixed(2);
      const spacing = ' '.repeat(Math.max(1, width - methodText.length - amountText.length));
      lines.push(`${methodText}${spacing}${amountText}`);
    });
    
    // Single line only - remove extra line after payment
    lines.push('------------------------------------------------');
    lines.push('');
    
    // Footer - centered
    lines.push(centerText('Thank you for dining with us!', width));
    lines.push('');
    lines.push(centerText('May your next round be under par!', width));
    lines.push(centerText('www.len.golf', width));
    lines.push('');
    
    lines.push(centerText(`Generated: ${new Date().toLocaleString('th-TH')}`, width));
    lines.push(centerText('Powered by Lengolf POS System', width));
    lines.push('================================================');
    
    // Extra lines for cutting
    lines.push('', '', '', '', '', '');
    
    return lines.join('\n');
  };

  // Helper functions matching thermal printer
  const centerText = (text: string, width: number): string => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const padText = (left: string, center: string, right: string, width: number): string => {
    const rightLen = right.length;
    const leftLen = left.length;
    const centerLen = center.length;
    
    const availableSpace = width - rightLen - leftLen;
    const centerPadding = Math.max(0, availableSpace - centerLen);
    
    return left + center + ' '.repeat(centerPadding) + right;
  };

  const testWin32Printer = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pos/print-win32', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPrint: true })
      });
      
      const result = await response.json();
      setLastResult(result);
      
      if (result.success) {
        alert('✅ Test page printed via Python win32print!');
      } else {
        alert('❌ Win32 test failed: ' + result.message);
      }
    } catch (error) {
      alert('❌ Win32 test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };


  const printReceiptWin32 = async () => {
    if (!receiptNumber.trim()) {
      alert('Please enter a receipt number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pos/print-win32', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber: receiptNumber.trim() })
      });
      
      const result = await response.json();
      setLastResult(result);
      
      if (result.success) {
        alert(`✅ Receipt ${result.receiptNumber} printed via Python win32print!`);
      } else {
        alert('❌ Win32 print failed: ' + result.message);
      }
    } catch (error) {
      alert('❌ Win32 print failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Printer className="w-8 h-8 text-blue-600" />
            LENGOLF Thermal Printer Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test your LENGOLF thermal printer and preview Thailand ABB format receipts.
          </p>

          <div className="space-y-6">
            {/* Receipt Preview */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-600" />
                Receipt Preview
              </h2>
              <p className="text-gray-600 mb-4">
                Preview how the thermal receipt will look when printed.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Label htmlFor="previewReceipt">Receipt Number (for real data)</Label>
                    <Input
                      id="previewReceipt"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="e.g. R20250726-0143"
                      className="font-mono"
                    />
                  </div>
                  <Button
                    onClick={generatePreview}
                    disabled={isLoading}
                    className="h-12 text-lg bg-gray-600 hover:bg-gray-700 mt-6"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Generate Preview'
                    )}
                  </Button>
                </div>
                
                {previewContent && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {isUsingRealData ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Using real receipt data</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">Using sample golf club data</span>
                        </>
                      )}
                    </div>
                    <div className="bg-black text-green-400 border border-gray-300 rounded p-4 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96">
                      {previewContent}
                    </div>
                    <p className="text-sm text-gray-600">
                      ↑ Exact 80mm thermal printer output (48 characters wide)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Test Printer - Win32Print Method */}
            <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                Test LENGOLF Printer
              </h2>
              <p className="text-gray-600 mb-4">
                Test LENGOLF printer using Python win32print - same method as your working solution.
              </p>
              <Button
                onClick={testWin32Printer}
                disabled={isLoading}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Testing Printer...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5 mr-2" />
                    Test Printer
                  </>
                )}
              </Button>
            </div>

            {/* Print Receipt */}
            <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-600" />
                Print Receipt
              </h2>
              <p className="text-gray-600 mb-4">
                Print any existing receipt by entering its receipt number.
              </p>
              
              <Button
                onClick={printReceiptWin32}
                disabled={isLoading || !receiptNumber.trim()}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 mr-2" />
                    Print Receipt: {receiptNumber}
                  </>
                )}
              </Button>
            </div>

            {/* Last Result */}
            {lastResult && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  {lastResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  Last Result
                </h2>
                
                <div className={`p-4 rounded ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="space-y-2">
                    <div><strong>Status:</strong> {lastResult.success ? 'Success' : 'Failed'}</div>
                    <div><strong>Message:</strong> {lastResult.message}</div>
                    {lastResult.receiptNumber && (
                      <div><strong>Receipt:</strong> {lastResult.receiptNumber}</div>
                    )}
                    {lastResult.total && (
                      <div><strong>Total:</strong> ฿{lastResult.total}</div>
                    )}
                    <div><strong>Printer:</strong> {lastResult.printerName || 'LENGOLF'}</div>
                    {lastResult.method && (
                      <div><strong>Method:</strong> {lastResult.method}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="border border-gray-200 rounded-lg p-6 bg-yellow-50">
              <h2 className="text-xl font-semibold mb-4">ℹ️ Information</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <div><strong>Printer Name:</strong> LENGOLF</div>
                <div><strong>Format:</strong> 80mm thermal receipt (ESC/POS)</div>
                <div><strong>Tax Format:</strong> Thailand ABB (Abbreviated Tax Invoice)</div>
                <div><strong>Method:</strong> Python win32print (working solution)</div>
                <div><strong>Prerequisites:</strong> Install Python + pywin32 (pip install pywin32)</div>
                <div><strong>Company:</strong> LENGOLF CO. LTD. (TAX ID: 0105566207013)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}