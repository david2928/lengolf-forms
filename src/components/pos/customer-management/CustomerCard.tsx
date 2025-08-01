'use client';

import React from 'react';
import { Phone, Calendar, Package, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POSCustomer } from '@/types/pos';

export interface CustomerCardProps {
  customer: POSCustomer;
  onSelect: () => void;
  onDetail: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onSelect,
  onDetail,
  isSelected = false,
  compact = false
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get customer status color and text based on last visit and registration
  const getCustomerStatus = () => {
    if (!customer.isActive) {
      return {
        color: 'bg-red-100 text-red-800',
        text: 'Inactive'
      };
    }

    const now = new Date();
    const registrationDate = customer.registrationDate ? new Date(customer.registrationDate) : null;
    const isRecentlyRegistered = registrationDate && 
      (now.getTime() - registrationDate.getTime()) <= (30 * 24 * 60 * 60 * 1000); // 30 days

    // Check last visit date - handle null, undefined, empty string
    if (!customer.lastVisit || customer.lastVisit === '' || customer.lastVisit === 'null') {
      // If recently registered (within 30 days) and never visited
      if (isRecentlyRegistered) {
        return {
          color: 'bg-yellow-100 text-yellow-800', 
          text: 'New'
        };
      }
      // If registered long ago but never visited
      return {
        color: 'bg-gray-100 text-gray-800',
        text: 'Never Visited'
      };
    }

    const lastVisitDate = new Date(customer.lastVisit);
    
    // Check if date is valid
    if (isNaN(lastVisitDate.getTime())) {
      // Same logic as no visit date
      if (isRecentlyRegistered) {
        return {
          color: 'bg-yellow-100 text-yellow-800',
          text: 'New'
        };
      }
      return {
        color: 'bg-gray-100 text-gray-800',
        text: 'Never Visited'
      };
    }

    const daysSinceVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

    // If recently registered and visited within 30 days, they're new
    if (isRecentlyRegistered && daysSinceVisit <= 30) {
      return {
        color: 'bg-yellow-100 text-yellow-800',
        text: 'New'
      };
    }

    if (daysSinceVisit > 180) { // 6 months
      return {
        color: 'bg-gray-100 text-gray-800',
        text: 'Dormant'
      };
    } else if (daysSinceVisit > 90) { // 3 months
      return {
        color: 'bg-orange-100 text-orange-800',
        text: 'Inactive'
      };
    } else if (daysSinceVisit <= 30) { // Active within 30 days
      if (customer.activePackages > 0) {
        return {
          color: 'bg-purple-100 text-purple-800',
          text: 'VIP'
        };
      }
      return {
        color: 'bg-green-100 text-green-800',
        text: 'Active'
      };
    } else { // 30-90 days
      return {
        color: 'bg-blue-100 text-blue-800',
        text: 'Regular'
      };
    }
  };

  const status = getCustomerStatus();

  return (
    <Card 
      className={`
        relative cursor-pointer transition-all duration-200 hover:shadow-md 
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}
        ${!customer.isActive ? 'opacity-75' : ''}
        ${compact ? 'p-3' : ''}
      `}
      onClick={onDetail}
    >
      <CardContent className={compact ? 'p-2' : 'p-3'}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate text-base">
                {customer.name}
              </h3>
              <Badge className={status.color}>
                {status.text}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-500 font-mono">
              {customer.customerCode}
            </p>
          </div>
          
          <div className="h-8 w-8 flex items-center justify-center text-gray-400">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-2">
          <div className="flex items-center text-sm text-gray-900 font-medium">
            <Phone className="h-4 w-4 mr-2 text-gray-500" />
            <span>{customer.phone}</span>
          </div>
        </div>


        {/* Visit Information */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
          <div>
            <div className="flex items-center mb-1">
              <Clock className="h-3 w-3 mr-1 text-gray-400" />
              <span>Last visit</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatDate(customer.lastVisit)}
            </span>
          </div>
          
          <div>
            <div className="flex items-center mb-1">
              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
              <span>Joined</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatDate(customer.registrationDate)}
            </span>
          </div>
        </div>

        {/* Active Packages */}
        {customer.activePackages > 0 && (
          <div className="mb-2">
            <div className="flex items-center">
              <Package className="h-3 w-3 mr-1 text-gray-400" />
              <span className="text-xs text-gray-600">Active packages:</span>
              <Badge variant="secondary" className="text-xs ml-1">
                {customer.activePackages}
              </Badge>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};