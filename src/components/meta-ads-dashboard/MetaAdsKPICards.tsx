import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Eye, 
  MousePointer, 
  Percent, 
  Target,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface MetaAdsKPIs {
  // Core metrics from simple plan
  totalSpend: number;
  metaBookings: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  leads: number;
  costPerBooking: number;
  costPerLead: number;
  
  // Trend indicators (30d comparison)
  spendChange: number;
  bookingsChange: number;
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
  leadsChange: number;
  costPerBookingChange: number;
  costPerLeadChange: number;

  // Backwards compatibility (optional)
  conversions?: number;
  conversionsChange?: number;
  costPerConversion?: number;
  costPerConversionChange?: number;
}

interface MetaAdsKPICardsProps {
  data: MetaAdsKPIs;
  isLoading: boolean;
  dateRange: string;
}

const MetaAdsKPICards: React.FC<MetaAdsKPICardsProps> = ({ data, isLoading, dateRange }) => {
  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('th-TH');
  };

  const formatPercent = (num: number): string => {
    return `${num.toFixed(2)}%`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getTrendColor = (change: number, inverse = false) => {
    if (inverse) {
      // For metrics where lower is better (like cost per booking)
      if (change < 0) return 'text-green-600';
      if (change > 0) return 'text-red-600';
    } else {
      // For metrics where higher is better
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const formatTrendChange = (change: number): string => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const kpiCards = [
    {
      title: 'Total Spend',
      value: formatCurrency(data.totalSpend),
      change: data.spendChange,
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Meta Bookings', 
      value: data.metaBookings.toString(),
      change: data.bookingsChange,
      icon: Users,
      gradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Impressions',
      value: formatNumber(data.totalImpressions),
      change: data.impressionsChange,
      icon: Eye,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Clicks',
      value: formatNumber(data.totalClicks),
      change: data.clicksChange,
      icon: MousePointer,
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      title: 'CTR',
      value: formatPercent(data.averageCtr),
      change: data.ctrChange,
      icon: Percent,
      gradient: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Leads',
      value: (data.leads || data.conversions || 0).toFixed(0),
      change: data.leadsChange || data.conversionsChange || 0,
      icon: Target,
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Cost/Booking',
      value: formatCurrency(data.costPerBooking),
      change: data.costPerBookingChange,
      icon: DollarSign,
      gradient: 'from-red-500 to-red-600',
      inverse: true // Lower is better
    },
    {
      title: 'Cost/Lead',
      value: formatCurrency(data.costPerLead || data.costPerConversion || 0),
      change: data.costPerLeadChange || data.costPerConversionChange || 0,
      icon: Target,
      gradient: 'from-yellow-500 to-yellow-600',
      inverse: true // Lower is better
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`} />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                  <IconComponent className={`h-4 w-4 bg-gradient-to-br ${card.gradient.replace('from-', 'text-').replace('to-', '').replace(/-([\d]+)/, '')}`} />
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {card.value}
                </div>
                
                <div className="flex items-center gap-2">
                  {getTrendIcon(card.change)}
                  <span className={`text-sm font-medium ${getTrendColor(card.change, card.inverse)}`}>
                    {formatTrendChange(card.change)}
                  </span>
                  <span className="text-xs text-gray-500">vs 30d</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          📊 Showing Meta Ads performance for {dateRange.replace(/^\d+\s+Days:\s*/, '')}
        </Badge>
      </div>
    </div>
  );
};

export default MetaAdsKPICards;