import { Metadata } from 'next'
import { TimeClockInterface } from '@/components/time-clock/time-clock-interface'

export const metadata: Metadata = {
  title: 'Staff Time Clock | LenGolf',
  description: 'Staff time clock system for clocking in and out',
}

export default function TimeClockPage() {
  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      <TimeClockInterface />
    </div>
  )
} 