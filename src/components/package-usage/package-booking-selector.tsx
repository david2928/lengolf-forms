'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Check, Calendar, Clock, Users, MapPin, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvailableBooking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string | null;
  number_of_people: number;
  customer_notes: string | null;
  booking_type: string | null;
  status: string;
  customer_name: string;
  phone_number: string;
  already_linked: boolean;
}

interface PackageBookingSelectorProps {
  packageId: string | null;
  value: string | null;
  onChange: (bookingId: string | null, bookingData?: AvailableBooking) => void;
  isDisabled?: boolean;
}

export function PackageBookingSelector({ 
  packageId, 
  value, 
  onChange, 
  isDisabled = false 
}: PackageBookingSelectorProps) {
  const [bookings, setBookings] = useState<AvailableBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch bookings when package changes
  useEffect(() => {
    if (!packageId) {
      setBookings([]);
      setCustomerName('');
      return;
    }

    const fetchBookings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/packages/${packageId}/available-bookings?limit=20`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data.bookings || []);
        setCustomerName(data.customer_name || '');
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [packageId]);

  const selectedBooking = bookings.find(b => b.id === value);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5); // HH:MM format
  };

  const handleBookingSelect = (booking: AvailableBooking) => {
    onChange(booking.id, booking);
    setIsExpanded(false);
  };

  const handleClearSelection = () => {
    onChange(null);
    setIsExpanded(false);
  };

  if (!packageId) {
    return (
      <div className="flex flex-col space-y-1.5">
        <Label className="text-muted-foreground">Select Booking</Label>
        <div className="text-sm text-muted-foreground italic">
          Please select a package first
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1.5">
      <Label>Select Booking</Label>
      
      {/* Selected booking display or selection button */}
      {selectedBooking ? (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900 text-sm">
                  {formatDate(selectedBooking.date)}
                </span>
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 text-sm">
                  {formatTime(selectedBooking.start_time)} ({selectedBooking.duration}h)
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedBooking.id}
                </Badge>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={isDisabled}
                className="text-blue-600 hover:text-blue-800 h-6 px-2"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between text-left h-auto min-h-[2.5rem] py-2",
            !value && "text-muted-foreground"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={isDisabled || isLoading}
        >
          <span>
            {isLoading 
              ? "Loading bookings..." 
              : bookings.length > 0 
                ? "Choose a booking to link usage"
                : "No available bookings found"
            }
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      )}

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Booking selection dropdown */}
      {isExpanded && !selectedBooking && (
        <Card className="border shadow-lg">
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No available bookings found for {customerName}
                </div>
              ) : (
                <div className="divide-y">
                  {bookings.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => handleBookingSelect(booking)}
                      className="w-full p-2 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="font-medium text-gray-900 text-sm">
                            {formatDate(booking.date)}
                          </span>
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-700 text-sm">
                            {formatTime(booking.start_time)} ({booking.duration}h)
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {booking.id}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {bookings.length > 0 && (
              <div className="border-t p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}