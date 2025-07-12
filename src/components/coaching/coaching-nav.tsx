'use client'

import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function CoachingNav() {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <div className="border-b bg-white">
      <div className="container h-12 sm:h-14 flex items-center justify-between px-4">
        {/* Minimal mobile-friendly header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-sm sm:text-lg font-medium text-gray-900">
            <span className="hidden sm:inline">Lengolf </span>Coaching
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:inline text-sm text-gray-600">
            Welcome, {session.user.name || session.user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut()} 
            className="flex items-center gap-1 sm:gap-2 border border-gray-200 h-8 sm:h-9"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  )
}