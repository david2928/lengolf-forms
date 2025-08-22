import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit,
  Trash2,
  Database, 
  FileText, 
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { PLData } from '@/hooks/useFinanceDashboard';
import { cn } from '@/lib/utils';
import ManualEntryModal from './ManualEntryModal';

interface PLStatementProps {
  data: PLData | null;
  loading: boolean;
  month: string;
  viewMode: 'actual' | 'runrate';
  collapsedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onDataChange?: () => void;
}

interface PLLineItemProps {
  label: string;
  value: number;
  historicalValue?: number;
  runRateValue?: number;
  viewMode: 'actual' | 'runrate';
  level: number;
  dataSource?: 'pos' | 'marketing' | 'manual' | 'historical' | 'calculated';
  isTotal?: boolean;
  showAddButton?: boolean;
  hasManualEntry?: boolean;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

function PLLineItem({
  label,
  value,
  historicalValue,
  runRateValue,
  viewMode,
  level,
  dataSource,
  isTotal = false,
  showAddButton = false,
  hasManualEntry = false,
  onAdd,
  onEdit,
  onDelete,
  children
}: PLLineItemProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const displayValue = viewMode === 'runrate' && runRateValue !== undefined ? runRateValue : value;
  const showComparison = historicalValue !== undefined && historicalValue !== 0;
  const variance = showComparison ? ((value - historicalValue) / Math.abs(historicalValue)) * 100 : 0;

  const getDataSourceBadge = () => {
    if (!dataSource) return null;
    
    const badges = {
      pos: { label: 'POS', variant: 'default' as const },
      marketing: { label: 'API', variant: 'secondary' as const },
      manual: { label: 'Manual', variant: 'outline' as const },
      historical: { label: 'CSV', variant: 'secondary' as const },
      calculated: { label: 'Calc', variant: 'default' as const }
    };

    const badge = badges[dataSource];
    return <Badge variant={badge.variant} className="text-xs ml-2">{badge.label}</Badge>;
  };

  const getVarianceIndicator = () => {
    if (!showComparison) return null;
    
    const color = variance > 5 ? 'text-green-600' : variance < -5 ? 'text-red-600' : 'text-gray-500';
    const icon = variance > 5 ? <TrendingUp className="h-3 w-3" /> : 
                 variance < -5 ? <TrendingDown className="h-3 w-3" /> : null;
    
    return (
      <div className={`flex items-center text-xs ${color} ml-2`}>
        {icon}
        <span className="ml-1">{Math.abs(variance).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className={cn(
      "border-b border-gray-100 last:border-b-0",
      isTotal && "bg-gray-50 font-semibold",
      level > 0 && "pl-4"
    )}>
      <div className="flex items-center justify-between py-3 px-4">
        <div className="flex items-center flex-1">
          <span className={cn(
            "text-gray-900",
            isTotal && "font-semibold",
            level > 0 && "text-gray-700 text-sm"
          )}>
            {label}
          </span>
          {getDataSourceBadge()}
          {getVarianceIndicator()}
        </div>

        <div className="flex items-center gap-4">
          {/* Historical comparison */}
          {showComparison && (
            <div className="text-xs text-gray-500 text-right">
              <div>Historical: {formatCurrency(historicalValue)}</div>
            </div>
          )}

          {/* Main value */}
          <div className={cn(
            "text-right",
            isTotal && "font-semibold text-lg",
            !isTotal && "text-gray-900"
          )}>
            {formatCurrency(displayValue)}
            {viewMode === 'runrate' && runRateValue !== undefined && (
              <div className="text-xs text-blue-600">
                {dataSource === 'calculated' ? 'Calculated' : 'Projected'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {showAddButton && (
            hasManualEntry ? (
              // Show edit/delete buttons when entry exists
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={onEdit}
                  title="Edit entry"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-red-600 hover:text-red-700"
                  onClick={onDelete}
                  title="Delete entry"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              // Show add button when no entry exists
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={onAdd}
                title="Add entry"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface PLSectionProps {
  title: string;
  sectionId: string;
  isCollapsed: boolean;
  onToggle: () => void;
  totalValue: number;
  runRateValue?: number;
  viewMode: 'actual' | 'runrate';
  children: React.ReactNode;
}

function PLSection({ 
  title, 
  sectionId, 
  isCollapsed, 
  onToggle, 
  totalValue, 
  runRateValue, 
  viewMode, 
  children 
}: PLSectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const displayValue = viewMode === 'runrate' && runRateValue !== undefined ? runRateValue : totalValue;

  return (
    <div className="border border-gray-200 rounded-lg">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-right">
          <div className="font-semibold text-lg">{formatCurrency(displayValue)}</div>
          {viewMode === 'runrate' && runRateValue !== undefined && (
            <div className="text-xs text-blue-600">
              Calculated
            </div>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PLStatement({ 
  data, 
  loading, 
  month, 
  viewMode, 
  collapsedSections, 
  onToggleSection,
  onDataChange
}: PLStatementProps) {
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'revenue' | 'expense'>('revenue');
  const [entryCategory, setEntryCategory] = useState<string>('');
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [manualEntries, setManualEntries] = useState<Record<string, any>>({});

  // Fetch manual entries for this month when component loads
  React.useEffect(() => {
    const fetchManualEntries = async () => {
      try {
        // Fetch revenue entries
        const revenueResponse = await fetch(`/api/finance/manual-entries?type=revenue&month=${month}`);
        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json();
          const revenueEntries: Record<string, any> = {};
          revenueData.forEach((entry: any) => {
            revenueEntries[`revenue-${entry.category}`] = entry;
          });
          
          // Fetch expense entries
          const expenseResponse = await fetch(`/api/finance/manual-entries?type=expense&month=${month}`);
          if (expenseResponse.ok) {
            const expenseData = await expenseResponse.json();
            const expenseEntries: Record<string, any> = {};
            expenseData.forEach((entry: any) => {
              expenseEntries[`expense-${entry.category}`] = entry;
            });
            
            setManualEntries({...revenueEntries, ...expenseEntries});
          }
        }
      } catch (error) {
        console.error('Failed to fetch manual entries:', error);
      }
    };

    if (month) {
      fetchManualEntries();
    }
  }, [month]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No data available for {month}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAddEntry = async (type: 'revenue' | 'expense', category: string) => {
    setEntryType(type);
    setEntryCategory(category);
    setExistingEntry(null);
    setShowManualEntryModal(true);
  };

  const handleEditEntry = async (type: 'revenue' | 'expense', category: string) => {
    setEntryType(type);
    setEntryCategory(category);
    
    const entryKey = `${type}-${category}`;
    const existingEntry = manualEntries[entryKey];
    setExistingEntry(existingEntry || null);
    setShowManualEntryModal(true);
  };

  const handleDeleteEntry = async (type: 'revenue' | 'expense', category: string) => {
    try {
      const response = await fetch(`/api/finance/manual-entries?type=${type}&month=${month}&category=${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Update local state
        const entryKey = `${type}-${category}`;
        const newEntries = {...manualEntries};
        delete newEntries[entryKey];
        setManualEntries(newEntries);
        
        // Refresh dashboard data
        onDataChange?.();
      } else {
        console.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const refreshManualEntries = () => {
    // Refresh manual entries after add/edit
    const fetchManualEntries = async () => {
      try {
        const revenueResponse = await fetch(`/api/finance/manual-entries?type=revenue&month=${month}`);
        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json();
          const revenueEntries: Record<string, any> = {};
          revenueData.forEach((entry: any) => {
            revenueEntries[`revenue-${entry.category}`] = entry;
          });
          
          const expenseResponse = await fetch(`/api/finance/manual-entries?type=expense&month=${month}`);
          if (expenseResponse.ok) {
            const expenseData = await expenseResponse.json();
            const expenseEntries: Record<string, any> = {};
            expenseData.forEach((entry: any) => {
              expenseEntries[`expense-${entry.category}`] = entry;
            });
            
            setManualEntries({...revenueEntries, ...expenseEntries});
          }
        }
      } catch (error) {
        console.error('Failed to fetch manual entries:', error);
      }
    };

    fetchManualEntries();
    onDataChange?.();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            P&L Statement - {new Date(month + '-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revenue Section */}
          <PLSection
            title="REVENUE"
            sectionId="revenue"
            isCollapsed={collapsedSections.has('revenue')}
            onToggle={() => onToggleSection('revenue')}
            totalValue={data?.revenue?.combined_net || 0}
            runRateValue={data?.run_rate_projections?.combined_net}
            viewMode={viewMode}
          >
            <PLLineItem
              label="Total Sales"
              value={data?.revenue?.total_sales || 0}
              historicalValue={data?.historical_data?.['Total Sales'] || 0}
              runRateValue={data?.run_rate_projections?.total_sales}
              level={1}
              dataSource="pos"
              viewMode={viewMode}
              isTotal
            />
            <PLLineItem
              label="Net Sales"
              value={data?.revenue?.net_sales || 0}
              historicalValue={data?.historical_data?.['Net Sales'] || 0}
              runRateValue={data?.run_rate_projections?.net_sales}
              level={1}
              dataSource="pos"
              viewMode={viewMode}
            />
            <PLLineItem
              label="Net Sales (Events)"
              value={manualEntries?.['revenue-Events']?.amount || 0}
              historicalValue={data.historical_data?.['Net Sales (Events)'] || 0}
              level={1}
              dataSource="manual"
              viewMode={viewMode}
              showAddButton
              hasManualEntry={!!manualEntries?.['revenue-Events']}
              onAdd={() => handleAddEntry('revenue', 'Events')}
              onEdit={() => handleEditEntry('revenue', 'Events')}
              onDelete={() => handleDeleteEntry('revenue', 'Events')}
            />
            <PLLineItem
              label="Net Sales (ClassPass)"
              value={manualEntries?.['revenue-ClassPass']?.amount || 0}
              historicalValue={data.historical_data?.['Net Sales (ClassPass)'] || 0}
              level={1}
              dataSource="manual"
              viewMode={viewMode}
              showAddButton
              hasManualEntry={!!manualEntries?.['revenue-ClassPass']}
              onAdd={() => handleAddEntry('revenue', 'ClassPass')}
              onEdit={() => handleEditEntry('revenue', 'ClassPass')}
              onDelete={() => handleDeleteEntry('revenue', 'ClassPass')}
            />
            <PLLineItem
              label="Net Sales (Gowabi)"
              value={manualEntries?.['revenue-Gowabi']?.amount || 0}
              historicalValue={data.historical_data?.['Net Sales (Gowabi)'] || 0}
              level={1}
              dataSource="manual"
              viewMode={viewMode}
              showAddButton
              hasManualEntry={!!manualEntries?.['revenue-Gowabi']}
              onAdd={() => handleAddEntry('revenue', 'Gowabi')}
              onEdit={() => handleEditEntry('revenue', 'Gowabi')}
              onDelete={() => handleDeleteEntry('revenue', 'Gowabi')}
            />
            <PLLineItem
              label="Total Net Sales"
              value={data?.revenue?.combined_net || 0}
              historicalValue={data?.historical_data?.['Total Net Sales'] || 0}
              runRateValue={data?.run_rate_projections?.combined_net}
              level={1}
              dataSource="calculated"
              viewMode={viewMode}
              isTotal
            />
            <PLLineItem
              label="Net Sales/Day"
              value={(data?.revenue?.combined_net || 0) / (data?.days_elapsed || 1)}
              historicalValue={((data?.historical_data?.['Total Net Sales'] || 0) / (data?.days_in_month || 1))}
              level={1}
              dataSource="calculated"
              viewMode={viewMode}
            />
          </PLSection>

          {/* COGS Section */}
          <PLSection
            title="COST OF GOODS SOLD (COGS)"
            sectionId="cogs"
            isCollapsed={collapsedSections.has('cogs')}
            onToggle={() => onToggleSection('cogs')}
            totalValue={data?.cogs?.total_cogs || 0}
            runRateValue={data?.run_rate_projections?.total_cogs}
            viewMode={viewMode}
          >
            <PLLineItem
              label="Combined (Food/Drinks/Coaching)"
              value={data?.cogs?.pos_cogs || 0}
              historicalValue={data?.historical_data?.['COGS'] || 0}
              level={1}
              dataSource="pos"
              viewMode={viewMode}
            />
            <PLLineItem
              label="Catering"
              value={manualEntries?.['expense-Catering']?.amount || 0}
              level={1}
              dataSource="manual"
              viewMode={viewMode}
              showAddButton
              hasManualEntry={!!manualEntries?.['expense-Catering']}
              onAdd={() => handleAddEntry('expense', 'Catering')}
              onEdit={() => handleEditEntry('expense', 'Catering')}
              onDelete={() => handleDeleteEntry('expense', 'Catering')}
            />
            <PLLineItem
              label="Drinks"
              value={manualEntries?.['expense-Drinks']?.amount || 0}
              level={1}
              dataSource="manual"
              viewMode={viewMode}
              showAddButton
              hasManualEntry={!!manualEntries?.['expense-Drinks']}
              onAdd={() => handleAddEntry('expense', 'Drinks')}
              onEdit={() => handleEditEntry('expense', 'Drinks')}
              onDelete={() => handleDeleteEntry('expense', 'Drinks')}
            />
          </PLSection>

          {/* Gross Profit */}
          <PLLineItem
            label="GROSS PROFIT"
            value={data?.gross_profit?.calculated || 0}
            historicalValue={data?.gross_profit?.historical_gross_profit || 0}
            runRateValue={data?.run_rate_projections?.gross_profit}
            level={0}
            dataSource="calculated"
            viewMode={viewMode}
            isTotal
          />

          {/* Operating Expenses Section */}
          <PLSection
            title="OPERATING EXPENSES"
            sectionId="operating"
            isCollapsed={collapsedSections.has('operating')}
            onToggle={() => onToggleSection('operating')}
            totalValue={data?.operating_expenses?.calculated_total || 0}
            runRateValue={data?.run_rate_projections?.operating_expenses}
            viewMode={viewMode}
          >
            {/* Dynamic Operating Expense Categories - Exclude Marketing Expenses and group by subcategories */}
            {data?.operating_expenses?.by_category && 
              Object.entries(data.operating_expenses.by_category)
                .filter(([categoryName]) => categoryName !== "Marketing Expenses") // Exclude Marketing Expenses
                .map(([categoryName, expenses]) => {
                  // Group expenses by subcategory within this category
                  const expensesBySubcategory = (expenses as any[]).reduce((acc: any, expense: any) => {
                    const subcat = expense.subcategory_name || 'Other';
                    if (!acc[subcat]) acc[subcat] = [];
                    acc[subcat].push(expense);
                    return acc;
                  }, {});

                  return Object.entries(expensesBySubcategory).map(([subcategoryName, subcategoryExpenses]) => (
                    <div key={`${categoryName}-${subcategoryName}`} className="ml-4 border-l-2 border-gray-200 pl-4 mb-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2 py-2">{subcategoryName}</h4>
                      {(subcategoryExpenses as any[]).map((expense: any) => (
                        <PLLineItem
                          key={expense.expense_type_name || expense.expense_category}
                          label={expense.expense_type_name || expense.expense_category || 'Unknown Expense'}
                          value={expense.amount}
                          historicalValue={data?.historical_data?.[expense.expense_type_name || expense.expense_category] || 0}
                          runRateValue={viewMode === 'runrate' ? 
                            data?.run_rate_projections?.operating_expenses_by_category?.[categoryName]?.find((e: any) => 
                              (e.expense_type_name || e.expense_category) === (expense.expense_type_name || expense.expense_category))?.amount : 
                            undefined
                          }
                          level={2}
                          dataSource="calculated"
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  ));
                }).flat()
            }
            
            {/* Fallback if no categorized data available */}
            {!data?.operating_expenses?.by_category && (
              <div className="ml-4 border-l-2 border-gray-200 pl-4 mb-3">
                <h4 className="font-medium text-sm text-gray-700 mb-2 py-2">Operating Expenses</h4>
                {Object.entries(data?.operating_expenses?.detail || {}).map(([expenseName, amount]) => (
                  <PLLineItem
                    key={expenseName}
                    label={expenseName}
                    value={amount as number}
                    historicalValue={data.historical_data?.[expenseName] || 0}
                    runRateValue={data.run_rate_projections?.operating_expenses_detail?.[expenseName]}
                    level={2}
                    dataSource="calculated"
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
            
            <PLLineItem
              label="Total Operating Expenses"
              value={
                (data?.operating_expenses?.calculated_total || 0) - 
                (data?.operating_expenses?.by_category?.["Marketing Expenses"]?.reduce((sum, expense) => sum + expense.amount, 0) || 0)
              }
              historicalValue={data?.historical_data?.['Total Operating Expenses'] || 0}
              runRateValue={data?.run_rate_projections?.operating_expenses}
              level={1}
              dataSource="calculated"
              viewMode={viewMode}
              isTotal
            />
          </PLSection>

          {/* Marketing Expenses Section */}
          <PLSection
            title="MARKETING EXPENSES"
            sectionId="marketing"
            isCollapsed={collapsedSections.has('marketing')}
            onToggle={() => onToggleSection('marketing')}
            totalValue={
              (data?.marketing_expenses?.calculated_total || 0) + 
              (data?.operating_expenses?.by_category?.["Marketing Expenses"]?.reduce((sum, expense) => sum + expense.amount, 0) || 0)
            }
            runRateValue={
              data?.run_rate_projections 
                ? (data.run_rate_projections.google_ads || 0) + 
                  (data.run_rate_projections.meta_ads || 0) +
                  (data?.run_rate_projections?.operating_expenses_by_category?.["Marketing Expenses"]?.reduce((sum, expense) => sum + expense.amount, 0) || 0)
                : undefined
            }
            viewMode={viewMode}
          >
            {/* Online Marketing Subsection */}
            <div className="ml-4 border-l-2 border-gray-200 pl-4 mb-3">
              <h4 className="font-medium text-sm text-gray-700 mb-2 py-2">Online Marketing</h4>
              <PLLineItem
                label="Google"
                value={data?.marketing_expenses?.google_ads || 0}
                historicalValue={data?.historical_data?.['Google Ads'] || 0}
                level={2}
                dataSource="marketing"
                viewMode={viewMode}
                runRateValue={data?.run_rate_projections?.google_ads}
              />
              <PLLineItem
                label="Meta"
                value={data?.marketing_expenses?.meta_ads || 0}
                historicalValue={data?.historical_data?.['Meta Ads'] || 0}
                level={2}
                dataSource="marketing"
                viewMode={viewMode}
                runRateValue={data?.run_rate_projections?.meta_ads}
              />
              {/* Operating expenses from Online Marketing subcategory */}
              {data?.operating_expenses?.by_category?.["Marketing Expenses"]
                ?.filter(expense => expense.subcategory_name === "Online Marketing")
                .map(expense => (
                <PLLineItem
                  key={`marketing-${expense.expense_type_name}`}
                  label={expense.expense_type_name}
                  value={expense.amount}
                  historicalValue={data?.historical_data?.[expense.expense_type_name] || 0}
                  level={2}
                  dataSource="calculated"
                  viewMode={viewMode}
                />
              ))}
            </div>
            
            {/* Offline Marketing - Show operating expenses from Offline Marketing subcategory */}
            {(data?.operating_expenses?.by_category?.["Marketing Expenses"]
              ?.filter(expense => expense.subcategory_name === "Offline Marketing")
              ?.length || 0) > 0 && (
              <div className="ml-4 border-l-2 border-gray-200 pl-4 mb-3">
                <h4 className="font-medium text-sm text-gray-700 mb-2 py-2">Offline Marketing</h4>
                
                {data?.operating_expenses?.by_category?.["Marketing Expenses"]
                  ?.filter(expense => expense.subcategory_name === "Offline Marketing")
                  .map(expense => (
                    <PLLineItem
                      key={`offline-marketing-${expense.expense_type_name}`}
                      label={expense.expense_type_name}
                      value={expense.amount}
                      historicalValue={data?.historical_data?.[expense.expense_type_name] || 0}
                      level={2}
                      dataSource="calculated"
                      viewMode={viewMode}
                    />
                  ))}
              </div>
            )}
            
            <PLLineItem
              label="Total Marketing Expenses"
              value={
                (data?.marketing_expenses?.google_ads || 0) + 
                (data?.marketing_expenses?.meta_ads || 0) + 
                (data?.operating_expenses?.by_category?.["Marketing Expenses"]?.reduce((sum, expense) => sum + expense.amount, 0) || 0)
              }
              historicalValue={data?.historical_data?.['Total Marketing Expenses'] || 0}
              runRateValue={
                viewMode === 'runrate' && data?.run_rate_projections ?
                  (data.run_rate_projections.google_ads || 0) + 
                  (data.run_rate_projections.meta_ads || 0) + 
                  (data?.run_rate_projections?.operating_expenses_by_category?.["Marketing Expenses"]?.reduce((sum: any, expense: any) => sum + expense.amount, 0) || 0)
                  : undefined
              }
              level={1}
              dataSource="calculated"
              viewMode={viewMode}
              isTotal
            />
          </PLSection>

          {/* EBITDA */}
          <PLLineItem
            label="EBITDA"
            value={
              (data?.gross_profit?.calculated || 0) - 
              (data?.operating_expenses?.calculated_total || 0) - 
              ((data?.marketing_expenses?.google_ads || 0) + 
               (data?.marketing_expenses?.meta_ads || 0) + 
               (data?.operating_expenses?.by_category?.["Marketing Expenses"]?.reduce((sum, expense) => sum + expense.amount, 0) || 0))
            }
            historicalValue={data?.ebitda?.historical_ebitda || 0}
            runRateValue={
              viewMode === 'runrate' && data?.run_rate_projections ? 
                (data.run_rate_projections.gross_profit || 0) - 
                (data.run_rate_projections.operating_expenses || 0) - 
                ((data.run_rate_projections.google_ads || 0) + 
                 (data.run_rate_projections.meta_ads || 0) +
                 (data?.run_rate_projections?.operating_expenses_by_category?.["Marketing Expenses"]?.reduce((sum: any, expense: any) => sum + expense.amount, 0) || 0))
                : undefined
            }
            level={0}
            dataSource="calculated"
            viewMode={viewMode}
            isTotal
          />
        </CardContent>
      </Card>

      {/* Data Sources Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">Data Sources:</span>
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-xs">POS</Badge>
              <span>Live POS data</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">API</Badge>
              <span>Marketing APIs</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">Manual</Badge>
              <span>Manual entries</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">CSV</Badge>
              <span>Historical data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        type={entryType}
        category={entryCategory}
        month={month}
        existingEntry={existingEntry}
        onSuccess={() => {
          onDataChange?.();
        }}
      />
    </div>
  );
}