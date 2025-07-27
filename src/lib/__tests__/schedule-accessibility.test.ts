/**
 * Tests for Schedule Accessibility utilities
 */

import {
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
} from '../schedule-accessibility'

// Mock ProcessedScheduleBlock data
const mockScheduleBlock = {
    id: '1',
    staffId: 'staff-1',
    staffName: 'John Doe',
    startTime: '10:00',
    endTime: '12:00',
    duration: 2,
    location: 'Main Floor',
    isRecurring: true,
    gridPosition: {
        dayIndex: 0,
        startRow: 2,
        rowSpan: 2
    }
}

const mockScheduleBlocks = [
    mockScheduleBlock,
    {
        ...mockScheduleBlock,
        id: '2',
        staffName: 'Jane Smith',
        gridPosition: { dayIndex: 1, startRow: 3, rowSpan: 1 }
    },
    {
        ...mockScheduleBlock,
        id: '3',
        staffName: 'Bob Johnson',
        gridPosition: { dayIndex: 0, startRow: 4, rowSpan: 1 }
    }
]

describe('Color Contrast Utilities', () => {
    describe('getContrastRatio', () => {
        it('should calculate contrast ratio correctly', () => {
            // Black on white should have high contrast
            const blackWhite = getContrastRatio('#000000', '#ffffff')
            expect(blackWhite).toBeCloseTo(21, 0)

            // White on white should have no contrast
            const whiteWhite = getContrastRatio('#ffffff', '#ffffff')
            expect(whiteWhite).toBe(1)

            // Test with actual colors
            const blueWhite = getContrastRatio('#0066cc', '#ffffff')
            expect(blueWhite).toBeGreaterThan(4.5)
        })

        it('should handle invalid hex colors gracefully', () => {
            const result = getContrastRatio('invalid', '#ffffff')
            expect(result).toBe(1)
        })
    })

    describe('hasAccessibleContrast', () => {
        it('should return true for accessible color combinations', () => {
            expect(hasAccessibleContrast('#000000', '#ffffff')).toBe(true)
            expect(hasAccessibleContrast('#ffffff', '#000000')).toBe(true)
            expect(hasAccessibleContrast('#0066cc', '#ffffff')).toBe(true)
        })

        it('should return false for inaccessible color combinations', () => {
            expect(hasAccessibleContrast('#cccccc', '#ffffff')).toBe(false)
            expect(hasAccessibleContrast('#ffff00', '#ffffff')).toBe(false)
        })
    })

    describe('getAccessibleTextColor', () => {
        it('should return white for dark backgrounds', () => {
            expect(getAccessibleTextColor('#000000')).toBe('#ffffff')
            expect(getAccessibleTextColor('#333333')).toBe('#ffffff')
        })

        it('should return black for light backgrounds', () => {
            expect(getAccessibleTextColor('#ffffff')).toBe('#000000')
            expect(getAccessibleTextColor('#ffff00')).toBe('#000000')
        })
    })
})

describe('ARIA Label Generators', () => {
    describe('generateScheduleBlockAriaLabel', () => {
        it('should generate comprehensive aria label', () => {
            const label = generateScheduleBlockAriaLabel(mockScheduleBlock)

            expect(label).toContain('John Doe')
            expect(label).toContain('from 10:00 to 12:00')
            expect(label).toContain('at Main Floor')
            expect(label).toContain('duration 2 hours')
            expect(label).toContain('recurring schedule')
        })

        it('should handle schedule without location', () => {
            const scheduleWithoutLocation = { ...mockScheduleBlock, location: undefined }
            const label = generateScheduleBlockAriaLabel(scheduleWithoutLocation)

            expect(label).toContain('John Doe')
            expect(label).not.toContain('at ')
        })

        it('should handle non-recurring schedule', () => {
            const nonRecurringSchedule = { ...mockScheduleBlock, isRecurring: false }
            const label = generateScheduleBlockAriaLabel(nonRecurringSchedule)

            expect(label).not.toContain('recurring')
        })

        it('should handle single hour duration', () => {
            const oneHourSchedule = { ...mockScheduleBlock, duration: 1 }
            const label = generateScheduleBlockAriaLabel(oneHourSchedule)

            expect(label).toContain('duration 1 hour')
        })
    })

    describe('generateGridCellAriaLabel', () => {
        it('should generate correct grid cell labels', () => {
            const label = generateGridCellAriaLabel(0, 2, '2024-01-15', { start: 10, end: 23 })

            expect(label).toContain('Monday')
            expect(label).toContain('12pm')
        })

        it('should handle AM times correctly', () => {
            const label = generateGridCellAriaLabel(1, 0, '2024-01-15', { start: 10, end: 23 })

            expect(label).toContain('Tuesday')
            expect(label).toContain('10am')
        })

        it('should handle PM times correctly', () => {
            const label = generateGridCellAriaLabel(2, 5, '2024-01-15', { start: 10, end: 23 })

            expect(label).toContain('Wednesday')
            expect(label).toContain('3pm')
        })
    })

    describe('generateTimeSlotAriaLabel', () => {
        it('should generate correct time slot labels', () => {
            expect(generateTimeSlotAriaLabel(10)).toBe('10 AM time slot')
            expect(generateTimeSlotAriaLabel(12)).toBe('12 PM time slot')
            expect(generateTimeSlotAriaLabel(15)).toBe('3 PM time slot')
        })
    })
})

