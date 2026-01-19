'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Booking } from '@/types/booking';
import { UnconfirmedBookingCard } from './UnconfirmedBookingCard';
import { CancelBookingModal } from '@/components/manage-bookings/CancelBookingModal';

interface UnconfirmedBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onConfirm: (bookingId: string, employeeName: string) => Promise<boolean>;
  onBookingCancelled: () => void;
  date: string;
}

export function UnconfirmedBookingsModal({
  isOpen,
  onClose,
  bookings,
  isLoading,
  onRefresh,
  onConfirm,
  onBookingCancelled,
  date
}: UnconfirmedBookingsModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmingBookingId, setConfirmingBookingId] = useState<string | null>(null);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirm = async (bookingId: string, employeeName: string): Promise<boolean> => {
    setConfirmingBookingId(bookingId);
    try {
      return await onConfirm(bookingId, employeeName);
    } finally {
      setConfirmingBookingId(null);
    }
  };

  const handleCancelClick = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    setBookingToCancel(null);
    onBookingCancelled();
  };

  const handleCancelModalClose = () => {
    setCancelModalOpen(false);
    setBookingToCancel(null);
  };

  // Format date for display
  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none sm:w-full sm:h-full sm:max-w-none sm:max-h-none p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="flex-shrink-0 p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Phone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold">
                      Unconfirmed Bookings
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDateForDisplay(date)} &bull; {bookings.length} booking{bookings.length !== 1 ? 's' : ''} to call
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
                  <p className="text-gray-500">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <div className="p-4 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">All caught up!</h3>
                    <p className="text-gray-500 mt-1">
                      No bookings need phone confirmation right now.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {bookings.map((booking) => (
                    <UnconfirmedBookingCard
                      key={booking.id}
                      booking={booking}
                      onConfirm={handleConfirm}
                      onCancel={handleCancelClick}
                      isConfirming={confirmingBookingId === booking.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t bg-white">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {bookings.length > 0
                    ? 'Tap the green phone button to call, then confirm after speaking with the customer.'
                    : 'Great job keeping up with confirmations!'
                  }
                </p>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={cancelModalOpen}
        onClose={handleCancelModalClose}
        booking={bookingToCancel}
        onSuccess={handleCancelSuccess}
      />
    </>
  );
}
