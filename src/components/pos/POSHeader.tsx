'use client';

import React, { useState } from 'react';
import { TableSession, Customer } from '@/types/pos';
import { ArrowLeft, Table2, Home, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePOSStaffAuth } from '@/hooks/use-pos-staff-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface POSHeaderProps {
  tableSession: TableSession;
  customer?: Customer | null;
  onBack: () => void;
  className?: string;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  tableSession,
  customer,
  onBack,
  className = ''
}) => {
  const router = useRouter();
  const { currentStaff, logout } = usePOSStaffAuth();
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
    if (!tableSession.sessionStart) return null;
    
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
    <div className={`pos-header bg-white border-b border-slate-200 ${className}`}>
      {/* Compact Header */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Back + Table/Customer Info */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                {customer ? customer.name : (
                  tableSession.table?.displayName || 
                  (tableSession.table?.tableNumber ? `Table ${tableSession.table.tableNumber}` : 'Walk-in')
                )}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                {tableSession.paxCount > 0 && (
                  <span>{tableSession.paxCount} guests</span>
                )}
                {sessionDuration && (
                  <span>{sessionDuration}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right: Staff Info + Home Button */}
          <div className="flex items-center gap-3">
            {/* Staff Info - Clickable */}
            {currentStaff && (
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{currentStaff.staff_name}</span>
              </button>
            )}

            {/* Home Button */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center w-8 h-8 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              title="Back to Backoffice"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};