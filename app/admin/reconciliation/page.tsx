'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import FileUploadForm from './components/FileUploadForm';
import ReconciliationTypeSelector from './components/ReconciliationTypeSelector';
import ReconciliationResults from './components/ReconciliationResults';

export default function ReconciliationPage() {
  const [reconciliationOptions, setReconciliationOptions] = useState<{
    type: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);
  
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  const handleOptionsChange = (options: { type: string; startDate?: string; endDate?: string }) => {
    setReconciliationOptions(options);
  };

  const handleFileProcessed = (data: any) => {
    setUploadedData(data);
  };

  const handleReconciliationComplete = (data: any) => {
    setReconciliationResult(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        
        {/* Reconciliation Type Selection */}
        <ReconciliationTypeSelector onSelectionChange={handleOptionsChange} />
        
        {/* File Upload Section */}
        {reconciliationOptions && (
          <div className="max-w-4xl mx-auto">
            <FileUploadForm
              onFileProcessed={handleFileProcessed}
              onReconciliationComplete={handleReconciliationComplete}
              reconciliationType={reconciliationOptions.type}
              dateRange={reconciliationOptions.startDate && reconciliationOptions.endDate ? {
                start: reconciliationOptions.startDate,
                end: reconciliationOptions.endDate
              } : undefined}
            />
          </div>
        )}
        
        {/* Detailed Reconciliation Results */}
        {uploadedData && reconciliationOptions && uploadedData.autoDetectedDateRange && (
          <ReconciliationResults 
            uploadedData={uploadedData}
            reconciliationType={reconciliationOptions.type}
            dateRange={{
              start: reconciliationOptions.startDate || uploadedData.autoDetectedDateRange.start,
              end: reconciliationOptions.endDate || uploadedData.autoDetectedDateRange.end
            }}
            onStartReconciliation={() => {}}
          />
        )}

        {/* Help Section - Only show if no file is uploaded */}
        {!uploadedData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use Reconciliation</CardTitle>
                <CardDescription>
                  Simple two-step process to reconcile your invoice data with POS sales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mb-3">
                      1
                    </div>
                    <h3 className="font-medium mb-2">Select Reconciliation Type</h3>
                    <p className="text-sm text-gray-500">
                      Choose from restaurant or golf coaching reconciliation based on your invoice type.
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mb-3">
                      2
                    </div>
                    <h3 className="font-medium mb-2">Upload & Process</h3>
                    <p className="text-sm text-gray-500">
                      Upload your invoice file and the system will automatically match with POS data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supported Formats */}
            <Card>
              <CardHeader>
                <CardTitle>Supported Invoice Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Restaurant Reconciliation</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Customer name and date</li>
                      <li>• Item descriptions and quantities</li>
                      <li>• Total amounts including tax</li>
                      <li>• CSV or Excel format</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Golf Coaching - Pro Ratchavin</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Student name and lesson date</li>
                      <li>• Number of lessons used</li>
                      <li>• Lesson rates and totals</li>
                      <li>• Excel format preferred</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Golf Coaching - Pro Boss</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Student name and lesson date</li>
                      <li>• Lesson type and quantity</li>
                      <li>• Payment amounts</li>
                      <li>• CSV or Excel format</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 