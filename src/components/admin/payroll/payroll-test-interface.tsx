'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlayIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon } from 'lucide-react';

interface TestDataInfo {
  testStaff: Array<{
    id: number;
    staff_name: string;
    staff_id: string;
    is_service_charge_eligible: boolean;
  }>;
  timeEntries: Array<{
    id: number;
    staff_id: number;
    action: string;
    timestamp: string;
    device_info: any;
  }>;
  compensationData: Array<{
    staff_id: number;
    position: string;
    base_salary: number;
    daily_allowance: number;
    is_hourly: boolean;
  }>;
  summary: {
    totalTestStaff: number;
    totalTimeEntries: number;
    staffWithCompensation: number;
  };
}

interface CalculationResult {
  staff_id: number;
  staff_name: string;
  staff_id_code: string;
  calculation?: any;
  error?: string;
}

export default function PayrollTestInterface() {
  const [testDataInfo, setTestDataInfo] = useState<TestDataInfo | null>(null);
  const [calculationResults, setCalculationResults] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testMonth, setTestMonth] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTestData();
    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setTestMonth(currentMonth);
  }, []);

  const loadTestData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payroll/test-calculations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load test data');
      }

      setTestDataInfo(data.testDataInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test data');
    } finally {
      setIsLoading(false);
    }
  };

  const runCalculations = async () => {
    if (!testMonth) {
      setError('Please select a month to test');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payroll/test-calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: testMonth }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Calculation failed');
      }

      setCalculationResults(data.calculationResults?.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="h-5 w-5" />
            Payroll Test Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="test-month">Test Month</Label>
              <Input
                id="test-month"
                type="month"
                value={testMonth}
                onChange={(e) => setTestMonth(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={runCalculations} disabled={isLoading || !testMonth}>
              {isLoading ? 'Running...' : 'Run Calculations'}
            </Button>
            <Button onClick={loadTestData} variant="outline" disabled={isLoading}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Data Overview */}
      {testDataInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Test Data Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {testDataInfo.summary.totalTestStaff}
                </div>
                <div className="text-sm text-muted-foreground">Test Staff</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {testDataInfo.summary.totalTimeEntries}
                </div>
                <div className="text-sm text-muted-foreground">Time Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {testDataInfo.summary.staffWithCompensation}
                </div>
                <div className="text-sm text-muted-foreground">With Compensation</div>
              </div>
            </div>

            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="entries">Time Entries</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Service Charge Eligible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testDataInfo.testStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>{staff.staff_name}</TableCell>
                        <TableCell>{staff.staff_id}</TableCell>
                        <TableCell>
                          <Badge variant={staff.is_service_charge_eligible ? 'default' : 'secondary'}>
                            {staff.is_service_charge_eligible ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="entries" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testDataInfo.timeEntries.slice(0, 20).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.staff_id}</TableCell>
                        <TableCell>
                          <Badge variant={entry.action === 'clock_in' ? 'default' : 'outline'}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                        <TableCell>{entry.device_info?.source || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {testDataInfo.timeEntries.length > 20 && (
                  <p className="text-sm text-muted-foreground">
                    Showing first 20 entries. Total: {testDataInfo.timeEntries.length}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="compensation" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Daily Allowance</TableHead>
                      <TableHead>Is Hourly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testDataInfo.compensationData.map((comp) => (
                      <TableRow key={comp.staff_id}>
                        <TableCell>{comp.staff_id}</TableCell>
                        <TableCell>{comp.position}</TableCell>
                        <TableCell>{formatCurrency(comp.base_salary)}</TableCell>
                        <TableCell>{formatCurrency(comp.daily_allowance)}</TableCell>
                        <TableCell>
                          <Badge variant={comp.is_hourly ? 'default' : 'secondary'}>
                            {comp.is_hourly ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Calculation Results */}
      {calculationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              Calculation Results for {testMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Total Payout</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculationResults.map((result) => (
                  <TableRow key={result.staff_id}>
                    <TableCell>{result.staff_name}</TableCell>
                    <TableCell>{result.staff_id_code}</TableCell>
                    <TableCell>
                      <Badge variant={result.error ? 'destructive' : 'default'}>
                        {result.error ? 'Error' : 'Success'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.calculation?.totalHours || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {result.calculation?.totalPayout 
                        ? formatCurrency(result.calculation.totalPayout)
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {result.error || 'Calculation completed'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 