'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { StaffPinModal } from '@/components/pos/payment/StaffPinModal';
import type { Table } from '@/types/pos';

export interface CancelTableModalProps {
  isOpen: boolean;
  table: Table;
  onClose: () => void;
  onConfirm: (staffPin: string, reason: string) => Promise<void>;
}

export function CancelTableModal({ isOpen, table, onClose, onConfirm }: CancelTableModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  // Debug logging to see table structure
  React.useEffect(() => {
    if (isOpen && table) {
      console.log('🔍 CancelTableModal: Table data:', JSON.stringify(table, null, 2));
      console.log('🔍 CancelTableModal: Current session:', table.currentSession);
      console.log('🔍 CancelTableModal: Orders:', table.currentSession?.orders);
    }
  }, [isOpen, table]);

  const handleReasonSubmit = () => {
    if (!reason.trim()) {
      setError('Please select a reason');
      return;
    }

    console.log('🔍 CancelTableModal: Showing PIN modal');
    setError(null);
    setShowPinModal(true);
  };

  const handlePinSuccess = async (pin: string) => {
    console.log('🔍 CancelTableModal: PIN success, canceling table');
    setIsSubmitting(true);
    setShowPinModal(false);

    try {
      await onConfirm(pin, reason);
      handleClose();
    } catch (error) {
      console.error('🔍 CancelTableModal: Cancel failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel table');
      setIsSubmitting(false);
    }
  };

  const handlePinCancel = () => {
    console.log('🔍 CancelTableModal: PIN canceled');
    setShowPinModal(false);
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    setIsSubmitting(false);
    setShowPinModal(false);
    onClose();
  };

  const predefinedReasons = [
    'Customer left early',
    'Customer cancelled',
    'Technical issue',
    'Staff error',
    'Emergency closure',
    'Other'
  ];

  return (
    <>
      <Dialog open={isOpen && !showPinModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Cancel Table Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                <strong>Table:</strong> {table.displayName}
              </div>
              {table.currentSession && (
                <>
                  {table.currentSession.booking && (
                    <div className="text-sm text-red-800 mt-1">
                      <strong>Customer:</strong> {table.currentSession.booking.name}
                    </div>
                  )}
                  {/* Order Information - try multiple sources */}
                  {(() => {
                    // Try orders array first
                    if (table.currentSession?.orders && table.currentSession.orders.length > 0) {
                      const orders = table.currentSession.orders;
                      return (
                        <div className="text-sm text-red-800 mt-1">
                          <strong>Order ID{orders.length > 1 ? 's' : ''}:</strong>{' '}
                          {orders.map((order, index) => (
                            <span key={order.id}>
                              {order.orderNumber || order.orderId}
                              {index < orders.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    
                    // Fallback: try session ID as order identifier
                    if (table.currentSession?.id) {
                      return (
                        <div className="text-sm text-red-800 mt-1">
                          <strong>Session ID:</strong> {table.currentSession.id.slice(-8)}
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                  {table.currentSession.totalAmount > 0 && (
                    <div className="text-sm text-red-700 mt-1">
                      <strong>Outstanding Amount:</strong> ฿{table.currentSession.totalAmount.toFixed(2)}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Cancellation</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {predefinedReasons.map((reasonOption) => (
                    <SelectItem key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleReasonSubmit} 
              disabled={isSubmitting || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Cancelling...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff PIN Modal */}
      <StaffPinModal
        isOpen={showPinModal}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        title="Authorization Required"
        description="Please enter your staff PIN to cancel this table session"
      />
      
      {/* Debug */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', top: 10, right: 10, background: 'yellow', padding: '5px', fontSize: '12px', zIndex: 9999 }}>
          showPinModal: {showPinModal.toString()}
        </div>
      )}
    </>
  );
}