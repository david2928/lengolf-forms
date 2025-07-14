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
  
  // Hide nav for coaching routes - standalone portal, but keep for coaching-assist
  const isCoachingRoute = isClient && pathname.startsWith('/coaching') && !pathname.startsWith('/coaching-assist')
  
  if (isCoachingRoute) {
    return null
  }
  
  return <Nav />
}