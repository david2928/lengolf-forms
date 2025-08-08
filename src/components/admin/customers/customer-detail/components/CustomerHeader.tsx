/**
 * Customer Header Component
 * Displays customer basic information, engagement metrics, and actions
 * Extracted from original 1,326-line component for better maintainability
 */

import React from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Package as PackageIcon,
  Star
} from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/customerFormatters';
import type { CustomerHeaderProps, Customer, CustomerAnalytics } from '../utils/customerTypes';

/**
 * Customer engagement badge component
 */
const EngagementBadge: React.FC<{ 
  score: number; 
  tier: CustomerAnalytics['customerTier'] 
}> = ({ score, tier }) => {
  const getTierConfig = (tier: CustomerAnalytics['customerTier']) => {
    const configs = {
      bronze: { label: 'Bronze', variant: 'outline' as const, color: 'text-amber-600' },
      silver: { label: 'Silver', variant: 'secondary' as const, color: 'text-slate-500' },
      gold: { label: 'Gold', variant: 'default' as const, color: 'text-yellow-500' },
      platinum: { label: 'Platinum', variant: 'default' as const, color: 'text-purple-500' }
    };
    return configs[tier];
  };

  const config = getTierConfig(tier);

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Star className={`w-3 h-3 ${config.color}`} />
        <span>{config.label}</span>
      </Badge>
      <div className="text-sm text-muted-foreground">
        Engagement: {score}/100
      </div>
    </div>
  );
};

/**
 * Customer contact information display
 */
const CustomerContactInfo: React.FC<{ customer: Customer }> = ({ customer }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
    {/* Phone */}
    {customer.phone && (
      <div className="flex items-center space-x-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <span>{customer.phone}</span>
      </div>
    )}

    {/* Email */}
    {customer.email && (
      <div className="flex items-center space-x-2">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <span className="truncate">{customer.email}</span>
      </div>
    )}

    {/* Member since */}
    <div className="flex items-center space-x-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <span>Member since {formatDate(customer.created_at)}</span>
    </div>
  </div>
);

/**
 * Customer metrics summary cards
 */
const CustomerMetricsSummary: React.FC<{ customer: Customer }> = ({ customer }) => {
  const metrics = [
    {
      icon: DollarSign,
      label: 'Total Spent',
      value: formatCurrency(customer.transactionSummary?.total_spent || 0),
      color: 'text-green-600'
    },
    {
      icon: PackageIcon,
      label: 'Packages',
      value: customer.packages_purchased || 0,
      color: 'text-blue-600'
    },
    {
      icon: Calendar,
      label: 'Bookings',
      value: customer.bookingSummary?.total_bookings || 0,
      color: 'text-purple-600'
    },
    {
      icon: TrendingUp,
      label: 'Avg per Visit',
      value: formatCurrency(customer.transactionSummary?.average_per_transaction || 0),
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card key={index} className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center space-x-2">
                <IconComponent className={`w-4 h-4 ${metric.color}`} />
                <div>
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                  <div className="font-semibold text-sm">{metric.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/**
 * Customer Header Component
 * 
 * Displays:
 * - Customer name and basic info
 * - Engagement score and tier
 * - Quick metrics summary
 * - Action buttons (edit, refresh)
 */
export const CustomerHeader: React.FC<CustomerHeaderProps & {
  onRefresh?: () => void;
}> = ({ 
  customer, 
  analytics, 
  onEdit, 
  onRefresh 
}) => {
  const customerName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed Customer';

  return (
    <div className="space-y-4">
      {/* Title and Actions Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {/* Customer Avatar/Icon */}
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          
          <div>
            <DialogTitle className="text-xl font-semibold">
              {customerName}
            </DialogTitle>
            {customer.line_user_id && (
              <div className="text-sm text-muted-foreground">
                LINE ID: {customer.line_user_id}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
          
          <Button
            variant="default"
            size="sm"
            onClick={onEdit}
            className="flex items-center space-x-1"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {/* Engagement Badge */}
      {analytics && (
        <EngagementBadge 
          score={analytics.engagementScore} 
          tier={analytics.customerTier} 
        />
      )}

      {/* Contact Information */}
      <CustomerContactInfo customer={customer} />

      <Separator />

      {/* Metrics Summary */}
      <CustomerMetricsSummary customer={customer} />

      {/* Last Activity */}
      {customer.bookingSummary?.last_booking_date && (
        <div className="text-sm text-muted-foreground">
          Last booking: {formatDate(customer.bookingSummary.last_booking_date)}
        </div>
      )}
    </div>
  );
};