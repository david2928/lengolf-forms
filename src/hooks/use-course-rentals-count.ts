import { useState, useEffect, useCallback } from 'react';

interface CourseRentalInfo {
  count: number;
  setNames: string[];
}

export function useCourseRentalsCount(date: string) {
  const [data, setData] = useState<CourseRentalInfo>({ count: 0, setNames: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    if (!date) return;
    try {
      const response = await fetch(`/api/club-rentals/course-count?date=${date}`);
      if (response.ok) {
        const result = await response.json();
        setData({ count: result.count, setNames: result.setNames || [] });
      }
    } catch (error) {
      console.error('Error fetching course rental count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setIsLoading(true);
    fetchCount();
  }, [fetchCount]);

  return { ...data, isLoading };
}
