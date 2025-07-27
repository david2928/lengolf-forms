/**
 * Coverage Analysis Utilities
 * Analyzes staff schedule coverage and identifies gaps
 */

export interface TimeSlot {
  start: string // HH:MM format
  end: string   // HH:MM format
}

export interface CoverageGap {
  start: string // HH:MM format
  end: string   // HH:MM format
  duration: number // minutes
}

export interface DayCoverage {
  date: string
  hasSchedules: boolean
  coverageGaps: CoverageGap[]
  totalCoverageMinutes: number
  requiredCoverageMinutes: number
  coveragePercentage: number
}

// Business hours: 10:00 AM to 11:00 PM (13 hours)
const BUSINESS_START = '10:00'
const BUSINESS_END = '23:00'
const BUSINESS_HOURS_MINUTES = 13 * 60 // 780 minutes

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Merge overlapping time slots and sort them
 */
function mergeTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return []
  
  // Convert to minutes and sort
  const minuteSlots = slots
    .map(slot => ({
      start: timeToMinutes(slot.start),
      end: timeToMinutes(slot.end)
    }))
    .sort((a, b) => a.start - b.start)
  
  const merged: { start: number; end: number }[] = []
  let current = minuteSlots[0]
  
  for (let i = 1; i < minuteSlots.length; i++) {
    const next = minuteSlots[i]
    
    // If current slot overlaps or touches the next slot, merge them
    if (current.end >= next.start) {
      current.end = Math.max(current.end, next.end)
    } else {
      merged.push(current)
      current = next
    }
  }
  merged.push(current)
  
  // Convert back to time strings
  return merged.map(slot => ({
    start: minutesToTime(slot.start),
    end: minutesToTime(slot.end)
  }))
}

/**
 * Calculate coverage gaps for a specific day
 */
export function calculateDayCoverageGaps(schedules: any[]): DayCoverage {
  const date = schedules.length > 0 ? schedules[0].schedule_date : new Date().toISOString().split('T')[0]
  
  if (schedules.length === 0) {
    return {
      date,
      hasSchedules: false,
      coverageGaps: [{
        start: BUSINESS_START,
        end: BUSINESS_END,
        duration: BUSINESS_HOURS_MINUTES
      }],
      totalCoverageMinutes: 0,
      requiredCoverageMinutes: BUSINESS_HOURS_MINUTES,
      coveragePercentage: 0
    }
  }
  
  // Extract time slots from schedules
  const timeSlots: TimeSlot[] = schedules.map(schedule => ({
    start: schedule.start_time.substring(0, 5), // Remove seconds if present
    end: schedule.end_time.substring(0, 5)
  }))
  
  // Merge overlapping slots
  const mergedSlots = mergeTimeSlots(timeSlots)
  
  // Calculate coverage within business hours
  const businessStart = timeToMinutes(BUSINESS_START)
  const businessEnd = timeToMinutes(BUSINESS_END)
  
  let totalCoverageMinutes = 0
  const coverageGaps: CoverageGap[] = []
  
  // Check for gap before first slot
  const firstSlotStart = timeToMinutes(mergedSlots[0].start)
  if (firstSlotStart > businessStart) {
    const gapEnd = Math.min(firstSlotStart, businessEnd)
    if (gapEnd > businessStart) {
      coverageGaps.push({
        start: BUSINESS_START,
        end: minutesToTime(gapEnd),
        duration: gapEnd - businessStart
      })
    }
  }
  
  // Calculate coverage and gaps between slots
  for (let i = 0; i < mergedSlots.length; i++) {
    const slot = mergedSlots[i]
    const slotStart = Math.max(timeToMinutes(slot.start), businessStart)
    const slotEnd = Math.min(timeToMinutes(slot.end), businessEnd)
    
    // Add coverage time for this slot (only within business hours)
    if (slotEnd > slotStart) {
      totalCoverageMinutes += slotEnd - slotStart
    }
    
    // Check for gap after this slot
    if (i < mergedSlots.length - 1) {
      const nextSlotStart = timeToMinutes(mergedSlots[i + 1].start)
      const gapStart = Math.max(slotEnd, businessStart)
      const gapEnd = Math.min(nextSlotStart, businessEnd)
      
      if (gapEnd > gapStart) {
        coverageGaps.push({
          start: minutesToTime(gapStart),
          end: minutesToTime(gapEnd),
          duration: gapEnd - gapStart
        })
      }
    }
  }
  
  // Check for gap after last slot
  const lastSlotEnd = timeToMinutes(mergedSlots[mergedSlots.length - 1].end)
  if (lastSlotEnd < businessEnd) {
    const gapStart = Math.max(lastSlotEnd, businessStart)
    if (businessEnd > gapStart) {
      coverageGaps.push({
        start: minutesToTime(gapStart),
        end: BUSINESS_END,
        duration: businessEnd - gapStart
      })
    }
  }
  
  const coveragePercentage = Math.round((totalCoverageMinutes / BUSINESS_HOURS_MINUTES) * 100)
  
  return {
    date,
    hasSchedules: true,
    coverageGaps,
    totalCoverageMinutes,
    requiredCoverageMinutes: BUSINESS_HOURS_MINUTES,
    coveragePercentage
  }
}

/**
 * Format coverage gap for display
 */
export function formatCoverageGap(gap: CoverageGap): string {
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`
  }
  
  return `${formatTime(gap.start)} - ${formatTime(gap.end)}`
}

/**
 * Check if a day has significant coverage gaps (more than 2 hours uncovered)
 */
export function hasSignificantGaps(coverage: DayCoverage): boolean {
  const totalGapMinutes = coverage.coverageGaps.reduce((sum, gap) => sum + gap.duration, 0)
  return totalGapMinutes > 120 // More than 2 hours
}