'use client';

import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

interface CurrentTimeIndicatorProps {
  getPositionForHour: (hour: number) => number;
  startHour?: number;
  endHour?: number;
}

export function CurrentTimeIndicator({ 
  getPositionForHour, 
  startHour = 10, 
  endHour = 24 
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(DateTime.now().setZone('Asia/Bangkok'));

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(DateTime.now().setZone('Asia/Bangkok'));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const getCurrentTimePosition = (): number | null => {
    const hour = currentTime.hour;
    const minute = currentTime.minute;
    
    // Only show indicator during business hours
    if (hour < startHour || hour >= endHour) {
      return null;
    }
    
    // Calculate exact position including minutes
    const decimalHour = hour + (minute / 60);
    return getPositionForHour(decimalHour);
  };

  const position = getCurrentTimePosition();
  
  if (position === null) {
    return null;
  }

  const timeString = currentTime.toFormat('HH:mm');

  return (
    <>
      {/* Current time line - simple red line across calendar */}
      <div 
        className="absolute left-0 right-0 z-20 h-0.5 bg-red-500 shadow-sm"
        style={{ top: `${position}%` }}
      />
      
      {/* Subtle glow effect */}
      <div 
        className="absolute left-0 right-0 h-px bg-red-300 opacity-50 z-10"
        style={{ top: `${position}%` }}
      />
    </>
  );
} 