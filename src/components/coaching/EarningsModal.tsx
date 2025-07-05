'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Calendar, ChevronDown, ChevronRight, ArrowUpDown, Download } from 'lucide-react';
import { EarningsData, Earning } from '@/types/coaching';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useCoachEarnings, CoachEarningsFilters } from '@/hooks/useCoachEarnings';
import { formatCurrency } from '@/lib/coachingUtils';

interface EarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId?: string;
}

type SortField = 'date' | 'customer_name' | 'rate_type' | 'hour_cnt' | 'coach_earnings';
type SortDirection = 'asc' | 'desc';

export function EarningsModal({ isOpen, onClose, coachId }: EarningsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rateTypeFilter, setRateTypeFilter] = useState('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showRates, setShowRates] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Export function
  const handleExport = () => {
    if (!data?.earnings || data.earnings.length === 0) {
      return;
    }

    // Prepare CSV data
    const headers = ['Date', 'Customer Name', 'Rate Type', 'Hours', 'Earnings', 'Receipt Number'];
    const csvData = filteredEarnings.map((earning: Earning) => [
      earning.date,
      earning.customer_name,
      earning.rate_type,
      earning.hour_cnt,
      earning.coach_earnings,
      earning.receipt_number
    ]);

    // Create CSV content
    const csvContent = [headers, ...csvData]
      .map(row => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `earnings-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filters: CoachEarningsFilters = {
    coachId,
    rateType: rateTypeFilter,
    period: period || undefined,
    startDate: startDate && endDate ? startDate.toLocaleDateString('en-CA') : undefined,
    endDate: startDate && endDate ? endDate.toLocaleDateString('en-CA') : undefined,
  };

  const { earningsData: data, isLoading: loading, mutate } = useCoachEarnings(filters, isOpen);

  const filteredEarnings = useMemo(() => {
    if (!data?.earnings) return [];
    
    let filtered = data.earnings.filter(earning => {
      const customerNameMatch = earning.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      return customerNameMatch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'customer_name':
          aVal = a.customer_name.toLowerCase();
          bVal = b.customer_name.toLowerCase();
          break;
        case 'rate_type':
          aVal = a.rate_type.toLowerCase();
          bVal = b.rate_type.toLowerCase();
          break;
        case 'hour_cnt':
          aVal = a.hour_cnt;
          bVal = b.hour_cnt;
          break;
        case 'coach_earnings':
          aVal = parseFloat(a.coach_earnings);
          bVal = parseFloat(b.coach_earnings);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  const summary = useMemo(() => {
    if (!data?.summary) {
      return { 
        total_revenue: 0, 
        avg_per_lesson: 0, 
        total_lessons: 0,
        rate_type_breakdown: {},
        unique_students: 0
      };
    }
    
    // Calculate unique students from the earnings data
    const uniqueStudents = new Set(data.earnings?.map(e => e.customer_name) || []).size;
    
    return {
      ...data.summary,
      unique_students: uniqueStudents
    };
  }, [data]);


  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            All Earnings
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={!data?.earnings || data.earnings.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading earnings...</p>
          </div>
        ) : data ? (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-900">{formatCurrency(summary.total_revenue)}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-900">{formatCurrency(summary.avg_per_lesson)}</div>
                <div className="text-sm text-gray-600">Avg per Lesson</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-900">{summary.total_lessons}</div>
                <div className="text-sm text-gray-600">Total Lessons</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-900">{summary.unique_students}</div>
                <div className="text-sm text-gray-600">Students</div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-4 mb-4">
              {/* Search and Rate Type Filter Row */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search by customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={rateTypeFilter} onValueChange={setRateTypeFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by rate type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rate Types</SelectItem>
                    {data.available_rate_types?.map((rateType) => (
                      <SelectItem key={rateType.rate_type} value={rateType.rate_type}>
                        {rateType.rate_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filters Row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Date Filters:</span>
                </div>
                
                {/* Quick Period Buttons */}
                <div className="flex gap-2">
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'year', label: 'This Year' },
                  ].map((periodOption) => (
                    <Button
                      key={periodOption.value}
                      variant={period === periodOption.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPeriod(period === periodOption.value ? '' : periodOption.value as any);
                        if (period !== periodOption.value) {
                          setStartDate(null);
                          setEndDate(null);
                        }
                      }}
                    >
                      {periodOption.label}
                    </Button>
                  ))}
                </div>

                {/* Custom Date Range */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">or</span>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={(date) => {
                      setStartDate(date);
                      if (date) setPeriod('');
                    }}
                    onEndDateChange={(date) => {
                      setEndDate(date);
                      if (date) setPeriod('');
                    }}
                    className="w-64"
                  />
                </div>

                {/* Clear Filters */}
                {(period || startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPeriod('');
                      setStartDate(null);
                      setEndDate(null);
                    }}
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </div>

            {/* Collapsible Rates Overview */}
            {data.available_rate_types && data.available_rate_types.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowRates(!showRates)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {showRates ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Session Rates
                </button>
                {showRates && (
                  <div className="mt-2 bg-gray-50 p-3 rounded border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {data.available_rate_types.map((rateType) => (
                        <div key={rateType.rate_type} className="flex justify-between items-center py-1">
                          <span className="text-gray-700" title={rateType.rate_type}>
                            {rateType.rate_type}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(parseFloat(rateType.rate))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Earnings Table */}
            <div className="flex-grow overflow-y-auto">
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-4 font-semibold text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                  <button 
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('date');
                        setSortDirection('desc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortField === 'customer_name') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('customer_name');
                        setSortDirection('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Customer
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortField === 'rate_type') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('rate_type');
                        setSortDirection('asc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Rate Type
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortField === 'hour_cnt') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('hour_cnt');
                        setSortDirection('desc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors text-center"
                  >
                    Hours
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortField === 'coach_earnings') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('coach_earnings');
                        setSortDirection('desc');
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors justify-end"
                  >
                    Coach Revenue
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </div>
                {filteredEarnings.map((earning: Earning) => (
                  <div key={earning.receipt_number} className="grid grid-cols-5 gap-4 border rounded-lg p-3 items-center">
                    <div>
                      <div className="font-medium">{new Date(earning.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{earning.customer_name}</div>
                      {earning.customer_phone_number && (
                        <p className="text-sm text-gray-500">{earning.customer_phone_number}</p>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {earning.rate_type}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{earning.hour_cnt}h</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(parseFloat(earning.coach_earnings))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredEarnings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No earnings found for the selected filters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Info */}
            {data.total > data.limit && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {data.offset + 1} to {Math.min(data.offset + data.limit, data.total)} of {data.total} earnings
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No earnings data available</p>
          </div>
        )}
      </div>
    </div>
  );
}