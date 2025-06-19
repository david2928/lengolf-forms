import { Metadata } from 'next'
import { TimeClockInterface } from '@/components/time-clock/time-clock-interface'

export const metadata: Metadata = {
  title: 'Staff Time Clock | LenGolf',
  description: 'Staff time clock system for clocking in and out',
}

export default function TimeClockPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <TimeClockInterface />
        </div>
      </div>
    </div>
  )
} 