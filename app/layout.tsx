import { Inter } from 'next/font/google'
import { NavMenu } from '../src/components/nav-menu'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background flex flex-col relative">
            <NavMenu />
            <main className="flex-1">{children}</main>
            <Toaster />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}