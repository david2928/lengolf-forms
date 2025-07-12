'use client';

import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Calendar } from 'lucide-react';
import { BookingsData, Booking } from '@/types/coaching';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useCoachBookings, CoachBookingsFilters } from '@/hooks/useCoachBookings';

interface BookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId?: string;
}

export function BookingsModal({ isOpen, onClose, coachId }: BookingsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
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

  const { bookingsData: data, isLoading: loading, mutate } = useCoachBookings(filters, isOpen);

  const getStatus = (booking: Booking): 'Upcoming' | 'Completed' | 'Cancelled' => {
    if (booking.status === 'cancelled') {
      return 'Cancelled';
    }
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    return bookingDateTime > new Date() ? 'Upcoming' : 'Completed';
  };

  const filteredBookings = useMemo(() => {
    if (!data?.bookings) return [];
    
    return data.bookings.filter(booking => {
      const studentNameMatch = booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getStatus(booking);
      const statusMatch = statusFilter === 'all' || status.toLowerCase() === statusFilter;
      return studentNameMatch && statusMatch;
    });
  }, [data, searchQuery, statusFilter]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Full-screen Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Bookings</h2>
            <p className="text-sm text-gray-600">Coaching session history and management</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-12 w-12 rounded-full touch-manipulation">
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bookings...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <button 
                  onClick={() => setStatusFilter('all')}
                  className={`bg-blue-50 border border-blue-200 p-4 rounded-lg text-left transition-all hover:bg-blue-100 hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-blue-400 bg-blue-100' : ''}`}
                >
                  <div className="text-2xl font-bold text-blue-900">{summary.total_bookings}</div>
                  <div className="text-sm text-blue-700">Total Bookings</div>
                </button>
                <button 
                  onClick={() => setStatusFilter('upcoming')}
                  className={`bg-green-50 border border-green-200 p-4 rounded-lg text-left transition-all hover:bg-green-100 hover:shadow-md ${statusFilter === 'upcoming' ? 'ring-2 ring-green-400 bg-green-100' : ''}`}
                >
                  <div className="text-2xl font-bold text-green-900">{summary.upcoming_bookings}</div>
                  <div className="text-sm text-green-700">Upcoming</div>
                </button>
                <button 
                  onClick={() => setStatusFilter('completed')}
                  className={`bg-purple-50 border border-purple-200 p-4 rounded-lg text-left transition-all hover:bg-purple-100 hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-purple-400 bg-purple-100' : ''}`}
                >
                  <div className="text-2xl font-bold text-purple-900">{summary.completed_bookings}</div>
                  <div className="text-sm text-purple-700">Completed</div>
                </button>
                <button 
                  onClick={() => setStatusFilter('cancelled')}
                  className={`bg-red-50 border border-red-200 p-4 rounded-lg text-left transition-all hover:bg-red-100 hover:shadow-md ${statusFilter === 'cancelled' ? 'ring-2 ring-red-400 bg-red-100' : ''}`}
                >
                  <div className="text-2xl font-bold text-red-900">{summary.cancelled_bookings}</div>
                  <div className="text-sm text-red-700">Cancelled</div>
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                {/* Search and Status Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search by student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-12">
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

                {/* Date Filters */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
                  </div>
                  
                  {/* Quick Period Buttons */}
                  <div className="flex flex-wrap gap-2">
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
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Custom Date Range - Mobile Friendly */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-sm text-gray-500">Custom range:</span>
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
                      className="w-full sm:w-64"
                    />
                  </div>
                </div>
              </div>
              
              {/* Booking Cards */}
              <div className="space-y-3">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking: Booking) => {
                    const status = getStatus(booking);
                    const statusColors = {
                      'Upcoming': 'bg-blue-50 border-blue-200 text-blue-900',
                      'Completed': 'bg-green-50 border-green-200 text-green-900',
                      'Cancelled': 'bg-red-50 border-red-200 text-red-900'
                    };

                    return (
                      <div key={booking.id} className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${statusColors[status]}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          {/* Main Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <h3 className="font-semibold text-lg truncate">{booking.customer_name}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {booking.package_name || 'Individual'}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    status === 'Upcoming' ? 'border-blue-500 text-blue-700' :
                                    status === 'Completed' ? 'border-green-500 text-green-700' :
                                    'border-red-500 text-red-700'
                                  }`}
                                >
                                  {status}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Booking Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600">Date:</span>
                                <div className="font-medium">
                                  {new Date(booking.booking_date).toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Time:</span>
                                <div className="font-medium">{booking.start_time} - {booking.end_time}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Bay:</span>
                                <div className="font-medium">{booking.bay_number || 'TBD'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Contact:</span>
                                <div className="font-medium text-xs truncate">{booking.contact_number || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                    <p className="text-gray-600">
                      {searchQuery || statusFilter !== 'all' ? 
                        'Try adjusting your search or filters.' : 
                        'No bookings available for the selected period.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">Unable to load bookings data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 