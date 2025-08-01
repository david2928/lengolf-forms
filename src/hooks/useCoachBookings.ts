import useSWR from 'swr';
import { BookingsData } from '@/types/coaching';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface CoachBookingsFilters {
  coachId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  period?: 'today' | 'week' | 'month' | 'year';
}

export function useCoachBookings(filters: CoachBookingsFilters, enabled: boolean = true) {
  const params = new URLSearchParams();
  
  if (filters.coachId) {
    params.append('coach_id', filters.coachId);
  }
  if (filters.startDate) {
    params.append('start_date', filters.startDate);
  }
  if (filters.endDate) {
    params.append('end_date', filters.endDate);
  }
  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters.period) {
    params.append('period', filters.period);
  }

  const { data, error, isLoading, mutate } = useSWR<BookingsData>(
    enabled ? `/api/coaching/bookings?${params.toString()}` : null,
    fetcher
  );

  return {
    bookingsData: data,
    error,
    isLoading,
    mutate,
  };
} 