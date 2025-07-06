'use client'

import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function CoachingNav() {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <div className="border-b bg-white">
      <div className="container h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Lengolf Coaching Portal
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Welcome, {session.user.name || session.user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut()} 
            className="flex items-center gap-2 border border-gray-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}