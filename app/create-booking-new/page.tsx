import { Metadata } from 'next'
import { BookingProvider } from '@/components/booking-form/context/booking-context'
import { BookingFormNew } from '@/components/booking-form-new'

export const metadata: Metadata = {
  title: 'Create Booking (New) | LENGOLF',
  description: 'Create and manage bookings with the new interface',
}

export default function CreateBookingNewPage() {
  return (
    <div className="w-full py-6">
      <BookingProvider>
        <BookingFormNew />
      </BookingProvider>
    </div>
  )
}