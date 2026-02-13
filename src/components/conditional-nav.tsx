'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Nav } from './nav'

export function ConditionalNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Hide nav for coaching routes, POS routes, staff chat routes, and create-booking from chat
  const isCoachingRoute = isClient && pathname.startsWith('/coaching') && !pathname.startsWith('/coaching-assist')
  const isPOSRoute = isClient && pathname.startsWith('/pos')
  const isStaffChatRoute = isClient && (pathname === '/staff/line-chat' || pathname === '/staff/line-chat-new' || pathname === '/staff/unified-chat')
  const fromParam = searchParams.get('from')
  const isCreateBookingFromChat = isClient && pathname === '/create-booking' && (fromParam === 'chat' || fromParam === 'obsales')

  if (isCoachingRoute || isPOSRoute || isStaffChatRoute || isCreateBookingFromChat) {
    return null
  }

  return <Nav />
}