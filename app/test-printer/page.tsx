'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Printer, Download, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TestReceiptData {
  receiptNumber: string;
  tableNumber: string;
  customerName: string;
  staffName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethods: Array<{
    method: string;
    amount: number;
  }>;
}

export default function PrinterTestPage() {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [format, setFormat] = useState<'json' | 'html' | 'thermal'>('thermal');
  const [language, setLanguage] = useState<'en' | 'th'>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sample test data
  const sampleTestData: TestReceiptData = {
    receiptNumber: `TEST-${Date.now()}`,
    tableNumber: 'T-05',
    customerName: 'Test Customer',
    staffName: 'Test Staff',
    items: [
      {
        name: 'Premium Coffee',
        quantity: 2,
        unitPrice: 85.00,
        totalPrice: 170.00,
        notes: 'No sugar'
      },
      {
        name: 'Club Sandwich',
        quantity: 1,
        unitPrice: 180.00,
        totalPrice: 180.00
      },
      {
        name: 'Caesar Salad',
        quantity: 1,
        unitPrice: 150.00,
        totalPrice: 150.00
      }
    ],
    subtotal: 467.29,
    vatAmount: 32.71,
    totalAmount: 500.00,
    paymentMethods: [
      {
        method: 'Cash',
        amount: 300.00
      },
      {
        method: 'PromptPay',
        amount: 200.00
      }
    ]
  };

  // Generate test receipt using existing service
  const generateTestReceipt = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/test/receipt-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testData: sampleTestData,
          format: format,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      if (format === 'thermal' || format === 'html') {
        const content = await response.text();
        setTestResult(content);
      } else {
        const data = await response.json();
        setTestResult(JSON.stringify(data, null, 2));
      }

    } catch (err) {
      console.error('Test receipt generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate test receipt');
    } finally {
      setIsLoading(false);
    }
  };

  // Test actual receipt from database
  const testExistingReceipt = async () => {
    if (!receiptNumber.trim()) {
      setError('Please enter a receipt number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/pos/receipts/${receiptNumber}?format=${format}&language=${language}`
      );

      if (!response.ok) {
        throw new Error(`Receipt not found or server error: ${response.status}`);
      }

      if (format === 'thermal' || format === 'html') {
        const content = await response.text();
        setTestResult(content);
      } else {
        const data = await response.json();
        setTestResult(JSON.stringify(data, null, 2));
      }

    } catch (err) {
      console.error('Receipt fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch receipt');
    } finally {
      setIsLoading(false);
    }
  };

  // Download thermal content as file
  const downloadThermalFile = () => {
    if (!testResult) return;

    const blob = new Blob([testResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thermal-receipt-${receiptNumber || 'test'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print thermal content (for testing with browser print dialog)
  const printThermalContent = () => {
    if (!testResult) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Thermal Receipt Test</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.2;
                white-space: pre-wrap;
                margin: 20px;
              }
            </style>
          </head>
          <body>${testResult}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Receipt Printer Test</h1>
        <p className="text-muted-foreground mt-2">
          Test receipt generation and printing capabilities for your Bluetooth thermal printer
        </p>
      </div>

      <Tabs defaultValue="test-receipt" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test-receipt">Generate Test Receipt</TabsTrigger>
          <TabsTrigger value="existing-receipt">Test Existing Receipt</TabsTrigger>
        </TabsList>

        <TabsContent value="test-receipt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Generate Test Receipt
              </CardTitle>
              <CardDescription>
                Generate a sample receipt using predefined test data to test your printer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="format">Receipt Format</Label>
                  <Select value={format} onValueChange={(value: 'json' | 'html' | 'thermal') => setFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Thermal (58mm)</SelectItem>
                      <SelectItem value="html">HTML (A4)</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={(value: 'en' | 'th') => setLanguage(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="th">Thai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={generateTestReceipt} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating...' : 'Generate Test Receipt'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing-receipt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Test Existing Receipt
              </CardTitle>
              <CardDescription>
                Enter a receipt number from your database to test actual receipt data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  placeholder="e.g., RCP-20250126-001"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="format">Receipt Format</Label>
                  <Select value={format} onValueChange={(value: 'json' | 'html' | 'thermal') => setFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Thermal (58mm)</SelectItem>
                      <SelectItem value="html">HTML (A4)</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={(value: 'en' | 'th') => setLanguage(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="th">Thai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={testExistingReceipt} 
                disabled={isLoading || !receiptNumber.trim()}
                className="w-full"
              >
                {isLoading ? 'Loading...' : 'Test Receipt'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Receipt Output ({format.toUpperCase()})
              <div className="flex gap-2">
                {format === 'thermal' && (
                  <>
                    <Button variant="outline" size="sm" onClick={downloadThermalFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={printThermalContent}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Test
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              {format === 'thermal' && 'Ready for thermal printer (58mm width)'}
              {format === 'html' && 'HTML format for A4 printing'}
              {format === 'json' && 'Raw JSON data structure'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {format === 'html' ? (
              <div 
                className="border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: testResult }}
              />
            ) : (
              <Textarea
                value={testResult}
                readOnly
                className="font-mono text-sm min-h-[400px]"
              />
            )}
          </CardContent>
        </Card>
      )}

      {format === 'thermal' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Bluetooth Printer Tips:</strong>
            <br />• Download the thermal file and send it directly to your printer
            <br />• Use your printer&apos;s mobile app or driver software 
            <br />• Most thermal printers support plain text files
            <br />• 58mm width format is standard for receipt printers
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}