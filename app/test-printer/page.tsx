'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bluetooth, Printer, TestTube, CheckCircle, XCircle, Usb, Smartphone, Eye, FileText, Receipt, VolumeX, Volume2 } from 'lucide-react';
import { bluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { usbThermalPrinter } from '@/services/USBThermalPrinter';
import { unifiedPrintService, PrintType } from '@/services/UnifiedPrintService';
import { ReceiptPreview } from '@/lib/receipt-preview';

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
      // Use unified print service - same as table management
      const result = await unifiedPrintService.print(PrintType.BILL, tableSessionId, { method: 'bluetooth' });
      
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

  // Generate thermal preview using shared component
  const generateThermalPreview = (receiptData: any, isTaxInvoice: boolean = false, isBill: boolean = false) => {
    return ReceiptPreview.generatePreviewText(receiptData, isTaxInvoice, isBill);
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