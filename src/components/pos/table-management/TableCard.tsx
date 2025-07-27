'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, DollarSign, MoreVertical, Crown, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CancelTableModal } from './CancelTableModal';
import { useToast } from '@/components/ui/use-toast';
import type { TableCardProps } from '@/types/pos';

export function TableCard({ table, onClick, onStatusChange, onPayment, closeTable, isSelected = false, isPremiumZone = false }: TableCardProps & { isPremiumZone?: boolean }) {
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

  const handleQuickAction = (e: React.MouseEvent, action: 'open') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'open' && !isOccupied) {
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
        data-testid="table-card"
        data-table-id={table.id}
        data-table-status={isOccupied ? 'occupied' : 'available'}
        className={cn(
          // Mobile-first: larger touch targets and better spacing
          'cursor-pointer transition-all duration-200 active:scale-[0.98] touch-manipulation',
          // Mobile height: minimum 80px for comfortable touch
          'min-h-[80px] sm:min-h-[90px] md:h-40 lg:h-44',
          'flex flex-col relative overflow-hidden',
          // Enhanced visual feedback with left border indicator
          'border-l-4',
          // Selection state styling
          isSelected && 'ring-2 ring-blue-500 ring-offset-2 shadow-lg transform scale-[1.02] z-10',
          isOccupied 
            ? isPremiumZone
              ? isSelected
                ? 'bg-gradient-to-br from-blue-50 via-emerald-50 to-blue-50 border-l-blue-500 border-2 border-blue-400 shadow-xl'
                : 'bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border-l-emerald-500 border-2 border-emerald-300 hover:shadow-lg hover:border-emerald-400 hover:bg-emerald-100/50'
              : isSelected
                ? 'bg-blue-50 border-l-blue-500 border-blue-400 border-2 shadow-xl'
                : 'bg-green-50 border-l-green-500 border-green-300 hover:bg-green-100 border-2'
            : isPremiumZone
              ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border-l-amber-500 border-2 border-amber-200 hover:shadow-md hover:border-amber-300'
              : 'bg-white border-l-gray-400 border-gray-200 hover:bg-gray-50 border hover:shadow-sm'
        )}
        onClick={handleCardClick}
      >
        {/* Premium Zone Indicator */}
        {isPremiumZone && !isSelected && (
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-amber-400">
            <div className="absolute -top-[14px] -right-[1px] text-white">
              <Crown className="w-2.5 h-2.5" />
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Mobile-Optimized Header */}
        <div className={cn(
          "px-3 py-2 sm:px-2 sm:py-1.5 flex items-center justify-between border-b flex-shrink-0",
          isPremiumZone ? "border-amber-200/50" : "border-gray-100"
        )}>
          <h3 className={cn(
            "font-bold text-base sm:text-sm truncate min-w-0 flex-1 mr-3",
            isPremiumZone ? "text-amber-900" : "text-gray-900"
          )}>
            {table.displayName}
          </h3>
          {/* Larger status indicator for mobile */}
          <div className={cn(
            'w-4 h-4 sm:w-3 sm:h-3 rounded-full flex-shrink-0 shadow-sm',
            isOccupied 
              ? isPremiumZone
                ? 'bg-emerald-500 shadow-emerald-200'
                : 'bg-green-500 shadow-green-200'
              : isPremiumZone 
                ? 'bg-amber-400 shadow-amber-200' 
                : 'bg-gray-300 shadow-gray-200'
          )} />
        </div>

        {/* Mobile-Enhanced Main Content */}
        <div className="px-3 py-2 sm:px-2 sm:py-1 flex-1 flex flex-col justify-center min-h-0">
          {isOccupied && session ? (
            <div className="space-y-2">
              {/* Guest Count */}
              <div className="flex items-center text-gray-700">
                <Users className="w-4 h-4 sm:w-3 sm:h-3 mr-1.5 sm:mr-1" />
                <span className="font-semibold text-sm sm:text-xs">{session.paxCount} guests</span>
              </div>

              {/* Customer Name - Better organized */}
              {session.booking && (
                <div className="text-sm sm:text-xs font-semibold text-gray-900 truncate">
                  {session.booking.name}
                </div>
              )}
              
              {/* Current Order Amount */}
              {session.totalAmount > 0 && (
                <div className={cn(
                  "flex items-center justify-center font-bold text-lg px-2 py-1 rounded-lg mt-2",
                  isPremiumZone 
                    ? "text-emerald-700 bg-emerald-100" 
                    : "text-green-700 bg-green-100"
                )}>
                  <span>฿{session.totalAmount.toFixed(0)}</span>
                </div>
              )}
              
            </div>
          ) : (
            <div className="text-center py-2">
              <div className={cn(
                "text-base sm:text-sm font-semibold",
                isPremiumZone ? "text-amber-700" : "text-gray-500"
              )}>
                {isPremiumZone ? "Premium Bay" : "Available"}
              </div>
              <div className={cn(
                "text-xs mt-1",
                isPremiumZone ? "text-amber-600" : "text-gray-400"
              )}>
                {isPremiumZone ? "Tap to book" : "Tap to open"}
              </div>
            </div>
          )}
        </div>

        {/* Mobile-Enhanced Touch Footer */}
        <div className="px-3 pb-2 sm:px-2 flex-shrink-0">
          {isOccupied ? (
            /* For occupied tables, show clearer action button */
            isSelected ? (
              <div className="text-center py-2">
                <div className="text-sm font-medium text-blue-700">
                  Selected - View details below
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <button 
                  data-testid="table-select-button"
                  data-table-action="select"
                  className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium border border-blue-200 transition-colors"
                >
                  Select
                </button>
              </div>
            )
          ) : (
            <Button
              data-testid="table-open-button"
              data-table-action="open"
              variant="default"
              size="sm"
              className={cn(
                // Larger touch target and enhanced visual feedback
                "w-full h-10 sm:h-8 text-sm font-semibold transition-all active:scale-95",
                "shadow-md hover:shadow-lg",
                isPremiumZone 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
              )}
              onClick={(e) => handleQuickAction(e, 'open')}
            >
              {isPremiumZone ? 'Book Premium Bay' : 'Open Table'}
            </Button>
          )}
        </div>
      </Card>

      {/* Cancel Table Modal - Available for cancel operations */}
      <CancelTableModal
        isOpen={showCancelModal}
        table={table}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}