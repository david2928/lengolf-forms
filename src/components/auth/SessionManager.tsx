'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SessionManagerProps {
  children: React.ReactNode
  warningMinutes?: number // Show warning X minutes before expiry
  checkInterval?: number // Check session every X milliseconds
}

export function SessionManager({ 
  children, 
  warningMinutes = 5,
  checkInterval = 60000 // 1 minute
}: SessionManagerProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Development bypass - skip session management
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
  );

  const checkSessionExpiry = useCallback(() => {
    if (!session?.expires) return

    const expiryTime = new Date(session.expires).getTime()
    const currentTime = Date.now()
    const timeLeft = expiryTime - currentTime
    const warningThreshold = warningMinutes * 60 * 1000

    if (timeLeft <= 0) {
      // Session has expired
      router.push('/auth/signin?message=Session expired')
      return
    }

    if (timeLeft <= warningThreshold && !showWarning) {
      // Show warning
      setShowWarning(true)
      setTimeRemaining(Math.ceil(timeLeft / 1000 / 60)) // Minutes remaining
    } else if (timeLeft > warningThreshold && showWarning) {
      // Hide warning if session was refreshed
      setShowWarning(false)
      setTimeRemaining(null)
    }
  }, [session, warningMinutes, showWarning, router])

  useEffect(() => {
    if (status !== 'authenticated' || shouldBypass) return

    // Check immediately
    checkSessionExpiry()

    // Set up interval to check periodically
    const interval = setInterval(checkSessionExpiry, checkInterval)

    return () => clearInterval(interval)
  }, [status, checkSessionExpiry, checkInterval, shouldBypass])

  const handleExtendSession = () => {
    // Trigger session refresh by making a request
    window.location.reload()
  }

  const handleSignOut = () => {
    router.push('/auth/signin')
  }

  if (shouldBypass) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {/* Session Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Session Expiring Soon</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}. 
                Would you like to extend your session?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleExtendSession}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Extend Session
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}