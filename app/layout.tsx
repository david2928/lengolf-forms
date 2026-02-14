import { Inter } from 'next/font/google'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import './globals.css'
import Script from 'next/script'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'
import { ConditionalNav } from '@/components/conditional-nav'
import { CustomerModalProvider } from '@/contexts/CustomerModalContext'
import { CustomerDetailModal } from '@/components/shared/CustomerDetailModal'
import { NotificationsClientProvider } from '@/components/providers/NotificationsClientProvider'
import { QueryClientProvider } from '@/components/providers/QueryClientProvider'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content', // Helps keep chat input above keyboard (Chrome/Firefox)
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
      {GTM_ID && (
        <head>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        </head>
      )}
      <body className={`${inter.className} h-full`}>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <SessionProvider session={session}>
          <QueryClientProvider>
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
          </QueryClientProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}