import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Staff Time Clock | LenGolf',
  description: 'Staff time clock system for clocking in and out',
  robots: {
    index: false,
    follow: false
  }
}

export default function TimeClockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="time-clock-layout">
      {children}
    </div>
  )
} 