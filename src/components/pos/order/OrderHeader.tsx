'use client';

import React, { useState } from 'react';
import { Order, Customer, TableSession } from '@/types/pos';
import { User, UserPlus, X, ChevronLeft, ChevronRight, Table2, Clock } from 'lucide-react';
// Customer info comes from booking system, no need for separate modal

export interface OrderHeaderProps {
  order: Order | null;
  tableSession?: TableSession | null;
  customer?: Customer | null;
  // Customer info comes from booking system
  onCollapseToggle?: () => void;
  isCollapsed?: boolean;
  className?: string;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  tableSession,
  customer,
  onCollapseToggle,
  isCollapsed = false,
  className = ''
}) => {
  // Customer info comes from tableSession.customer or tableSession.booking

  // Format date/time
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  // Get session duration
  const getSessionDuration = () => {
    if (!tableSession?.sessionStart) return null;
    
    const start = new Date(tableSession.sessionStart);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const sessionDuration = getSessionDuration();

  return (
    <div className={`order-header p-6 bg-slate-50 border-b border-slate-200 ${className}`}>
      {/* Main Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {order ? `Order #${order.orderNumber.split('-').pop()}` : 'New Order'}
          </h2>
          
          {/* Collapse Toggle for Mobile */}
          {onCollapseToggle && (
            <button
              onClick={onCollapseToggle}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {isCollapsed ? (
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-600" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-500">
          {order?.createdAt && (
            <>
              <Clock className="h-4 w-4" />
              <span>{formatTime(order.createdAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Table and Customer Info */}
      <div className="space-y-3">
        {/* Table Session Info */}
        {tableSession && (
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2">
              <Table2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">
                {tableSession.table?.displayName || 'Table'}
              </span>
              {tableSession.paxCount > 0 && (
                <span className="text-sm text-slate-500">
                  {tableSession.paxCount} guests
                </span>
              )}
            </div>
            {sessionDuration && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {sessionDuration}
              </span>
            )}
          </div>
        )}

        {/* Customer Info */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
          {customer ? (
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {customer.name}
                </p>
                {(customer.phone || customer.email) && (
                  <p className="text-xs text-slate-500 truncate">
                    {customer.phone || customer.email}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-sm text-slate-500 w-full">
              <User className="h-4 w-4" />
              <span>Walk-in customer</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Status */}
      {order && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-slate-500">Status:</span>
              <span className={`
                font-medium px-2 py-1 rounded-lg
                ${order.status === 'draft' ? 'bg-slate-100 text-slate-700' : ''}
                ${order.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                ${order.status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
              `}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};