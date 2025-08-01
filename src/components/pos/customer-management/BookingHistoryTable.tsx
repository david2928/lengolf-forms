'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, Users, MapPin, Search, X, CalendarIcon } from 'lucide-react';
import { useResponsive } from '@/hooks/use-responsive';
import { cn, formatDateToLocalString } from '@/lib/utils';

interface Booking {
  id: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  package_used?: string;
  bay?: string;
  duration: number;
  number_of_people: number;
  created_at: string;
  is_upcoming: boolean;
}

interface BookingHistoryTableProps {
  customerId?: string;
}

export const BookingHistoryTable: React.FC<BookingHistoryTableProps> = ({ customerId }) => {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { isTablet } = useResponsive();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/customers/${customerId}/bookings`);
        if (response.ok) {
          const data = await response.json();
          const bookings = data.bookings || [];
          setAllBookings(bookings);
          setFilteredBookings(bookings);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [customerId]);

  // Filter bookings based on search term and date
  useEffect(() => {
    let filtered = allBookings;

    // Filter by search term (booking ID or type)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => (
        booking.id.toLowerCase().includes(searchLower) ||
        booking.type.toLowerCase().includes(searchLower) ||
        (booking.package_used && booking.package_used.toLowerCase().includes(searchLower)) ||
        (booking.bay && booking.bay.toLowerCase().includes(searchLower))
      ));
    }

    // Filter by selected date
    if (selectedDate) {
      const selectedDateStr = formatDateToLocalString(selectedDate);
      filtered = filtered.filter(booking => booking.date === selectedDateStr);
    }
    
    setFilteredBookings(filtered);
  }, [searchTerm, selectedDate, allBookings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString || typeof timeString !== 'string') return 'N/A';
    
    try {
      const [hours, minutes] = timeString.split(':');
      if (!hours || !minutes) return timeString;
      
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const formatBookingId = (id: string) => {
    // Format booking ID to show first 8 characters
    return `#${id.slice(0, 8)}`;
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    setCalendarOpen(false);
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedDate(undefined);
    setCalendarOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      case 'no-show':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-500">Loading bookings...</span>
        </div>
      </div>
    );
  }

  if (allBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mb-2" />
        <p className="text-gray-500">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-3 mb-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by booking ID, type, package, or bay..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[140px]",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDate(formatDateToLocalString(selectedDate)) : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                defaultMonth={new Date()}
                initialFocus
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearDate}
                    className="w-full"
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters & Results */}
        {(searchTerm || selectedDate) && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredBookings.length} of {allBookings.length} bookings
              {selectedDate && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Date: {formatDate(formatDateToLocalString(selectedDate))}
                </span>
              )}
              {searchTerm && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* No Results */}
      {filteredBookings.length === 0 && (searchTerm || selectedDate) && (
        <div className="flex flex-col items-center justify-center py-8">
          <Search className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500">No bookings match your search</p>
          <Button variant="outline" onClick={handleClearAll} className="mt-2">
            Clear filters
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      {filteredBookings.length > 0 && (
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Booking ID</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Date & Time</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Type</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Bay</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center px-3 py-2 text-sm">People</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center px-3 py-2 text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
              <TableRow 
                key={booking.id}
                className="transition-colors hover:bg-gray-50/50"
              >
                <TableCell className="px-3 py-2">
                  <div>
                    <p className="font-mono font-medium text-sm text-blue-600">
                      {formatBookingId(booking.id)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex flex-col">
                    <p className="font-medium text-sm">
                      {formatDate(booking.date)}
                    </p>
                    <p className="text-gray-500 flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTime(booking.time)} ({booking.duration || 1}h)
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">
                      {booking.type}
                    </p>
                    {booking.package_used && (
                      <p className="text-gray-500 text-xs">
                        Package: {booking.package_used}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="text-gray-400 h-3 w-3" />
                    {booking.bay || 'Any'}
                  </div>
                </TableCell>
                <TableCell className="text-center px-3 py-2">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Users className="text-gray-400 h-3 w-3" />
                    {booking.number_of_people || 1}
                  </div>
                </TableCell>
                <TableCell className="text-center px-3 py-2">
                  <div className="text-xs">
                    {getStatusBadge(booking.status)}
                  </div>
                </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile/Tablet Card View */}
      {filteredBookings.length > 0 && (
        <div className="lg:hidden">
          <div className="space-y-3 p-4">
            {filteredBookings.map((booking) => {
            const isCompleted = booking.status === 'completed';
            const isCancelled = booking.status === 'cancelled' || booking.status === 'no-show';
            const isConfirmed = booking.status === 'confirmed';
            
            return (
              <div 
                key={booking.id}
                className={cn(
                  "bg-white border rounded-lg p-4 transition-all hover:shadow-md",
                  isCompleted ? "border-green-200 bg-green-50" :
                  isCancelled ? "border-red-200 bg-red-50" :
                  isConfirmed ? "border-blue-200 bg-blue-50" : "border-gray-200"
                )}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "font-mono font-bold",
                    isTablet ? "text-lg" : "text-base",
                    "text-blue-600"
                  )}>
                    {formatBookingId(booking.id)}
                  </div>
                  <div className="text-xs">
                    {getStatusBadge(booking.status)}
                  </div>
                </div>

                {/* Booking Type */}
                <div className="mb-3">
                  <p className={cn(
                    "font-semibold text-gray-900",
                    isTablet ? "text-base" : "text-sm"
                  )}>
                    {booking.type}
                  </p>
                  {booking.package_used && (
                    <p className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded mt-1">
                      Package: {booking.package_used}
                    </p>
                  )}
                </div>

                {/* Date & Time Info */}
                <div className="mb-4 p-3 bg-white/60 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className={cn(
                      "font-bold",
                      isTablet ? "text-base" : "text-sm"
                    )}>
                      {formatDate(booking.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className={cn(
                      "font-medium text-gray-600",
                      isTablet ? "text-sm" : "text-sm"
                    )}>
                      {formatTime(booking.time)} ({booking.duration || 1}h)
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Bay</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm"
                      )}>
                        {booking.bay || 'Any'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">People</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm"
                      )}>
                        {booking.number_of_people || 1} {booking.number_of_people === 1 ? 'person' : 'people'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};