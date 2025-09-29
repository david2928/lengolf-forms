import { Metadata } from 'next'
import { CreateBookingClient } from './create-booking-client'

export const metadata: Metadata = {
  title: 'Create Booking | LENGOLF',
  description: 'Create and manage bookings',
}

export default function CreateBookingPage() {
  return <CreateBookingClient />
}