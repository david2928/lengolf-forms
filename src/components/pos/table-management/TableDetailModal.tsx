'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Minus, Clock, Calendar, Search, ArrowLeft, Table2, X } from 'lucide-react';
import { useResponsive } from '@/hooks/use-responsive';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { useBookingIntegration } from '@/hooks/use-booking-integration';
import { getBayColor } from '@/lib/calendar-utils';
import { BookingSelector } from './BookingSelector';
import { StaffPinModal } from '../payment/StaffPinModal';
import type { TableDetailModalProps, OpenTableRequest, Booking } from '@/types/pos';

export function TableDetailModal({ table, isOpen, onClose, onOpenTable }: TableDetailModalProps) {
  const router = useRouter();
  const { staff, isAuthenticated, login } = useStaffAuth();
  const { getBayUpcomingBookings } = useBookingIntegration();
  const { isMobile, isTablet } = useResponsive();
  
  // Get bay-specific upcoming bookings
  const bayUpcomingBookings = getBayUpcomingBookings(table.displayName);
  
  const [paxCount, setPaxCount] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showStaffPinModal, setShowStaffPinModal] = useState(false);

  const isOccupied = table.currentSession?.status === 'occupied';

  // Reset form and auto-select most likely booking when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setShowCreateBooking(false);
      
      // Auto-select the most likely booking (first in the list for this bay)
      if (bayUpcomingBookings.length > 0) {
        const mostLikelyBooking = bayUpcomingBookings[0];
        setSelectedBooking(mostLikelyBooking);
        setPaxCount(mostLikelyBooking.numberOfPeople);
      } else {
        // For bar areas, select walk-in by default
        if (table.zone.zoneType !== 'bay') {
          setSelectedBooking(null);
          setPaxCount(1);
        } else {
          setSelectedBooking(null);
          setPaxCount(1);
        }
      }
    }
  }, [isOpen]); // Removed bayUpcomingBookings and table.zone.zoneType to prevent infinite loop

  // Update pax count when booking is selected
  useEffect(() => {
    if (selectedBooking) {
      setPaxCount(selectedBooking.numberOfPeople);
      setShowCreateBooking(false);
    }
  }, [selectedBooking]);

  const handlePaxChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(table.maxPax, paxCount + delta));
    setPaxCount(newCount);
  };

  const handleStaffPinSuccess = async (pin: string) => {
    try {
      const result = await login(pin);
      if (result.success) {
        setShowStaffPinModal(false);
        // After successful login, try opening the table again
        setTimeout(() => handleOpenTable(), 100);
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      // The StaffPinModal will handle the error display
      throw error;
    }
  };

  const handleOpenTable = async () => {
    
    // Check if we have valid staff authentication
    if (!isAuthenticated || !staff) {
      setShowStaffPinModal(true);
      return;
    }

    if (paxCount > table.maxPax) {
      alert(`Pax count cannot exceed table capacity (${table.maxPax})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const request: OpenTableRequest = {
        staffId: staff.id, // Use staff ID instead of PIN
        paxCount,
        notes: notes.trim() || undefined,
        bookingId: selectedBooking?.id
      };

      await onOpenTable(request);
    } catch (error) {
      console.error('Error opening table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open table';
      
      // If the error is about invalid staff pin, trigger login
      if (errorMessage.includes('Invalid staff pin') || errorMessage.includes('inactive staff')) {
        setShowStaffPinModal(true);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSelect = (booking: Booking) => {
    // Only allow unselecting if clicking on the currently selected booking AND there are other bookings available
    if (selectedBooking?.id === booking.id && bayUpcomingBookings.length > 1) {
      // Don't allow unselecting - select a different booking instead
      return;
    }
    setSelectedBooking(booking);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/bookings?search=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to search bookings');
      }
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        data-testid="table-detail-modal"
        className={`focus:outline-none flex flex-col ${
          isTablet || isMobile
            ? "max-w-full max-h-full h-screen w-screen m-0 p-0 rounded-none"
            : "max-w-lg max-h-[80vh] h-auto w-auto m-auto p-0 rounded-lg"
        } [&>button]:hidden`}
      >
        {/* Accessibility Components - visually hidden */}
        <DialogTitle className="sr-only">
          Table Details - {table.displayName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          View and manage table {table.displayName} in {table.zone.name}. Select a booking or create walk-in service to open the table.
        </DialogDescription>
        
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-5 sm:hidden relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Table Icon */}
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">
                  {table.displayName.slice(-2)}
                </span>
              </div>
              
              {/* Table Info */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-blue-900">
                  {table.displayName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Staff Info - POS Header Style */}
              {staff && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">{staff.staff_name}</span>
                </div>
              )}
              
              {/* Close Button - More Prominent */}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-blue-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Header */}
        <div className="hidden sm:block">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Table Icon */}
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">
                    {table.displayName.slice(-2)}
                  </span>
                </div>
                
                {/* Table Info */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-blue-900">
                    {table.displayName}
                  </h2>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Staff Info - POS Header Style */}
                {staff && (
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{staff.staff_name}</span>
                  </div>
                )}
                
                {/* Close Button - More Prominent */}
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center text-blue-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 sm:px-4 sm:space-y-3">
          {/* Current Session Info (if occupied) */}
          {isOccupied && table.currentSession && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Current Session</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{table.currentSession.paxCount} pax</span>
                  </div>
                  {table.currentSession.booking && (
                    <div>Customer: {table.currentSession.booking.name}</div>
                  )}
                  {table.currentSession.sessionStart && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Started: {new Date(table.currentSession.sessionStart).toLocaleTimeString()}</span>
                    </div>
                  )}
                  <div>Total: ฿{table.currentSession.totalAmount.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Info */}

          {!isOccupied && (
            <>
              {/* PRIORITY 1: Bay-Specific Upcoming Bookings */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Select Booking</h3>
                
                
                {/* Bay-Specific Upcoming Bookings - Mobile Optimized */}
                {bayUpcomingBookings.length > 0 && (
                  <div className="space-y-3 mb-6 sm:space-y-6 sm:mb-8 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <h3 className="text-base font-semibold text-gray-900">Upcoming Bookings</h3>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-6">
                      {bayUpcomingBookings
                        .filter((_, index) => showAllBookings || index === 0)
                        .map((booking: Booking, index: number) => {
                          const isSelected = selectedBooking?.id === booking.id;
                          const originalIndex = showAllBookings ? index : 0;
                          const isFirstBooking = originalIndex === 0;
                        
                        return (
                          <div 
                            key={`bay-${booking.id}`}
                            data-testid="booking-selector"
                            data-booking-id={booking.id}
                            className={`group relative rounded-xl border transition-all duration-300 cursor-pointer overflow-visible ${
                              isSelected 
                                ? 'bg-blue-100 border-blue-500 shadow-lg ring-2 ring-blue-200' 
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30'
                            } ${
                              isFirstBooking 
                                ? 'p-4 sm:p-5 border-2' 
                                : 'p-3 sm:p-5'
                            }`}
                            onClick={() => handleBookingSelect(booking)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Customer name and phone - tablet optimized */}
                                <div className="mb-3">
                                  <div className={`font-bold text-gray-900 break-words ${isFirstBooking ? "text-lg sm:text-xl" : "text-base"}`}>
                                    {booking.name}
                                  </div>
                                  <div className="text-sm text-gray-500 font-medium mt-1 break-all">
                                    {booking.phoneNumber}
                                  </div>
                                </div>
                                
                                {/* Date info - prominent for tablet */}
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className={`font-semibold text-blue-800 ${isFirstBooking ? "text-base" : "text-sm"}`}>
                                      {new Date(booking.date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short', 
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Essential info - tablet optimized */}
                                <div className={`flex items-center text-gray-700 ${isTablet ? "gap-4" : isFirstBooking ? "gap-3 sm:gap-4" : "gap-2"}`}>
                                  <div className={`flex items-center gap-2 bg-gray-100 rounded-lg ${isFirstBooking ? "px-3 py-1.5" : "px-2 py-1"}`}>
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <span className="font-semibold text-sm">{booking.numberOfPeople}</span>
                                  </div>
                                  
                                  <div className={`flex items-center gap-2 bg-gray-100 rounded-lg ${isFirstBooking ? "px-3 py-1.5" : "px-2 py-1"}`}>
                                    <Clock className="h-4 w-4 text-green-600" />
                                    <span className={`font-semibold ${isFirstBooking ? "text-base" : "text-sm"}`}>
                                      {booking.startTime} - {(() => {
                                        const [hours, minutes] = booking.startTime.split(':').map(Number);
                                        const durationHours = Math.floor(booking.duration || 1);
                                        const durationMinutes = Math.round(((booking.duration || 1) % 1) * 60);
                                        
                                        const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes;
                                        const endHour = Math.floor(totalMinutes / 60) % 24;
                                        const endMinute = totalMinutes % 60;
                                        
                                        return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Booking Type and Package - Subtle bottom info */}
                                {booking.bookingType && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="text-xs text-gray-500">
                                      {booking.bookingType}
                                      {booking.packageName && ` • ${booking.packageName}`}
                                    </div>
                                  </div>
                                )}
                                
                              </div>
                              
                              {/* Selection indicator - centered vertically */}
                              <div className="flex-shrink-0 ml-4">
                                <div className={`w-8 h-8 rounded-full border-3 transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-600 shadow-lg' 
                                    : 'border-gray-300 group-hover:border-blue-400'
                                }`}>
                                  {isSelected && (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show More Button for Mobile */}
                      {!showAllBookings && bayUpcomingBookings.length > 1 && (
                        <button
                          onClick={() => setShowAllBookings(true)}
                          className="w-full sm:hidden p-3 text-center text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <span className="text-sm font-medium">
                            Show {bayUpcomingBookings.length - 1} more booking{bayUpcomingBookings.length > 2 ? 's' : ''}
                          </span>
                        </button>
                      )}
                      
                      {/* Show Less Button for Mobile */}
                      {showAllBookings && bayUpcomingBookings.length > 1 && (
                        <button
                          onClick={() => setShowAllBookings(false)}
                          className="w-full sm:hidden p-2 text-center text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm font-medium">Show less</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Guest Count and Notes - appears after selected booking */}
                {selectedBooking && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                    {/* Guest Count Selection */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Adjust Guest Count
                      </Label>
                      
                      {/* Horizontal Guest Count Buttons */}
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(count => (
                          <Button
                            key={count}
                            variant={paxCount === count ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaxCount(count)}
                            className="flex-1 h-12 text-base font-semibold"
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        Originally booked for {selectedBooking.numberOfPeople} guests
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Special requests..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Search for Other Bookings */}
                <div className="space-y-6 mt-8 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <h3 className="text-base font-semibold text-gray-900">Search Other Bookings</h3>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Search by customer name or phone..."
                      className="pr-10"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isSearching ? (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchQuery.length >= 2 && (
                    <div className="mt-6">
                      {searchResults.length > 0 ? (
                        <div className="space-y-4 max-h-64 overflow-y-auto overflow-x-visible px-2">
                          {searchResults.map((booking: Booking) => {
                            const isSelected = selectedBooking?.id === booking.id;
                            
                            return (
                              <div 
                                key={`search-${booking.id}`}
                                className={`group relative rounded-2xl border-2 p-4 transition-all duration-300 cursor-pointer overflow-visible ${
                                  isSelected 
                                    ? 'bg-blue-100 border-blue-500 shadow-xl ring-4 ring-blue-200 transform scale-[1.01]' 
                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30'
                                }`}
                                style={{ margin: isSelected ? '6px 2px' : '0px 2px' }}
                                onClick={() => handleBookingSelect(booking)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    {/* Customer name and phone - responsive layout */}
                                    <div className="mb-3">
                                      <div className="text-lg font-bold text-gray-900 break-words">
                                        {booking.name}
                                      </div>
                                      <div className="text-sm text-gray-500 font-medium mt-1 break-all">
                                        {booking.phoneNumber}
                                      </div>
                                    </div>
                                    
                                    {/* Date info - tablet optimized */}
                                    <div className="mb-3">
                                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <span className="font-semibold text-blue-800 text-sm">
                                          {new Date(booking.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short', 
                                            day: 'numeric',
                                            year: new Date(booking.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Essential info - tablet optimized spacing */}
                                    <div className={`flex items-center text-gray-700 ${isTablet ? "gap-4" : "gap-3"}`}>
                                      <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg">
                                        <Users className="h-3.5 w-3.5 text-blue-600" />
                                        <span className="font-semibold text-sm">{booking.numberOfPeople}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-lg">
                                        <Clock className="h-3.5 w-3.5 text-green-600" />
                                        <span className="font-semibold text-sm">
                                          {booking.startTime} - {(() => {
                                            const [hours, minutes] = booking.startTime.split(':').map(Number);
                                            const durationHours = Math.floor(booking.duration || 1);
                                            const durationMinutes = Math.round(((booking.duration || 1) % 1) * 60);
                                            
                                            const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes;
                                            const endHour = Math.floor(totalMinutes / 60) % 24;
                                            const endMinute = totalMinutes % 60;
                                            
                                            return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                                          })()} 
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Booking Type and Package - Subtle bottom info */}
                                    {booking.bookingType && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="text-xs text-gray-500">
                                          {booking.bookingType}
                                          {booking.packageName && ` • ${booking.packageName}`}
                                        </div>
                                      </div>
                                    )}
                                    
                                  </div>
                                  
                                  {/* Selection indicator - centered vertically */}
                                  <div className="flex-shrink-0 ml-3">
                                    <div className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                                      isSelected 
                                        ? 'bg-blue-600 border-blue-600 shadow-lg' 
                                        : 'border-gray-300 group-hover:border-blue-400'
                                    }`}>
                                      {isSelected && (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : !isSearching ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <div className="text-sm">No bookings found for &quot;{searchQuery}&quot;</div>
                          <div className="text-xs mt-1">Try a different search term</div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Create New Booking */}
                <div className="space-y-4 mt-8">
                  {/* Show message if no bay bookings */}
                  {bayUpcomingBookings.length === 0 && !searchQuery && (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                      <div className="text-sm">No upcoming bookings for {table.displayName}</div>
                      <div className="text-xs mt-1">Search existing or create new booking below</div>
                    </div>
                  )}
                  
                  {/* Create New Booking Option */}
                  <div 
                    className="rounded-lg border border-dashed border-gray-300 hover:border-green-400 bg-gray-50 hover:bg-green-50 cursor-pointer transition-all duration-200 p-4"
                    onClick={() => {
                      onClose();
                      router.push(`/create-booking?bay=${encodeURIComponent(table.displayName)}&zone=${encodeURIComponent(table.zone.name)}`);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-700">Create New Booking</div>
                    </div>
                  </div>
                </div>

                {/* Walk-in Option - Only for Bar Areas */}
                {table.zone.zoneType !== 'bay' && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <h3 className="text-base font-semibold text-gray-900">Quick Service (Bar Only)</h3>
                    </div>
                    
                    <div 
                      className={`group relative rounded-2xl border-2 p-5 transition-all duration-300 cursor-pointer ${
                        !selectedBooking 
                          ? 'bg-orange-50 border-orange-400 shadow-lg ring-4 ring-orange-100' 
                          : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md hover:bg-orange-50/30'
                      }`}
                      onClick={() => setSelectedBooking(null)}
                    >
                      {/* Selection indicator */}
                      <div className={`absolute top-4 right-4 w-8 h-8 rounded-full border-3 transition-all duration-300 ${
                        !selectedBooking 
                          ? 'bg-orange-600 border-orange-600 shadow-lg' 
                          : 'border-gray-300 group-hover:border-orange-400'
                      }`}>
                        {!selectedBooking && (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Option name - prominent */}
                      <div className="text-xl font-bold text-gray-900 mb-3 pr-8">
                        No Booking Required
                      </div>
                      
                      {/* Description */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-gray-600 font-medium">For quick bar service without reservation</span>
                      </div>
                      
                      {/* Selection feedback */}
                      {!selectedBooking && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                          <div className="text-orange-700 font-bold text-sm uppercase tracking-wide">
                            SELECTED FOR WALK-IN SERVICE
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Guest Count for Walk-in (Bar only) */}
              {!selectedBooking && table.zone.zoneType !== 'bay' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  {/* Guest Count Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Number of Guests
                    </Label>
                    
                    {/* Horizontal Guest Count Buttons */}
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(count => (
                        <Button
                          key={count}
                          variant={paxCount === count ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaxCount(count)}
                          className="flex-1 h-12 text-base font-semibold"
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes for walk-in */}
                  <div className="space-y-2">
                    <Label htmlFor="notes-walkin" className="text-sm font-medium text-gray-700">Notes (Optional)</Label>
                    <Input
                      id="notes-walkin"
                      placeholder="Special requests..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

            </>
          )}

        </div>


        {/* Fixed Bottom Action Bar */}
        <div className="bg-background border-t px-6 py-4 flex gap-3 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            size="lg"
            className="flex-1 h-12 font-semibold"
          >
            Cancel
          </Button>
          
          {!isOccupied && (
            <Button
              data-testid="open-table-button"
              onClick={handleOpenTable}
              disabled={isSubmitting || (table.zone.zoneType === 'bay' && !selectedBooking)}
              size="lg"
              className="flex-1 h-12 font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Opening...' : 'Open Table'}
            </Button>
          )}
        </div>
      </DialogContent>
      </Dialog>
      
      {/* Staff PIN Modal - Outside main dialog to avoid z-index issues */}
      {showStaffPinModal && (
        <StaffPinModal
          isOpen={showStaffPinModal}
          onSuccess={handleStaffPinSuccess}
          onCancel={() => setShowStaffPinModal(false)}
          title="Staff Authentication Required"
          description="Please enter your staff PIN to open the table"
        />
      )}
    </>
  );
}