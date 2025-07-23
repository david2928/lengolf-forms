'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Users, Plus, Search } from 'lucide-react';
import { useBookingIntegration } from '@/hooks/use-booking-integration';
import type { Booking } from '@/types/pos';

interface BookingSelectorProps {
  likelyBookings: Booking[];
  selectedBooking: Booking | null;
  onBookingSelect: (booking: Booking) => void;
  onCreateNew: () => void;
}

export function BookingSelector({ 
  likelyBookings, 
  selectedBooking, 
  onBookingSelect, 
  onCreateNew 
}: BookingSelectorProps) {
  const { searchBookings } = useBookingIntegration();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchBookings(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatBookingTime = (booking: Booking) => {
    const timeStr = booking.startTime;
    return timeStr.slice(0, 5); // HH:MM format
  };

  const renderBookingCard = (booking: Booking, isFromSearch = false) => {
    const isSelected = selectedBooking?.id === booking.id;
    
    return (
      <Card 
        key={booking.id}
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => onBookingSelect(booking)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{booking.name}</div>
              <div className="text-sm text-gray-600">{booking.phoneNumber}</div>
              
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{booking.numberOfPeople}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatBookingTime(booking)}</span>
                </div>
                
                {booking.bay && (
                  <Badge variant="outline" className="text-xs">
                    {booking.bay}
                  </Badge>
                )}
              </div>
              
              {booking.bookingType && (
                <div className="mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {booking.bookingType}
                  </Badge>
                </div>
              )}
            </div>
            
            {isSelected && (
              <div className="text-blue-600">
                ✓
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Likely Next Bookings */}
      {likelyBookings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upcoming Bookings</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {likelyBookings.map(booking => renderBookingCard(booking))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Search Bookings</h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {isSearching && (
          <div className="text-sm text-gray-500 mt-2">Searching...</div>
        )}
        
        {searchResults.length > 0 && (
          <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
            {searchResults.map(booking => renderBookingCard(booking, true))}
          </div>
        )}
        
        {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-sm text-gray-500 mt-2">No bookings found</div>
        )}
      </div>

      {/* No Booking - Walk-in */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Walk-in Customer</h4>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onCreateNew}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Booking for Walk-in
        </Button>
      </div>

      {/* No Booking - Quick Open */}
      <div>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600"
          onClick={() => onBookingSelect(null as any)} // Allow opening without booking
        >
          Open table without booking (not recommended)
        </Button>
      </div>
    </div>
  );
}