import useSWR from 'swr';
import { CoachDashboardData } from '@/types/coaching';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCoachDashboard(year: number, month: number, coachId?: string) {
  const params = new URLSearchParams({
    year: year.toString(),
    month: month.toString(),
  });

  if (coachId) {
    params.append('coach_id', coachId);
  }

  const { data, error, isLoading } = useSWR<CoachDashboardData>(
    `/api/coaching/dashboard?${params.toString()}`,
    fetcher
  );

  return {
    dashboardData: data,
    error,
    isLoading,
  };
} 