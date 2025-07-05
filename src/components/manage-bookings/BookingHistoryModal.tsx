'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface BookingHistoryEntry {
  history_id: string;
  changed_at: string;
  action_type: string;
  changed_by_type: string | null;
  changed_by_identifier: string | null;
  changes_summary: string | null;
  notes: string | null;
}

interface BookingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
}

export function BookingHistoryModal({ isOpen, onClose, bookingId }: BookingHistoryModalProps) {
  const [history, setHistory] = useState<BookingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/bookings/${bookingId}/history`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch booking history');
          }
          const data = await response.json();
          setHistory(data.history || []);
        } catch (e: any) {
          setError(e.message || 'An unexpected error occurred.');
          setHistory([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    } else {
      // Clear history when modal is closed or bookingId is not available
      setHistory([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, bookingId]);

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking History (ID: {bookingId ? bookingId : 'N/A'})</DialogTitle>
          <DialogDescription>
            View the change history for this booking.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[60vh] overflow-y-auto pr-6">
          {isLoading && <p className="text-center py-4">Loading history...</p>}
          {error && <p className="text-red-500 text-center py-4">Error: {error}</p>}
          {!isLoading && !error && history.length === 0 && (
            <p className="text-center py-4">No history found for this booking.</p>
          )}
          {!isLoading && !error && history.length > 0 && (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.history_id} className="p-3 border rounded-md bg-slate-50">
                  <p className="text-sm font-semibold">
                    {format(parseISO(entry.changed_at), 'PPP ppp')} - <span className="font-normal">{entry.action_type}</span>
                  </p>
                  {(entry.changed_by_identifier || entry.changed_by_type) && (
                     <p className="text-xs text-gray-600">
                        By: {entry.changed_by_identifier || 'N/A'} ({entry.changed_by_type || 'N/A'})
                     </p>
                  )}
                  {entry.changes_summary && (
                    <p className="text-xs mt-1">Summary: {entry.changes_summary}</p>
                  )}
                  {entry.notes && (
                    <p className="text-xs mt-1">Notes: {entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 