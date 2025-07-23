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
  
  // Hide nav for coaching routes and POS routes - standalone portals
  const isCoachingRoute = isClient && pathname.startsWith('/coaching') && !pathname.startsWith('/coaching-assist')
  const isPOSRoute = isClient && pathname.startsWith('/pos')
  
  if (isCoachingRoute || isPOSRoute) {
    return null
  }
  
  return <Nav />
}