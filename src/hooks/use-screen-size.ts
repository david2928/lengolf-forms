'use client'

import { useState, useEffect } from 'react'

export interface ScreenSize {
  width: number
  height: number
  deviceType: 'mobile' | 'tablet' | 'desktop'
  isLandscape: boolean
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    isLandscape: false,
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
      
      if (width < 768) {
        deviceType = 'mobile'
      } else if (width >= 768 && width <= 1200) {
        deviceType = 'tablet'
      } else {
        deviceType = 'desktop'
      }
      
      setScreenSize({
        width,
        height,
        deviceType,
        isLandscape: width > height,
      })
    }

    // Set initial size
    updateScreenSize()

    // Add event listener
    window.addEventListener('resize', updateScreenSize)

    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return screenSize
} 