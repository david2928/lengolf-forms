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

    // Prepare CSV data with discount info
    const headers = ['Date', 'Customer Name', 'Rate Type', 'Hours', 'Gross Earnings', 'Discount', 'Net Earnings', 'Discount Note', 'Receipt Number'];
    const csvData = filteredEarnings.map((earning: Earning) => [
      earning.date,
      earning.customer_name,
      earning.rate_type,
      earning.hour_cnt,
      earning.gross_coach_earnings || earning.coach_earnings,
      earning.discount_deduction || 0,
      earning.coach_earnings,
      earning.discount_note || '',
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
    startDate: startDate ? startDate.toLocaleDateString('en-CA') : undefined,
    endDate: endDate ? endDate.toLocaleDateString('en-CA') : undefined,
  };

  const { earningsData: data, isLoading: loading, mutate } = useCoachEarnings(filters, isOpen);

  const filteredEarnings = useMemo(() => {
    if (!data?.earnings) return [];
    
    let filtered = data.earnings.filter(earning => {
      const customerNameMatch = earning.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
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
          aVal = (a.customer_name || '').toLowerCase();
          bVal = (b.customer_name || '').toLowerCase();
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
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Full-screen Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Earnings</h2>
            <p className="text-sm text-gray-600">Revenue tracking and analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={!data?.earnings || data.earnings.length === 0}
              size="sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Export</span>
            </Button>
            <Button variant="ghost" onClick={onClose} className="h-12 w-12 rounded-full touch-manipulation">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading earnings...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Cards with Discount Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-900">{formatCurrency(summary.gross_revenue || summary.total_revenue)}</div>
                  <div className="text-xs sm:text-sm text-blue-700">Gross Revenue</div>
                </div>
                {summary.total_discounts && summary.total_discounts > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-red-900">-{formatCurrency(summary.total_discounts || 0)}</div>
                    <div className="text-xs sm:text-sm text-red-700">Discounts</div>
                  </div>
                )}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-emerald-900">{formatCurrency(summary.net_revenue || summary.total_revenue)}</div>
                  <div className="text-xs sm:text-sm text-emerald-700">Net Revenue</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-900">{summary.total_lessons}</div>
                  <div className="text-xs sm:text-sm text-purple-700">Total Lessons</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-900">{summary.unique_students}</div>
                  <div className="text-xs sm:text-sm text-orange-700">Students</div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                {/* Search and Rate Type Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search by customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12"
                  />
                  <Select value={rateTypeFilter} onValueChange={setRateTypeFilter}>
                    <SelectTrigger className="w-full sm:w-56 h-12">
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

                {/* Date Filters */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
                  </div>
                  
                  {/* Quick Period Buttons */}
                  <div className="flex flex-wrap gap-2">
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
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Custom Date Range */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-sm text-gray-500">Custom range:</span>
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
                      className="w-full sm:w-64"
                    />
                  </div>
                </div>

                {/* Rate Types - Collapsible */}
                {data.available_rate_types && data.available_rate_types.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowRates(!showRates)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {showRates ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Session Rates
                    </button>
                    {showRates && (
                      <div className="mt-3 bg-gray-50 border rounded-lg p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {data.available_rate_types.map((rateType) => (
                            <div key={rateType.rate_type} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                              <span className="text-sm text-gray-700 truncate mr-2">
                                {rateType.rate_type}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(parseFloat(rateType.rate))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Earnings Cards */}
              <div className="space-y-3">
                {filteredEarnings.length > 0 ? (
                  <>
                    {/* Sort Controls - Mobile Friendly */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-600">Sort by:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortField === 'date') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('date');
                            setSortDirection('desc');
                          }
                        }}
                        className={`h-8 text-xs ${sortField === 'date' ? 'bg-blue-100 text-blue-700' : ''}`}
                      >
                        Date <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortField === 'coach_earnings') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('coach_earnings');
                            setSortDirection('desc');
                          }
                        }}
                        className={`h-8 text-xs ${sortField === 'coach_earnings' ? 'bg-blue-100 text-blue-700' : ''}`}
                      >
                        Amount <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortField === 'customer_name') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('customer_name');
                            setSortDirection('asc');
                          }
                        }}
                        className={`h-8 text-xs ${sortField === 'customer_name' ? 'bg-blue-100 text-blue-700' : ''}`}
                      >
                        Customer <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </div>

                    {filteredEarnings.map((earning: Earning) => (
                      <div key={earning.receipt_number} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          {/* Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <h3 className="font-semibold text-lg truncate">{earning.customer_name}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {earning.rate_type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {earning.hour_cnt}h
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Earning Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600">Date:</span>
                                <div className="font-medium">
                                  {new Date(earning.date).toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              {/* Hide receipt and contact on mobile */}
                              <div className="hidden sm:block">
                                <span className="text-gray-600">Receipt:</span>
                                <div className="font-medium text-xs truncate">#{earning.receipt_number}</div>
                              </div>
                              <div className="hidden sm:block">
                                <span className="text-gray-600">Contact:</span>
                                <div className="font-medium text-xs truncate">{earning.customer_phone_number || 'N/A'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Earnings Amount with Discount Breakdown */}
                          <div className="self-start sm:self-center space-y-2">
                            {earning.discount_deduction && parseFloat(earning.discount_deduction) > 0 ? (
                              <>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                                  <div className="text-sm font-semibold text-blue-900">
                                    {formatCurrency(parseFloat(earning.gross_coach_earnings || earning.coach_earnings))}
                                  </div>
                                  <div className="text-xs text-blue-700">Gross</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                                  <div className="text-sm font-semibold text-red-900">
                                    -{formatCurrency(parseFloat(earning.discount_deduction))}
                                  </div>
                                  <div className="text-xs text-red-700">{earning.discount_note || 'Discount'}</div>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-emerald-900">
                                    {formatCurrency(parseFloat(earning.coach_earnings))}
                                  </div>
                                  <div className="text-xs text-emerald-700">Net Earnings</div>
                                </div>
                              </>
                            ) : (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-emerald-900">
                                  {formatCurrency(parseFloat(earning.coach_earnings))}
                                </div>
                                <div className="text-xs text-emerald-700">Coach Earnings</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Earnings Found</h3>
                    <p className="text-gray-600">
                      {searchQuery || rateTypeFilter !== 'all' || period || startDate || endDate ? 
                        'Try adjusting your search or filters.' : 
                        'No earnings available for the selected period.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination Info */}
              {data.total > data.limit && (
                <div className="mt-6 text-sm text-gray-500 text-center bg-gray-50 p-3 rounded">
                  Showing {data.offset + 1} to {Math.min(data.offset + data.limit, data.total)} of {data.total} earnings
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">Unable to load earnings data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}