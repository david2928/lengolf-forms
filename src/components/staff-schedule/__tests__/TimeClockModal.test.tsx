import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeClockModal } from '../TimeClockModal'

// Mock the time clock integration hook
jest.mock('@/hooks/useTimeClockIntegration', () => ({
  useTimeClockIntegration: jest.fn(),
}))

const mockUseTimeClockIntegration = require('@/hooks/useTimeClockIntegration').useTimeClockIntegration

describe('TimeClockModal', () => {
  const mockOnClose = jest.fn()
  const mockClockIn = jest.fn()
  const mockClockOut = jest.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    scheduleId: 'schedule-123',
    staffId: 1,
    staffName: 'John Doe',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTimeClockIntegration.mockReturnValue({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      isLoading: false,
      error: null,
      currentStatus: null,
    })
  })

  it('renders correctly when open', () => {
    render(<TimeClockModal {...defaultProps} />)

    expect(screen.getByText('Time Clock')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<TimeClockModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Time Clock')).not.toBeInTheDocument()
  })

  it('shows PIN input form', () => {
    render(<TimeClockModal {...defaultProps} />)

    expect(screen.getByLabelText(/enter your pin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument()
  })

  it('handles clock in action', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '1234')
    await user.click(clockInButton)

    expect(mockClockIn).toHaveBeenCalledWith({
      staffId: 1,
      scheduleId: 'schedule-123',
      pin: '1234',
    })
  })

  it('handles clock out action', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockOutButton = screen.getByRole('button', { name: /clock out/i })

    await user.type(pinInput, '1234')
    await user.click(clockOutButton)

    expect(mockClockOut).toHaveBeenCalledWith({
      staffId: 1,
      scheduleId: 'schedule-123',
      pin: '1234',
    })
  })

  it('validates PIN input', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const clockInButton = screen.getByRole('button', { name: /clock in/i })
    await user.click(clockInButton)

    expect(screen.getByText(/pin is required/i)).toBeInTheDocument()
  })

  it('validates PIN length', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '12')
    await user.click(clockInButton)

    expect(screen.getByText(/pin must be 4 digits/i)).toBeInTheDocument()
  })

  it('shows loading state during clock action', async () => {
    const user = userEvent.setup()
    
    mockUseTimeClockIntegration.mockReturnValue({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      isLoading: true,
      error: null,
      currentStatus: null,
    })

    render(<TimeClockModal {...defaultProps} />)

    expect(screen.getByText(/processing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clock in/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clock out/i })).toBeDisabled()
  })

  it('displays error messages', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      isLoading: false,
      error: 'Invalid PIN',
      currentStatus: null,
    })

    render(<TimeClockModal {...defaultProps} />)

    expect(screen.getByText('Invalid PIN')).toBeInTheDocument()
  })

  it('shows current clock status', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      isLoading: false,
      error: null,
      currentStatus: {
        isClockedIn: true,
        clockInTime: '09:00',
        totalHours: '2.5',
      },
    })

    render(<TimeClockModal {...defaultProps} />)

    expect(screen.getByText(/clocked in at 09:00/i)).toBeInTheDocument()
    expect(screen.getByText(/2.5 hours worked/i)).toBeInTheDocument()
  })

  it('closes modal on successful clock action', async () => {
    const user = userEvent.setup()
    
    mockClockIn.mockResolvedValue({ success: true })
    
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '1234')
    await user.click(clockInButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('clears PIN input after failed attempt', async () => {
    const user = userEvent.setup()
    
    mockClockIn.mockRejectedValue(new Error('Invalid PIN'))
    
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i) as HTMLInputElement
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '1234')
    await user.click(clockInButton)

    await waitFor(() => {
      expect(pinInput.value).toBe('')
    })
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    
    await user.type(pinInput, '1234')
    await user.keyboard('{Enter}')

    expect(mockClockIn).toHaveBeenCalled()
  })

  it('masks PIN input for security', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    
    expect(pinInput).toHaveAttribute('type', 'password')
  })

  it('shows numeric keypad on mobile', () => {
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    
    expect(pinInput).toHaveAttribute('inputMode', 'numeric')
    expect(pinInput).toHaveAttribute('pattern', '[0-9]*')
  })

  it('prevents non-numeric input', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i) as HTMLInputElement
    
    await user.type(pinInput, 'abc123')
    
    expect(pinInput.value).toBe('123')
  })

  it('limits PIN input to 4 digits', async () => {
    const user = userEvent.setup()
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i) as HTMLInputElement
    
    await user.type(pinInput, '123456')
    
    expect(pinInput.value).toBe('1234')
  })

  it('closes modal when backdrop is clicked', async () => {
    render(<TimeClockModal {...defaultProps} />)

    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when escape key is pressed', async () => {
    render(<TimeClockModal {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('focuses PIN input when modal opens', async () => {
    render(<TimeClockModal {...defaultProps} />)

    await waitFor(() => {
      const pinInput = screen.getByLabelText(/enter your pin/i)
      expect(pinInput).toHaveFocus()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<TimeClockModal {...defaultProps} />)

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAttribute('aria-labelledby')
    expect(modal).toHaveAttribute('aria-modal', 'true')

    const pinInput = screen.getByLabelText(/enter your pin/i)
    expect(pinInput).toHaveAttribute('aria-required', 'true')
  })

  it('announces status changes to screen readers', async () => {
    const user = userEvent.setup()
    
    mockClockIn.mockResolvedValue({ success: true })
    
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '1234')
    await user.click(clockInButton)

    await waitFor(() => {
      const statusMessage = screen.getByRole('status')
      expect(statusMessage).toHaveTextContent(/successfully clocked in/i)
    })
  })

  it('shows different button states based on clock status', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      isLoading: false,
      error: null,
      currentStatus: {
        isClockedIn: true,
        clockInTime: '09:00',
      },
    })

    render(<TimeClockModal {...defaultProps} />)

    const clockInButton = screen.getByRole('button', { name: /clock in/i })
    const clockOutButton = screen.getByRole('button', { name: /clock out/i })

    expect(clockInButton).toBeDisabled()
    expect(clockOutButton).not.toBeDisabled()
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockClockIn.mockRejectedValue(new Error('Network error'))
    
    render(<TimeClockModal {...defaultProps} />)

    const pinInput = screen.getByLabelText(/enter your pin/i)
    const clockInButton = screen.getByRole('button', { name: /clock in/i })

    await user.type(pinInput, '1234')
    await user.click(clockInButton)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })
})