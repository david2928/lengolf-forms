/**
 * Staff Performance Table Component for Chat SLA Dashboard
 * Modern admin-style table showing individual staff SLA metrics
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ChevronsUpDown, Users } from 'lucide-react';
import type { StaffSLAMetrics } from '@/types/chat-sla';

interface StaffPerformanceTableProps {
  data: StaffSLAMetrics[] | undefined;
  isLoading: boolean;
}

type SortField = 'staff_name' | 'total_responses' | 'sla_compliance_rate' | 'avg_response_minutes';
type SortDirection = 'asc' | 'desc';

export default function StaffPerformanceTable({ data, isLoading }: StaffPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_responses');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort data based on current sort field and direction
  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const getComplianceBadgeVariant = (rate: number): 'default' | 'secondary' | 'destructive' => {
    if (rate >= 95) return 'default';
    if (rate >= 85) return 'secondary';
    return 'destructive';
  };

  const getComplianceBarColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <CardDescription>No staff performance data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Performance</CardTitle>
        <CardDescription>
          Individual staff SLA metrics (excludes owner responses)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead
                  className="font-semibold text-gray-900 px-6 py-4 w-[30%] cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('staff_name')}
                >
                  <div className="flex items-center gap-1">
                    Staff Member
                    {getSortIcon('staff_name')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 px-4 py-4 w-[12%] cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_responses')}
                >
                  <div className="flex items-center gap-1">
                    Responses
                    {getSortIcon('total_responses')}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] hidden lg:table-cell">
                  SLA Met
                </TableHead>
                <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] hidden lg:table-cell">
                  Breached
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 px-4 py-4 w-[17%] cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sla_compliance_rate')}
                >
                  <div className="flex items-center gap-1">
                    Compliance
                    {getSortIcon('sla_compliance_rate')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 px-4 py-4 w-[17%] cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                  onClick={() => handleSort('avg_response_minutes')}
                >
                  <div className="flex items-center gap-1">
                    Avg Response
                    {getSortIcon('avg_response_minutes')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((staff, index) => (
                <TableRow key={staff.staff_email || index} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-700">
                            {staff.staff_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-base">{staff.staff_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {staff.is_owner && (
                            <Badge variant="outline" className="text-xs">Owner</Badge>
                          )}
                          {staff.is_historical && (
                            <Badge variant="secondary" className="text-xs">Historical</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono text-gray-700 font-semibold">
                        {staff.total_responses}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 hidden lg:table-cell">
                    <div className="text-sm">
                      <span className="font-medium text-green-600">{staff.sla_met}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 hidden lg:table-cell">
                    <div className="text-sm">
                      <span className="font-medium text-red-600">{staff.sla_breached}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Badge variant={getComplianceBadgeVariant(staff.sla_compliance_rate)}>
                        {staff.sla_compliance_rate.toFixed(1)}%
                      </Badge>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getComplianceBarColor(staff.sla_compliance_rate)}`}
                          style={{ width: `${Math.min(staff.sla_compliance_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">
                        {staff.avg_response_minutes.toFixed(1)} min
                      </div>
                      {staff.median_response_minutes > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Median: {staff.median_response_minutes.toFixed(1)} min
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
