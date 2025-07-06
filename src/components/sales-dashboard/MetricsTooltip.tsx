'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Target,
  Users,
  Info,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
// Removed direct Supabase import - using API endpoint instead

// =============================================================================
// INTERFACES
// =============================================================================

interface MetricsTooltipProps {
  trigger?: React.ReactNode;
  metric?: string | null;
  position?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

interface CalculationDoc {
  formula: string;
  description: string;
  tooltip: string;
  unit?: string;
  source_column?: string;
  source_columns?: string[];
  calculation_note?: string;
  insight?: string;
  limitation?: string;
  assumptions?: Record<string, any>;
  interpretation?: string;
  note?: string;
}

interface MetricsDocumentation {
  revenue_metrics: Record<string, CalculationDoc>;
  transaction_metrics: Record<string, CalculationDoc>;
  utilization_metrics: Record<string, CalculationDoc>;
  vat_and_pricing: Record<string, any>;
  comparison_calculations: Record<string, CalculationDoc>;
  data_quality_notes: Record<string, string>;
  business_insights: Record<string, string>;
}

// =============================================================================
// HOOKS
// =============================================================================

const useMetricsDocumentation = () => {
  const [documentation, setDocumentation] = useState<MetricsDocumentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentation = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard/calculations-documentation');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        setDocumentation(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documentation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentation();
  }, []);

  return { documentation, isLoading, error };
};

// =============================================================================
// METRIC CALCULATION CARD COMPONENT
// =============================================================================

