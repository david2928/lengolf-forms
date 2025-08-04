import useSWR from 'swr';
import { useCallback } from 'react';
import type { Booking } from '@/types/pos';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  const data = await res.json();
  // Extract bookings array from the response object
  return data.bookings || [];
};

export function useBookingIntegration() {
  // Create a stable cache key that only changes every minute to prevent constant refetching
  const getStableCacheKey = useCallback(() => {
    const now = new Date();
    // Add 2-hour buffer in the past (show bookings from 2 hours ago)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    // Show bookings up to 6 hours in the future
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    // Round to nearest minute for stable caching
    const startTime = new Date(twoHoursAgo.getFullYear(), twoHoursAgo.getMonth(), twoHoursAgo.getDate(), twoHoursAgo.getHours(), twoHoursAgo.getMinutes());
    const endTime = new Date(sixHoursLater.getFullYear(), sixHoursLater.getMonth(), sixHoursLater.getDate(), sixHoursLater.getHours(), sixHoursLater.getMinutes());
    
    return `/api/bookings/list-by-date?date=${now.toISOString().split('T')[0]}&start=${startTime.toISOString()}&end=${endTime.toISOString()}`;
  }, []);

  const { data: upcomingBookings, error, isLoading, mutate } = useSWR(
    getStableCacheKey(),
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  // Search bookings by customer name or phone
  const searchBookings = useCallback(async (query: string): Promise<Booking[]> => {
    if (query.length < 2) return [];

    const response = await fetch(`/api/bookings?search=${encodeURIComponent(query)}&limit=10`);
    if (!response.ok) {
      throw new Error('Failed to search bookings');
    }

    return response.json();
  }, []);

  // Get booking by ID
  const getBooking = useCallback(async (bookingId: string): Promise<Booking | null> => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch booking');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  }, []);

  // Create a new booking for walk-in customers
  const createWalkInBooking = useCallback(async (bookingData: {
    name: string;
    email: string;
    phoneNumber: string;
    numberOfPeople: number;
    bay?: string;
    customerNotes?: string;
  }) => {
    const now = new Date();
    
    const newBooking = {
      ...bookingData,
      date: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5), // HH:MM format
      duration: 1, // 1 hour default
      status: 'confirmed',
      bookingType: 'walk-in',
      phone_number: bookingData.phoneNumber,
      number_of_people: bookingData.numberOfPeople,
      customer_notes: bookingData.customerNotes
    };

    const response = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }

    const result = await response.json();
    
    // Refresh bookings cache
    mutate();
    
    return result;
  }, [mutate]);

  // Get bay-specific upcoming bookings (only unlinked ones)
  const getBayUpcomingBookings = useCallback((bayName?: string) => {
    if (!upcomingBookings || !Array.isArray(upcomingBookings)) {
      return [];
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // -2 hour buffer
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hour limit


    const filtered = upcomingBookings
      .filter((booking: any) => {
        const bookingStart = new Date(`${booking.date}T${booking.start_time}`);
        
        // Debug each booking
        const timeCheck = bookingStart >= twoHoursAgo && bookingStart <= sixHoursLater;
        
        // Bay logic: Show bookings that either:
        // 1. Have NO bay assigned (null/undefined) - these can be assigned to any bay
        // 2. Have the EXACT bay assignment that matches the requested bay
        const bayCheck = (!booking.bay || booking.bay === null || booking.bay === '') || 
                         (booking.bay === bayName);
        
        
        // Only show bookings that:
        // 1. Are from 2 hours ago onwards (buffer for late arrivals)
        // 2. Either have no bay assigned OR match the requested bay exactly
        return timeCheck && bayCheck;
      })
      .sort((a: any, b: any) => {
        const aTime = new Date(`${a.date}T${a.start_time}`);
        const bTime = new Date(`${b.date}T${b.start_time}`);
        return aTime.getTime() - bTime.getTime();
      })
      .slice(0, 3); // Top 3 most relevant


    return filtered;
  }, [upcomingBookings]);

  // Legacy function for backward compatibility
  const getLikelyNextBookings = useCallback(() => {
    return getBayUpcomingBookings();
  }, [getBayUpcomingBookings]);

  // Transform booking data to match our Booking interface
  const transformBooking = useCallback((booking: any): Booking => ({
    id: booking.id,
    customerId: booking.customer_id,
    name: booking.name,
    email: booking.email,
    phoneNumber: booking.phone_number,
    date: booking.date,
    startTime: booking.start_time,
    duration: booking.duration,
    numberOfPeople: booking.number_of_people,
    status: booking.status,
    bay: booking.bay,
    bookingType: booking.booking_type,
    packageName: booking.package_name,
    customerNotes: booking.customer_notes,
    createdAt: new Date(booking.created_at),
    updatedAt: new Date(booking.updated_at)
  }), []);

  return {
    // Data
    upcomingBookings: Array.isArray(upcomingBookings) ? upcomingBookings.map(transformBooking) : [],
    likelyNextBookings: getLikelyNextBookings().map(transformBooking),
    
    // State
    isLoading,
    error,
    
    // Actions
    searchBookings,
    getBooking,
    createWalkInBooking,
    refreshBookings: mutate,
    getBayUpcomingBookings: (bayName?: string) => getBayUpcomingBookings(bayName).map(transformBooking)
  };
}