import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  availabilityService, 
  AvailabilityChange, 
  TimeSlot 
} from '@/lib/availability-subscription';

export interface UseAvailabilityOptions {
  date: string;
  bay?: string;
  duration?: number;
  startHour?: number;
  endHour?: number;
  autoRefresh?: boolean;
}

export interface UseAvailabilityReturn {
  availability: Record<string, boolean>;
  availableSlots: TimeSlot[];
  loading: boolean;
  error: string | null;
  refreshAvailability: () => Promise<void>;
  checkSlotAvailability: (startTime: string, duration?: number) => Promise<boolean>;
}

/**
 * Hook for managing availability data with real-time updates
 */
export function useAvailability(options: UseAvailabilityOptions): UseAvailabilityReturn {
  const {
    date,
    bay,
    duration = 1.0,
    startHour = 10,
    endHour = 22,
    autoRefresh = true
  } = options;

  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Refresh availability data
   */
  const refreshAvailability = useCallback(async () => {
    if (!date) return;

    setLoading(true);
    setError(null);

    try {
      // Get all bays availability
      const allBaysAvailability = await availabilityService.checkAllBaysAvailability(
        date,
        '10:00', // Default time for checking
        duration
      );
      setAvailability(allBaysAvailability);

      // Get available slots if a specific bay is selected
      if (bay) {
        const slots = await availabilityService.getAvailableSlots(
          date,
          bay,
          duration,
          startHour,
          endHour
        );
        setAvailableSlots(slots);
      }
    } catch (err) {
      console.error('Error refreshing availability:', err);
      setError('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [date, bay, duration, startHour, endHour]);

  /**
   * Check availability for a specific slot
   */
  const checkSlotAvailability = useCallback(async (
    startTime: string,
    slotDuration: number = duration
  ): Promise<boolean> => {
    if (!date || !bay) return false;

    try {
      return await availabilityService.checkAvailability(
        date,
        bay,
        startTime,
        slotDuration
      );
    } catch (err) {
      console.error('Error checking slot availability:', err);
      return false;
    }
  }, [date, bay, duration]);

  /**
   * Handle real-time availability changes
   */
  const handleAvailabilityChange = useCallback((change: AvailabilityChange) => {
    console.log('Availability change detected:', change);
    
    // If the change affects our current date/bay, refresh the data
    if (change.booking.date === date && (!bay || change.booking.bay === bay)) {
      // Debounce refresh to avoid too many updates
      setTimeout(() => {
        refreshAvailability();
      }, 500);
    }
  }, [date, bay, refreshAvailability]);

  /**
   * Set up real-time subscription
   */
  useEffect(() => {
    if (!date || !autoRefresh) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to changes
    const unsubscribe = availabilityService.subscribeToAvailabilityChanges(
      date,
      bay || null,
      handleAvailabilityChange
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [date, bay, autoRefresh, handleAvailabilityChange]);

  /**
   * Initial data load
   */
  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    availability,
    availableSlots,
    loading,
    error,
    refreshAvailability,
    checkSlotAvailability
  };
}

/**
 * Simpler hook for checking all bays availability - no subscriptions, just on-demand checks
 */
export function useAllBaysAvailability(date: string, startTime: string, duration: number = 1.0) {
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false); // Start as false, only load when needed
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async () => {
    if (!date || !startTime) return;

    setLoading(true);
    setError(null);

    try {
      const result = await availabilityService.checkAllBaysAvailability(
        date,
        startTime,
        duration
      );
      setAvailability(result);
      console.log('Successfully checked bay availability:', result);
    } catch (err) {
      console.error('Error checking all bays availability:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check availability';
      setError(errorMessage);
      // Don't set availability to avoid showing incorrect data
      setAvailability({});
    } finally {
      setLoading(false);
    }
  }, [date, startTime, duration]);

  // Only check on initial mount if we have valid params
  useEffect(() => {
    if (date && startTime) {
      checkAvailability();
    }
  }, [date, startTime, duration, checkAvailability]); // Check whenever params change

  return {
    availability,
    loading,
    error,
    refresh: checkAvailability
  };
} 