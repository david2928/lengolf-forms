'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/common/LoadingState'

interface RouteProtectionProps {
  children: React.ReactNode
  requireAdmin?: boolean
  redirectTo?: string
  fallbackComponent?: React.ReactNode
}

export function RouteProtection({ 
  children, 
  requireAdmin = false, 
  redirectTo,
  fallbackComponent 
}: RouteProtectionProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Development bypass - skip all auth checks
    const shouldBypass = (
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    );
    
    if (shouldBypass) {
      setIsAuthorized(true)
      setIsLoading(false)
      return
    }

    if (status === 'loading') {
      return // Still loading session
    }

    if (status === 'unauthenticated') {
      // Not authenticated - redirect to sign in
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && session?.user) {
      // Check admin requirement
      if (requireAdmin && !session.user.isAdmin) {
        // User is not admin but admin is required
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          // Default redirect for non-admin users trying to access admin pages
          router.push('/staff-schedule')
        }
        return
      }

      // User is authorized
      setIsAuthorized(true)
    }

    setIsLoading(false)
  }, [session, status, requireAdmin, redirectTo, router])

  // Show loading state while checking authentication
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Checking authentication..." />
      </div>
    )
  }

  // Show fallback component if provided and not authorized
  if (!isAuthorized && fallbackComponent) {
    return <>{fallbackComponent}</>
  }

  // Don't render children if not authorized
  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

// Higher-order component for admin route protection
export function withAdminProtection<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteProtection requireAdmin={true} redirectTo={redirectTo}>
        <Component {...props} />
      </RouteProtection>
    )
  }
}

// Higher-order component for staff route protection
export function withStaffProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteProtection requireAdmin={false}>
        <Component {...props} />
      </RouteProtection>
    )
  }
}