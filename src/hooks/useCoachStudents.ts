import useSWR from 'swr';
import { StudentsData } from '@/types/coaching';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCoachStudents(coachId?: string, enabled: boolean = true) {
  const params = new URLSearchParams();
  if (coachId) {
    params.append('coach_id', coachId);
  }

  const { data, error, isLoading } = useSWR<StudentsData>(
    enabled ? `/api/coaching-assist/students?${params.toString()}` : null,
    fetcher
  );

  return {
    studentsData: data,
    error,
    isLoading,
  };
} 