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
      {/* Minimal Header - Table + Customer Only */}
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back + Table/Customer Info */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {customer ? customer.name : (
                    tableSession.table?.displayName || 
                    (tableSession.table?.tableNumber ? `Table ${tableSession.table.tableNumber}` : 'Walk-in')
                  )}
                </h1>
                <div className="flex items-center space-x-3 text-sm text-slate-500">
                  {tableSession.paxCount > 0 && (
                    <span>{tableSession.paxCount} guests</span>
                  )}
                  {sessionDuration && (
                    <span>{sessionDuration}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Staff Info + Actions */}
          <div className="flex items-center space-x-3">
            {/* Staff Dropdown */}
            {currentStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 bg-white border-slate-200 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{currentStaff.staff_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Staff Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-slate-600">
                    <div className="font-medium">{currentStaff.staff_name}</div>
                    {currentStaff.staff_id && (
                      <div className="text-xs">ID: {currentStaff.staff_id}</div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Backoffice Button */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center w-10 h-10 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              title="Back to Backoffice"
            >
              <Home className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};