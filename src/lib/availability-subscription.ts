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
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds cache

  constructor() {
    console.log('Simple availability service initialized (using API calls only)');
  }

  /**
   * Simple cache management
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * No more polling - simple manual refresh when needed
   */
  subscribeToAvailabilityChanges(
    date: string,
    bay: string | null,
    callback: (change: AvailabilityChange) => void
  ): () => void {
    console.log('Simple availability service: no real subscriptions, use manual refresh');
    // Return no-op unsubscribe function
    return () => {};
  }

  /**
   * No more polling for all bookings either
   */
  subscribeToAllBookingChanges(
    callback: (change: AvailabilityChange) => void
  ): () => void {
    console.log('Simple availability service: no polling for all bookings');
    return () => {};
  }

  /**
   * Check availability for a specific slot using API endpoint
   */
  async checkAvailability(
    date: string,
    bay: string,
    startTime: string,
    duration: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/availability/check-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          bay,
          startTime,
          duration,
          excludeBookingId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result.available;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error(`Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check availability for all bays with simple caching using API endpoint
   */
  async checkAllBaysAvailability(
    date: string,
    startTime: string,
    duration: number,
    excludeBookingId?: string
  ): Promise<Record<string, boolean>> {
    const cacheKey = `all-bays-${date}-${startTime}-${duration}-${excludeBookingId || 'none'}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('Using cached availability data');
      return cached;
    }

    try {
      console.log('Checking bay availability with params:', { date, startTime, duration, excludeBookingId });

      const response = await fetch('/api/availability/check-all-bays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          duration,
          excludeBookingId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Ensure we have a valid result
      if (!result.availability || typeof result.availability !== 'object') {
        console.warn('Invalid availability data received:', result);
        throw new Error('Invalid availability data received from API');
      }

      // Cache the result
      this.setCache(cacheKey, result.availability);

      console.log('Bay availability check result:', {
        date,
        startTime,
        duration,
        result: result.availability
      });

      return result.availability;
    } catch (err) {
      console.error('Error in checkAllBaysAvailability:', err);
      throw err instanceof Error ? err : new Error('Unknown error checking bay availability');
    }
  }

  /**
   * Get available time slots with caching using API endpoint
   */
  async getAvailableSlots(
    date: string,
    bay: string,
    duration: number = 1.0,
    startHour: number = 10,
    endHour: number = 22
  ): Promise<TimeSlot[]> {
    const cacheKey = `slots-${date}-${bay}-${duration}-${startHour}-${endHour}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('Using cached slots data');
      return cached;
    }

    try {
      const response = await fetch('/api/availability/get-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          bay,
          duration,
          startHour,
          endHour
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const slots = result.slots || [];
      this.setCache(cacheKey, slots);
      return slots;
    } catch (err) {
      console.error('Error in getAvailableSlots:', err);
      return [];
    }
  }

  /**
   * Clear cache manually when needed
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Availability cache cleared');
  }

  /**
   * Simple cleanup - just clear cache
   */
  cleanup(): void {
    this.clearCache();
    console.log('Simple availability service cleaned up');
  }
}

// Create a singleton instance for the app
export const availabilityService = new AvailabilitySubscription();