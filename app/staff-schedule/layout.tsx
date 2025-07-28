import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Staff Schedule | LenGolf',
  description: 'View and manage staff schedules with mobile-optimized interface',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Staff Schedule',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Staff Schedule',
    'application-name': 'Staff Schedule',
    'msapplication-TileColor': '#2563eb',
    'theme-color': '#2563eb',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2563eb',
}

export default function StaffScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="staff-schedule-layout">
      {children}
    </div>
  )
}