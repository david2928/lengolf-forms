'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Nav } from './nav'

export function ConditionalNav() {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Hide nav for coaching routes, POS routes, and staff chat routes - standalone portals
  const isCoachingRoute = isClient && pathname.startsWith('/coaching') && !pathname.startsWith('/coaching-assist')
  const isPOSRoute = isClient && pathname.startsWith('/pos')
  const isStaffChatRoute = isClient && (pathname === '/staff/line-chat' || pathname === '/staff/line-chat-new' || pathname === '/staff/unified-chat')

  if (isCoachingRoute || isPOSRoute || isStaffChatRoute) {
    return null
  }
  
  return <Nav />
}