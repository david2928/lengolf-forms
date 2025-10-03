import { Inter } from 'next/font/google'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'
import { ConditionalNav } from '@/components/conditional-nav'
import { CustomerModalProvider } from '@/contexts/CustomerModalContext'
import { CustomerDetailModal } from '@/components/shared/CustomerDetailModal'
import { NotificationsClientProvider } from '@/components/providers/NotificationsClientProvider'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Development auth bypass
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_AUTH === 'true'
  );

  const session = shouldBypass ? null : await getServerSession(authOptions)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <SessionProvider session={session}>
          <NotificationsClientProvider>
            <CustomerModalProvider>
              <div className="min-h-screen bg-background flex flex-col">
                <ConditionalNav />
                <main className="flex-1">{children}</main>
                <Toaster />
                <SonnerToaster position="top-right" />
              </div>
              <CustomerDetailModal />
            </CustomerModalProvider>
          </NotificationsClientProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}