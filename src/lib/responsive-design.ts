/**
 * Responsive design utilities for schedule visualization
 */

import React from 'react'

// Breakpoint definitions
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// Responsive configuration for different screen sizes
export interface ResponsiveConfig {
  breakpoint: Breakpoint
  gridColumns: string
  timeSlotHeight: number
  fontSize: string
  blockPadding: number
  showMinutes: boolean
  showLocation: boolean
  headerHeight: number
  scrollable: boolean
  compactMode: boolean
}

export const RESPONSIVE_CONFIGS: Record<Breakpoint, ResponsiveConfig> = {
  mobile: {
    breakpoint: 'mobile',
    gridColumns: 'minmax(60px, 80px) repeat(7, 1fr)',
    timeSlotHeight: 48,
    fontSize: '0.75rem', // 12px
    blockPadding: 6,
    showMinutes: false,
    showLocation: false,
    headerHeight: 60,
    scrollable: true,
    compactMode: true
  },
  tablet: {
    breakpoint: 'tablet',
    gridColumns: 'minmax(80px, 100px) repeat(7, 1fr)',
    timeSlotHeight: 56,
    fontSize: '0.875rem', // 14px
    blockPadding: 8,
    showMinutes: true,
    showLocation: true,
    headerHeight: 70,
    scrollable: true,
    compactMode: false
  },
  desktop: {
    breakpoint: 'desktop',
    gridColumns: 'minmax(100px, 120px) repeat(7, 1fr)',
    timeSlotHeight: 60,
    fontSize: '0.875rem', // 14px
    blockPadding: 10,
    showMinutes: true,
    showLocation: true,
    headerHeight: 80,
    scrollable: false,
    compactMode: false
  },
  wide: {
    breakpoint: 'wide',
    gridColumns: 'minmax(120px, 140px) repeat(7, 1fr)',
    timeSlotHeight: 64,
    fontSize: '1rem', // 16px
    blockPadding: 12,
    showMinutes: true,
    showLocation: true,
    headerHeight: 90,
    scrollable: false,
    compactMode: false
  }
}

// Get current breakpoint based on screen width
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide'
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}

// Get responsive configuration for current screen size
export function getResponsiveConfig(width: number): ResponsiveConfig {
  const breakpoint = getCurrentBreakpoint(width)
  return RESPONSIVE_CONFIGS[breakpoint]
}

// Media query helpers
export function createMediaQuery(breakpoint: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[breakpoint]}px)`
}

export function useMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    return window.matchMedia(query).matches
  } catch (error) {
    return false
  }
}

// Responsive hook for React components
export function useResponsiveConfig(): ResponsiveConfig {
  const [config, setConfig] = React.useState<ResponsiveConfig>(() => 
    getResponsiveConfig(typeof window !== 'undefined' ? window.innerWidth : 1024)
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const updateConfig = () => {
      setConfig(getResponsiveConfig(window.innerWidth))
    }

    // Set initial config
    updateConfig()

    // Listen for resize events
    window.addEventListener('resize', updateConfig)
    return () => window.removeEventListener('resize', updateConfig)
  }, [])

  return config
}

// CSS class generators for responsive design
export function generateResponsiveClasses(
  baseClasses: string,
  responsiveClasses: Partial<Record<Breakpoint, string>>
): string {
  let classes = baseClasses

  Object.entries(responsiveClasses).forEach(([breakpoint, classNames]) => {
    if (classNames) {
      const prefix = breakpoint === 'mobile' ? '' : `${breakpoint}:`
      const prefixedClasses = classNames
        .split(' ')
        .map(cls => `${prefix}${cls}`)
        .join(' ')
      classes += ` ${prefixedClasses}`
    }
  })

  return classes
}

// Touch device detection
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    'ontouchstart' in window ||
    (window.navigator && window.navigator.maxTouchPoints > 0) ||
    // @ts-ignore - Legacy property
    (window.navigator && window.navigator.msMaxTouchPoints > 0)
  )
}

// Viewport utilities
export function getViewportDimensions() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

// Scroll utilities for mobile
export function enableHorizontalScroll(element: HTMLElement) {
  if (!element) return

  element.style.overflowX = 'auto'
  element.style.overflowY = 'hidden'
  element.style.scrollbarWidth = 'thin'
  
  // Add momentum scrolling for iOS
  element.style.webkitOverflowScrolling = 'touch'
}

export function createStickyTimeLabels(
  containerElement: HTMLElement,
  timeLabelsElement: HTMLElement
) {
  if (!containerElement || !timeLabelsElement) return

  const handleScroll = () => {
    const scrollLeft = containerElement.scrollLeft
    timeLabelsElement.style.transform = `translateX(${scrollLeft}px)`
  }

  containerElement.addEventListener('scroll', handleScroll, { passive: true })
  
  return () => {
    containerElement.removeEventListener('scroll', handleScroll)
  }
}

// Responsive font scaling
export function getScaledFontSize(baseFontSize: number, breakpoint: Breakpoint): string {
  const scalingFactors: Record<Breakpoint, number> = {
    mobile: 0.8,
    tablet: 0.9,
    desktop: 1.0,
    wide: 1.1
  }

  const scaledSize = baseFontSize * scalingFactors[breakpoint]
  return `${Math.round(scaledSize * 1000) / 1000}rem`
}

// React is already imported at the top

export default {
  BREAKPOINTS,
  RESPONSIVE_CONFIGS,
  getCurrentBreakpoint,
  getResponsiveConfig,
  createMediaQuery,
  useMediaQuery,
  useResponsiveConfig,
  generateResponsiveClasses,
  isTouchDevice,
  getViewportDimensions,
  enableHorizontalScroll,
  createStickyTimeLabels,
  getScaledFontSize
}