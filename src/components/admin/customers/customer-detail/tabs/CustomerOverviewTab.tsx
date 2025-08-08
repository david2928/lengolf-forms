/**
 * Customer Overview Tab
 * Displays customer basic information, contact details, and key metrics
 * First tab component in the modular architecture
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Package as PackageIcon,
  TrendingUp,
  Star,
  Activity
} from 'lucide-react';
import { formatDate, formatCurrency, formatPackageStatus } from '../utils/customerFormatters';
import type { CustomerOverviewTabProps } from '../utils/customerTypes';

/**
 * Customer basic information card
 */
const CustomerInfoCard: React.FC<CustomerOverviewTabProps> = ({ customer }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <User className="w-5 h-5" />
        <span>Customer Information</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Name</label>
        <p className="text-base">
          {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Not provided'}
        </p>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
            <Phone className="w-3 h-3" />
            <span>Phone</span>
          </label>
          <p className="text-base">{customer.phone || 'Not provided'}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
            <Mail className="w-3 h-3" />
            <span>Email</span>
          </label>
          <p className="text-base truncate">{customer.email || 'Not provided'}</p>
        </div>
      </div>

      {/* LINE Integration */}
      {customer.line_user_id && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">LINE User ID</label>
          <p className="text-base font-mono text-sm">{customer.line_user_id}</p>
        </div>
      )}

      {/* Membership Info */}
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Member Since</span>
          </label>
          <p className="text-base">{formatDate(customer.created_at)}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Last Updated</span>
          </label>
          <p className="text-base">{formatDate(customer.updated_at)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Customer activity summary card
 */
const CustomerActivityCard: React.FC<CustomerOverviewTabProps> = ({ customer, analytics }) => {
  const activities = [
    {
      icon: DollarSign,
      label: 'Total Spent',
      value: formatCurrency(customer.transactionSummary?.total_spent || 0),
      subtext: `${customer.transactionSummary?.transaction_count || 0} transactions`,
      color: 'text-green-600'
    },
    {
      icon: PackageIcon,
      label: 'Packages Purchased',
      value: customer.packages_purchased || 0,
      subtext: 'Lifetime packages',
      color: 'text-blue-600'
    },
    {
      icon: Calendar,
      label: 'Total Bookings',
      value: customer.bookingSummary?.total_bookings || 0,
      subtext: customer.bookingSummary?.last_booking_date 
        ? `Last: ${formatDate(customer.bookingSummary.last_booking_date)}`
        : 'No bookings yet',
      color: 'text-purple-600'
    },
    {
      icon: TrendingUp,
      label: 'Average per Visit',
      value: formatCurrency(customer.transactionSummary?.average_per_transaction || 0),
      subtext: customer.bookingSummary?.average_duration 
        ? `${customer.bookingSummary.average_duration}min avg`
        : 'No data',
      color: 'text-orange-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Activity Summary</span>
          </div>
          {analytics && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span>{analytics.customerTier.charAt(0).toUpperCase() + analytics.customerTier.slice(1)}</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity, index) => {
            const IconComponent = activity.icon;
            return (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg bg-muted ${activity.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{activity.label}</p>
                  <p className="text-lg font-semibold">{activity.value}</p>
                  <p className="text-xs text-muted-foreground">{activity.subtext}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Engagement Score */}
        {analytics && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Engagement Score</p>
                <p className="text-xs text-muted-foreground">
                  Based on bookings, spending, and frequency
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {analytics.engagementScore}/100
                </p>
                <Badge 
                  variant={analytics.engagementScore >= 70 ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {analytics.engagementScore >= 70 ? 'Highly Engaged' : 
                   analytics.engagementScore >= 40 ? 'Moderately Engaged' : 'Low Engagement'}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Recent activity preview card
 */
const RecentActivityCard: React.FC<CustomerOverviewTabProps> = ({ customer }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Clock className="w-5 h-5" />
        <span>Recent Activity</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Last booking */}
        {customer.bookingSummary?.last_booking_date && (
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Last booking</span>
            </div>
            <span className="text-sm font-medium">
              {formatDate(customer.bookingSummary.last_booking_date)}
            </span>
          </div>
        )}

        {/* Transaction summary */}
        {customer.transactionSummary && customer.transactionSummary.transaction_count > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Recent purchases</span>
            </div>
            <span className="text-sm font-medium">
              {customer.transactionSummary.transaction_count} transactions
            </span>
          </div>
        )}

        {/* Packages */}
        {customer.packages_purchased && customer.packages_purchased > 0 && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              <PackageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Packages purchased</span>
            </div>
            <span className="text-sm font-medium">
              {customer.packages_purchased} packages
            </span>
          </div>
        )}

        {/* No activity state */}
        {!customer.bookingSummary?.last_booking_date && 
         !customer.transactionSummary?.transaction_count &&
         !customer.packages_purchased && (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

/**
 * Customer Overview Tab Component
 * 
 * Displays:
 * - Customer basic information and contact details
 * - Activity summary with key metrics
 * - Recent activity preview
 * - Engagement scoring (if analytics available)
 */
export const CustomerOverviewTab: React.FC<CustomerOverviewTabProps> = ({ 
  customer, 
  analytics 
}) => {
  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <CustomerInfoCard customer={customer} analytics={analytics} />

        {/* Activity Summary */}
        <CustomerActivityCard customer={customer} analytics={analytics} />
      </div>

      {/* Recent Activity */}
      <RecentActivityCard customer={customer} analytics={analytics} />
    </div>
  );
};