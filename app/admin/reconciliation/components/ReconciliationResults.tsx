'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calculator,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface ReconciliationResultsProps {
  uploadedData: any;
  reconciliationType: string;
  dateRange: { start: string; end: string };
  onStartReconciliation: () => void;
}

interface ReconciliationResult {
  matched: MatchedItem[];
  invoiceOnly: InvoiceItem[];
  posOnly: POSRecord[];
  summary: {
    totalInvoiceItems: number;
    totalPOSRecords: number;
    matchedCount: number;
    matchRate: number;
    totalInvoiceAmount: number;
    totalPOSAmount: number;
    varianceAmount: number;
    variancePercentage: number;
  };
  sessionId: string;
}

interface MatchedItem {
  invoiceItem: InvoiceItem;
  posRecord: POSRecord;
  matchType: 'exact' | 'fuzzy_name' | 'fuzzy_amount' | 'fuzzy_both';
  confidence: number;
  variance: {
    amountDiff: number;
    quantityDiff: number;
    nameSimilarity: number;
  };
}

interface InvoiceItem {
  id: string;
  date: string;
  customerName: string;
  productType?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  sku?: string;
}

interface POSRecord {
  id: number;
  date: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  skuNumber?: string;
}

export default function ReconciliationResults({ 
  uploadedData, 
  reconciliationType, 
  dateRange,
  onStartReconciliation 
}: ReconciliationResultsProps) {
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Auto-start reconciliation when data is available
  useEffect(() => {
    if (uploadedData?.data?.items && !isProcessing && !reconciliationResult && !error) {
      startReconciliation();
    }
  }, [uploadedData, reconciliationType, dateRange]);

  const startReconciliation = async () => {
    if (!uploadedData?.data?.items) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Validate date range before starting
      if (!dateRange.start || !dateRange.end) {
        throw new Error('Date range is required for reconciliation. Please ensure your invoice file contains valid dates.');
      }

      console.log('Starting reconciliation with date range:', dateRange);

      // Step 1: Fetch POS data
      setProcessingStep('Fetching POS data...');
      setProgress(20);

      const posResponse = await fetch(`/api/admin/reconciliation/pos-data?` + new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: reconciliationType
      }));

      if (!posResponse.ok) {
        const errorText = await posResponse.text();
        console.error('POS data fetch error:', errorText);
        throw new Error(`Failed to fetch POS data: ${posResponse.statusText}`);
      }

      const posData = await posResponse.json();
      
      // Step 2: Process reconciliation
      setProcessingStep('Processing reconciliation...');
      setProgress(60);

      const reconcileResponse = await fetch('/api/admin/reconciliation/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: uploadedData.data.items,
          reconciliationType,
          dateRange,
          options: {
            toleranceAmount: 50, // ฿50 tolerance
            tolerancePercentage: 5, // 5% tolerance
            nameSimilarityThreshold: 0.8 // 80% similarity
          }
        }),
      });

      if (!reconcileResponse.ok) {
        throw new Error(`Reconciliation failed: ${reconcileResponse.statusText}`);
      }

      const result = await reconcileResponse.json();
      
      setProcessingStep('Complete!');
      setProgress(100);
      setReconciliationResult(result.result);

    } catch (error) {
      console.error('Reconciliation error:', error);
      setError(error instanceof Error ? error.message : 'Reconciliation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800';
      case 'fuzzy_name': return 'bg-blue-100 text-blue-800';
      case 'fuzzy_amount': return 'bg-yellow-100 text-yellow-800';
      case 'fuzzy_both': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (amount < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (!uploadedData?.data?.items) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No uploaded data available for reconciliation.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 animate-spin" />
              Processing Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{processingStep}</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reconciliation Results */}
      {reconciliationResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reconciliationResult.summary.matchRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">
                  {reconciliationResult.summary.matchedCount} of {reconciliationResult.summary.totalInvoiceItems} items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoice Items</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reconciliationResult.summary.totalInvoiceItems}
                </div>
                <p className="text-xs text-gray-500">
                  Total items to match
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">POS Records</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reconciliationResult.summary.totalPOSRecords}
                </div>
                <p className="text-xs text-gray-500">
                  Available for matching
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="unmatched_invoice" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matched">
                <CheckCircle className="mr-2 h-4 w-4" />
                Matched ({reconciliationResult.matched.length})
              </TabsTrigger>
              <TabsTrigger value="unmatched_invoice">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Invoice Only ({reconciliationResult.invoiceOnly.length})
              </TabsTrigger>
              <TabsTrigger value="unmatched_pos">
                <XCircle className="mr-2 h-4 w-4" />
                POS Only ({reconciliationResult.posOnly.length})
              </TabsTrigger>
            </TabsList>

            {/* Matched Items */}
            <TabsContent value="matched">
              <Card>
                <CardHeader>
                  <CardTitle>Matched Items</CardTitle>
                  <CardDescription>
                    These items were successfully matched between invoice and POS data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reconciliationResult.matched.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {reconciliationType === 'smith_and_co_restaurant'
                            ? `SKU: ${item.invoiceItem.sku}`
                            : item.invoiceItem.customerName}
                        </div>
                        <Badge className={getMatchTypeColor(item.matchType)}>
                          {item.matchType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {reconciliationType === 'smith_and_co_restaurant'
                          ? item.invoiceItem.productType
                          : `Invoice: ${item.invoiceItem.productType}`}
                      </div>
                      <div className="text-sm text-gray-500">{item.invoiceItem.date}</div>
                      <hr className="my-3" />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">Invoice</div>
                          <div>Qty: {item.invoiceItem.quantity}</div>
                          <div>Amt: ฿{item.invoiceItem.totalAmount.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">POS</div>
                          <div>Qty: {item.posRecord.quantity}</div>
                          <div>Amt: ฿{item.posRecord.totalAmount.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Variance</div>
                          <div className="flex items-center gap-1">
                            {getVarianceIcon(item.variance.quantityDiff)}
                            Qty: {item.variance.quantityDiff}
                          </div>
                          <div className="flex items-center gap-1">
                            {getVarianceIcon(item.variance.amountDiff)}
                            Amt: ฿{item.variance.amountDiff.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Unmatched Invoice Items */}
            <TabsContent value="unmatched_invoice">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Items Not in POS</CardTitle>
                  <CardDescription>
                    These items were found in the invoice but not in the POS data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reconciliationResult.invoiceOnly.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-semibold">
                          {reconciliationType === 'smith_and_co_restaurant'
                            ? `SKU: ${item.sku}`
                            : item.customerName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.productType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">
                          ฿{item.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">{item.date}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Unmatched POS Items */}
            <TabsContent value="unmatched_pos">
              <Card>
                <CardHeader>
                  <CardTitle>POS Items Not in Invoice</CardTitle>
                  <CardDescription>
                    These items were found in the POS data but not in the invoice.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reconciliationResult.posOnly.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-semibold">
                          {reconciliationType === 'smith_and_co_restaurant'
                            ? `SKU: ${item.skuNumber}`
                            : item.customerName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.productName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">
                          ฿{item.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">{item.date}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
                <Button variant="outline" onClick={() => setReconciliationResult(null)}>
                  Start New Reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 