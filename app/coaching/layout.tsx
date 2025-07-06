import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'
import { CoachingNav } from '@/components/coaching/coaching-nav'

export default async function CoachingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-background flex flex-col">
        <CoachingNav />
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  )
}