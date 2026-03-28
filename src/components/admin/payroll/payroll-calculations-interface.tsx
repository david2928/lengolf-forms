'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCwIcon,
  CalendarIcon,
  DollarSignIcon,
  UsersIcon,
  ClockIcon,
  AlertCircleIcon,
  SendIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PayrollSummary {
  total_staff: number;
  total_regular_hours: number;
  total_ot_hours: number;
  total_payroll: number;
}

interface StaffPayroll {
  staff_id: number;
  staff_name: string;
  base_salary: number;
  regular_hours: number;
  ot_hours: number;
  ot_pay: number;
  holiday_hours: number;
  holiday_pay: number;
  working_days: number;
  total_allowance: number;
  service_charge: number;
  total_payout: number;
}

interface ServiceChargeSummary {
  total_amount: number;
  eligible_staff_count: number;
  per_staff_amount: number;
  total_distributed: number;
}

interface PayrollData {
  month: string;
  summary: PayrollSummary;
  staff_payroll: StaffPayroll[];
  service_charge_summary: ServiceChargeSummary;
  calculated_at: string;
}

type SnapshotStatus = 'none' | 'pending' | 'imported' | 'superseded';

interface SnapshotMeta {
  status: SnapshotStatus;
  staff_count: number;
  total_payout: number;
  calculated_at: string | null;
  calculated_by: string | null;
}

export default function PayrollCalculationsInterface() {
  const { toast } = useToast();
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Snapshot state
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupersededWarning, setShowSupersededWarning] = useState(false);

  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  const fetchSnapshotStatus = useCallback(async (month: string) => {
    if (!month) return;
    try {
      const res = await fetch(`/api/admin/payroll/${month}/submit`);
      if (res.ok) {
        const data: SnapshotMeta = await res.json();
        setSnapshotMeta(data);
      } else {
        setSnapshotMeta(null);
      }
    } catch {
      setSnapshotMeta(null);
    }
  }, []);

  // Fetch snapshot status whenever month changes
  useEffect(() => {
    if (selectedMonth) {
      setSnapshotMeta(null);
      fetchSnapshotStatus(selectedMonth);
    }
  }, [selectedMonth, fetchSnapshotStatus]);

  const loadPayrollData = async () => {
    if (!selectedMonth) {
      setError('Please select a month');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.userMessage || 'Failed to load payroll data');
      }

      setPayrollData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  const doSubmitSnapshot = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/payroll/${selectedMonth}/submit`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payroll snapshot');
      }

      const monthLabel = new Date(`${selectedMonth}-01`).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      toast({
        title: 'Payroll submitted to accounting',
        description: `${monthLabel} payroll submitted (${data.staff_count} staff, ฿${data.total_payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total)`,
      });

      // Refresh snapshot status
      await fetchSnapshotStatus(selectedMonth);
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Failed to submit payroll snapshot',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitToAccounting = () => {
    if (snapshotMeta && snapshotMeta.status === 'pending') {
      // Warn before superseding an existing pending snapshot
      setShowSupersededWarning(true);
    } else {
      doSubmitSnapshot();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const snapshotBanner = () => {
    if (!snapshotMeta || snapshotMeta.status === 'none') return null;

    if (snapshotMeta.status === 'pending') {
      return (
        <Alert className="border-amber-500 bg-amber-50 text-amber-900">
          <AlertCircleIcon className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            A snapshot already exists for this period — submitted by{' '}
            <strong>{snapshotMeta.calculated_by}</strong> on{' '}
            {snapshotMeta.calculated_at ? formatDateTime(snapshotMeta.calculated_at) : ''}
            {' '}({snapshotMeta.staff_count} staff, {formatCurrency(snapshotMeta.total_payout)}).
            Submitting again will supersede it.
          </AlertDescription>
        </Alert>
      );
    }

    if (snapshotMeta.status === 'imported') {
      return (
        <Alert className="border-blue-500 bg-blue-50 text-blue-900">
          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            Snapshot imported by accounting on{' '}
            {snapshotMeta.calculated_at ? formatDateTime(snapshotMeta.calculated_at) : ''} —{' '}
            {snapshotMeta.staff_count} staff, {formatCurrency(snapshotMeta.total_payout)}.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Payroll Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="month">Select Month</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={loadPayrollData} disabled={isLoading || !selectedMonth}>
              {isLoading ? 'Loading...' : 'Load Payroll Data'}
            </Button>
            <Button onClick={loadPayrollData} variant="outline" disabled={isLoading}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleSubmitToAccounting}
              disabled={!payrollData || isSubmitting || snapshotMeta?.status === 'imported'}
              variant="default"
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              <SendIcon className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit to Accounting'}
            </Button>
          </div>

          {snapshotBanner()}

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {payrollData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{payrollData.summary.total_staff}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Regular Hours</p>
                    <p className="text-2xl font-bold">{payrollData.summary.total_regular_hours.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                    <p className="text-2xl font-bold">{payrollData.summary.total_ot_hours.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                    <p className="text-2xl font-bold">{formatCurrency(payrollData.summary.total_payroll)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Charge Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Service Charge Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(payrollData.service_charge_summary.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eligible Staff</p>
                  <p className="text-lg font-bold">{payrollData.service_charge_summary.eligible_staff_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Per Staff</p>
                  <p className="text-lg font-bold">{formatCurrency(payrollData.service_charge_summary.per_staff_amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Distributed</p>
                  <p className="text-lg font-bold">{formatCurrency(payrollData.service_charge_summary.total_distributed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Payroll Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Payroll Details - {payrollData.month}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Calculated at: {formatDateTime(payrollData.calculated_at)}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>OT Hours</TableHead>
                    <TableHead>OT Pay</TableHead>
                    <TableHead>Holiday Hours</TableHead>
                    <TableHead>Holiday Pay</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Allowance</TableHead>
                    <TableHead>Service Charge</TableHead>
                    <TableHead>Total Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData.staff_payroll.map((staff) => (
                    <TableRow key={staff.staff_id}>
                      <TableCell className="font-medium">{staff.staff_name}</TableCell>
                      <TableCell>{formatCurrency(staff.base_salary)}</TableCell>
                      <TableCell>{staff.regular_hours.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={staff.ot_hours > 0 ? 'default' : 'secondary'}>
                          {staff.ot_hours.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(staff.ot_pay)}</TableCell>
                      <TableCell>{staff.holiday_hours.toFixed(1)}</TableCell>
                      <TableCell>{formatCurrency(staff.holiday_pay)}</TableCell>
                      <TableCell>{staff.working_days}</TableCell>
                      <TableCell>{formatCurrency(staff.total_allowance)}</TableCell>
                      <TableCell>{formatCurrency(staff.service_charge)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(staff.total_payout)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Supersede warning dialog */}
      <Dialog open={showSupersededWarning} onOpenChange={setShowSupersededWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snapshot already exists for this period</DialogTitle>
            <DialogDescription>
              A payroll snapshot already exists for{' '}
              <strong>
                {selectedMonth
                  ? new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                  : selectedMonth}
              </strong>
              . Submitting will mark the existing snapshot as superseded and replace it with a
              fresh calculation. The accounting app will use the new snapshot when creating a run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSupersededWarning(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSupersededWarning(false);
                doSubmitSnapshot();
              }}
              disabled={isSubmitting}
            >
              Yes, supersede and resubmit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