describe('Keyboard Navigation', () => {
    describe('getNextFocusableBlock', () => {
        it('should navigate to next block', () => {
            const nextId = getNextFocusableBlock('1', mockScheduleBlocks, 'next')
            expect(nextId).toBe('2')
        })

        it('should navigate to previous block', () => {
            const prevId = getNextFocusableBlock('2', mockScheduleBlocks, 'previous')
            expect(prevId).toBe('1')
        })

        it('should wrap around at end for next navigation', () => {
            const nextId = getNextFocusableBlock('3', mockScheduleBlocks, 'next')
            expect(nextId).toBe('1')
        })

        it('should wrap around at beginning for previous navigation', () => {
            const prevId = getNextFocusableBlock('1', mockScheduleBlocks, 'previous')
            expect(prevId).toBe('3')
        })

        it('should navigate up in same day', () => {
            const upId = getNextFocusableBlock('3', mockScheduleBlocks, 'up')
            expect(upId).toBe('1') // Same day (0), earlier row (2 < 4)
        })

        it('should navigate down in same day', () => {
            const downId = getNextFocusableBlock('1', mockScheduleBlocks, 'down')
            expect(downId).toBe('3') // Same day (0), later row (4 > 2)
        })

        it('should navigate right to next day', () => {
            const rightId = getNextFocusableBlock('1', mockScheduleBlocks, 'right')
            expect(rightId).toBe('2') // Different day (1 > 0)
        })

        it('should return null for no valid navigation', () => {
            const leftId = getNextFocusableBlock('1', mockScheduleBlocks, 'left')
            expect(leftId).toBeNull() // No blocks to the left of day 0
        })

        it('should handle empty schedule blocks', () => {
            const nextId = getNextFocusableBlock(null, [], 'next')
            expect(nextId).toBeNull()
        })

        it('should return first block when no current block', () => {
            const nextId = getNextFocusableBlock(null, mockScheduleBlocks, 'next')
            expect(nextId).toBe('1')
        })
    })
})

describe('Live Region Announcements', () => {
    describe('createLiveRegionAnnouncement', () => {
        it('should create schedule loaded announcement', () => {
            const announcement = createLiveRegionAnnouncement('schedule-loaded', {
                blockCount: 5,
                staffCount: 3
            })

            expect(announcement).toContain('Schedule visualization loaded')
            expect(announcement).toContain('5 scheduled shifts')
            expect(announcement).toContain('3 staff members')
        })

        it('should create schedule updated announcement', () => {
            const announcement = createLiveRegionAnnouncement('schedule-updated', {
                changedCount: 2
            })

            expect(announcement).toContain('Schedule has been updated')
            expect(announcement).toContain('2 shifts modified')
        })

        it('should create block focused announcement', () => {
            const announcement = createLiveRegionAnnouncement('block-focused', {
                ariaLabel: 'John Doe scheduled from 10:00 to 12:00'
            })

            expect(announcement).toBe('John Doe scheduled from 10:00 to 12:00')
        })

        it('should create navigation help announcement', () => {
            const announcement = createLiveRegionAnnouncement('navigation-help')

            expect(announcement).toContain('Use arrow keys to navigate')
            expect(announcement).toContain('Enter to select')
            expect(announcement).toContain('Escape to exit')
        })

        it('should handle unknown announcement types', () => {
            const announcement = createLiveRegionAnnouncement('unknown' as any)
            expect(announcement).toBe('')
        })
    })
})

