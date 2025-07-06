import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { SessionProvider } from '@/components/session-provider'

export default async function CoachingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-background">
        {/* No Nav component here - standalone coaching portal */}
        <div className="w-full">{children}</div>
      </div>
    </SessionProvider>
  )
}