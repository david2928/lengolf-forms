import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AvailabilityChange {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  booking: {
    id: string;
    date: string;
    bay: string;
    start_time: string;
    duration: number;
    status: string;
  };
  timestamp: Date;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  bay: string;
  duration: number;
}

export class AvailabilitySubscription {
  private supabase: SupabaseClient | null = null;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Temporarily disable Supabase client to avoid RealtimeClient error
    try {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY!
      );
    } catch (error) {
      console.warn('Supabase client creation failed, using stub implementation:', error);
      this.supabase = null;
    }
  }

  /**
   * Subscribe to availability changes for a specific date and bay combination
   * Uses polling instead of realtime for now
   */
  subscribeToAvailabilityChanges(
    date: string,
    bay: string | null,
    callback: (change: AvailabilityChange) => void
  ): () => void {
    // Return no-op function if supabase client is not available
    if (!this.supabase) {
      console.warn('Supabase client not available, skipping availability subscription');
      return () => {};
    }

    const subscriptionKey = `availability-${date}-${bay || 'all'}`;
    
    // Clear existing interval if it exists
    if (this.pollIntervals.has(subscriptionKey)) {
      clearInterval(this.pollIntervals.get(subscriptionKey)!);
      this.pollIntervals.delete(subscriptionKey);
    }

    // Poll for changes every 5 seconds
    const interval = setInterval(async () => {
      try {
        if (!this.supabase) return;
        
        let query = this.supabase
          .from('bookings')
          .select('*')
          .eq('date', date);

        if (bay) {
          query = query.eq('bay', bay);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error polling for availability changes:', error);
          return;
        }

        // For polling, we can't detect the exact change type, so we'll use 'UPDATE'
        // This is a simplified implementation - in practice you'd need to compare with previous state
        if (data && data.length > 0) {
          data.forEach(booking => {
            callback({
              event: 'UPDATE',
              booking: booking as any,
              timestamp: new Date()
            });
          });
        }
      } catch (err) {
        console.error('Error in availability polling:', err);
      }
    }, 5000);

    this.pollIntervals.set(subscriptionKey, interval);

    // Return unsubscribe function
    return () => {
      if (this.pollIntervals.has(subscriptionKey)) {
        clearInterval(this.pollIntervals.get(subscriptionKey)!);
        this.pollIntervals.delete(subscriptionKey);
      }
    };
  }

  /**
   * Subscribe to all booking changes (for dashboard views)
   * Uses polling instead of realtime for now
   */
  subscribeToAllBookingChanges(
    callback: (change: AvailabilityChange) => void
  ): () => void {
    if (!this.supabase) {
      console.warn('Supabase client not available, skipping all booking changes subscription');
      return () => {};
    }

    const subscriptionKey = 'all-bookings';
    
    if (this.pollIntervals.has(subscriptionKey)) {
      clearInterval(this.pollIntervals.get(subscriptionKey)!);
      this.pollIntervals.delete(subscriptionKey);
    }

    const interval = setInterval(async () => {
      try {
        if (!this.supabase) return;
        
        const { data, error } = await this.supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error polling for all booking changes:', error);
          return;
        }

        if (data && data.length > 0) {
          data.forEach(booking => {
            callback({
              event: 'UPDATE',
              booking: booking as any,
              timestamp: new Date()
            });
          });
        }
      } catch (err) {
        console.error('Error in all bookings polling:', err);
      }
    }, 10000); // Poll every 10 seconds for all bookings

    this.pollIntervals.set(subscriptionKey, interval);
    return () => {
      if (this.pollIntervals.has(subscriptionKey)) {
        clearInterval(this.pollIntervals.get(subscriptionKey)!);
        this.pollIntervals.delete(subscriptionKey);
      }
    };
  }

  /**
   * Check availability for a specific slot
   */
  async checkAvailability(
    date: string,
    bay: string,
    startTime: string,
    duration: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    if (!this.supabase) {
      console.warn('Supabase client not available, returning true for availability check');
      return true;
    }

    const { data, error } = await this.supabase.rpc('check_availability', {
      p_date: date,
      p_bay: bay,
      p_start_time: startTime,
      p_duration: duration,
      p_exclude_booking_id: excludeBookingId || null
    });

    if (error) {
      console.error('Error checking availability:', error);
      return false;
    }

    return data;
  }

  /**
   * Check availability for all bays
   */
  async checkAllBaysAvailability(
    date: string,
    startTime: string,
    duration: number,
    excludeBookingId?: string
  ): Promise<Record<string, boolean>> {
    if (!this.supabase) {
      console.warn('Supabase client not available, returning optimistic availability');
      return { 'Bay 1': true, 'Bay 2': true, 'Bay 3': true };
    }

    try {
      const params = {
        p_date: date,
        p_start_time: startTime,
        p_duration: duration,
        p_exclude_booking_id: excludeBookingId || null
      };

      const { data, error } = await this.supabase.rpc('check_all_bays_availability', params);

      if (error) {
        console.error('Supabase error checking all bays availability:', error);
        // Return optimistic availability to not block user
        return { 'Bay 1': true, 'Bay 2': true, 'Bay 3': true };
      }

      // Ensure we have a valid result
      if (!data || typeof data !== 'object') {
        console.warn('Invalid availability data received:', data);
        return { 'Bay 1': true, 'Bay 2': true, 'Bay 3': true };
      }

      return data;
    } catch (err) {
      console.error('Error in checkAllBaysAvailability:', err);
      // Return optimistic availability to not block user
      return { 'Bay 1': true, 'Bay 2': true, 'Bay 3': true };
    }
  }

  /**
   * Get available time slots for a specific bay and date
   */
  async getAvailableSlots(
    date: string,
    bay: string,
    duration: number = 1.0,
    startHour: number = 10,
    endHour: number = 22
  ): Promise<TimeSlot[]> {
    if (!this.supabase) {
      console.warn('Supabase client not available, returning empty slots');
      return [];
    }

    const { data, error } = await this.supabase.rpc('get_available_slots', {
      p_date: date,
      p_bay: bay,
      p_duration: duration,
      p_start_hour: startHour,
      p_end_hour: endHour
    });

    if (error) {
      console.error('Error getting available slots:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.pollIntervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`Cleaned up polling for ${key}`);
    });
    this.pollIntervals.clear();
  }
}

// Create a singleton instance for the app
export const availabilityService = new AvailabilitySubscription();