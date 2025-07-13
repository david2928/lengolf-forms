import { Inter } from 'next/font/google'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'
import { ConditionalNav } from '@/components/conditional-nav'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background flex flex-col">
            <ConditionalNav />
            <main className="flex-1">{children}</main>
            <Toaster />
            <SonnerToaster position="top-right" />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}