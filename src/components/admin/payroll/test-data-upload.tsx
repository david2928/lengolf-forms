'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, UploadIcon, PlayIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import SampleTestData from './sample-test-data';

interface TestDataRow {
  employee: string;
  clockIn: string;
  clockOut: string;
}

interface UploadResults {
  staffCreated: number;
  entriesCreated: number;
  errors: string[];
  summary: {
    totalStaff: number;
    totalEntries: number;
    recentEntries: number;
    uploadedAt: string;
  };
}

export default function TestDataUpload() {
  const [testData, setTestData] = useState<TestDataRow[]>([]);
  const [dateOverride, setDateOverride] = useState<string>('');
  const [csvInput, setCsvInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const [error, setError] = useState<string>('');

  const handleParseCsv = () => {
    try {
      const lines = csvInput.trim().split('\n');
      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const employeeIndex = headers.findIndex(h => h.includes('employee') || h.includes('name'));
      const clockInIndex = headers.findIndex(h => h.includes('clock') && h.includes('in'));
      const clockOutIndex = headers.findIndex(h => h.includes('clock') && h.includes('out'));

      if (employeeIndex === -1 || clockInIndex === -1 || clockOutIndex === -1) {
        setError('CSV must have columns for Employee, Clock-in, and Clock-out');
        return;
      }

      const parsedData: TestDataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          parsedData.push({
            employee: values[employeeIndex],
            clockIn: values[clockInIndex],
            clockOut: values[clockOutIndex]
          });
        }
      }

      setTestData(parsedData);
      setError('');
    } catch (err) {
      setError('Failed to parse CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpload = async () => {
    if (testData.length === 0) {
      setError('No test data to upload');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payroll/upload-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testData,
          dateOverride: dateOverride || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestPayroll = () => {
    // Navigate to payroll calculations page
    window.location.href = '/admin/payroll';
  };

  return (
    <div className="space-y-6">
      <SampleTestData />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Upload Test Data for Payroll System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CSV Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-input">CSV Data</Label>
            <Textarea
              id="csv-input"
              placeholder="Employee,Clock-in,Clock-out
John Doe,09:00,17:00
Jane Smith,08:30,16:30"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Paste your CSV data with columns: Employee, Clock-in, Clock-out
            </p>
          </div>

          {/* Date Override */}
          <div className="space-y-2">
            <Label htmlFor="date-override">Date Override (optional)</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                id="date-override"
                type="date"
                value={dateOverride}
                onChange={(e) => setDateOverride(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              If not set, will use today&apos;s date for time entries
            </p>
          </div>

          {/* Parse CSV Button */}
          <Button onClick={handleParseCsv} variant="outline" className="w-full">
            Parse CSV Data
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Data Preview */}
          {testData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Parsed Data Preview</h3>
                <Badge variant="secondary">{testData.length} rows</Badge>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Clock-in</th>
                      <th className="px-3 py-2 text-left">Clock-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testData.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{row.employee}</td>
                        <td className="px-3 py-2">{row.clockIn}</td>
                        <td className="px-3 py-2">{row.clockOut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={testData.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Test Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff Created</Label>
                <div className="text-2xl font-bold text-green-600">
                  {uploadResults.staffCreated}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time Entries Created</Label>
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResults.entriesCreated}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label>Database Summary</Label>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold">Total Staff</div>
                  <div className="text-muted-foreground">{uploadResults.summary.totalStaff}</div>
                </div>
                <div>
                  <div className="font-semibold">Total Entries</div>
                  <div className="text-muted-foreground">{uploadResults.summary.totalEntries}</div>
                </div>
                <div>
                  <div className="font-semibold">Recent Entries</div>
                  <div className="text-muted-foreground">{uploadResults.summary.recentEntries}</div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {uploadResults.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Errors</Label>
                <div className="space-y-1">
                  {uploadResults.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Test Payroll Button */}
            <Button onClick={handleTestPayroll} className="w-full">
              <PlayIcon className="h-4 w-4 mr-2" />
              Test Payroll Calculations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 