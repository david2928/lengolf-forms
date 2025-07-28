/**
 * Immutable constants for staff scheduling compact formatting
 * DO NOT MODIFY - These values ensure consistent compact layout
 */

export const COMPACT_FORMATTING = {
  // Staff Weekly Hours Section
  STAFF_HOURS: {
    CONTAINER: 'bg-white rounded-lg border border-slate-200 p-3 sm:p-4',
    TITLE: 'text-base font-semibold text-slate-900 mb-3',
    GRID: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3',
    CARD: 'p-2 rounded-md border text-center',
    STAFF_NAME: 'text-xs font-medium truncate',
    HOURS: 'text-sm font-bold',
    STATUS: 'text-xs'
  },

  // Weekly Calendar Grid
  CALENDAR: {
    CONTAINER: 'bg-white rounded-lg border border-slate-200 p-3 sm:p-4',
    TITLE: 'text-base font-semibold text-slate-900 mb-3',
    GRID: 'grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-3',
    HEADER_CELL: 'text-center p-2 border-b border-slate-200',
    DAY_CONTAINER: 'min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 border border-slate-100 rounded-lg'
  },

  // Schedule Items
  SCHEDULE_ITEM: {
    BUTTON: 'w-full text-left text-xs p-1 rounded-md hover:opacity-80 transition-colors border relative cursor-pointer',
    RECURRING_INDICATOR: 'absolute top-0.5 right-0.5 z-10',
    RECURRING_ICON: 'w-3 h-3 rounded-full bg-white border border-slate-400 flex items-center justify-center shadow-sm',
    RECURRING_SVG: 'w-2 h-2 text-slate-700'
  },

  // Coverage Indicators
  COVERAGE: {
    CONTAINER: 'mb-1.5 text-xs',
    DOT: 'w-1.5 h-1.5 rounded-full',
    TEXT: 'font-medium'
  },

  // Status Text (shortened)
  STATUS_TEXT: {
    UNDER: 'Under',
    OVER: 'Over', 
    GOOD: 'Good'
  }
} as const

// Type for the constants to ensure immutability
export type CompactFormattingConstants = typeof COMPACT_FORMATTING

// Validation function to check if formatting is applied correctly
export function validateCompactFormatting(content: string): boolean {
  const requiredPatterns = [
    'lg:grid-cols-6',           // 6-column grid
    'gap-2 md:gap-3',           // Compact gaps
    'min-h-\\[80px\\]',         // Compact height
    'p-1 rounded-md',           // Compact padding
    "'Under'",                  // Shortened status
    "'Over'",                   // Shortened status
    "'Good'"                    // Shortened status
  ]

  return requiredPatterns.every(pattern => {
    const regex = new RegExp(pattern)
    return regex.test(content)
  })
}

// Helper function to get compact class names
export function getCompactClasses() {
  return {
    staffHoursGrid: COMPACT_FORMATTING.STAFF_HOURS.GRID,
    calendarGrid: COMPACT_FORMATTING.CALENDAR.GRID,
    dayContainer: COMPACT_FORMATTING.CALENDAR.DAY_CONTAINER,
    scheduleItem: COMPACT_FORMATTING.SCHEDULE_ITEM.BUTTON,
    coverageDot: COMPACT_FORMATTING.COVERAGE.DOT
  }
}