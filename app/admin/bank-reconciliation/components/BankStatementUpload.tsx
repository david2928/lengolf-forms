'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { parseBankCSV, getParseStats } from '../lib/parse-bank-csv';
import type { BankStatementParsed } from '../types/bank-reconciliation';

interface BankStatementUploadProps {
  onParsed: (data: BankStatementParsed) => void;
  currentData: BankStatementParsed | null;
  onClear: () => void;
}

export default function BankStatementUpload({ onParsed, currentData, onClear }: BankStatementUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(r => r.errors.map(e => e.message).join(', ')).join('; ');
      setError(`File rejected: ${errors}`);
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseBankCSV(text);
        onParsed(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file, 'utf-8');
  }, [onParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const stats = currentData ? getParseStats(currentData) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" />
          Bank Statement Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentData ? (
          <>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <input {...getInputProps()} />
              <div className="space-y-2">
                <Upload className={`h-8 w-8 mx-auto ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-900">
                  {isDragActive ? 'Drop the file here' : 'Drop KBank CSV statement here'}
                </p>
                <p className="text-xs text-gray-500">
                  or <span className="text-blue-600 font-medium">click to browse</span> &middot; CSV only
                </p>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Parsed successfully</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                {fileName}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500 text-xs">Date Range</div>
                  <div className="font-medium">{stats.totalDays} days</div>
                </div>
                <div className="bg-blue-50 rounded p-2">
                  <div className="text-blue-600 text-xs">Card Settlements</div>
                  <div className="font-medium">{stats.cardSettlementCount}</div>
                </div>
                <div className="bg-purple-50 rounded p-2">
                  <div className="text-purple-600 text-xs">eWallet</div>
                  <div className="font-medium">{stats.ewalletCount}</div>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <div className="text-green-600 text-xs">Transfers</div>
                  <div className="font-medium">{stats.transferCount}</div>
                </div>
                {stats.gowabiCount > 0 && (
                  <div className="bg-orange-50 rounded p-2">
                    <div className="text-orange-600 text-xs">GoWabi</div>
                    <div className="font-medium">{stats.gowabiCount}</div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              {currentData.accountName} &middot; {currentData.accountNumber} &middot; {stats?.dateRange}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
