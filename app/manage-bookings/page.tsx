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
import { Checkbox } from '@/components/ui/checkbox'; // Add Checkbox import
import { Info } from 'lucide-react'; // Import Info icon

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

// Helper function to get bay badge classes and color
const getBayBadgeClasses = (simpleBayName: string | null): string => {
  if (!simpleBayName) return 'bg-gray-100 text-gray-500';
  switch(simpleBayName) {
    case 'Bay 1': return 'bg-[#009ae1]/10 text-[#009ae1]';
    case 'Bay 2': return 'bg-[#fc5228]/10 text-[#fc5228]';
    case 'Bay 3': return 'bg-[#ec7c74]/10 text-[#ec7c74]';
    default: return 'bg-gray-100 text-gray-500';
  }
};

export default function ManageBookingsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [statusFilter, setStatusFilter] = useState('confirmed'); // State for status filter: 'all', 'confirmed', 'cancelled'
  const [showPastBookings, setShowPastBookings] = useState<boolean>(true);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedBookingIdForHistory, setSelectedBookingIdForHistory] = useState<string | null>(null);

  const { toast } = useToast();

  // Helper to check if selected date is today
  const isToday = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

  // On date change, set showPastBookings default
  useEffect(() => {
    if (isToday) {
      setShowPastBookings(false); // Hide past bookings by default for today
    } else {
      setShowPastBookings(true); // Show all bookings for other days
    }
  }, [selectedDate]);

  const isBookingInPast = (booking: Booking): boolean => {
    if (booking.date && booking.start_time && booking.duration) {
      try {
        // Calculate end time based on start time + duration
        const [hours, minutes] = booking.start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (booking.duration * 60);
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        // Create end datetime using the calculated end time
        const bookingEndDateTime = new Date(`${booking.date}T${endTime}`);
        const now = new Date();
        
        // Booking is in the past only if it has ended
        return bookingEndDateTime < now;
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

        // Filter by status
        if (statusFilter !== 'all' && booking.status !== statusFilter) {
          return false;
        }
        // Filter out past bookings for today if flag is off
        if (isToday && !showPastBookings && isBookingInPast(booking)) {
          return false;
        }
        return searchMatch;
      });
  }, [bookings, searchTerm, statusFilter, isToday, showPastBookings]);

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
          {isToday && (
            <div className="mb-4 flex items-center space-x-2">
              <Checkbox id="showPastBookings" checked={showPastBookings} onCheckedChange={checked => setShowPastBookings(!!checked)} />
              <label htmlFor="showPastBookings" className="text-sm">Show past bookings</label>
            </div>
          )}
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
            {/* Mobile: Card/List layout */}
            <div className="block md:hidden space-y-4">
              {bookingsForDisplay.map((booking) => (
                <div key={booking.id} className={`rounded-lg border p-4 shadow-sm ${booking.status === 'cancelled' ? 'bg-red-50 opacity-70' : 'bg-white'}`}> 
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{booking.name}</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{booking.status}</span>
                  </div>
                  {booking.customer_notes && (
                    <div className="flex items-start text-xs text-gray-600 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <Info size={16} className="mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap">{booking.customer_notes}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-sm text-gray-700 mb-2">
                    <div><span className="font-medium">Time:</span> {booking.start_time} - {booking.display_end_time}</div>
                    <div>
                      <span className="font-medium">Bay:</span> 
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ml-1 ${getBayBadgeClasses(booking.bay)}`}>{booking.bay || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEditModal(booking)} disabled={booking.status === 'cancelled' || isBookingInPast(booking)}>Edit</Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleOpenCancelModal(booking)} disabled={booking.status === 'cancelled' || isBookingInPast(booking)}>Cancel</Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenHistoryModal(booking.id)}>History</Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop/Tablet: Table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bay</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookingsForDisplay.map((booking) => (
                    <tr key={booking.id} className={booking.status === 'cancelled' ? 'bg-red-50 opacity-70' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.name}
                        {booking.customer_notes && (
                          <span title={booking.customer_notes} className="ml-2">
                            <Info size={16} className="inline text-blue-500 cursor-pointer" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.start_time} - {booking.display_end_time}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${getBayBadgeClasses(booking.bay)}`}>{booking.bay || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{booking.status}</span>
                      </td>
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