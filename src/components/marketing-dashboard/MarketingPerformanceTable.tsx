import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface WeeklyPerformance {
  period: string;
  weekStart: string;
  weekEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleConversions: number;
  metaConversions: number;
  totalConversions: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekConversionsChange: number;
}

interface MarketingPerformanceTableProps {
  data: WeeklyPerformance[];
  isLoading?: boolean;
  onExport?: () => void;
}

type SortField = keyof WeeklyPerformance;
type SortDirection = 'asc' | 'desc';

const MarketingPerformanceTable: React.FC<MarketingPerformanceTableProps> = ({
  data,
  isLoading = false,
  onExport
}) => {
  const [sortField, setSortField] = useState<SortField>('period');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 0) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number, decimals: number = 2) => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (change: number, inverse: boolean = false) => {
    if (inverse) {
      if (change > 0) return 'text-red-600';
      if (change < 0) return 'text-green-600';
    } else {
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-gray-500';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-gray-400" />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-gray-900">Performance Breakdown</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Weekly performance comparison across platforms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={viewMode} onValueChange={(value: 'weekly' | 'monthly') => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {onExport && (
              <Button
                onClick={onExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="period">Period</SortableHeader>
                <SortableHeader field="totalSpend">Total Spend</SortableHeader>
                <TableHead>Google Spend</TableHead>
                <TableHead>Meta Spend</TableHead>
                <SortableHeader field="totalImpressions">Impressions</SortableHeader>
                <SortableHeader field="totalClicks">Clicks</SortableHeader>
                <SortableHeader field="averageCtr">CTR</SortableHeader>
                <SortableHeader field="totalConversions">Conversions</SortableHeader>
                <SortableHeader field="cac">CAC</SortableHeader>
                <SortableHeader field="roas">ROAS</SortableHeader>
                <TableHead>WoW Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((week, index) => (
                <TableRow key={week.period} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold text-gray-900">{week.period}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(week.totalSpend)}
                    </div>
                    {week.weekOverWeekSpendChange !== 0 && (
                      <div className={`flex items-center gap-1 text-xs ${getTrendColor(week.weekOverWeekSpendChange)}`}>
                        {getTrendIcon(week.weekOverWeekSpendChange)}
                        {week.weekOverWeekSpendChange > 0 ? '+' : ''}{formatPercentage(week.weekOverWeekSpendChange, 1)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="text-blue-700 font-medium">
                      {formatCurrency(week.googleSpend)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {week.totalSpend > 0 ? formatPercentage((week.googleSpend / week.totalSpend) * 100, 0) : '0%'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-purple-700 font-medium">
                      {formatCurrency(week.metaSpend)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {week.totalSpend > 0 ? formatPercentage((week.metaSpend / week.totalSpend) * 100, 0) : '0%'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{formatNumber(week.totalImpressions)}</div>
                    <div className="text-xs text-gray-500">
                      G: {formatNumber(week.googleImpressions)} | M: {formatNumber(week.metaImpressions)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{formatNumber(week.totalClicks)}</div>
                    <div className="text-xs text-gray-500">
                      G: {formatNumber(week.googleClicks)} | M: {formatNumber(week.metaClicks)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{formatPercentage(week.averageCtr)}</div>
                    <div className="text-xs text-gray-500">
                      G: {formatPercentage(week.googleCtr)} | M: {formatPercentage(week.metaCtr)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{week.totalConversions}</div>
                    <div className="text-xs text-gray-500">
                      G: {week.googleConversions} | M: {week.metaConversions}
                    </div>
                    {week.weekOverWeekConversionsChange !== 0 && (
                      <div className={`flex items-center gap-1 text-xs ${getTrendColor(week.weekOverWeekConversionsChange)}`}>
                        {getTrendIcon(week.weekOverWeekConversionsChange)}
                        {week.weekOverWeekConversionsChange > 0 ? '+' : ''}{formatPercentage(week.weekOverWeekConversionsChange, 1)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{formatCurrency(week.cac)}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {week.cac < 50 ? 'Good' : week.cac < 100 ? 'Fair' : 'High'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{week.roas.toFixed(1)}x</div>
                    <Badge variant={week.roas >= 2.5 ? 'default' : week.roas >= 2.0 ? 'secondary' : 'destructive'} className="text-xs mt-1">
                      {week.roas >= 2.5 ? 'Good' : week.roas >= 2.0 ? 'Fair' : 'Poor'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {week.weekOverWeekSpendChange !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${getTrendColor(week.weekOverWeekSpendChange)}`}>
                          Spend: {week.weekOverWeekSpendChange > 0 ? '+' : ''}{formatPercentage(week.weekOverWeekSpendChange, 1)}
                        </div>
                      )}
                      {week.weekOverWeekConversionsChange !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${getTrendColor(week.weekOverWeekConversionsChange)}`}>
                          Conv: {week.weekOverWeekConversionsChange > 0 ? '+' : ''}{formatPercentage(week.weekOverWeekConversionsChange, 1)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">No performance data available</div>
            <div className="text-sm text-gray-400">
              Performance data will appear here once campaigns are running
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketingPerformanceTable;