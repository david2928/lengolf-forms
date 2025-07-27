'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bluetooth, Printer, TestTube, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { bluetoothThermalPrinter, BluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';

export default function BluetoothTestPage() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<{ name?: string; id?: string } | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>('R20250727-0146');
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    const checkSupport = () => {
      const supported = BluetoothThermalPrinter.isSupported();
      setIsSupported(supported);
      console.log('📱 Bluetooth support:', supported);
    };

    checkSupport();
  }, []);

  const handleConnect = async (printerName?: string) => {
    try {
      setIsLoading(true);
      
      const connected = await bluetoothThermalPrinter.connect(printerName);
      
      if (connected) {
        setIsConnected(true);
        const info = bluetoothThermalPrinter.getDeviceInfo();
        setDeviceInfo(info);
        alert(`✅ Connected to Bluetooth printer successfully! ${info?.name || 'Unknown'}`);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      setDeviceInfo(null);
      
      if (error instanceof Error && error.message.includes('User cancelled')) {
        alert('❌ Connection cancelled by user');
      } else {
        alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothThermalPrinter.disconnect();
      setIsConnected(false);
      setDeviceInfo(null);
      alert('📴 Disconnected from Bluetooth printer');
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
      await bluetoothThermalPrinter.testPrint();
      setLastResult({ success: true, message: 'Test print completed', method: 'Bluetooth' });
      alert('✅ Test print sent successfully!');
    } catch (error) {
      console.error('Test print error:', error);
      setLastResult({ success: false, message: error instanceof Error ? error.message : 'Test print failed', method: 'Bluetooth' });
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
      const response = await fetch('/api/pos/print-bluetooth', {
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
      await bluetoothThermalPrinter.printReceipt(result.receiptData);
      
      setLastResult({
        success: true,
        message: 'Receipt printed successfully',
        receiptNumber: receiptNumber,
        method: 'Bluetooth',
        total: result.receiptData.total
      });
      
      alert(`✅ Receipt ${receiptNumber} printed successfully via Bluetooth!`);

    } catch (error) {
      console.error('Print receipt error:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Print failed',
        method: 'Bluetooth'
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
            <Smartphone className="w-8 h-8 text-blue-600" />
            Android Bluetooth Printer Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test Bluetooth thermal printing for Android tablets and phones.
          </p>

          <div className="space-y-6">
            {/* Bluetooth Support Check */}
            <div className={`border rounded-lg p-6 ${isSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {isSupported ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                Bluetooth Support
              </h2>
              
              {isSupported ? (
                <div className="space-y-2">
                  <p className="text-green-700 font-medium">✅ Web Bluetooth API is supported!</p>
                  <p className="text-sm text-green-600">
                    Your device supports Bluetooth printing. Make sure to use Chrome/Edge browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-700 font-medium">❌ Web Bluetooth API is not supported</p>
                  <p className="text-sm text-red-600">
                    This feature requires Chrome/Edge browser on Android/Windows. Safari and Firefox are not supported.
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
                <Bluetooth className="w-5 h-5 text-blue-600" />
                Bluetooth Connection
              </h2>
              
              <div className="space-y-4">
                {deviceInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="font-medium text-blue-800">Connected Device:</p>
                    <p className="text-blue-700">Name: {deviceInfo.name || 'Unknown'}</p>
                    <p className="text-blue-700 text-sm">ID: {deviceInfo.id || 'Unknown'}</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleConnect()}
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
                          <Bluetooth className="w-5 h-5 mr-2" />
                          Scan & Connect
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
                  
                  <Button
                    onClick={() => handleConnect('printer001')}
                    disabled={!isSupported || isConnected || isLoading}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading && !isConnected ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Connecting to printer001...
                      </>
                    ) : (
                      <>
                        <Bluetooth className="w-5 h-5 mr-2" />
                        Connect to "printer001" directly
                      </>
                    )}
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
                Send a simple test page to verify Bluetooth connection.
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
              <h2 className="text-xl font-semibold mb-4">📱 Android Setup Instructions</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div><strong>1. Enable Bluetooth:</strong> Turn on Bluetooth on your Android device</div>
                <div><strong>2. Pair Printer:</strong> Go to Settings → Bluetooth and pair your thermal printer</div>
                <div><strong>3. Use Chrome:</strong> Open this page in Chrome browser (not Firefox/Samsung Internet)</div>
                <div><strong>4a. Quick Connect:</strong> Click &quot;Connect to printer001 directly&quot; if your printer is named &quot;printer001&quot;</div>
                <div><strong>4b. Scan Connect:</strong> Click &quot;Scan &amp; Connect&quot; to choose from available printers</div>
                <div><strong>5. Test:</strong> Send a test print to verify connection</div>
                <div><strong>6. Print:</strong> Use &quot;Print Receipt&quot; for actual receipts</div>
              </div>
              
              <div className="mt-4 p-3 bg-white border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Compatible Printers:</strong> Any ESC/POS compatible thermal printer (58mm/80mm) with Bluetooth connectivity.
                  Common brands: Xprinter, Epson TM-series, Star TSP-series.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}