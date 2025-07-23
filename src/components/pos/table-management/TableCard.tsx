'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, DollarSign, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CancelTableModal } from './CancelTableModal';
import { useToast } from '@/components/ui/use-toast';
import type { TableCardProps } from '@/types/pos';

export function TableCard({ table, onClick, onStatusChange, onPayment, closeTable }: TableCardProps) {
  const session = table.currentSession;
  const isOccupied = session?.status === 'occupied';
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { toast } = useToast();
  
  // Removed getStatusColor and getStatusBadgeColor - moved to inline styles

  const formatDuration = (start?: Date | string) => {
    if (!start) return '';
    
    const startDate = start instanceof Date ? start : new Date(start);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(table);
  };

  const handleQuickAction = (e: React.MouseEvent, action: 'open' | 'close' | 'payment') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'close' && isOccupied) {
      // Show cancel modal for staff PIN confirmation
      setShowCancelModal(true);
    } else if (action === 'payment' && isOccupied && onPayment) {
      onPayment(table);
    } else if (action === 'open' && !isOccupied) {
      // Opening requires more info, so open the modal
      onClick(table);
    }
  };

  const handleCancelConfirm = async (staffPin: string, reason: string) => {
    try {
      // Call closeTable directly with force close flag instead of going through onStatusChange
      await closeTable(table.id, {
        reason,
        staffPin,
        forceClose: true // Allow closing with unpaid orders for cancellations
      });
      
      setShowCancelModal(false);
      
      // Show success toast
      toast({
        title: "Table Cancelled",
        description: `${table.displayName} has been successfully cancelled and is now available.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error closing table:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to cancel table. Please try again.",
        variant: "destructive",
      });
      
      // Re-throw error for the modal to handle
      throw error;
    }
  };

  return (
    <>
      <Card 
        className={cn(
          'cursor-pointer transition-all duration-200 active:scale-95 touch-manipulation h-32 md:h-56 lg:h-64 xl:h-72 2xl:h-80 flex flex-col',
          isOccupied 
            ? 'bg-green-50 border-green-300 hover:bg-green-100 border-2' 
            : 'bg-white border-gray-200 hover:bg-gray-50 border'
        )}
        onClick={handleCardClick}
      >
      {/* Compact Header */}
      <div className="p-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <h3 className="font-bold text-base text-gray-900 truncate">{table.displayName}</h3>
        <div className={cn(
          'w-3 h-3 rounded-full flex-shrink-0',
          isOccupied ? 'bg-green-500' : 'bg-gray-300'
        )} />
      </div>

      {/* Main Content */}
      <div className="p-2 flex-1 flex flex-col justify-center min-h-0">
        {isOccupied && session ? (
          <div className="space-y-1">
            {/* Essential Info Only */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-700">
                <Users className="w-3 h-3 mr-1" />
                <span className="font-medium">{session.paxCount}</span>
              </div>
              {session.totalAmount > 0 && (
                <div className="flex items-center text-green-600 font-medium text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  <span>฿{session.totalAmount.toFixed(0)}</span>
                </div>
              )}
            </div>

            {/* Customer Name */}
            {session.booking && (
              <div className="text-xs font-medium text-gray-900 truncate">
                {session.booking.name}
              </div>
            )}

          </div>
        ) : (
          <div className="text-center py-1">
            <div className="text-gray-500 text-sm font-medium">Available</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {table.maxPax} pax max
            </div>
          </div>
        )}
      </div>

      {/* Touch-Optimized Footer */}
      <div className="p-1.5 flex-shrink-0">
        {isOccupied ? (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-6 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
              onClick={(e) => handleQuickAction(e, 'payment')}
            >
              Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-6 text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
              onClick={(e) => handleQuickAction(e, 'close')}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="w-full h-6 text-xs font-medium"
            onClick={(e) => handleQuickAction(e, 'open')}
          >
            Open Table
          </Button>
        )}
      </div>
      </Card>

      {/* Cancel Table Modal - Outside the card to prevent event bubbling */}
      <CancelTableModal
        isOpen={showCancelModal}
        table={table}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}