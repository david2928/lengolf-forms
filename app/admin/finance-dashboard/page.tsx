'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  RefreshCw, 
  Calendar,
  Download,
  BarChart3,
  DollarSign,
  TrendingDown,
  PieChart,
  Settings
} from 'lucide-react';

// Import our finance dashboard components (we'll create these next)
import FinanceKPICards from '@/components/finance-dashboard/FinanceKPICards';
import PLStatement from '@/components/finance-dashboard/PLStatement';
import PLComparisonView from '@/components/finance-dashboard/PLComparisonView';

// Import finance dashboard hooks
import { useFinanceDashboard } from '@/hooks/useFinanceDashboard';
import { usePLComparison, useDefaultComparisonMonths, getCurrentMonth } from '@/hooks/usePLComparison';

type ViewMode = 'actual' | 'runrate';
type DashboardTab = 'pl-statement' | 'comparison';

export default function FinanceDashboardPage() {
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('pl-statement');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Comparison view state
  const defaultComparisonMonths = useDefaultComparisonMonths();
  const [comparisonMonths, setComparisonMonths] = useState<string[]>(defaultComparisonMonths);
  
  // Check if current month is selected for run-rate toggle
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonth;
  
  // Use the finance dashboard hook with caching
  const {
    data: { plData, kpiData },
    isLoading,
    isValidating: isRefreshing,
    isError,
    error,
    refresh
  } = useFinanceDashboard({
    month: selectedMonth,
    includeRunRate: isCurrentMonth && viewMode === 'runrate',
    refreshInterval: 0, // No auto-refresh, manual only
    enabled: activeTab !== 'comparison'
  });

  // Use comparison hook for comparison tab
  const {
    data: comparisonData,
    isLoading: comparisonLoading,
    error: comparisonError
  } = usePLComparison({
    months: comparisonMonths,
    includeRunRate: true,
    enabled: activeTab === 'comparison'
  });

  // Handle refresh
  const handleRefresh = () => {
    refresh();
  };

  // Handle CSV export
  const handleExport = () => {
    if (!plData) return;

    const csvData = {
      Month: selectedMonth,
      'View Mode': viewMode,
      'Total Sales': plData.revenue?.total_sales || 0,
      'Total COGS': plData.cogs?.total_cogs || 0,
      'Gross Profit': plData.gross_profit?.calculated || 0,
      'Operating Expenses': plData.operating_expenses?.calculated_total || 0,
      'Marketing Expenses': plData.marketing_expenses?.calculated_total || 0,
      'EBITDA': plData.ebitda?.calculated || 0,
      'Data Sources': Object.entries(plData.data_sources || {})
        .filter(([_, value]) => value)
        .map(([key, _]) => key)
        .join(', ')
    };

    const csvContent = Object.entries(csvData)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');

    const blob = new Blob([`Key,Value\n${csvContent}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-pl-${selectedMonth}-${viewMode}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Generate month options from April 2024 to current month
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    const startDate = new Date(2024, 3, 1); // April 2024 (month is 0-based)
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const date = new Date(currentDate);
    while (date >= startDate) {
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
      date.setMonth(date.getMonth() - 1);
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6 min-h-screen">
      {/* Mobile-Optimized Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="text-sm text-gray-600">Monthly P&L Statement and Financial Analytics</p>
            {/* Mobile: Simplified status */}
            <div className="mt-2 sm:hidden">
              {plData?.days_elapsed && plData?.days_in_month && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {Math.round((plData.days_elapsed / plData.days_in_month) * 100)}% complete
                  </span>
                  <span>{plData.days_elapsed}/{plData.days_in_month} days</span>
                </div>
              )}
            </div>
            {/* Desktop: Full status */}
            {plData && (
              <div className="mt-2 hidden sm:flex items-center gap-4 text-xs text-gray-500">
                <span>
                  Data as of: {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {plData.days_elapsed && plData.days_in_month && (
                  <span>
                    • Period: {plData.days_elapsed} of {plData.days_in_month} days 
                    ({Math.round((plData.days_elapsed / plData.days_in_month) * 100)}% complete)
                  </span>
                )}
                {plData.data_sources && (
                  <span>
                    • Sources: {Object.entries(plData.data_sources)
                      .filter(([_, active]) => active)
                      .map(([source, _]) => source.replace('has_', '').replace('_data', ''))
                      .join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        
          {/* Mobile: Compact action buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Mobile: Icon-only buttons */}
            <div className="flex items-center gap-2 sm:hidden">
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => window.open('/admin/finance-dashboard/operating-expenses', '_blank')}
                title="Manage Expenses"
              >
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 w-9 p-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh Data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 w-9 p-0"
                onClick={handleExport}
                disabled={!plData}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Desktop: Full buttons with text */}
            <div className="hidden sm:flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/admin/finance-dashboard/operating-expenses', '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Expenses
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                disabled={!plData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Month Selector */}
            <div className="flex items-center gap-2 sm:min-w-0">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* Group months by year for easier navigation */}
                  {(() => {
                    const groupedOptions = monthOptions.reduce((acc, option) => {
                      const year = option.value.split('-')[0];
                      if (!acc[year]) acc[year] = [];
                      acc[year].push(option);
                      return acc;
                    }, {} as Record<string, typeof monthOptions>);
                    
                    return Object.entries(groupedOptions)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Most recent year first
                      .map(([year, options]) => (
                        <div key={year}>
                          {Object.keys(groupedOptions).length > 1 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                              {year}
                            </div>
                          )}
                          {options.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label.replace(` ${year}`, '')} {/* Remove year from label since it's in header */}
                            </SelectItem>
                          ))}
                        </div>
                      ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle (only for current month) */}
            {isCurrentMonth && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'actual' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setViewMode('actual')}
                  >
                    Actual
                  </Button>
                  <Button
                    variant={viewMode === 'runrate' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setViewMode('runrate')}
                  >
                    Run Rate
                  </Button>
                </div>
              </div>
            )}

            {/* Enhanced Data Source Indicators */}
            {plData?.data_sources && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Data:</span>
                <div className="flex gap-1">
                  {plData.data_sources.has_pos_data && (
                    <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                      POS
                    </Badge>
                  )}
                  {plData.data_sources.has_marketing_data && (
                    <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200">
                      API
                    </Badge>
                  )}
                  {plData.data_sources.has_historical_data && (
                    <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">
                      CSV
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile-Optimized Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Mobile: Bottom-style tabs with full-width buttons */}
        <div className="sm:hidden grid grid-cols-2 gap-0">
          <button
            onClick={() => setActiveTab('pl-statement')}
            className={`flex flex-col items-center justify-center py-4 px-3 rounded-l-lg border-r border-gray-200 min-h-[60px] transition-all ${
              activeTab === 'pl-statement'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <BarChart3 className={`h-5 w-5 mb-1 ${
              activeTab === 'pl-statement' ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <span className="text-xs font-medium">P&L Statement</span>
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex flex-col items-center justify-center py-4 px-3 rounded-r-lg min-h-[60px] transition-all ${
              activeTab === 'comparison'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <PieChart className={`h-5 w-5 mb-1 ${
              activeTab === 'comparison' ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <span className="text-xs font-medium">Comparison</span>
          </button>
        </div>
        
        {/* Desktop: Traditional horizontal tabs */}
        <div className="hidden sm:block border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4">
            <button
              onClick={() => setActiveTab('pl-statement')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pl-statement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              P&L Statement
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'comparison'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PieChart className="h-4 w-4 inline mr-2" />
              Monthly Comparison
            </button>
          </nav>
        </div>
      </div>

      {/* Error State */}
      {(isError || comparisonError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">Error loading data:</span>
              <span>{error?.message || comparisonError?.message || 'Unknown error occurred'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {activeTab === 'pl-statement' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <FinanceKPICards 
            data={kpiData} 
            loading={isLoading}
            month={selectedMonth}
            viewMode={viewMode}
          />

          {/* P&L Statement */}
          <PLStatement 
            data={plData}
            loading={isLoading}
            month={selectedMonth}
            viewMode={viewMode}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
            onDataChange={handleRefresh}
          />
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* P&L Comparison */}
          <PLComparisonView
            data={comparisonData}
            loading={comparisonLoading}
            selectedMonths={comparisonMonths}
            onMonthsChange={setComparisonMonths}
            currentMonth={currentMonth}
            showRunRate={viewMode === 'runrate'}
          />
        </div>
      )}

      {/* Enhanced Mobile Footer with Data Sources */}
      <div className="block sm:hidden">
        {plData?.data_sources && (
          <Card className="mt-4 bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-600 mb-3">Data Sources</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {plData.data_sources.has_pos_data && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Live POS data</span>
                    </div>
                  )}
                  {plData.data_sources.has_marketing_data && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Marketing APIs</span>
                    </div>
                  )}
                  {plData.data_sources.has_historical_data && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Historical data</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}