describe('Focus Management', () => {
    describe('manageFocus', () => {
        let mockElement: HTMLElement

        beforeEach(() => {
            mockElement = {
                focus: jest.fn(),
                select: jest.fn()
            } as any
        })

        it('should focus element', () => {
            manageFocus(mockElement)
            expect(mockElement.focus).toHaveBeenCalledWith({ preventScroll: false })
        })

        it('should focus with preventScroll option', () => {
            manageFocus(mockElement, { preventScroll: true })
            expect(mockElement.focus).toHaveBeenCalledWith({ preventScroll: true })
        })

        it('should select text for input elements', () => {
            const mockInput = {
                ...mockElement,
                select: jest.fn()
            } as any

            Object.setPrototypeOf(mockInput, HTMLInputElement.prototype)

            manageFocus(mockInput, { selectText: true })
            expect(mockInput.focus).toHaveBeenCalled()
            expect(mockInput.select).toHaveBeenCalled()
        })

        it('should handle null element gracefully', () => {
            expect(() => manageFocus(null)).not.toThrow()
        })
    })
})

describe('Accessibility Detection', () => {
    let mockMatchMedia: jest.Mock

    beforeEach(() => {
        mockMatchMedia = jest.fn()
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: mockMatchMedia
        })
    })

    afterEach(() => {
        delete (window as any).matchMedia
    })

    describe('isHighContrastMode', () => {
        it('should detect high contrast mode', () => {
            mockMatchMedia.mockReturnValue({ matches: true })

            expect(isHighContrastMode()).toBe(true)
            expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)')
        })

        it('should detect Windows high contrast mode', () => {
            mockMatchMedia
                .mockReturnValueOnce({ matches: false }) // First call for prefers-contrast
                .mockReturnValueOnce({ matches: true })  // Second call for -ms-high-contrast

            expect(isHighContrastMode()).toBe(true)
            expect(mockMatchMedia).toHaveBeenCalledWith('(-ms-high-contrast: active)')
        })

        it('should return false when not in high contrast mode', () => {
            mockMatchMedia.mockReturnValue({ matches: false })

            expect(isHighContrastMode()).toBe(false)
        })

        it('should handle missing matchMedia', () => {
            const originalMatchMedia = window.matchMedia
            delete (window as any).matchMedia

            expect(isHighContrastMode()).toBe(false)

            // Restore
            window.matchMedia = originalMatchMedia
        })
    })

    describe('prefersReducedMotion', () => {
        it('should detect reduced motion preference', () => {
            mockMatchMedia.mockReturnValue({ matches: true })

            expect(prefersReducedMotion()).toBe(true)
            expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
        })

        it('should return false when motion is not reduced', () => {
            mockMatchMedia.mockReturnValue({ matches: false })

            expect(prefersReducedMotion()).toBe(false)
        })

        it('should handle missing matchMedia', () => {
            const originalMatchMedia = window.matchMedia
            delete (window as any).matchMedia

            expect(prefersReducedMotion()).toBe(false)

            // Restore
            window.matchMedia = originalMatchMedia
        })
    })

    describe('isScreenReaderActive', () => {
        it('should detect NVDA screen reader', () => {
            Object.defineProperty(window.navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NVDA/2021.1',
                writable: true
            })

            expect(isScreenReaderActive()).toBe(true)
        })

        it('should detect JAWS screen reader', () => {
            Object.defineProperty(window.navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JAWS/2021',
                writable: true
            })

            expect(isScreenReaderActive()).toBe(true)
        })

        it('should detect speech synthesis activity', () => {
            Object.defineProperty(window, 'speechSynthesis', {
                value: { speaking: true },
                writable: true
            })

            expect(isScreenReaderActive()).toBe(true)
        })

        it('should return false when no screen reader detected', () => {
            Object.defineProperty(window.navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                writable: true
            })

            Object.defineProperty(window, 'speechSynthesis', {
                value: { speaking: false },
                writable: true
            })

            expect(isScreenReaderActive()).toBe(false)
        })
    })
})

describe('Server-side Rendering', () => {
    const originalWindow = global.window

    beforeEach(() => {
        delete (global as any).window
    })

    afterEach(() => {
        global.window = originalWindow
    })

    it('should handle missing window object gracefully', () => {
        expect(() => isHighContrastMode()).not.toThrow()
        expect(() => prefersReducedMotion()).not.toThrow()
        expect(() => isScreenReaderActive()).not.toThrow()

        expect(isHighContrastMode()).toBe(false)
        expect(prefersReducedMotion()).toBe(false)
        expect(isScreenReaderActive()).toBe(false)
    })
})