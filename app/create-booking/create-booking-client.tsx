'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookingProvider } from '@/components/booking-form/context/booking-context'
import { BookingFormNew } from '@/components/booking-form-new'
import { BatchBookingForm } from '@/components/batch-booking'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CreateBookingClient() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'single' | 'batch'>('single')

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
    duration: searchParams.get('duration') ? parseFloat(searchParams.get('duration')!) : undefined,
    gclid: searchParams.get('gclid')
  }

  const isFromChat = chatContext.from === 'chat'
  const isFromOBSales = chatContext.from === 'obsales'

  const handleBackToSource = () => {
    // Close the current tab to return to the source page
    window.close()
  }

  // Don't show batch mode toggle when coming from chat or OB Sales
  const showModeToggle = !isFromChat && !isFromOBSales

  return (
    <div className="w-full">
      {isFromChat ? (
        <div className="px-3 sm:px-4 py-3 border-b bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSource}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      ) : isFromOBSales ? (
        <div className="px-3 sm:px-4 py-3 border-b bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSource}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to OB Sales
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

      {/* Mode Toggle */}
      {showModeToggle && (
        <div className="px-3 sm:px-4 mb-4">
          <div className="flex rounded-lg border bg-gray-100 p-1 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${
                mode === 'single'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-colors ${
                mode === 'batch'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Batch
            </button>
          </div>
        </div>
      )}

      {mode === 'single' ? (
        <BookingProvider>
          <BookingFormNew chatContext={chatContext} bookingPreFill={bookingPreFill} />
        </BookingProvider>
      ) : (
        <div className="px-3 sm:px-4 pb-6">
          <BatchBookingForm />
        </div>
      )}
    </div>
  )
}
