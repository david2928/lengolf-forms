import { render, screen, fireEvent, act } from '@testing-library/react'
import { HorizontalDatePicker } from '../HorizontalDatePicker'

// Mock touch events
const mockTouchStart = jest.fn()
const mockTouchMove = jest.fn()
const mockTouchEnd = jest.fn()

// Add touch event support to jsdom
Object.defineProperty(window, 'TouchEvent', {
  value: class TouchEvent extends Event {
    touches: any[]
    changedTouches: any[]
    targetTouches: any[]
    
    constructor(type: string, options: any = {}) {
      super(type, options)
      this.touches = options.touches || []
      this.changedTouches = options.changedTouches || []
      this.targetTouches = options.targetTouches || []
    }
  }
})

describe('HorizontalDatePicker', () => {
  const mockOnDateSelect = jest.fn()
  const mockOnWeekChange = jest.fn()
  
  const defaultProps = {
    selectedDate: new Date('2025-07-15'), // Tuesday
    onDateSelect: mockOnDateSelect,
    onWeekChange: mockOnWeekChange,
    scheduleIndicators: {
      '2025-07-14': 'single' as const,
      '2025-07-15': 'multiple' as const,
      '2025-07-17': 'single' as const,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders 7 days of the week', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    // Should show 7 date buttons
    const dateButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.match(/^\d{1,2}$/)
    )
    expect(dateButtons).toHaveLength(7)
  })

  it('highlights the selected date', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const selectedButton = screen.getByRole('button', { name: /15/ })
    expect(selectedButton).toHaveClass('bg-blue-500') // or whatever selected class
  })

  it('shows current date indicator', () => {
    const today = new Date()
    const props = {
      ...defaultProps,
      selectedDate: today,
    }

    render(<HorizontalDatePicker {...props} />)

    const todayButton = screen.getByRole('button', { 
      name: new RegExp(today.getDate().toString()) 
    })
    expect(todayButton).toHaveClass('ring-2') // or current date indicator class
  })

  it('displays schedule indicators correctly', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    // Check for single shift indicator (small dot)
    const singleIndicators = screen.getAllByTestId('single-indicator')
    expect(singleIndicators).toHaveLength(2) // 14th and 17th

    // Check for multiple shift indicator (larger dot)
    const multipleIndicators = screen.getAllByTestId('multiple-indicator')
    expect(multipleIndicators).toHaveLength(1) // 15th
  })

  it('calls onDateSelect when date is clicked', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const dateButton = screen.getByRole('button', { name: /16/ })
    fireEvent.click(dateButton)

    expect(mockOnDateSelect).toHaveBeenCalledWith(new Date('2025-07-16'))
  })

  it('navigates to previous week with left arrow', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const prevButton = screen.getByRole('button', { name: /previous week/i })
    fireEvent.click(prevButton)

    expect(mockOnWeekChange).toHaveBeenCalledWith(new Date('2025-07-08'))
  })

  it('navigates to next week with right arrow', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const nextButton = screen.getByRole('button', { name: /next week/i })
    fireEvent.click(nextButton)

    expect(mockOnWeekChange).toHaveBeenCalledWith(new Date('2025-07-22'))
  })

  it('handles swipe gestures for week navigation', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const container = screen.getByTestId('date-picker-container')

    // Simulate swipe left (next week)
    fireEvent.touchStart(container, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchEnd(container, {
      changedTouches: [{ clientX: 100, clientY: 100 }]
    })

    expect(mockOnWeekChange).toHaveBeenCalledWith(new Date('2025-07-22'))
  })

  it('handles swipe right for previous week', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const container = screen.getByTestId('date-picker-container')

    // Simulate swipe right (previous week)
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchMove(container, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchEnd(container, {
      changedTouches: [{ clientX: 200, clientY: 100 }]
    })

    expect(mockOnWeekChange).toHaveBeenCalledWith(new Date('2025-07-08'))
  })

  it('ignores small swipe movements', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const container = screen.getByTestId('date-picker-container')

    // Simulate small movement (should not trigger navigation)
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchMove(container, {
      touches: [{ clientX: 120, clientY: 100 }]
    })

    fireEvent.touchEnd(container, {
      changedTouches: [{ clientX: 120, clientY: 100 }]
    })

    expect(mockOnWeekChange).not.toHaveBeenCalled()
  })

  it('displays day abbreviations correctly', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    dayAbbreviations.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('handles month transitions correctly', () => {
    const endOfMonth = new Date('2025-07-31') // Thursday
    const props = {
      ...defaultProps,
      selectedDate: endOfMonth,
    }

    render(<HorizontalDatePicker {...props} />)

    const nextButton = screen.getByRole('button', { name: /next week/i })
    fireEvent.click(nextButton)

    // Should navigate to first week of August
    expect(mockOnWeekChange).toHaveBeenCalledWith(new Date('2025-08-07'))
  })

  it('has proper accessibility attributes', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const dateButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.match(/^\d{1,2}$/)
    )

    dateButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  it('meets minimum touch target size requirements', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const dateButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.match(/^\d{1,2}$/)
    )

    dateButtons.forEach(button => {
      const rect = button.getBoundingClientRect()
      expect(rect.width).toBeGreaterThanOrEqual(44)
      expect(rect.height).toBeGreaterThanOrEqual(44)
    })
  })

  it('handles keyboard navigation', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const dateButton = screen.getByRole('button', { name: /16/ })
    
    fireEvent.keyDown(dateButton, { key: 'Enter' })
    expect(mockOnDateSelect).toHaveBeenCalledWith(new Date('2025-07-16'))

    fireEvent.keyDown(dateButton, { key: ' ' })
    expect(mockOnDateSelect).toHaveBeenCalledTimes(2)
  })

  it('prevents default behavior on touch events', () => {
    render(<HorizontalDatePicker {...defaultProps} />)

    const container = screen.getByTestId('date-picker-container')
    const preventDefault = jest.fn()

    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
      preventDefault,
    })

    expect(preventDefault).toHaveBeenCalled()
  })
})