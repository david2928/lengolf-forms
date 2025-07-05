import { Metadata } from 'next'
import { BookingProvider } from '@/components/booking-form/context/booking-context'
import { BookingForm } from '@/components/booking-form'

export const metadata: Metadata = {
  title: 'Create Booking | LENGOLF',
  description: 'Create and manage bookings',
}

export default function CreateBookingPage() {
  return (
    <div className="w-full py-6">
      <div className="px-4 sm:px-0 text-center mb-8">
        <h1 className="text-2xl font-bold">Create Booking</h1>
        <p className="text-muted-foreground">
          Book bays and manage appointments
        </p>
      </div>
      
      <BookingProvider>
        <BookingForm />
      </BookingProvider>
    </div>
  )
}