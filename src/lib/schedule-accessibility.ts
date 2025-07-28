/**
 * Accessibility utilities for schedule visualization
 */

import { ProcessedScheduleBlock } from '@/types/schedule-visualization'

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

export function hasAccessibleContrast(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background)
  return ratio >= 4.5 // WCAG AA standard for normal text
}

export function getAccessibleTextColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio('#ffffff', backgroundColor)
  const blackContrast = getContrastRatio('#000000', backgroundColor)
  
  return whiteContrast > blackContrast ? '#ffffff' : '#000000'
}

// ARIA label generators
export function generateScheduleBlockAriaLabel(schedule: ProcessedScheduleBlock): string {
  const timeRange = `from ${schedule.startTime} to ${schedule.endTime}`
  const location = schedule.location ? ` at ${schedule.location}` : ''
  const recurring = schedule.isRecurring ? ' (recurring schedule)' : ''
  const duration = schedule.duration === 1 ? '1 hour' : `${schedule.duration} hours`
  
  return `${schedule.staffName} scheduled ${timeRange}${location}, duration ${duration}${recurring}`
}

export function generateGridCellAriaLabel(
  dayIndex: number, 
  hourIndex: number, 
  weekStart: string,
  businessHours: { start: number; end: number }
): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayName = days[dayIndex]
  const hour = businessHours.start + hourIndex
  const timeLabel = hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`
  
  return `${dayName} at ${timeLabel}`
}

export function generateTimeSlotAriaLabel(hour: number): string {
  if (hour === 12) return '12 PM time slot'
  if (hour > 12) return `${hour - 12} PM time slot`
  return `${hour} AM time slot`
}

// Keyboard navigation utilities
export interface KeyboardNavigationState {
  focusedBlockId: string | null
  focusedGridCell: { day: number; hour: number } | null
}

export function getNextFocusableBlock(
  currentBlockId: string | null,
  scheduleBlocks: ProcessedScheduleBlock[],
  direction: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right'
): string | null {
  if (!scheduleBlocks.length) return null
  
  const currentIndex = currentBlockId 
    ? scheduleBlocks.findIndex(block => block.id === currentBlockId)
    : -1
  
  switch (direction) {
    case 'next':
      return currentIndex < scheduleBlocks.length - 1 
        ? scheduleBlocks[currentIndex + 1].id 
        : scheduleBlocks[0].id
    
    case 'previous':
      return currentIndex > 0 
        ? scheduleBlocks[currentIndex - 1].id 
        : scheduleBlocks[scheduleBlocks.length - 1].id
    
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      // For directional navigation, find blocks in the specified direction
      if (currentIndex === -1) return scheduleBlocks[0].id
      
      const currentBlock = scheduleBlocks[currentIndex]
      const candidates = scheduleBlocks.filter(block => {
        switch (direction) {
          case 'up':
            return block.gridPosition.dayIndex === currentBlock.gridPosition.dayIndex &&
                   block.gridPosition.startRow < currentBlock.gridPosition.startRow
          case 'down':
            return block.gridPosition.dayIndex === currentBlock.gridPosition.dayIndex &&
                   block.gridPosition.startRow > currentBlock.gridPosition.startRow
          case 'left':
            return block.gridPosition.dayIndex < currentBlock.gridPosition.dayIndex
          case 'right':
            return block.gridPosition.dayIndex > currentBlock.gridPosition.dayIndex
          default:
            return false
        }
      })
      
      if (!candidates.length) return null
      
      // Return the closest candidate
      return candidates.sort((a, b) => {
        switch (direction) {
          case 'up':
            return b.gridPosition.startRow - a.gridPosition.startRow
          case 'down':
            return a.gridPosition.startRow - b.gridPosition.startRow
          case 'left':
            return b.gridPosition.dayIndex - a.gridPosition.dayIndex
          case 'right':
            return a.gridPosition.dayIndex - b.gridPosition.dayIndex
          default:
            return 0
        }
      })[0].id
    
    default:
      return null
  }
}

// Screen reader announcements
export function createLiveRegionAnnouncement(
  type: 'schedule-loaded' | 'schedule-updated' | 'block-focused' | 'navigation-help',
  data?: any
): string {
  switch (type) {
    case 'schedule-loaded':
      const blockCount = data?.blockCount || 0
      const staffCount = data?.staffCount || 0
      return `Schedule visualization loaded with ${blockCount} scheduled shifts for ${staffCount} staff members`
    
    case 'schedule-updated':
      return `Schedule has been updated. ${data?.changedCount || 0} shifts modified`
    
    case 'block-focused':
      return data?.ariaLabel || 'Schedule block focused'
    
    case 'navigation-help':
      return 'Use arrow keys to navigate between schedule blocks, Enter to select, Escape to exit navigation mode'
    
    default:
      return ''
  }
}

// Focus management
export function manageFocus(element: HTMLElement | null, options?: {
  preventScroll?: boolean
  selectText?: boolean
}) {
  if (!element) return
  
  element.focus({ 
    preventScroll: options?.preventScroll || false 
  })
  
  if (options?.selectText && element instanceof HTMLInputElement) {
    element.select()
  }
}

// High contrast mode detection
export function isHighContrastMode(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for Windows high contrast mode
  if (window.matchMedia) {
    try {
      return window.matchMedia('(prefers-contrast: high)').matches ||
             window.matchMedia('(-ms-high-contrast: active)').matches
    } catch (error) {
      return false
    }
  }
  
  return false
}

// Reduced motion detection
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  if (window.matchMedia) {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch (error) {
      return false
    }
  }
  
  return false
}

// Screen reader detection (basic)
export function isScreenReaderActive(): boolean {
  if (typeof window === 'undefined') return false
  
  // Basic heuristic - not 100% reliable but helps
  return window.navigator.userAgent.includes('NVDA') ||
         window.navigator.userAgent.includes('JAWS') ||
         window.speechSynthesis?.speaking === true
}

export default {
  getContrastRatio,
  hasAccessibleContrast,
  getAccessibleTextColor,
  generateScheduleBlockAriaLabel,
  generateGridCellAriaLabel,
  generateTimeSlotAriaLabel,
  getNextFocusableBlock,
  createLiveRegionAnnouncement,
  manageFocus,
  isHighContrastMode,
  prefersReducedMotion,
  isScreenReaderActive
}