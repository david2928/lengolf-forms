/**
 * Customer Analytics Tab
 * Displays customer insights, engagement metrics, and spending patterns
 * TODO: Full implementation in next phase
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CustomerTabError } from '../shared/CustomerDetailError';
import {
  BarChart3,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  Target
} from 'lucide-react';
import { formatCurrency } from '../utils/customerFormatters';
import type { Customer, CustomerAnalytics } from '../utils/customerTypes';

interface CustomerAnalyticsTabProps {
  customer: Customer;
  analytics: CustomerAnalytics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Engagement metrics card
 */
const EngagementMetricsCard: React.FC<{ analytics: CustomerAnalytics }> = ({ analytics }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Star className="w-5 h-5" />
        <span>Customer Engagement</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Overall engagement score */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Overall Score</span>
          <span className="text-2xl font-bold text-primary">{analytics.engagementScore}/100</span>
        </div>
        <Progress value={analytics.engagementScore} className="h-3" />
        <p className="text-xs text-muted-foreground">
          {analytics.engagementScore >= 70 ? 'Highly engaged customer' :
           analytics.engagementScore >= 40 ? 'Moderately engaged customer' :
           'Low engagement - consider targeted outreach'}
        </p>
      </div>

      {/* Customer tier */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Customer Tier</span>
        <Badge variant="default" className="text-sm">
          {analytics.customerTier.charAt(0).toUpperCase() + analytics.customerTier.slice(1)}
        </Badge>
      </div>

      {/* Spending trend */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Spending Trend</span>
        <div className="flex items-center space-x-1">
          <TrendingUp className={`w-4 h-4 ${
            analytics.spendingTrend === 'increasing' ? 'text-green-600' :
            analytics.spendingTrend === 'stable' ? 'text-blue-600' :
            'text-orange-600'
          }`} />
          <span className="text-sm capitalize">{analytics.spendingTrend}</span>
        </div>
      </div>

      {/* Frequency score */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Visit Frequency</span>
          <span className="text-sm font-semibold">{analytics.frequencyScore}/100</span>
        </div>
        <Progress value={analytics.frequencyScore} className="h-2" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Spending insights card
 */
const SpendingInsightsCard: React.FC<{ customer: Customer }> = ({ customer }) => {
  const insights = [
    {
      icon: DollarSign,
      label: 'Total Lifetime Value',
      value: formatCurrency(customer.transactionSummary?.total_spent || 0),
      color: 'text-green-600'
    },
    {
      icon: Target,
      label: 'Average per Transaction',
      value: formatCurrency(customer.transactionSummary?.average_per_transaction || 0),
      color: 'text-blue-600'
    },
    {
      icon: BarChart3,
      label: 'Total Transactions',
      value: customer.transactionSummary?.transaction_count || 0,
      color: 'text-purple-600'
    },
    {
      icon: Clock,
      label: 'Average Session',
      value: customer.bookingSummary?.average_duration 
        ? `${customer.bookingSummary.average_duration} min`
        : 'No data',
      color: 'text-orange-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Spending Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <div key={index} className="text-center space-y-2">
                <div className={`w-8 h-8 mx-auto rounded-lg bg-muted flex items-center justify-center ${insight.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{insight.value}</p>
                  <p className="text-xs text-muted-foreground">{insight.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Recommendations card
 */
const RecommendationsCard: React.FC<{ analytics: CustomerAnalytics; customer: Customer }> = ({ 
  analytics, 
  customer 
}) => {
  const getRecommendations = () => {
    const recommendations = [];
    
    if (analytics.engagementScore < 40) {
      recommendations.push({
        type: 'warning',
        text: 'Low engagement score - consider personalized offers or check-ins'
      });
    }
    
    if (analytics.spendingTrend === 'decreasing') {
      recommendations.push({
        type: 'warning', 
        text: 'Declining spending pattern - may need retention strategies'
      });
    }
    
    if (analytics.customerTier === 'gold' || analytics.customerTier === 'platinum') {
      recommendations.push({
        type: 'success',
        text: 'High-value customer - consider VIP treatment and exclusive offers'
      });
    }
    
    if (!customer.bookingSummary?.last_booking_date) {
      recommendations.push({
        type: 'info',
        text: 'No recent bookings - consider re-engagement campaign'
      });
    }

    return recommendations.length > 0 ? recommendations : [{
      type: 'info',
      text: 'Customer profile looks healthy - continue current engagement strategy'
    }];
  };

  const recommendations = getRecommendations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className={`p-3 rounded-lg border-l-4 ${
            rec.type === 'warning' ? 'bg-orange-50 border-orange-500' :
            rec.type === 'success' ? 'bg-green-50 border-green-500' :
            'bg-blue-50 border-blue-500'
          }`}>
            <p className="text-sm">{rec.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * Customer Analytics Tab Component
 */
export const CustomerAnalyticsTab: React.FC<CustomerAnalyticsTabProps> = ({
  customer,
  analytics,
  loading,
  error,
  onRefresh
}) => {
  if (error) {
    return (
      <CustomerTabError 
        error={error} 
        onRetry={onRefresh}
        tabName="analytics"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <BarChart3 className="w-8 h-8 mx-auto animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Computing analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <EngagementMetricsCard analytics={analytics} />
        
        {/* Spending Insights */}
        <SpendingInsightsCard customer={customer} />
      </div>
      
      {/* Recommendations */}
      <RecommendationsCard analytics={analytics} customer={customer} />
    </div>
  );
};