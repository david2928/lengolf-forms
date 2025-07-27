'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cable, Printer, TestTube, CheckCircle, XCircle, Monitor } from 'lucide-react';
import { usbThermalPrinter, USBThermalPrinter } from '@/services/USBThermalPrinter';

export default function USBTestPage() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<{ manufacturer?: string; product?: string; vendorId?: string; productId?: string } | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>('R20250727-0146');
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    const checkSupport = () => {
      const supported = USBThermalPrinter.isSupported();
      setIsSupported(supported);
      console.log('🔌 WebUSB support:', supported);
    };

    checkSupport();
  }, []);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      const connected = await usbThermalPrinter.connect();
      
      if (connected) {
        setIsConnected(true);
        const info = usbThermalPrinter.getDeviceInfo();
        setDeviceInfo(info);
        alert(`✅ Connected to USB printer successfully! ${info?.product || 'Unknown'}`);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      setDeviceInfo(null);
      
      if (error instanceof Error && error.message.includes('No USB printer selected')) {
        alert('❌ No printer selected or cancelled by user');
      } else {
        alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await usbThermalPrinter.disconnect();
      setIsConnected(false);
      setDeviceInfo(null);
      alert('📴 Disconnected from USB printer');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleTestPrint = async () => {
    if (!isConnected) {
      alert('❌ Please connect to a printer first');
      return;
    }

    try {
      setIsLoading(true);
      await usbThermalPrinter.testPrint();
      setLastResult({ success: true, message: 'Test print completed', method: 'USB' });
      alert('✅ Test print sent successfully!');
    } catch (error) {
      console.error('Test print error:', error);
      setLastResult({ success: false, message: error instanceof Error ? error.message : 'Test print failed', method: 'USB' });
      alert(`❌ Test print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!isConnected) {
      alert('❌ Please connect to a printer first');
      return;
    }

    if (!receiptNumber.trim()) {
      alert('❌ Please enter a receipt number');
      return;
    }

    try {
      setIsLoading(true);

      // Get receipt data from API
      const response = await fetch('/api/pos/print-usb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptNumber: receiptNumber.trim()
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get receipt data');
      }

      // Print the receipt
      await usbThermalPrinter.printReceipt(result.receiptData);
      
      setLastResult({
        success: true,
        message: 'Receipt printed successfully',
        receiptNumber: receiptNumber,
        method: 'USB',
        total: result.receiptData.total
      });
      
      alert(`✅ Receipt ${receiptNumber} printed successfully via USB!`);

    } catch (error) {
      console.error('Print receipt error:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Print failed',
        method: 'USB'
      });
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Monitor className="w-8 h-8 text-green-600" />
            USB Thermal Printer Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test direct USB thermal printing using WebUSB API.
          </p>

          <div className="space-y-6">
            {/* WebUSB Support Check */}
            <div className={`border rounded-lg p-6 ${isSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {isSupported ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                WebUSB Support
              </h2>
              
              {isSupported ? (
                <div className="space-y-2">
                  <p className="text-green-700 font-medium">✅ WebUSB API is supported!</p>
                  <p className="text-sm text-green-600">
                    Your browser supports direct USB communication with thermal printers.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-700 font-medium">❌ WebUSB API is not supported</p>
                  <p className="text-sm text-red-600">
                    This feature requires Chrome/Edge browser. Safari and Firefox are not supported.
                  </p>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-500">
                User Agent: {navigator.userAgent}
              </div>
            </div>

            {/* Connection Management */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cable className="w-5 h-5 text-blue-600" />
                USB Connection
              </h2>
              
              <div className="space-y-4">
                {deviceInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="font-medium text-blue-800">Connected Device:</p>
                    <p className="text-blue-700">Manufacturer: {deviceInfo.manufacturer || 'Unknown'}</p>
                    <p className="text-blue-700">Product: {deviceInfo.product || 'Unknown'}</p>
                    <p className="text-blue-700 text-sm">Vendor ID: 0x{deviceInfo.vendorId || 'Unknown'}</p>
                    <p className="text-blue-700 text-sm">Product ID: 0x{deviceInfo.productId || 'Unknown'}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleConnect}
                    disabled={!isSupported || isConnected || isLoading}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading && !isConnected ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Cable className="w-5 h-5 mr-2" />
                        Connect USB Printer
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDisconnect}
                    disabled={!isConnected}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>

            {/* Test Print */}
            <div className="border border-gray-200 rounded-lg p-6 bg-yellow-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-yellow-600" />
                Test Print
              </h2>
              <p className="text-gray-600 mb-4">
                Send a simple test page to verify USB connection.
              </p>
              <Button
                onClick={handleTestPrint}
                disabled={!isConnected || isLoading}
                className="w-full h-12 bg-yellow-600 hover:bg-yellow-700"
              >
                {isLoading && isConnected ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5 mr-2" />
                    Send Test Print
                  </>
                )}
              </Button>
            </div>

            {/* Print Receipt */}
            <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-green-600" />
                Print Receipt
              </h2>
              <p className="text-gray-600 mb-4">
                Print an actual receipt by entering its receipt number.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input
                    id="receiptNumber"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g. R20250727-0146"
                    className="font-mono"
                  />
                </div>
                
                <Button
                  onClick={handlePrintReceipt}
                  disabled={!isConnected || !receiptNumber.trim() || isLoading}
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                >
                  {isLoading && isConnected ? (
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
                    <div><strong>Method:</strong> {lastResult.method}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-semibold mb-4">🔌 USB Setup Instructions</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div><strong>1. Connect Printer:</strong> Connect your thermal printer via USB cable</div>
                <div><strong>2. Use Chrome/Edge:</strong> Open this page in Chrome or Edge browser</div>
                <div><strong>3. Enable HTTPS:</strong> Ensure you&apos;re using HTTPS (or localhost for testing)</div>
                <div><strong>4. Connect:</strong> Click &quot;Connect USB Printer&quot; and select your device</div>
                <div><strong>5. Test:</strong> Send a test print to verify connection</div>
                <div><strong>6. Print:</strong> Use &quot;Print Receipt&quot; for actual receipts</div>
              </div>
              
              <div className="mt-4 p-3 bg-white border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Advantages over Bluetooth:</strong> USB printing is faster, more reliable, no pairing required, 
                  and works with larger data transfers. Perfect for desktop/laptop POS systems.
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note for Windows:</strong> Some thermal printers may require a virtual COM port driver 
                  if Windows claims the device exclusively. Check your printer documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}