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
import { QueryClientProvider } from '@/components/providers/QueryClientProvider'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'

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
      {process.env.NODE_ENV === 'development' && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var reloading = false;
              function handleStaleChunk() {
                if (reloading) return;
                reloading = true;
                console.warn('[Dev] Stale webpack chunks detected, reloading...');
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    return Promise.all(names.map(function(n) { return caches.delete(n); }));
                  }).then(function() { window.location.reload(); });
                } else {
                  window.location.reload();
                }
              }
              window.addEventListener('error', function(e) {
                if (e.message && e.message.indexOf("reading 'call'") !== -1) handleStaleChunk();
              });
              window.addEventListener('unhandledrejection', function(e) {
                var msg = e.reason && (e.reason.message || String(e.reason));
                if (msg && msg.indexOf("reading 'call'") !== -1) handleStaleChunk();
              });
            })();
          `}} />
        </head>
      )}
      <body className={`${inter.className} h-full`}>
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