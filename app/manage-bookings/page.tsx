'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Booking } from '@/types/booking'; // Import actual Booking type
import { format, addHours, parse, parseISO, isValid, isBefore, subHours } from 'date-fns'; // For date manipulations, added parseISO, isValid, isBefore, subHours
import { Input } from "@/components/ui/input"; // Import Input component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { CancelBookingModal } from '@/components/manage-bookings/CancelBookingModal'; // Import the modal
import { EditBookingModal } from '@/components/manage-bookings/EditBookingModal'; // Import the Edit modal
import { BookingHistoryModal } from '@/components/manage-bookings/BookingHistoryModal'; // Import the History modal
import { useToast } from "@/components/ui/use-toast"; // For showing success/error messages

// Helper function to calculate end_time
const calculateEndTime = (date: string, startTime: string, duration: number): string => {
  // Ensure date is in 'yyyy-MM-dd' format before parsing with time
  let baseDateStr = date;
  if (date && date.includes('T')) { // If it's an ISO string already
    baseDateStr = format(parseISO(date), 'yyyy-MM-dd');
  }

  try {
    const startDateObj = parse(`${baseDateStr} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    if (isNaN(startDateObj.getTime())) {
        console.error("Invalid date or time for end_time calculation:", baseDateStr, startTime);
        return 'Invalid time';
    }
    const endDateObj = addHours(startDateObj, duration);
    return format(endDateObj, 'HH:mm');
  } catch (error) {
    console.error("Error calculating end_time:", error);
    return 'Error';
  }
};

// Helper function to get CSS classes for bay cell based on bay name
const getBayCellClasses = (simpleBayName: string | null): string => {
  if (!simpleBayName) return 'border-l-4 border-transparent'; // Default transparent border
  switch(simpleBayName) {
    case 'Bay 1': return 'border-l-4 border-[#009ae1]'; // Custom hex for Bay 1
    case 'Bay 2': return 'border-l-4 border-[#fc5228]'; // Custom hex for Bay 2
    case 'Bay 3': return 'border-l-4 border-[#ec7c74]'; // Custom hex for Bay 3
    default: return 'border-l-4 border-transparent';
  }
};

export default function ManageBookingsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [statusFilter, setStatusFilter] = useState('all'); // State for status filter: 'all', 'confirmed', 'cancelled'

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedBookingIdForHistory, setSelectedBookingIdForHistory] = useState<string | null>(null);

  const { toast } = useToast();

  const isBookingInPast = (booking: Booking): boolean => {
    if (booking.date && booking.start_time) {
      try {
        const bookingDateTime = parse(`${booking.date} ${booking.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
        if (isValid(bookingDateTime)) {
          const twoHoursAgo = subHours(new Date(), 2);
          return isBefore(bookingDateTime, twoHoursAgo);
        }
      } catch (e) {
        console.error("Error parsing booking date/time for past check (page):", e);
      }
    }
    return false; // Default to not in past if data is missing or parse error
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchBookingsForDate = async (date: Date) => {
    setIsLoading(true);
    setError(null);
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log(`Fetching bookings for ${formattedDate}`);
    try {
      const response = await fetch(`/api/bookings/list-by-date?date=${formattedDate}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch bookings: ${response.statusText}`);
      }
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (e: any) {
      console.error('Error fetching bookings:', e);
      setError(e.message || 'An unexpected error occurred.');
      setBookings([]); // Clear bookings on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date || undefined);
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setSelectedBookingForCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedBookingForCancel(null);
  };

  const handleCancelSuccess = (cancelledBookingId: string) => {
    toast({
      title: "Booking Cancelled",
      description: `Booking ID: ${cancelledBookingId.substring(0,8)}... has been cancelled.`,
      variant: "destructive"
    });
    if (selectedDate) fetchBookingsForDate(selectedDate);
  };

  const handleOpenEditModal = (booking: Booking) => {
    setSelectedBookingForEdit(booking);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBookingForEdit(null);
  };

  const handleEditSuccess = (updatedBooking: Booking) => {
    toast({
      title: "Booking Updated",
      description: `Booking ID: ${updatedBooking.id.substring(0,8)}... has been updated.`,
    });
    if (selectedDate) fetchBookingsForDate(selectedDate);
  };

  const handleOpenHistoryModal = (bookingId: string) => {
    setSelectedBookingIdForHistory(bookingId);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedBookingIdForHistory(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  // Memoize bookings with calculated end_time for display
  const bookingsForDisplay = useMemo(() => {
    return bookings
      .map(booking => ({
        ...booking,
        display_end_time: calculateEndTime(booking.date, booking.start_time, booking.duration)
      }))
      .filter(booking => {
        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = booking.name.toLowerCase().includes(searchTermLower);
        const phoneMatch = booking.phone_number && booking.phone_number.toLowerCase().includes(searchTermLower);
        const idMatch = booking.id.toLowerCase().includes(searchTermLower);
        const searchMatch = nameMatch || phoneMatch || idMatch;

        if (statusFilter === 'all') {
          return searchMatch;
        }
        return searchMatch && booking.status === statusFilter;
      });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <DatePicker value={selectedDate} onChange={handleDateChange} label="Select Booking Date"/>
          </div>
          <div className="mb-4">
            <Input 
              type="text"
              placeholder="Search by customer name, phone, or Booking ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          </div>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-center py-4">Loading bookings...</p>}
      {error && <p className="text-red-500 text-center py-4">Error fetching bookings: {error}</p>}

      {!isLoading && !error && bookingsForDisplay.length === 0 && selectedDate && (
        <p className="text-center py-4">No bookings found for {format(selectedDate, 'PPP')}.</p>
      )}

      {!isLoading && !error && bookingsForDisplay.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings for {selectedDate ? format(selectedDate, 'PPP') : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bay</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GCal Sync</th> */}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookingsForDisplay.map((booking) => (
                    <tr key={booking.id} className={booking.status === 'cancelled' ? 'bg-red-50 opacity-70' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.start_time} - {booking.display_end_time}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${getBayCellClasses(booking.bay)}`}>{booking.bay || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {booking.status}
                        </span>
                      </td>
                      {/* 
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${booking.google_calendar_sync_status === 'error_syncing' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {booking.google_calendar_sync_status || 'N/A'}
                      </td>
                      */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(booking)} disabled={booking.status === 'cancelled' || isBookingInPast(booking)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenCancelModal(booking)} disabled={booking.status === 'cancelled' || isBookingInPast(booking)}>Cancel</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenHistoryModal(booking.id)}>History</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        booking={selectedBookingForCancel}
        onSuccess={handleCancelSuccess}
      />
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        booking={selectedBookingForEdit}
        onSuccess={handleEditSuccess}
      />
      <BookingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        bookingId={selectedBookingIdForHistory}
      />
    </div>
  );
} 