const MetricCalculationCard: React.FC<{
  title: string;
  calculation: CalculationDoc;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ title, calculation, icon: Icon = Calculator }) => {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Badge variant="outline" className="mb-2">Formula</Badge>
          <code className="block bg-gray-50 p-2 rounded text-xs font-mono text-gray-800">
            {calculation.formula}
          </code>
        </div>
        
        <div>
          <p className="text-sm text-gray-700">{calculation.description}</p>
        </div>

        {calculation.tooltip && (
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">{calculation.tooltip}</p>
            </div>
          </div>
        )}

        {calculation.unit && (
          <div>
            <Badge variant="secondary">Unit: {calculation.unit}</Badge>
          </div>
        )}

        {(calculation.source_column || calculation.source_columns) && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Source Data:</p>
            <div className="flex flex-wrap gap-1">
              {calculation.source_column && (
                <Badge variant="outline" className="text-xs">
                  {calculation.source_column}
                </Badge>
              )}
              {calculation.source_columns?.map((col, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {calculation.assumptions && (
          <div className="bg-yellow-50 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Assumptions:</p>
                <ul className="text-yellow-700 space-y-1">
                  {Object.entries(calculation.assumptions).map(([key, value]) => (
                    <li key={key} className="text-xs">
                      <strong>{key}:</strong> {String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {(calculation.insight || calculation.interpretation || calculation.calculation_note) && (
          <div className="bg-green-50 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                {calculation.insight && <p className="mb-1">{calculation.insight}</p>}
                {calculation.interpretation && <p className="mb-1">{calculation.interpretation}</p>}
                {calculation.calculation_note && <p>{calculation.calculation_note}</p>}
              </div>
            </div>
          </div>
        )}

        {calculation.limitation && (
          <div className="bg-red-50 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>Limitation:</strong> {calculation.limitation}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================================================
// VAT CALCULATION COMPONENT
// =============================================================================

const VATCalculationCard: React.FC<{ vatData: any }> = ({ vatData }) => {
  if (!vatData) {
    return (
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4 text-orange-600" />
            VAT Calculation Logic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">VAT calculation data not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calculator className="h-4 w-4 text-orange-600" />
          VAT Calculation Logic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Badge variant="outline" className="mb-2">Pre-September 2024</Badge>
          <div className="bg-gray-50 p-3 rounded-md">
            <code className="text-xs font-mono text-gray-800 block mb-2">
              {vatData?.vat_calculation?.pre_sep_2024?.formula || 'Formula not available'}
            </code>
            <p className="text-sm text-gray-700 mb-2">
              {vatData?.vat_calculation?.pre_sep_2024?.description || 'Description not available'}
            </p>
            <p className="text-xs text-gray-600">
              Sales Total: {vatData?.vat_calculation?.pre_sep_2024?.sales_total || 'N/A'}
            </p>
          </div>
        </div>

        <div>
          <Badge variant="outline" className="mb-2">Post-September 2024</Badge>
          <div className="bg-gray-50 p-3 rounded-md">
            <code className="text-xs font-mono text-gray-800 block mb-2">
              {vatData?.vat_calculation?.post_sep_2024?.formula || 'Formula not available'}
            </code>
            <p className="text-sm text-gray-700 mb-2">
              {vatData?.vat_calculation?.post_sep_2024?.description || 'Description not available'}
            </p>
            <p className="text-xs text-gray-600">
              Sales Total: {vatData?.vat_calculation?.post_sep_2024?.sales_total || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Sales Net Calculation</p>
              <code className="text-xs font-mono bg-white p-1 rounded">
                {vatData?.sales_net_calculation?.formula || 'Formula not available'}
              </code>
              <p className="mt-2">{vatData?.sales_net_calculation?.tooltip || 'Tooltip not available'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// BUSINESS INSIGHTS COMPONENT
// =============================================================================

const BusinessInsightsCard: React.FC<{ insights: Record<string, string> }> = ({ insights }) => {
  if (!insights || Object.keys(insights).length === 0) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-green-600" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">No business insights available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-green-600" />
          Business Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(insights).map(([key, value]) => (
            <div key={key} className="bg-green-50 p-3 rounded-md">
              <h4 className="font-medium text-green-800 text-sm mb-1 capitalize">
                {key.replace(/_/g, ' ')}
              </h4>
              <p className="text-sm text-green-700">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// SPECIFIC METRIC TOOLTIP COMPONENT
// =============================================================================

const SpecificMetricTooltip: React.FC<{ 
  metric: string; 
  documentation: MetricsDocumentation 
}> = ({ metric, documentation }) => {
  // Find the metric in the documentation
  const getMetricInfo = (metricKey: string): CalculationDoc | null => {
    // Check revenue metrics
    if (documentation.revenue_metrics[metricKey]) {
      return documentation.revenue_metrics[metricKey];
    }
    // Check transaction metrics
    if (documentation.transaction_metrics[metricKey]) {
      return documentation.transaction_metrics[metricKey];
    }
    // Check utilization metrics
    if (documentation.utilization_metrics[metricKey]) {
      return documentation.utilization_metrics[metricKey];
    }
    return null;
  };

  const metricInfo = getMetricInfo(metric);
  
  if (!metricInfo) {
    return (
      <div className="p-3 bg-yellow-50 rounded-md">
        <p className="text-sm text-yellow-800">
          No documentation available for metric: {metric}
        </p>
      </div>
    );
  }

  const getMetricIcon = (metricKey: string) => {
    if (metricKey.includes('revenue') || metricKey.includes('profit')) return DollarSign;
    if (metricKey.includes('utilization') || metricKey.includes('sim')) return Target;
    if (metricKey.includes('customer')) return Users;
    if (metricKey.includes('transaction')) return TrendingUp;
    return Calculator;
  };

  return (
    <MetricCalculationCard
      title={metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      calculation={metricInfo}
      icon={getMetricIcon(metric)}
    />
  );
};

// =============================================================================
// MAIN METRICS TOOLTIP COMPONENT
// =============================================================================

const MetricsTooltip: React.FC<MetricsTooltipProps> = ({ 
  trigger,
  metric = null,
  position = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { documentation, isLoading, error } = useMetricsDocumentation();

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading calculations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <p className="text-sm text-red-800">Failed to load calculations: {error}</p>
      </div>
    );
  }

  if (!documentation) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">No calculation documentation available</p>
      </div>
    );
  }

  // If a specific metric is requested, show only that metric
  if (metric) {
    return (
      <div className={`max-w-md ${className}`}>
        <SpecificMetricTooltip metric={metric} documentation={documentation} />
      </div>
    );
  }

  // Full documentation modal/popover
  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        type="button"
      >
        {trigger || (
          <>
            <HelpCircle className="h-4 w-4" />
            Calculation Details
          </>
        )}
      </button>

      {/* Documentation Modal/Popover */}
      {isOpen && (
        <div className={`absolute z-50 ${position === 'left' ? 'right-0' : 'left-0'} ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-96 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg`}>
          <div className="sticky top-0 bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Dashboard Calculations</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
                <TabsTrigger value="transactions" className="text-xs">Transactions</TabsTrigger>
                <TabsTrigger value="utilization" className="text-xs">Utilization</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue" className="space-y-3">
                {Object.entries(documentation.revenue_metrics).map(([key, calc]) => (
                  <MetricCalculationCard
                    key={key}
                    title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    calculation={calc}
                    icon={DollarSign}
                  />
                ))}
                <VATCalculationCard vatData={documentation.vat_and_pricing} />
              </TabsContent>
              
              <TabsContent value="transactions" className="space-y-3">
                {Object.entries(documentation.transaction_metrics).map(([key, calc]) => (
                  <MetricCalculationCard
                    key={key}
                    title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    calculation={calc}
                    icon={TrendingUp}
                  />
                ))}
              </TabsContent>
              
              <TabsContent value="utilization" className="space-y-3">
                {Object.entries(documentation.utilization_metrics).map(([key, calc]) => (
                  <MetricCalculationCard
                    key={key}
                    title={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    calculation={calc}
                    icon={Target}
                  />
                ))}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-3">
                <BusinessInsightsCard insights={documentation.business_insights} />
                
                <Card className="border-l-4 border-l-gray-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4 text-gray-600" />
                      Data Quality Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documentation.data_quality_notes && Object.keys(documentation.data_quality_notes).length > 0 ? (
                        Object.entries(documentation.data_quality_notes).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded-md">
                            <p className="text-xs text-gray-700">
                              <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {value}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="bg-gray-50 p-2 rounded-md">
                          <p className="text-xs text-gray-600">No data quality notes available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsTooltip;

// =============================================================================
// QUICK METRIC TOOLTIP COMPONENT
// =============================================================================

export const QuickMetricTooltip: React.FC<{
  metric: string;
  children: React.ReactNode;
  className?: string;
}> = ({ metric, children, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { documentation, isLoading } = useMetricsDocumentation();

  if (isLoading || !documentation) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-80">
          <SpecificMetricTooltip metric={metric} documentation={documentation} />
        </div>
      )}
    </div>
  );
}; 