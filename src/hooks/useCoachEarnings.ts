import useSWR from 'swr';
import { EarningsData } from '@/types/coaching';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface CoachEarningsFilters {
  coachId?: string;
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month' | 'year';
  rateType?: string;
  limit?: number;
  offset?: number;
}

export function useCoachEarnings(filters: CoachEarningsFilters, enabled: boolean = true) {
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
  if (filters.period) {
    params.append('period', filters.period);
  }
  if (filters.rateType && filters.rateType !== 'all') {
    params.append('rate_type', filters.rateType);
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters.offset) {
    params.append('offset', filters.offset.toString());
  }

  const { data, error, isLoading, mutate } = useSWR<EarningsData>(
    enabled ? `/api/coaching/earnings?${params.toString()}` : null,
    fetcher
  );

  return {
    earningsData: data,
    error,
    isLoading,
    mutate,
  };
}