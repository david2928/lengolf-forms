'use client'

import { useContext } from 'react'
import { BookingContext } from '@/components/booking-form/context/booking-context'

export function useBookingContext() {
  const context = useContext(BookingContext)
  
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider')
  }
  
  return context
}