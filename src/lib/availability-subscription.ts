import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Subscribe to availability changes for a specific date and bay combination
   */
  subscribeToAvailabilityChanges(
    date: string,
    bay: string | null,
    callback: (change: AvailabilityChange) => void
  ): () => void {
    const channelName = `availability-${date}-${bay || 'all'}`;
    
    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribeFromChannel(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: bay ? `date=eq.${date},bay=eq.${bay}` : `date=eq.${date}`
        },
        (payload) => {
          const booking = payload.new || payload.old;
          callback({
            event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            booking: booking as any,
            timestamp: new Date()
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to availability changes for ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to all booking changes (for dashboard views)
   */
  subscribeToAllBookingChanges(
    callback: (change: AvailabilityChange) => void
  ): () => void {
    const channelName = 'all-bookings';
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromChannel(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const booking = payload.new || payload.old;
          callback({
            event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            booking: booking as any,
            timestamp: new Date()
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to all booking changes');
        }
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribeFromChannel(channelName);
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
   * Private method to unsubscribe from a channel
   */
  private unsubscribeFromChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.channels.forEach((channel, channelName) => {
      this.supabase.removeChannel(channel);
      console.log(`Cleaned up ${channelName}`);
    });
    this.channels.clear();
  }
}

// Create a singleton instance for the app
export const availabilityService = new AvailabilitySubscription(); 