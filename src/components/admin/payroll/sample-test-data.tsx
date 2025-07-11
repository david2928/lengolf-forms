'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ClipboardIcon, CheckIcon, InfoIcon } from 'lucide-react';

const SAMPLE_CSV_DATA = `Employee,Clock-in,Clock-out
John Doe,09:00,17:00
Jane Smith,08:30,16:30
Mike Johnson,10:00,18:00
Sarah Wilson,09:15,17:15
Tom Brown,08:45,16:45
Lisa Davis,09:30,17:30
Chris Taylor,08:00,16:00
Amy White,09:45,17:45
David Lee,10:15,18:15
Emma Garcia,08:15,16:15`;

export default function SampleTestData() {
  const [copied, setCopied] = useState<string>('');

  const handleCopy = (data: string, type: string) => {
    navigator.clipboard.writeText(data);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          Sample Test Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Copy this sample CSV data and paste it into the upload form to test the payroll system.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Sample CSV Data</h3>
            <Badge variant="outline">10 employees</Badge>
          </div>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-md text-sm font-mono max-h-48 overflow-y-auto">
              {SAMPLE_CSV_DATA}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(SAMPLE_CSV_DATA, 'basic')}
            >
              {copied === 'basic' ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <ClipboardIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This sample creates 10 test employees with 8-hour work days.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Instructions</h3>
                     <ol className="list-decimal list-inside space-y-2 text-sm">
             <li>Copy the sample data above</li>
             <li>Paste it into the CSV input field</li>
             <li>Click &quot;Parse CSV Data&quot; to preview</li>
             <li>Set a date (optional) - defaults to today</li>
             <li>Click &quot;Upload Test Data&quot; to create entries</li>
             <li>Switch to &quot;Test & Verify&quot; tab to run calculations</li>
           </ol>
        </div>
      </CardContent>
    </Card>
  );
} 