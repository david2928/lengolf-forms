'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet 
} from 'lucide-react';

interface FileUploadFormProps {
  onFileProcessed: (data: any) => void;
  onReconciliationComplete?: (data: any) => void;
  reconciliationType: string;
  dateRange?: { start: string; end: string };
}

interface UploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  preview: any[] | null;
}

const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUploadForm({ 
  onFileProcessed, 
  onReconciliationComplete,
  reconciliationType, 
  dateRange 
}: FileUploadFormProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    preview: null
  });

  const startReconciliation = useCallback(async (uploadResult: any, detectedDateRange: { start: string; end: string }) => {
    if (!onReconciliationComplete) return;
    
    try {
      const reconcileResponse = await fetch('/api/admin/reconciliation/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: uploadResult.data.items,
          reconciliationType,
          dateRange: detectedDateRange,
          options: {
            toleranceAmount: 50,
            tolerancePercentage: 5,
            nameSimilarityThreshold: 0.8
          }
        }),
      });

      if (!reconcileResponse.ok) {
        throw new Error(`Reconciliation failed: ${reconcileResponse.statusText}`);
      }

      const reconciliationResult = await reconcileResponse.json();
      onReconciliationComplete(reconciliationResult.result);
      
    } catch (error) {
      console.error('Auto-reconciliation error:', error);
      // Still show the upload result even if reconciliation fails
    }
  }, [onReconciliationComplete, reconciliationType]);

  const processFileImmediately = useCallback(async (file: File) => {
    setUploadState(prev => ({ ...prev, uploading: true, error: null, progress: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('reconciliationType', reconciliationType);
      
      // Auto-detect date range from invoice data if not provided
      if (dateRange) {
        formData.append('startDate', dateRange.start);
        formData.append('endDate', dateRange.end);
      }

      const response = await fetch('/api/admin/reconciliation/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const result = await response.json();
      clearInterval(progressInterval);

      setUploadState(prev => ({ 
        ...prev, 
        progress: 100,
        preview: result.preview || null
      }));

      // Call parent callback with processed data
      onFileProcessed(result);
      
      // Auto-trigger reconciliation if callback provided
      if (onReconciliationComplete && result.autoDetectedDateRange) {
        setTimeout(() => {
          startReconciliation(result, result.autoDetectedDateRange);
        }, 500);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        uploading: false,
        progress: 0,
        error: errorMessage 
      }));
    }
  }, [reconciliationType, dateRange, onFileProcessed, onReconciliationComplete, startReconciliation]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(rejection => 
        rejection.errors.map((err: any) => err.message).join(', ')
      ).join('; ');
      setUploadState(prev => ({ ...prev, error: `File rejected: ${errors}` }));
      return;
    }

    // Handle accepted file - automatically process it
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadState(prev => ({ 
        ...prev, 
        file, 
        error: null,
        preview: null 
      }));
      
      // Auto-process the file
      setTimeout(() => {
        processFileImmediately(file);
      }, 100);
    }
  }, [processFileImmediately]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: uploadState.uploading
  });

  const clearFile = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      preview: null
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'csv') return FileText;
    if (['xls', 'xlsx'].includes(ext || '')) return FileSpreadsheet;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Invoice File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        {!uploadState.file && !uploadState.uploading && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-3">
              <div className="flex justify-center">
                <Upload className={`h-10 w-10 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your invoice file'}
                </p>
                <p className="text-gray-500 text-sm">
                  or <span className="text-blue-600 font-medium">click to browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CSV, Excel (.xlsx, .xls) • Max {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadState.uploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing and starting reconciliation...</span>
              <span className="text-sm text-gray-500">{uploadState.progress}%</span>
            </div>
            <Progress value={uploadState.progress} className="h-2" />
          </div>
        )}

        {/* Success State */}
        {uploadState.progress === 100 && !uploadState.uploading && !uploadState.error && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Processing complete!</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {uploadState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadState.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 