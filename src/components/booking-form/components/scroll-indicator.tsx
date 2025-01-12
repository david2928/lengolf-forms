'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function ScrollIndicator() {
  const [showIndicator, setShowIndicator] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      // Hide indicator after user has scrolled a bit
      if (scrollPosition > 100) {
        setShowIndicator(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!showIndicator) return null

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
      "animate-bounce transition-opacity duration-500",
      "pointer-events-none"
    )}>
      <ChevronDown className="h-6 w-6 text-muted-foreground" />
    </div>
  )
}