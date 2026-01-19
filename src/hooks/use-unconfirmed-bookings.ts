'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking } from '@/types/booking';

interface UseUnconfirmedBookingsResult {
  bookings: Booking[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  confirmBooking: (bookingId: string, employeeName: string) => Promise<boolean>;
}

/**
 * Custom hook for managing unconfirmed bookings
 * Auto-refreshes every 2 minutes to stay in sync with calendar
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Object with bookings, count, loading state, and actions
 */
export function useUnconfirmedBookings(date: string): UseUnconfirmedBookingsResult {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch unconfirmed bookings from API
  const fetchUnconfirmedBookings = useCallback(async () => {
    if (!date) return;

    try {
      const response = await fetch(`/api/bookings/unconfirmed?date=${date}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch unconfirmed bookings: ${response.status}`);
      }

      const data = await response.json();
      setBookings(data.bookings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching unconfirmed bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch unconfirmed bookings');
      setBookings([]);
    }
  }, [date]);

  // Initial fetch and refresh setup
  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      setIsLoading(true);
      await fetchUnconfirmedBookings();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    doFetch();

    // Auto-refresh every 2 minutes (matches calendar refresh interval)
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchUnconfirmedBookings();
      }
    }, 120000); // 2 minutes

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [fetchUnconfirmedBookings]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchUnconfirmedBookings();
    setIsLoading(false);
  }, [fetchUnconfirmedBookings]);

  // Confirm booking via phone call
  const confirmBooking = useCallback(async (bookingId: string, employeeName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/confirm-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_name: employeeName })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to confirm booking');
      }

      // Remove the confirmed booking from local state
      setBookings(prev => prev.filter(b => b.id !== bookingId));

      return true;
    } catch (err) {
      console.error('Error confirming booking:', err);
      return false;
    }
  }, []);

  return {
    bookings,
    count: bookings.length,
    isLoading,
    error,
    refresh,
    confirmBooking
  };
}
