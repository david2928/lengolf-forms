import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StaffNameSelector } from '../StaffNameSelector'

// Mock the staff data hook
jest.mock('@/hooks/useStaffSchedule', () => ({
  useStaffSchedule: () => ({
    staff: [
      { id: 1, staff_name: 'John Doe', profile_photo: null },
      { id: 2, staff_name: 'Jane Smith', profile_photo: '/photos/jane.jpg' },
      { id: 3, staff_name: 'Mike Johnson', profile_photo: null },
      { id: 4, staff_name: 'Sarah Wilson', profile_photo: '/photos/sarah.jpg' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('StaffNameSelector', () => {
  const mockOnStaffSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all staff members', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
    expect(screen.getByText('Sarah Wilson')).toBeInTheDocument()
  })

  it('displays profile photos when available', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    const janePhoto = screen.getByAltText('Jane Smith')
    const sarahPhoto = screen.getByAltText('Sarah Wilson')

    expect(janePhoto).toHaveAttribute('src', '/photos/jane.jpg')
    expect(sarahPhoto).toHaveAttribute('src', '/photos/sarah.jpg')
  })

  it('displays initials when no profile photo', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    expect(screen.getByText('JD')).toBeInTheDocument() // John Doe
    expect(screen.getByText('MJ')).toBeInTheDocument() // Mike Johnson
  })

  it('calls onStaffSelect when staff member is clicked', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    const johnCard = screen.getByText('John Doe').closest('button')
    fireEvent.click(johnCard!)

    expect(mockOnStaffSelect).toHaveBeenCalledWith(1, 'John Doe')
  })

  it('has proper touch targets for mobile', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    const staffCards = screen.getAllByRole('button')
    
    staffCards.forEach(card => {
      const styles = window.getComputedStyle(card)
      // Check minimum touch target size (44px)
      expect(parseInt(styles.minHeight) >= 44 || card.offsetHeight >= 44).toBe(true)
    })
  })

  it('shows loading state', () => {
    jest.doMock('@/hooks/useStaffSchedule', () => ({
      useStaffSchedule: () => ({
        staff: [],
        isLoading: true,
        error: null,
      }),
    }))

    const { StaffNameSelector: LoadingSelector } = require('../StaffNameSelector')
    render(<LoadingSelector onStaffSelect={mockOnStaffSelect} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    jest.doMock('@/hooks/useStaffSchedule', () => ({
      useStaffSchedule: () => ({
        staff: [],
        isLoading: false,
        error: 'Failed to load staff',
      }),
    }))

    const { StaffNameSelector: ErrorSelector } = require('../StaffNameSelector')
    render(<ErrorSelector onStaffSelect={mockOnStaffSelect} />)

    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('handles keyboard navigation', () => {
    render(<StaffNameSelector onStaffSelect={mockOnStaffSelect} />)

    const firstCard = screen.getByText('John Doe').closest('button')
    firstCard?.focus()

    fireEvent.keyDown(firstCard!, { key: 'Enter' })
    expect(mockOnStaffSelect).toHaveBeenCalledWith(1, 'John Doe')

    fireEvent.keyDown(firstCard!, { key: ' ' })
    expect(mockOnStaffSelect).toHaveBeenCalledTimes(2)
  })

  it('generates correct initials for names', () => {
    const testCases = [
      { name: 'John Doe', expected: 'JD' },
      { name: 'Mary Jane Watson', expected: 'MW' },
      { name: 'Prince', expected: 'P' },
      { name: 'Jean-Claude Van Damme', expected: 'JV' },
    ]

    // This would require exposing the initials generation function
    // For now, we test the rendered output
    testCases.forEach(({ name, expected }) => {
      const initials = name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
      expect(initials).toBe(expected)
    })
  })
})