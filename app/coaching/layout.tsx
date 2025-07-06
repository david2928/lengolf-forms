import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import '../globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'

const inter = Inter({ subsets: ['latin'] })

export default async function CoachingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background">
            {/* No Nav component here - standalone coaching portal */}
            <main className="w-full">{children}</main>
            <Toaster />
            <SonnerToaster position="top-right" />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}