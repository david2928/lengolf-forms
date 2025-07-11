'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Booking } from '@/types/coaching';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useCoachBookings, CoachBookingsFilters } from '@/hooks/useCoachBookings';

interface BookingsViewProps {
  coachId?: string;
  searchTerm?: string;
}

export function BookingsView({ coachId, searchTerm = '' }: BookingsViewProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const filters: CoachBookingsFilters = {
    coachId,
    status: statusFilter,
    period: period || undefined,
    startDate: startDate ? startDate.toLocaleDateString('en-CA') : undefined,
    endDate: endDate ? endDate.toLocaleDateString('en-CA') : undefined,
  };

  const { bookingsData: data, isLoading: loading } = useCoachBookings(filters, true);

  const getStatus = (booking: Booking): 'Upcoming' | 'Completed' | 'Cancelled' => {
    if (booking.status === 'cancelled') {
      return 'Cancelled';
    }
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    return bookingDateTime > new Date() ? 'Upcoming' : 'Completed';
  };

  const getCoachName = (bookingType: string): string => {
    if (!bookingType) return 'Unknown';
    
    // Extract coach name from booking_type like "Coaching (Boss)" or "Coaching (Boss - Ratchavin)"
    const match = bookingType.match(/Coaching \((.+)\)/);
    return match ? match[1] : bookingType;
  };

  const filteredBookings = useMemo(() => {
    if (!data?.bookings) return [];
    
    return data.bookings.filter(booking => {
      const studentNameMatch = booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const status = getStatus(booking);
      const statusMatch = statusFilter === 'all' || status.toLowerCase() === statusFilter;
      return studentNameMatch && statusMatch;
    });
  }, [data, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    if (!data?.bookings) {
      return { total_bookings: 0, upcoming_bookings: 0, completed_bookings: 0, cancelled_bookings: 0 };
    }
    const upcoming = data.bookings.filter(b => getStatus(b) === 'Upcoming').length;
    const completed = data.bookings.filter(b => getStatus(b) === 'Completed').length;
    const cancelled = data.bookings.filter(b => getStatus(b) === 'Cancelled').length;
    return {
      total_bookings: data.bookings.length,
      upcoming_bookings: upcoming,
      completed_bookings: completed,
      cancelled_bookings: cancelled,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Bookings</h1>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading bookings...</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`bg-blue-50 p-3 rounded text-left transition-colors hover:bg-blue-100 ${statusFilter === 'all' ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="font-semibold text-blue-800">{summary.total_bookings}</div>
              <div className="text-sm text-blue-600">Total Bookings</div>
            </button>
            <button 
              onClick={() => setStatusFilter('upcoming')}
              className={`bg-green-50 p-3 rounded text-left transition-colors hover:bg-green-100 ${statusFilter === 'upcoming' ? 'ring-2 ring-green-400' : ''}`}
            >
              <div className="font-semibold text-green-800">{summary.upcoming_bookings}</div>
              <div className="text-sm text-green-600">Upcoming</div>
            </button>
            <button 
              onClick={() => setStatusFilter('completed')}
              className={`bg-purple-50 p-3 rounded text-left transition-colors hover:bg-purple-100 ${statusFilter === 'completed' ? 'ring-2 ring-purple-400' : ''}`}
            >
              <div className="font-semibold text-purple-800">{summary.completed_bookings}</div>
              <div className="text-sm text-purple-600">Completed</div>
            </button>
            <button 
              onClick={() => setStatusFilter('cancelled')}
              className={`bg-red-50 p-3 rounded text-left transition-colors hover:bg-red-100 ${statusFilter === 'cancelled' ? 'ring-2 ring-red-400' : ''}`}
            >
              <div className="font-semibold text-red-800">{summary.cancelled_bookings}</div>
              <div className="text-sm text-red-600">Cancelled</div>
            </button>
          </div>

          <div className="space-y-4">
            {/* Date Filters and Status Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Filters:</span>
              </div>
              
              {/* Quick Period Buttons */}
              <div className="flex gap-2">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'year', label: 'This Year' },
                ].map((periodOption) => (
                  <Button
                    key={periodOption.value}
                    variant={period === periodOption.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPeriod(period === periodOption.value ? '' : periodOption.value as any);
                      if (period !== periodOption.value) {
                        setStartDate(null);
                        setEndDate(null);
                      }
                    }}
                  >
                    {periodOption.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Range */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">or</span>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={(date) => {
                    setStartDate(date);
                    if (date) setPeriod('');
                  }}
                  onEndDateChange={(date) => {
                    setEndDate(date);
                    if (date) setPeriod('');
                  }}
                  className="w-64"
                />
              </div>

              {/* Clear Filters */}
              {(period || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPeriod('');
                    setStartDate(null);
                    setEndDate(null);
                  }}
                >
                  Clear Dates
                </Button>
              )}

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border">
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-6 gap-4 font-semibold text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                <div>Date</div>
                <div>Student</div>
                <div>Coach</div>
                <div>Duration</div>
                <div>Status</div>
                <div>Bay</div>
              </div>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking: Booking) => (
                  <div key={booking.id} className="grid grid-cols-6 gap-4 border rounded-lg p-3 items-center">
                    <div>
                      <div className="font-medium">{new Date(booking.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{booking.customer_name}</div>
                      {booking.contact_number && <p className="text-sm text-gray-500">{booking.contact_number}</p>}
                    </div>
                    <div>
                      <Badge variant="secondary">{getCoachName(booking.booking_type || '')}</Badge>
                    </div>
                    <div>
                      {booking.start_time} - {booking.end_time}
                    </div>
                    <div>
                      <Badge variant="outline">{getStatus(booking)}</Badge>
                    </div>
                    <div>
                      {booking.bay_number}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bookings found matching your filters
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center py-8 text-gray-500">No bookings data available</p>
      )}
    </div>
  );
}