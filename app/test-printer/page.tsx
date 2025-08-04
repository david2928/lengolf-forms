'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bluetooth, Printer, TestTube, CheckCircle, XCircle, Usb, Smartphone, Eye, FileText, Receipt, VolumeX, Volume2 } from 'lucide-react';
import { bluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { usbThermalPrinter } from '@/services/USBThermalPrinter';
import { unifiedPrintService, PrintType } from '@/services/UnifiedPrintService';

export default function UnifiedPrinterTestPage() {
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean>(false);
  const [usbSupported, setUSBSupported] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);
  const [usbConnected, setUSBConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bluetoothDeviceInfo, setBluetoothDeviceInfo] = useState<any>(null);
  const [usbDeviceInfo, setUSBDeviceInfo] = useState<any>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>('R20250727-0146');
  const [tableSessionId, setTableSessionId] = useState<string>('1');
  const [lastResult, setLastResult] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<'bluetooth' | 'usb'>('bluetooth');
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'abb' | 'original' | 'bill'>('abb');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [silentMode, setSilentMode] = useState<boolean>(false);

  useEffect(() => {
    // Check support for both printer types
    const checkSupport = () => {
      try {
        const btSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
        const usbSupported = typeof navigator !== 'undefined' && 'usb' in navigator;
        
        setBluetoothSupported(btSupported);
        setUSBSupported(usbSupported);
        
        // Check connection status
        setBluetoothConnected(bluetoothThermalPrinter.getConnectionStatus());
        setUSBConnected(usbThermalPrinter.getConnectionStatus());
        
        // Get device info if connected
        if (bluetoothThermalPrinter.getConnectionStatus()) {
          setBluetoothDeviceInfo(bluetoothThermalPrinter.getDeviceInfo());
        }
        if (usbThermalPrinter.getConnectionStatus()) {
          setUSBDeviceInfo(usbThermalPrinter.getDeviceInfo());
        }
      } catch (error) {
        console.error('Error checking printer support:', error);
      }
    };

    checkSupport();
    const interval = setInterval(checkSupport, 1000);
    return () => clearInterval(interval);
  }, []);

  const connectBluetooth = async () => {
    setIsLoading(true);
    try {
      const success = await bluetoothThermalPrinter.connect();
      if (success) {
        setBluetoothConnected(true);
        setBluetoothDeviceInfo(bluetoothThermalPrinter.getDeviceInfo());
        setLastResult({ success: true, message: 'Bluetooth printer connected successfully!' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Bluetooth connection failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const connectUSB = async () => {
    setIsLoading(true);
    try {
      const success = await usbThermalPrinter.connect();
      if (success) {
        setUSBConnected(true);
        setUSBDeviceInfo(usbThermalPrinter.getDeviceInfo());
        setLastResult({ success: true, message: 'USB printer connected successfully!' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `USB connection failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectBluetooth = async () => {
    setIsLoading(true);
    try {
      await bluetoothThermalPrinter.disconnect();
      setBluetoothConnected(false);
      setBluetoothDeviceInfo(null);
      setLastResult({ success: true, message: 'Bluetooth printer disconnected' });
    } catch (error) {
      setLastResult({ success: false, message: `Disconnect failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectUSB = async () => {
    setIsLoading(true);
    try {
      await usbThermalPrinter.disconnect();
      setUSBConnected(false);
      setUSBDeviceInfo(null);
      setLastResult({ success: true, message: 'USB printer disconnected' });
    } catch (error) {
      setLastResult({ success: false, message: `Disconnect failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const testPrintBluetooth = async () => {
    if (!bluetoothConnected) {
      setLastResult({ success: false, message: 'Please connect to Bluetooth printer first' });
      return;
    }

    setIsLoading(true);
    try {
      await bluetoothThermalPrinter.testPrint();
      if (!silentMode) {
        setLastResult({ success: true, message: 'Bluetooth test print sent successfully!' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Test print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const testPrintUSB = async () => {
    if (!usbConnected) {
      setLastResult({ success: false, message: 'Please connect to USB printer first' });
      return;
    }

    setIsLoading(true);
    try {
      await usbThermalPrinter.testPrint();
      if (!silentMode) {
        setLastResult({ success: true, message: 'USB test print sent successfully!' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Test print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const printReceiptBluetooth = async () => {
    if (!bluetoothConnected) {
      setLastResult({ success: false, message: 'Please connect to Bluetooth printer first' });
      return;
    }

    if (!receiptNumber) {
      setLastResult({ success: false, message: 'Please enter a receipt number' });
      return;
    }

    setIsLoading(true);
    try {
      // Call API to get receipt data
      const response = await fetch('/api/pos/print-bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber })
      });

      const result = await response.json();
      if (result.success) {
        // Print using the service
        await bluetoothThermalPrinter.printReceipt(result.receiptData);
        if (!silentMode) {
          setLastResult({ success: true, message: `Receipt ${receiptNumber} printed via Bluetooth!` });
        }
      } else {
        setLastResult({ success: false, message: result.error || 'Receipt not found' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const printReceiptUSB = async () => {
    if (!usbConnected) {
      setLastResult({ success: false, message: 'Please connect to USB printer first' });
      return;
    }

    if (!receiptNumber) {
      setLastResult({ success: false, message: 'Please enter a receipt number' });
      return;
    }

    setIsLoading(true);
    try {
      // Call API to get receipt data
      const response = await fetch('/api/pos/print-bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber })
      });

      const result = await response.json();
      if (result.success) {
        // Print using the service
        await usbThermalPrinter.printReceipt(result.receiptData);
        if (!silentMode) {
          setLastResult({ success: true, message: `Receipt ${receiptNumber} printed via USB!` });
        }
      } else {
        setLastResult({ success: false, message: result.error || 'Receipt not found' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const printBillBluetooth = async () => {
    if (!bluetoothConnected) {
      setLastResult({ success: false, message: 'Please connect to Bluetooth printer first' });
      return;
    }

    if (!tableSessionId) {
      setLastResult({ success: false, message: 'Please enter a table session ID' });
      return;
    }

    setIsLoading(true);
    try {
      // Call API to get bill data
      const response = await fetch('/api/pos/print-bill-bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableSessionId })
      });

      const result = await response.json();
      if (result.success) {
        // Print using the service
        await bluetoothThermalPrinter.printReceipt(result.billData);
        if (!silentMode) {
          setLastResult({ success: true, message: `Bill for table session ${tableSessionId} printed via Bluetooth!` });
        }
      } else {
        setLastResult({ success: false, message: result.error || 'Bill not found' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const printBillUSB = async () => {
    if (!usbConnected) {
      setLastResult({ success: false, message: 'Please connect to USB printer first' });
      return;
    }

    if (!tableSessionId) {
      setLastResult({ success: false, message: 'Please enter a table session ID' });
      return;
    }

    setIsLoading(true);
    try {
      // Use unified print service for bill printing
      const result = await unifiedPrintService.print(PrintType.BILL, tableSessionId, { method: 'usb' });
      
      if (result.success) {
        if (!silentMode) {
          setLastResult({ success: true, message: result.message });
        }
      } else {
        setLastResult({ success: false, message: result.error || 'Bill printing failed' });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Print failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const testPrintWithDefaults = async () => {
    setIsLoading(true);
    try {
      if (currentTab === 'bluetooth' && bluetoothConnected) {
        await bluetoothThermalPrinter.testPrintWithDefaults();
        if (!silentMode) {
          setLastResult({ success: true, message: 'Bluetooth test receipt printed with default data!' });
        }
      } else if (currentTab === 'usb' && usbConnected) {
        await usbThermalPrinter.testPrintWithDefaults();
        if (!silentMode) {
          setLastResult({ success: true, message: 'USB test receipt printed with default data!' });
        }
      } else {
        setLastResult({ success: false, message: `Please connect to ${currentTab} printer first` });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Test receipt failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Load preview data for receipt or bill
  const loadPreview = async (type: 'abb' | 'original' | 'bill') => {
    if (type === 'bill') {
      if (!tableSessionId) {
        setLastResult({ success: false, message: 'Please enter a table session ID' });
        return;
      }
    } else {
      if (!receiptNumber) {
        setLastResult({ success: false, message: 'Please enter a receipt number' });
        return;
      }
    }
    
    setIsLoading(true);
    try {
      let response;
      if (type === 'bill') {
        // Get bill data from API  
        response = await fetch(`/api/pos/bills/${tableSessionId}?format=json`);
      } else {
        // Get receipt data from API
        response = await fetch(`/api/pos/receipts/${receiptNumber}?format=json&taxInvoice=${type === 'original'}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        setLastResult({ success: false, message: errorData.error || `Failed to load ${type === 'bill' ? 'bill' : 'receipt'}.` });
        return;
      }
      
      const data = await response.json();
      
      if (data.success && (data.receiptData || data.billData)) {
        const receiptData = data.receiptData || data.billData;
        // Generate thermal preview
        const thermalPreview = generateThermalPreview(receiptData, type === 'original', type === 'bill');
        
        setPreviewData(thermalPreview);
        setPreviewType(type);
        setShowPreview(true);
        if (!silentMode) {
          setLastResult({ 
            success: true, 
            message: `${type === 'bill' ? 'Bill' : type === 'original' ? 'Tax invoice (original)' : 'Tax invoice (ABB)'} preview loaded successfully!` 
          });
        }
      } else {
        setLastResult({ success: false, message: `Failed to load ${type === 'bill' ? 'bill' : 'receipt'} preview. Check if ${type === 'bill' ? 'table session ID' : 'receipt number'} exists.` });
      }
    } catch (error) {
      setLastResult({ success: false, message: `Preview failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate thermal preview exactly like TaxInvoiceModal does
  const generateThermalPreview = (receiptData: any, isTaxInvoice: boolean = false, isBill: boolean = false) => {
    const width = 48; // 80mm thermal printer width
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
    
    // Receipt type
    if (isTaxInvoice) {
      lines.push(centerText('TAX INVOICE (ORIGINAL)', width));
    } else if (isBill) {
      lines.push(centerText('BILL', width));
    } else {
      lines.push(centerText('TAX INVOICE (ABB)', width));
    }
    lines.push('------------------------------------------------');
    
    // Receipt details
    if (!isBill) {
      lines.push(`Receipt No: ${receiptData.receiptNumber}`);
    }
    
    if (receiptData.staffName) {
      lines.push(`Staff: ${receiptData.staffName}`);
    }
    
    // Guest count
    const guestCount = receiptData.paxCount || 1;
    lines.push(`Guests: ${guestCount}`);
    
    // Date and time
    const transactionDate = receiptData.transactionDate ? new Date(receiptData.transactionDate) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const totalLength = dateText.length + timeText.length;
    const spacing = ' '.repeat(Math.max(1, width - totalLength));
    lines.push(`${dateText}${spacing}${timeText}`);
    
    lines.push('------------------------------------------------');
    
    // Items
    if (receiptData.items) {
      receiptData.items.forEach((item: any) => {
        const qty = item.qty || 1;
        const originalPrice = item.originalPrice || item.price;
        const originalTotal = originalPrice * qty;
        const qtyStr = qty.toString();
        const priceStr = originalTotal.toFixed(2);
        const nameMaxLength = width - qtyStr.length - priceStr.length - 4;
        const itemName = item.name.length > nameMaxLength ? 
          item.name.substring(0, nameMaxLength - 3) + '...' : item.name;
        
        const spaces = ' '.repeat(Math.max(1, width - qtyStr.length - 4 - itemName.length - priceStr.length));
        lines.push(`${qtyStr}    ${itemName}${spaces}${priceStr}`);
        
        // Show item discount if applicable
        if (item.itemDiscount && item.itemDiscountAmount > 0) {
          const discountLabel = `     ${item.itemDiscount.title} -${item.itemDiscount.type === 'percentage' ? item.itemDiscount.value + '%' : ''}`;
          const discountAmount = `-${item.itemDiscountAmount.toFixed(2)}`;
          const discountSpacing = ' '.repeat(Math.max(1, width - discountLabel.length - discountAmount.length));
          lines.push(`${discountLabel}${discountSpacing}${discountAmount}`);
        }
      });
    }
    
    lines.push('------------------------------------------------');
    
    // Items count
    const itemCount = receiptData.items ? 
      receiptData.items.reduce((sum: number, item: any) => sum + (item.qty || 1), 0) : 0;
    lines.push(`Items: ${itemCount}`);
    lines.push('');
    
    // Totals section
    const leftAlign = 20;
    
    // Original subtotal (before discount)
    const originalSubtotal = (receiptData.orderItemsTotal || receiptData.subtotal || 0);
    const originalSubtotalStr = originalSubtotal.toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Subtotal:${' '.repeat(width - leftAlign - 9 - originalSubtotalStr.length)}${originalSubtotalStr}`);
    
    // Receipt discount (if applicable)
    if (receiptData.receiptDiscount && receiptData.receiptDiscountAmount > 0) {
      const discount = receiptData.receiptDiscount;
      const discountAmount = receiptData.receiptDiscountAmount;
      
      let discountLabel = '';
      let discountAmountStr = '';
      if (discount.type === 'percentage') {
        // Calculate the correct discount amount based on order items total
        const correctDiscountAmount = receiptData.orderItemsTotal ? 
          (receiptData.orderItemsTotal * discount.value / 100) : discountAmount;
        discountLabel = `Discount (${discount.value}%):`;
        discountAmountStr = `-${correctDiscountAmount.toFixed(2)}`;
      } else {
        discountLabel = 'Discount:';
        discountAmountStr = `-${discountAmount.toFixed(2)}`;
      }
      
      const discountSpacing = ' '.repeat(Math.max(1, width - leftAlign - discountLabel.length - discountAmountStr.length));
      lines.push(`${' '.repeat(leftAlign)}${discountLabel}${discountSpacing}${discountAmountStr}`);
    }
    
    // VAT (calculated from final amount)
    const vatAmount = (receiptData.tax || 0).toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}VAT(7%) incl.:${' '.repeat(width - leftAlign - 14 - vatAmount.length)}${vatAmount}`);
    
    // Double line under VAT
    lines.push(`${' '.repeat(leftAlign)}============================`);
    
    // Total
    const totalAmount = (receiptData.total || 0).toFixed(2);
    lines.push(`${' '.repeat(leftAlign)}Total:${' '.repeat(width - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    
    lines.push('');
    lines.push('------------------------------------------------');
    
    if (isBill) {
      // For bills, show amount due and available payment options
      const totalAmount = (receiptData.total || 0);
      lines.push(`AMOUNT DUE: THB ${totalAmount.toFixed(2)}`);
      lines.push('');
      
      lines.push('PAYMENT OPTIONS AVAILABLE:');
      lines.push('• Cash');
      lines.push('• PromptPay (QR Code)');
      lines.push('• Visa/Mastercard (EDC)');
      lines.push('• Alipay');
    } else {
      // Payment method
      if (receiptData.paymentMethods && receiptData.paymentMethods.length > 0) {
        receiptData.paymentMethods.forEach((payment: any) => {
          const methodText = payment.method;
          const amountText = payment.amount.toFixed(2);
          const paymentSpacing = ' '.repeat(Math.max(1, width - methodText.length - amountText.length));
          lines.push(`${methodText}${paymentSpacing}${amountText}`);
        });
      }
    }
    
    lines.push('------------------------------------------------');
    lines.push('');
    
    // Tax invoice specific additions
    if (isTaxInvoice) {
      lines.push('Customer Information:');
      
      // Use stored tax invoice customer information if available
      if (receiptData.taxInvoiceData && receiptData.taxInvoiceData.customerName) {
        lines.push(`Name: ${receiptData.taxInvoiceData.customerName}`);
        
        if (receiptData.taxInvoiceData.customerAddress) {
          // Split long addresses into multiple lines
          const addressLines = receiptData.taxInvoiceData.customerAddress.match(/.{1,46}/g) || [receiptData.taxInvoiceData.customerAddress];
          addressLines.forEach((line: string, index: number) => {
            lines.push(index === 0 ? `Address: ${line}` : `         ${line}`);
          });
        } else {
          lines.push(`Address: [To be filled by customer]`);
        }
        
        if (receiptData.taxInvoiceData.customerTaxId) {
          lines.push(`Tax ID: ${receiptData.taxInvoiceData.customerTaxId}`);
        } else {
          lines.push(`Tax ID: [To be filled by customer]`);
        }
      } else {
        // Fallback to basic customer name or placeholders
        lines.push(`Name: ${receiptData.customerName || '[To be filled by customer]'}`);
        lines.push(`Address: [To be filled by customer]`);
        lines.push(`Tax ID: [To be filled by customer]`);
      }
      
      lines.push('');
    }
    
    // Footer
    if (isBill) {
      lines.push(centerText('Please present this bill when paying', width));
      lines.push('');
      lines.push(centerText('Staff will process your payment', width));
      lines.push(centerText('and provide a receipt', width));
    } else {
      lines.push(centerText('You\'re tee-rific. Come back soon!', width));
    }
    lines.push(centerText('Tel: 096-668-2335 | @lengolf', width));
    lines.push(centerText('www.len.golf', width));
    lines.push('');
    
    lines.push(centerText(`Generated: ${transactionDate.toLocaleString('th-TH')}`, width));
    lines.push(centerText('Powered by Lengolf POS System', width));
    
    if (isTaxInvoice) {
      // Signature section
      lines.push('');
      lines.push(centerText('________________________', width));
      lines.push(centerText('Signature Cashier', width));
      lines.push('');
      
      // ABB reference
      lines.push(`Issued to replace the TAX Invoice (ABB)`);
      lines.push(`number: ${receiptData.receiptNumber}`);
    }
    
    return lines.join('\n');
  };

  // Helper function to center text
  const centerText = (text: string, width: number): string => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Printer className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Unified Thermal Printer Test</h1>
              <p className="text-gray-600">Test both Bluetooth and USB thermal printing with live preview (no connection required for preview)</p>
            </div>
          </div>
          
          {/* Silent Mode Toggle */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {silentMode ? (
                <VolumeX className="w-5 h-5 text-gray-600" />
              ) : (
                <Volume2 className="w-5 h-5 text-blue-600" />
              )}
              <span className="text-sm font-medium text-gray-700">Silent Mode</span>
            </div>
            <Button
              onClick={() => setSilentMode(!silentMode)}
              variant={silentMode ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {silentMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Silent Mode Info */}
        {silentMode && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Silent Mode Active</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Print success confirmations are hidden. Error messages will still appear.
            </p>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 ${
              currentTab === 'bluetooth' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('bluetooth')}
          >
            <Bluetooth className="w-4 h-4" />
            Bluetooth Printing
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 ${
              currentTab === 'usb' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setCurrentTab('usb')}
          >
            <Usb className="w-4 h-4" />
            USB Printing
          </button>
        </div>

        {/* Bluetooth Tab */}
        {currentTab === 'bluetooth' && (
          <div className="space-y-6">
            {/* Support Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Bluetooth Support Status</span>
              </div>
              <div className="flex items-center gap-2">
                {bluetoothSupported ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={bluetoothSupported ? 'text-green-600' : 'text-red-600'}>
                  {bluetoothSupported ? 'Web Bluetooth API supported' : 'Web Bluetooth API not supported'}
                </span>
              </div>
              {!bluetoothSupported && (
                <p className="text-sm text-gray-600 mt-2">
                  Use Chrome or Edge browser on Android/Windows for Bluetooth printing support.
                </p>
              )}
            </div>

            {/* Connection Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bluetooth className="w-5 h-5" />
                <span className="font-medium">Connection Status</span>
              </div>
              <div className="flex items-center gap-2">
                {bluetoothConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={bluetoothConnected ? 'text-green-600' : 'text-red-600'}>
                  {bluetoothConnected ? 'Connected to Bluetooth printer' : 'Not connected'}
                </span>
              </div>
              {bluetoothDeviceInfo && (
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Device:</strong> {bluetoothDeviceInfo.name || 'Unknown'}</p>
                  <p><strong>ID:</strong> {bluetoothDeviceInfo.id}</p>
                </div>
              )}
            </div>

            {/* Connection Controls */}
            <div className="flex gap-3">
              <Button
                onClick={connectBluetooth}
                disabled={!bluetoothSupported || bluetoothConnected || isLoading}
                className="flex items-center gap-2"
              >
                <Bluetooth className="w-4 h-4" />
                Connect Bluetooth
              </Button>
              <Button
                onClick={disconnectBluetooth}
                disabled={!bluetoothConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Disconnect
              </Button>
            </div>

            {/* Test Controls */}
            <div className="flex gap-3">
              <Button
                onClick={testPrintBluetooth}
                disabled={!bluetoothConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Print
              </Button>
              <Button
                onClick={testPrintWithDefaults}
                disabled={!bluetoothConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Test Receipt (Default Data)
              </Button>
            </div>
          </div>
        )}

        {/* USB Tab */}
        {currentTab === 'usb' && (
          <div className="space-y-6">
            {/* Support Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Usb className="w-5 h-5" />
                <span className="font-medium">USB Support Status</span>
              </div>
              <div className="flex items-center gap-2">
                {usbSupported ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={usbSupported ? 'text-green-600' : 'text-red-600'}>
                  {usbSupported ? 'WebUSB API supported' : 'WebUSB API not supported'}
                </span>
              </div>
              {!usbSupported && (
                <p className="text-sm text-gray-600 mt-2">
                  Use Chrome or Edge browser for WebUSB printing support.
                </p>
              )}
            </div>

            {/* Connection Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Usb className="w-5 h-5" />
                <span className="font-medium">Connection Status</span>
              </div>
              <div className="flex items-center gap-2">
                {usbConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={usbConnected ? 'text-green-600' : 'text-red-600'}>
                  {usbConnected ? 'Connected to USB printer' : 'Not connected'}
                </span>
              </div>
              {usbDeviceInfo && (
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Device:</strong> {usbDeviceInfo.product || 'Unknown'}</p>
                  <p><strong>Manufacturer:</strong> {usbDeviceInfo.manufacturer || 'Unknown'}</p>
                  <p><strong>Vendor ID:</strong> 0x{usbDeviceInfo.vendorId}</p>
                  <p><strong>Product ID:</strong> 0x{usbDeviceInfo.productId}</p>
                </div>
              )}
            </div>

            {/* Connection Controls */}
            <div className="flex gap-3">
              <Button
                onClick={connectUSB}
                disabled={!usbSupported || usbConnected || isLoading}
                className="flex items-center gap-2"
              >
                <Usb className="w-4 h-4" />
                Connect USB
              </Button>
              <Button
                onClick={disconnectUSB}
                disabled={!usbConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Disconnect
              </Button>
            </div>

            {/* Test Controls */}
            <div className="flex gap-3">
              <Button
                onClick={testPrintUSB}
                disabled={!usbConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Print
              </Button>
              <Button
                onClick={testPrintWithDefaults}
                disabled={!usbConnected || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Test Receipt (Default Data)
              </Button>
            </div>
          </div>
        )}

        {/* Receipt Testing & Preview */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Receipt & Bill Testing & Preview</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  type="text"
                  placeholder="e.g., R20250727-0146"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  For testing existing receipts
                </p>
              </div>
              <div>
                <Label htmlFor="tableSessionId">Table Session ID</Label>
                <Input
                  id="tableSessionId"
                  type="text"
                  placeholder="e.g., 1, 123, abc-def-ghi"
                  value={tableSessionId}
                  onChange={(e) => setTableSessionId(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  For testing bill printing
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              💡 Preview works without printer connection - just enter IDs to see how they will look
            </p>
            
            {/* Preview Controls - No printer connection required */}
            <div className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => loadPreview('abb')}
                  disabled={isLoading || !receiptNumber}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Tax Invoice (ABB)
                </Button>
                <Button
                  onClick={() => loadPreview('original')}
                  disabled={isLoading || !receiptNumber}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Preview Tax Invoice (Original)
                </Button>
                <Button
                  onClick={() => loadPreview('bill')}
                  disabled={isLoading || !tableSessionId}
                  variant="outline"
                  className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Receipt className="w-4 h-4" />
                  Preview Bill
                </Button>
              </div>
              
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={currentTab === 'bluetooth' ? printReceiptBluetooth : printReceiptUSB}
                  disabled={
                    (!bluetoothConnected && currentTab === 'bluetooth') || 
                    (!usbConnected && currentTab === 'usb') || 
                    isLoading || 
                    !receiptNumber
                  }
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt via {currentTab === 'bluetooth' ? 'Bluetooth' : 'USB'}
                </Button>
                <Button
                  onClick={currentTab === 'bluetooth' ? printBillBluetooth : printBillUSB}
                  disabled={
                    (!bluetoothConnected && currentTab === 'bluetooth') || 
                    (!usbConnected && currentTab === 'usb') || 
                    isLoading || 
                    !tableSessionId
                  }
                  variant="outline"
                  className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <FileText className="w-4 h-4" />
                  Print Bill via {currentTab === 'bluetooth' ? 'Bluetooth' : 'USB'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview Section */}
        {showPreview && previewData && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                {previewType === 'bill' ? 'Bill Preview' : previewType === 'original' ? 'Tax Invoice (Original) Preview' : 'Tax Invoice (ABB) Preview'}
              </h3>
              <Button
                onClick={() => setShowPreview(false)}
                variant="ghost"
                size="sm"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              {/* Thermal Receipt Preview - exactly like TaxInvoiceModal */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-900 whitespace-pre-wrap overflow-auto max-h-96" style={{fontFamily: 'Courier New, monospace'}}>
                {previewData}
              </div>
              <div className="border-t border-gray-200 pt-3 mt-4">
                <p className="text-xs text-gray-500 text-center">
                  80mm thermal printer output preview (48 characters wide)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {lastResult && (
          <div className={`mt-6 p-4 rounded-lg ${
            lastResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                lastResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {lastResult.success ? 'Success' : 'Error'}
              </span>
            </div>
            <p className={`mt-1 text-sm ${
              lastResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {lastResult.message}
            </p>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}