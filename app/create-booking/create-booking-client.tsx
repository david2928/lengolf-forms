'use client'

import { useSearchParams } from 'next/navigation'
import { BookingProvider } from '@/components/booking-form/context/booking-context'
import { BookingFormNew } from '@/components/booking-form-new'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CreateBookingClient() {
  const searchParams = useSearchParams()

  // Extract URL parameters
  const chatContext = {
    from: searchParams.get('from'),
    conversationId: searchParams.get('conversation'),
    customerId: searchParams.get('customer'),
    channelType: searchParams.get('channel'),
    staffName: searchParams.get('staff')
  }

  // Extract booking pre-fill parameters
  const bookingPreFill = {
    date: searchParams.get('date'),
    time: searchParams.get('time'),
    duration: searchParams.get('duration') ? parseFloat(searchParams.get('duration')!) : undefined
  }

  const isFromChat = chatContext.from === 'chat'

  const getChannelDisplayName = (channel: string | null) => {
    switch (channel) {
      case 'line': return 'LINE'
      case 'website': return 'Website Chat'
      case 'facebook': return 'Facebook'
      case 'instagram': return 'Instagram'
      case 'whatsapp': return 'WhatsApp'
      default: return 'Chat'
    }
  }

  const handleBackToChat = () => {
    // Close the current tab to return to chat
    window.close()
  }

  return (
    <div className="w-full">
      {isFromChat ? (
        <div className="px-3 sm:px-4 py-3 border-b bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChat}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      ) : (
        <div className="px-3 sm:px-4 text-center mb-6 sm:mb-8 py-3 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold">Create Booking</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Book bays and manage appointments
          </p>
        </div>
      )}

      <BookingProvider>
        <BookingFormNew chatContext={chatContext} bookingPreFill={bookingPreFill} />
      </BookingProvider>
    </div>
  )
}