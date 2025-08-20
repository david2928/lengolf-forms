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
import FinanceCharts from '@/components/finance-dashboard/FinanceCharts';

// Import finance dashboard hooks
import { useFinanceDashboard } from '@/hooks/useFinanceDashboard';

type ViewMode = 'actual' | 'runrate';
type DashboardTab = 'pl-statement' | 'trends';

export default function FinanceDashboardPage() {
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('pl-statement');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Check if current month is selected for run-rate toggle
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonth;
  
  // Use the finance dashboard hook with caching
  const {
    data: { plData, trendsData, kpiData },
    isLoading,
    isValidating: isRefreshing,
    isError,
    error,
    refresh
  } = useFinanceDashboard({
    month: selectedMonth,
    includeRunRate: isCurrentMonth && viewMode === 'runrate',
    refreshInterval: 0, // No auto-refresh, manual only
    enabled: true
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

  // Generate month options (last 24 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-600">Monthly P&L Statement and Financial Analytics</p>
        </div>
        
        <div className="flex items-center gap-3">
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

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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

            {/* Data Source Indicator */}
            {plData?.data_sources && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Data:</span>
                <div className="flex gap-1">
                  {plData.data_sources.has_historical_data && (
                    <Badge variant="secondary" className="text-xs">CSV</Badge>
                  )}
                  {plData.data_sources.has_pos_data && (
                    <Badge variant="secondary" className="text-xs">POS</Badge>
                  )}
                  {plData.data_sources.has_marketing_data && (
                    <Badge variant="secondary" className="text-xs">Marketing</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pl-statement')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pl-statement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            P&L Statement
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Trends & Analytics
          </button>
        </nav>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">Error loading data:</span>
              <span>{error?.message || 'Unknown error occurred'}</span>
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

      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Trends Charts */}
          <FinanceCharts 
            data={trendsData}
            loading={isLoading}
            selectedMonth={selectedMonth}
          />
        </div>
      )}
    </div>
  );
}