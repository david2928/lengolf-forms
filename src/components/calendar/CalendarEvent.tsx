'use client';

import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { Users, Package2, Clock, Gamepad2, Calendar } from 'lucide-react';

interface ProcessedBooking {
  id: string;
  customer_name: string;
  start: string;
  end: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  bay: string;
  booking_type: string;
  package_name?: string;
  number_of_pax: string;
  color?: string;
  displayName?: string;
  summary?: string;
}

interface CalendarEventProps {
  booking: ProcessedBooking;
  style: React.CSSProperties;
  className: string;
  children?: React.ReactNode;
  formatTime: (isoTime: string) => string;
  isCompact?: boolean;
  isMobile?: boolean;
  onEditClick?: (bookingId: string) => void;
}

export function CalendarEvent({ 
  booking, 
  style, 
  className, 
  children, 
  formatTime,
  isCompact = false,
  isMobile = false,
  onEditClick
}: CalendarEventProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  // Determine if booking is current, upcoming, or past
  const now = DateTime.now().setZone('Asia/Bangkok');
  const bookingStart = DateTime.fromISO(booking.start, { zone: 'Asia/Bangkok' });
  const bookingEnd = DateTime.fromISO(booking.end, { zone: 'Asia/Bangkok' });
  
  const isCurrent = now >= bookingStart && now <= bookingEnd;
  const isUpcoming = now < bookingStart;
  const isPast = now > bookingEnd;
  
  // Calculate time until/since booking
  const getTimeStatus = () => {
    if (isCurrent) {
      const minutesLeft = Math.ceil(bookingEnd.diff(now, 'minutes').minutes);
      return `${minutesLeft}m left`;
    } else if (isUpcoming) {
      const minutesUntil = Math.ceil(bookingStart.diff(now, 'minutes').minutes);
      if (minutesUntil < 60) {
        return `in ${minutesUntil}m`;
      } else {
        const hoursUntil = Math.ceil(minutesUntil / 60);
        return `in ${hoursUntil}h`;
      }
    }
    return '';
  };

  // Get booking type badge
  const getBookingTypeBadge = () => {
    if (!booking.booking_type && !booking.package_name) return null;
    
    const bookingType = booking.booking_type?.toLowerCase() || '';
    
    // Determine badge style and content
    let badgeContent = '';
    let badgeColor = '';
    let icon = null;
    
    if (bookingType.includes('coaching')) {
      badgeContent = 'Coach';
      badgeColor = 'bg-blue-500 text-white';
      icon = <Users className="h-2.5 w-2.5" />;
    } else if (booking.package_name || bookingType.includes('package')) {
      badgeContent = 'Package';
      badgeColor = 'bg-green-500 text-white';
      icon = <Package2 className="h-2.5 w-2.5" />;
    } else if (bookingType.includes('classpass')) {
      badgeContent = 'ClassPass';
      badgeColor = 'bg-purple-500 text-white';
      icon = <Calendar className="h-2.5 w-2.5" />;
    } else if (bookingType.includes('vr')) {
      badgeContent = 'VR';
      badgeColor = 'bg-orange-500 text-white';
      icon = <Gamepad2 className="h-2.5 w-2.5" />;
    } else if (bookingType.includes('rate') || bookingType.includes('normal')) {
      badgeContent = 'Bay Rate';
      badgeColor = 'bg-gray-500 text-white';
      icon = <Clock className="h-2.5 w-2.5" />;
    } else {
      // Default for any other type
      badgeContent = 'Event';
      badgeColor = 'bg-indigo-500 text-white';
      icon = <Calendar className="h-2.5 w-2.5" />;
    }
    
    // Show full badge on desktop/larger bookings, minimal on compact
    if (isCompact) {
      return (
        <div className={`inline-flex items-center px-1 py-0.5 rounded-sm text-[6px] font-medium ${badgeColor}`}>
          {icon}
        </div>
      );
    }
    
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-medium ${badgeColor}`}>
        {icon}
        <span>{badgeContent}</span>
      </div>
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call the edit function if provided
    if (onEditClick) {
      onEditClick(booking.id);
    } else {
      // Fallback for development/testing
      alert(`Edit booking: ${booking.customer_name}\n${formatTime(booking.start)} - ${formatTime(booking.end)}\nBay: ${booking.bay}`);
    }
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  // Enhanced styling based on status
  const getStatusClassName = () => {
    let statusClass = '';
    if (isCurrent) {
      statusClass = 'ring-2 ring-green-400 ring-opacity-75 bg-opacity-90';
    } else if (isUpcoming) {
      statusClass = 'shadow-md';
    } else if (isPast) {
      statusClass = 'opacity-75';
    }
    
    if (isPressed) {
      statusClass += ' scale-95 shadow-lg';
    }
    
    return statusClass;
  };

  const timeStatus = getTimeStatus();
  const customerName = booking.customer_name || 'Unknown Customer';
  const bookingTypeBadge = getBookingTypeBadge();

  return (
    <div
      className={`${className} ${getStatusClassName()} cursor-pointer transition-all duration-150 active:scale-95 hover:shadow-lg hover:z-10 relative`}
      style={style}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={`${customerName} - ${formatTime(booking.start)} to ${formatTime(booking.end)}\n${booking.booking_type}${booking.package_name ? ` (${booking.package_name})` : ''}\nClick to edit`}
    >
      {/* Current time indicator dot */}
      {isCurrent && (
        <div className="absolute -left-1 top-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}
      
      <div className={`${isCompact ? 'p-0.5' : isMobile ? 'p-1.5' : 'p-2'}`}>
        {/* Top row: Badge and time status */}
        {!isCompact && bookingTypeBadge && (
          <div className="flex items-center justify-between mb-1">
            {bookingTypeBadge}
            {timeStatus && (
              <div className={`text-[9px] font-medium ${isCurrent ? 'text-green-600' : 'text-blue-600'}`}>
                {timeStatus}
              </div>
            )}
          </div>
        )}
        
        {/* Customer name with proper text wrapping */}
        <div className={`font-medium leading-tight ${isCompact ? 'text-[9px]' : isMobile ? 'text-sm' : 'text-sm'}`}
             style={{ 
               wordBreak: 'break-word',
               overflowWrap: 'break-word',
               whiteSpace: 'normal',
               lineHeight: isCompact ? '1.2' : '1.3'
             }}>
          {isCompact ? (
            // Ultra-compact: still need to truncate for space, but allow more characters
            customerName.length > (isMobile ? 12 : 15) 
              ? customerName.substring(0, isMobile ? 12 : 15) + '...'
              : customerName
          ) : (
            // Traditional: full text wrapping - no truncation!
            customerName
          )}
        </div>
        
        {/* Compact view: show badge and time status in second row */}
        {isCompact && (
          <div className="flex items-center justify-between mt-0.5">
            {bookingTypeBadge}
            {timeStatus && (
              <div className="text-[7px] text-green-600 font-medium">
                {timeStatus}
              </div>
            )}
          </div>
        )}
        
        {/* Package name for longer bookings (traditional view only) */}
        {!isCompact && booking.duration_hours >= 1 && booking.package_name && (
          <div className="text-[10px] text-gray-500 mt-1 break-words leading-tight" 
               style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {booking.package_name}
          </div>
        )}
      </div>
      
      {/* Upcoming booking indicator */}
      {isUpcoming && bookingStart.diff(now, 'minutes').minutes <= 30 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
} 