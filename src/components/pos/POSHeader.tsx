'use client';

import React, { useState } from 'react';
import { TableSession, Customer } from '@/types/pos';
import { ArrowLeft, Table2, Home, User, LogOut, Menu, Receipt, Users, X, RefreshCw, CalendarCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type POSView = 'tables' | 'transactions' | 'customers' | 'pos' | 'payment';

export interface POSMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  enabled: boolean;
  badge?: string | number;
  dividerAfter?: boolean;
}

export interface POSHeaderProps {
  tableSession?: TableSession;
  customer?: Customer | null;
  onBack: () => void;
  className?: string;
  currentView?: POSView;
  onViewChange?: (view: POSView) => void;
  onReprintReceipt?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onCloseDay?: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  tableSession,
  customer,
  onBack,
  className = '',
  currentView = 'tables',
  onViewChange,
  onReprintReceipt,
  onRefresh,
  isRefreshing,
  onCloseDay
}) => {
  const router = useRouter();
  const { staff, logout } = useStaffAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Menu items configuration - Only the three requested items
  const menuItems: POSMenuItem[] = [
    {
      id: 'tables',
      label: 'Table Management',
      icon: Table2,
      action: () => {
        onViewChange?.('tables');
        setIsMenuOpen(false);
      },
      enabled: true
    },
    {
      id: 'transactions',
      label: 'Transaction Management',
      icon: Receipt,
      action: () => {
        onViewChange?.('transactions');
        setIsMenuOpen(false);
      },
      enabled: true
    },
    {
      id: 'customers',
      label: 'Customer Management',
      icon: Users,
      action: () => {
        onViewChange?.('customers');
        setIsMenuOpen(false);
      },
      enabled: true
    },
    {
      id: 'close-day',
      label: 'Close Day',
      icon: CalendarCheck,
      action: () => {
        onCloseDay?.();
        setIsMenuOpen(false);
      },
      enabled: !!onCloseDay,
      dividerAfter: true
    }
  ];

  // Format time
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
    <>
      <div className={`pos-header bg-white ${className}`}>
        {/* Top Header Row - LENGOLF POS + Home */}
        <div className="border-b border-slate-200">
          <div className="px-4 py-2 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Lengolf POS</h1>
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center w-8 h-8 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              title="Back to Backoffice"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Second Row - Navigation + Staff Info */}
        <div className="border-b border-slate-200">
          <div className="px-4 py-2 flex items-center justify-between">
            {/* Left: Menu + Navigation */}
            <div className="flex items-center gap-3">
              {/* Menu Button - Opens Side Panel */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center justify-center w-8 h-8 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                title="Menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Back Button - Only show when not on tables view */}
              {currentView !== 'tables' && (
                <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              
              {/* Page Title */}
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {currentView === 'tables' && 'Table Management'}
                  {currentView === 'transactions' && 'Transaction Management'}
                  {currentView === 'customers' && 'Customer Management'}
                  {currentView === 'pos' && (customer ? customer.name : (
                    tableSession?.table?.displayName || 
                    (tableSession?.table?.tableNumber ? `Table ${tableSession.table.tableNumber}` : 'Walk-in')
                  ))}
                </h2>
                {currentView === 'pos' && tableSession && (
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    {tableSession.paxCount > 0 && (
                      <span>{tableSession.paxCount} guests</span>
                    )}
                    {sessionDuration && (
                      <span>{sessionDuration}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Staff Info + Refresh Button */}
            <div className="flex items-center gap-2">
              {/* Refresh Button - only show on transactions view */}
              {currentView === 'transactions' && onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              
              {/* Staff Info */}
              {staff && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">{staff.staff_name}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Side Panel */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">POS Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <button
                        onClick={item.action}
                        disabled={!item.enabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          item.enabled
                            ? 'hover:bg-gray-100 text-gray-900'
                            : 'text-gray-400 cursor-not-allowed'
                        } ${
                          (item.id === 'tables' && currentView === 'tables') ||
                          (item.id === 'transactions' && currentView === 'transactions')
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                      {item.dividerAfter && (
                        <div className="my-2 border-t border-gray-200"></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Panel Footer */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};