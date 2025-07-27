/**
 * Tests for Responsive Design utilities
 */

import {
  BREAKPOINTS,
  RESPONSIVE_CONFIGS,
  getCurrentBreakpoint,
  getResponsiveConfig,
  createMediaQuery,
  useMediaQuery,
  generateResponsiveClasses,
  isTouchDevice,
  getViewportDimensions,
  getScaledFontSize
} from '../responsive-design'

describe('Responsive Design Utilities', () => {
  describe('getCurrentBreakpoint', () => {
    it('should return correct breakpoint for mobile', () => {
      expect(getCurrentBreakpoint(320)).toBe('mobile')
      expect(getCurrentBreakpoint(767)).toBe('mobile')
    })

    it('should return correct breakpoint for tablet', () => {
      expect(getCurrentBreakpoint(768)).toBe('tablet')
      expect(getCurrentBreakpoint(1023)).toBe('tablet')
    })

    it('should return correct breakpoint for desktop', () => {
      expect(getCurrentBreakpoint(1024)).toBe('desktop')
      expect(getCurrentBreakpoint(1439)).toBe('desktop')
    })

    it('should return correct breakpoint for wide', () => {
      expect(getCurrentBreakpoint(1440)).toBe('wide')
      expect(getCurrentBreakpoint(1920)).toBe('wide')
    })
  })

  describe('getResponsiveConfig', () => {
    it('should return mobile config for small screens', () => {
      const config = getResponsiveConfig(320)
      expect(config.breakpoint).toBe('mobile')
      expect(config.compactMode).toBe(true)
      expect(config.scrollable).toBe(true)
      expect(config.showMinutes).toBe(false)
    })

    it('should return tablet config for medium screens', () => {
      const config = getResponsiveConfig(800)
      expect(config.breakpoint).toBe('tablet')
      expect(config.compactMode).toBe(false)
      expect(config.scrollable).toBe(true)
      expect(config.showMinutes).toBe(true)
    })

    it('should return desktop config for large screens', () => {
      const config = getResponsiveConfig(1200)
      expect(config.breakpoint).toBe('desktop')
      expect(config.compactMode).toBe(false)
      expect(config.scrollable).toBe(false)
      expect(config.showMinutes).toBe(true)
    })

    it('should return wide config for extra large screens', () => {
      const config = getResponsiveConfig(1600)
      expect(config.breakpoint).toBe('wide')
      expect(config.compactMode).toBe(false)
      expect(config.scrollable).toBe(false)
      expect(config.showMinutes).toBe(true)
    })
  })

  describe('createMediaQuery', () => {
    it('should create correct media queries', () => {
      expect(createMediaQuery('mobile')).toBe('(min-width: 0px)')
      expect(createMediaQuery('tablet')).toBe('(min-width: 768px)')
      expect(createMediaQuery('desktop')).toBe('(min-width: 1024px)')
      expect(createMediaQuery('wide')).toBe('(min-width: 1440px)')
    })
  })

  describe('useMediaQuery', () => {
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

    it('should return true when media query matches', () => {
      mockMatchMedia.mockReturnValue({ matches: true })
      
      expect(useMediaQuery('(min-width: 768px)')).toBe(true)
      expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 768px)')
    })

    it('should return false when media query does not match', () => {
      mockMatchMedia.mockReturnValue({ matches: false })
      
      expect(useMediaQuery('(min-width: 768px)')).toBe(false)
    })

    it('should handle missing matchMedia gracefully', () => {
      delete (window as any).matchMedia
      
      expect(useMediaQuery('(min-width: 768px)')).toBe(false)
    })

    it('should handle matchMedia errors gracefully', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia error')
      })
      
      expect(useMediaQuery('(min-width: 768px)')).toBe(false)
    })
  })

  describe('generateResponsiveClasses', () => {
    it('should generate responsive classes correctly', () => {
      const result = generateResponsiveClasses('base-class', {
        mobile: 'text-sm',
        tablet: 'text-base',
        desktop: 'text-lg'
      })

      expect(result).toBe('base-class text-sm tablet:text-base desktop:text-lg')
    })

    it('should handle empty responsive classes', () => {
      const result = generateResponsiveClasses('base-class', {})
      expect(result).toBe('base-class')
    })

    it('should handle undefined responsive classes', () => {
      const result = generateResponsiveClasses('base-class', {
        mobile: 'text-sm',
        tablet: undefined,
        desktop: 'text-lg'
      })

      expect(result).toBe('base-class text-sm desktop:text-lg')
    })

    it('should handle multiple classes per breakpoint', () => {
      const result = generateResponsiveClasses('base', {
        mobile: 'text-sm p-2',
        desktop: 'text-lg p-4'
      })

      expect(result).toBe('base text-sm p-2 desktop:text-lg desktop:p-4')
    })
  })

  describe('isTouchDevice', () => {
    const originalWindow = global.window

    beforeEach(() => {
      // Reset window object
      Object.defineProperty(global, 'window', {
        value: {
          ...originalWindow,
          navigator: {
            ...originalWindow?.navigator,
            maxTouchPoints: 0
          }
        },
        writable: true
      })
    })

    afterEach(() => {
      global.window = originalWindow
    })

    it('should detect touch device via ontouchstart', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        writable: true
      })

      expect(isTouchDevice()).toBe(true)
    })

    it('should detect touch device via maxTouchPoints', () => {
      Object.defineProperty(global.window, 'navigator', {
        value: {
          ...global.window.navigator,
          maxTouchPoints: 1
        },
        writable: true
      })

      expect(isTouchDevice()).toBe(true)
    })

    it('should return false for non-touch devices', () => {
      expect(isTouchDevice()).toBe(false)
    })

    it('should handle missing window gracefully', () => {
      const originalWindow = global.window
      delete (global as any).window

      expect(isTouchDevice()).toBe(false)

      global.window = originalWindow
    })
  })

  describe('getViewportDimensions', () => {
    it('should return current viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true
      })

      const dimensions = getViewportDimensions()
      expect(dimensions).toEqual({ width: 1024, height: 768 })
    })

    it('should return default dimensions when window is undefined', () => {
      const originalWindow = global.window
      delete (global as any).window

      const dimensions = getViewportDimensions()
      expect(dimensions).toEqual({ width: 1024, height: 768 })

      global.window = originalWindow
    })
  })

  describe('getScaledFontSize', () => {
    it('should scale font size correctly for different breakpoints', () => {
      expect(getScaledFontSize(1, 'mobile')).toBe('0.8rem')
      expect(getScaledFontSize(1, 'tablet')).toBe('0.9rem')
      expect(getScaledFontSize(1, 'desktop')).toBe('1rem')
      expect(getScaledFontSize(1, 'wide')).toBe('1.1rem')
    })

    it('should handle different base font sizes', () => {
      expect(getScaledFontSize(1.5, 'mobile')).toBe('1.2rem')
      expect(getScaledFontSize(0.875, 'desktop')).toBe('0.875rem')
    })
  })

  describe('RESPONSIVE_CONFIGS', () => {
    it('should have all required breakpoints', () => {
      expect(RESPONSIVE_CONFIGS).toHaveProperty('mobile')
      expect(RESPONSIVE_CONFIGS).toHaveProperty('tablet')
      expect(RESPONSIVE_CONFIGS).toHaveProperty('desktop')
      expect(RESPONSIVE_CONFIGS).toHaveProperty('wide')
    })

    it('should have consistent config structure', () => {
      Object.values(RESPONSIVE_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('breakpoint')
        expect(config).toHaveProperty('gridColumns')
        expect(config).toHaveProperty('timeSlotHeight')
        expect(config).toHaveProperty('fontSize')
        expect(config).toHaveProperty('blockPadding')
        expect(config).toHaveProperty('showMinutes')
        expect(config).toHaveProperty('showLocation')
        expect(config).toHaveProperty('headerHeight')
        expect(config).toHaveProperty('scrollable')
        expect(config).toHaveProperty('compactMode')
      })
    })

    it('should have increasing time slot heights', () => {
      expect(RESPONSIVE_CONFIGS.mobile.timeSlotHeight).toBeLessThan(
        RESPONSIVE_CONFIGS.tablet.timeSlotHeight
      )
      expect(RESPONSIVE_CONFIGS.tablet.timeSlotHeight).toBeLessThanOrEqual(
        RESPONSIVE_CONFIGS.desktop.timeSlotHeight
      )
      expect(RESPONSIVE_CONFIGS.desktop.timeSlotHeight).toBeLessThanOrEqual(
        RESPONSIVE_CONFIGS.wide.timeSlotHeight
      )
    })

    it('should have appropriate scrollable settings', () => {
      expect(RESPONSIVE_CONFIGS.mobile.scrollable).toBe(true)
      expect(RESPONSIVE_CONFIGS.tablet.scrollable).toBe(true)
      expect(RESPONSIVE_CONFIGS.desktop.scrollable).toBe(false)
      expect(RESPONSIVE_CONFIGS.wide.scrollable).toBe(false)
    })
  })

  describe('BREAKPOINTS', () => {
    it('should have correct breakpoint values', () => {
      expect(BREAKPOINTS.mobile).toBe(0)
      expect(BREAKPOINTS.tablet).toBe(768)
      expect(BREAKPOINTS.desktop).toBe(1024)
      expect(BREAKPOINTS.wide).toBe(1440)
    })

    it('should have ascending breakpoint values', () => {
      const values = Object.values(BREAKPOINTS)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
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
    expect(() => useMediaQuery('(min-width: 768px)')).not.toThrow()
    expect(() => isTouchDevice()).not.toThrow()
    expect(() => getViewportDimensions()).not.toThrow()

    expect(useMediaQuery('(min-width: 768px)')).toBe(false)
    expect(isTouchDevice()).toBe(false)
    expect(getViewportDimensions()).toEqual({ width: 1024, height: 768 })
  })
})