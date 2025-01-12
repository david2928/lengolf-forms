import { Inter } from 'next/font/google'
import { Nav } from '../src/components/nav'
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
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <SessionProvider session={session}>
          <div className="min-h-screen bg-background flex flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <Toaster />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}