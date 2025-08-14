import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  MousePointer, 
  Target,
  Users,
  Activity
} from 'lucide-react';

interface MarketingKPIs {
  totalSpend: number;
  totalSpendChange: number;
  totalImpressions: number;
  totalImpressionsChange: number;
  totalClicks: number;
  totalClicksChange: number;
  averageCtr: number;
  averageCtrChange: number;
  totalNewCustomers: number;
  totalNewCustomersChange: number;
  cac: number;
  cacChange: number;
  roas: number;
  roasChange: number;
  customerLifetimeValue: number;
  customerLifetimeValueChange: number;
  googleSpend: number;
  metaSpend: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
}

interface MarketingKPICardsProps {
  data: MarketingKPIs;
  isLoading?: boolean;
  dateRange?: string;
}

const MarketingKPICards: React.FC<MarketingKPICardsProps> = ({ 
  data, 
  isLoading = false,
  dateRange = "Last 30 days"
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
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

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (change: number, inverse: boolean = false) => {
    if (inverse) {
      // For metrics where lower is better (like CAC)
      if (change > 0) return 'text-red-600';
      if (change < 0) return 'text-green-600';
    } else {
      // For metrics where higher is better
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-gray-500';
  };

  const getTrendBadgeVariant = (change: number, inverse: boolean = false) => {
    if (inverse) {
      // For metrics where lower is better (like CAC)
      if (change > 0) return 'destructive'; // Increase is bad = red
      if (change < 0) return 'default'; // Decrease is good = green
    } else {
      // For metrics where higher is better
      if (change > 0) return 'default'; // Increase is good = green  
      if (change < 0) return 'destructive'; // Decrease is bad = red
    }
    return 'secondary';
  };

  const getTrendBadgeClass = (change: number, inverse: boolean = false) => {
    if (inverse) {
      // For metrics where lower is better (like CAC)
      if (change > 0) return 'bg-red-100 text-red-800 border-red-200'; // Bad
      if (change < 0) return 'bg-green-100 text-green-800 border-green-200'; // Good
    } else {
      // For metrics where higher is better
      if (change > 0) return 'bg-green-100 text-green-800 border-green-200'; // Good
      if (change < 0) return 'bg-red-100 text-red-800 border-red-200'; // Bad
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Spend',
      value: formatCurrency(data.totalSpend),
      change: data.totalSpendChange,
      icon: DollarSign,
      description: `Google: ${formatCurrency(data.googleSpend)} | Meta: ${formatCurrency(data.metaSpend)}`,
      inverse: false
    },
    {
      title: 'Total Impressions',
      value: formatNumber(data.totalImpressions),
      change: data.totalImpressionsChange,
      icon: Eye,
      description: `${formatNumber(data.totalImpressions)} total views`,
      inverse: false
    },
    {
      title: 'Total Clicks',
      value: formatNumber(data.totalClicks),
      change: data.totalClicksChange,
      icon: MousePointer,
      description: `${formatNumber(data.totalClicks)} total clicks`,
      inverse: false
    },
    {
      title: 'Average CTR',
      value: formatPercentage(data.averageCtr),
      change: data.averageCtrChange,
      icon: Activity,
      description: 'Click-through rate',
      inverse: false
    },
    {
      title: 'New Customers',
      value: formatNumber(data.totalNewCustomers),
      change: data.totalNewCustomersChange,
      icon: Target,
      description: `Google: ${data.googleNewCustomers} | Meta: ${data.metaNewCustomers}`,
      inverse: false
    },
    {
      title: 'CAC',
      value: formatCurrency(data.cac),
      change: data.cacChange,
      icon: Users,
      description: 'Customer Acquisition Cost',
      inverse: true
    },
    {
      title: 'ROAS',
      value: `${data.roas.toFixed(1)}x`,
      change: data.roasChange,
      icon: TrendingUp,
      description: 'Return on Ad Spend',
      inverse: false
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(data.customerLifetimeValue),
      change: data.customerLifetimeValueChange,
      icon: Users,
      description: 'Total gross profit in period',
      inverse: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing KPIs</h2>
          <p className="text-sm text-gray-600 mt-1">{dateRange}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Live Data
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon;
          const trendColor = getTrendColor(kpi.change, kpi.inverse);
          const badgeClass = getTrendBadgeClass(kpi.change, kpi.inverse);
          
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <IconComponent className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {kpi.value}
                    </div>
                    <p className="text-xs text-gray-500">
                      {kpi.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(kpi.change)}
                    <Badge 
                      variant="outline"
                      className={`text-xs ${badgeClass}`}
                    >
                      {kpi.change > 0 ? '+' : ''}{formatPercentage(kpi.change, 1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              Google Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">Spend:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(data.googleSpend)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">New Customers:</span>
                <span className="font-semibold text-blue-900">{data.googleNewCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">CAC:</span>
                <span className="font-semibold text-blue-900">
                  {data.googleNewCustomers > 0 ? formatCurrency(data.googleSpend / data.googleNewCustomers) : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              Meta Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-purple-700">Spend:</span>
                <span className="font-semibold text-purple-900">{formatCurrency(data.metaSpend)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-purple-700">New Customers:</span>
                <span className="font-semibold text-purple-900">{data.metaNewCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-purple-700">CAC:</span>
                <span className="font-semibold text-purple-900">
                  {data.metaNewCustomers > 0 ? formatCurrency(data.metaSpend / data.metaNewCustomers) : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketingKPICards;