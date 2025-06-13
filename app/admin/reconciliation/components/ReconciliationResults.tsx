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
}

interface POSRecord {
  id: number;
  date: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
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
      // Step 1: Fetch POS data
      setProcessingStep('Fetching POS data...');
      setProgress(20);

      const posResponse = await fetch(`/api/admin/reconciliation/pos-data?` + new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: reconciliationType
      }));

      if (!posResponse.ok) {
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
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
              <CardDescription>
                Review matched items and resolve discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="matched" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="matched" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Matched ({reconciliationResult.matched.length})
                  </TabsTrigger>
                  <TabsTrigger value="invoice-only" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Invoice Only ({reconciliationResult.invoiceOnly.length})
                  </TabsTrigger>
                  <TabsTrigger value="pos-only" className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    POS Only ({reconciliationResult.posOnly.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matched" className="space-y-4">
                  <div className="space-y-2">
                    {reconciliationResult.matched.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No matched items found.</p>
                    ) : (
                      reconciliationResult.matched.map((match, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getMatchTypeColor(match.matchType)}>
                                {match.matchType.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {(match.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Invoice:</strong> {match.invoiceItem.customerName} - 
                              ฿{match.invoiceItem.totalAmount} ({match.invoiceItem.date})
                            </div>
                            <div>
                              <strong>POS:</strong> {match.posRecord.customerName} - 
                              ฿{match.posRecord.totalAmount} ({match.posRecord.date})
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invoice-only" className="space-y-4">
                  <div className="space-y-2">
                    {reconciliationResult.invoiceOnly.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">All invoice items were matched!</p>
                    ) : (
                      reconciliationResult.invoiceOnly.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-yellow-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <strong>{item.customerName}</strong> - {item.productType}
                            </div>
                            <div className="text-right">
                              <div>฿{item.totalAmount}</div>
                              <div className="text-sm text-gray-500">{item.date}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pos-only" className="space-y-4">
                  <div className="space-y-2">
                    {reconciliationResult.posOnly.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">All POS records were matched!</p>
                    ) : (
                      reconciliationResult.posOnly.map((record, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <strong>{record.customerName}</strong> - {record.productName}
                            </div>
                            <div className="text-right">
                              <div>฿{record.totalAmount}</div>
                              <div className="text-sm text-gray-500">{record.date}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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