import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShiftDetailModal } from '../ShiftDetailModal'

const mockSchedule = {
  schedule_id: 'test-schedule-123',
  staff_name: 'John Doe',
  schedule_date: '2025-07-15',
  start_time: '09:00',
  end_time: '17:00',
  location: 'Main Office',
  notes: 'Regular shift with team meeting at 2 PM',
  team_members: [
    { id: 1, name: 'John Doe', photo: '/photos/john.jpg' },
    { id: 2, name: 'Jane Smith', photo: null },
  ],
}

describe('ShiftDetailModal', () => {
  const mockOnClose = jest.fn()
  const mockOnClockInOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly when open', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.getByText('Shift Details')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
    expect(screen.getByText('Main Office')).toBeInTheDocument()
    expect(screen.getByText('Regular shift with team meeting at 2 PM')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ShiftDetailModal
        isOpen={false}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.queryByText('Shift Details')).not.toBeInTheDocument()
  })

  it('calculates and displays shift duration correctly', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.getByText('8 hours')).toBeInTheDocument()
  })

  it('formats date correctly', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.getByText('Tuesday, July 15, 2025')).toBeInTheDocument()
  })

  it('displays team members with photos', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()

    const johnPhoto = screen.getByAltText('John Doe')
    expect(johnPhoto).toHaveAttribute('src', '/photos/john.jpg')

    // Jane should show initials since no photo
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('shows clock in/out button', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })
    expect(clockButton).toBeInTheDocument()
  })

  it('calls onClockInOut when clock button is clicked', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })
    fireEvent.click(clockButton)

    expect(mockOnClockInOut).toHaveBeenCalled()
  })

  it('closes modal when backdrop is clicked', async () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('closes modal when X button is clicked', async () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles escape key to close modal', async () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('prevents body scroll when modal is open', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(document.body).toHaveStyle('overflow: hidden')
  })

  it('restores body scroll when modal is closed', () => {
    const { rerender } = render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    rerender(
      <ShiftDetailModal
        isOpen={false}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(document.body).not.toHaveStyle('overflow: hidden')
  })

  it('handles schedule without notes', () => {
    const scheduleWithoutNotes = {
      ...mockSchedule,
      notes: null,
    }

    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={scheduleWithoutNotes}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.queryByTestId('shift-notes')).not.toBeInTheDocument()
  })

  it('handles schedule without team members', () => {
    const scheduleWithoutTeam = {
      ...mockSchedule,
      team_members: [],
    }

    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={scheduleWithoutTeam}
        onClockInOut={mockOnClockInOut}
      />
    )

    expect(screen.queryByText('Team Members')).not.toBeInTheDocument()
  })

  it('calculates duration for different time ranges', () => {
    const testCases = [
      { start: '09:00', end: '17:00', expected: '8 hours' },
      { start: '10:30', end: '14:30', expected: '4 hours' },
      { start: '08:00', end: '12:30', expected: '4.5 hours' },
      { start: '13:15', end: '15:45', expected: '2.5 hours' },
    ]

    testCases.forEach(({ start, end, expected }) => {
      const schedule = {
        ...mockSchedule,
        start_time: start,
        end_time: end,
      }

      render(
        <ShiftDetailModal
          isOpen={true}
          onClose={mockOnClose}
          schedule={schedule}
          onClockInOut={mockOnClockInOut}
        />
      )

      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAttribute('aria-labelledby')
    expect(modal).toHaveAttribute('aria-modal', 'true')

    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toHaveAttribute('aria-label')
  })

  it('focuses close button when modal opens', async () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toHaveFocus()
    })
  })

  it('traps focus within modal', () => {
    render(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })

    // Tab should cycle between focusable elements
    fireEvent.keyDown(closeButton, { key: 'Tab' })
    expect(clockButton).toHaveFocus()

    fireEvent.keyDown(clockButton, { key: 'Tab' })
    expect(closeButton).toHaveFocus()
  })

  it('handles animation states correctly', async () => {
    const { rerender } = render(
      <ShiftDetailModal
        isOpen={false}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    rerender(
      <ShiftDetailModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
        onClockInOut={mockOnClockInOut}
      />
    )

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveClass('animate-in') // or appropriate animation class

    // Test closing animation
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(modal).toHaveClass('animate-out') // or appropriate animation class
  })
})