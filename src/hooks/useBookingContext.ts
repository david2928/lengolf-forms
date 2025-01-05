'use client'

import { useContext } from 'react'
import { BookingContext } from '@/contexts/booking-context'

export function useBookingContext() {
  const context = useContext(BookingContext)
  
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider')
  }
  
  return context
}