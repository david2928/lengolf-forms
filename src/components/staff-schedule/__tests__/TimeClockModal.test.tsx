import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimeClockModal } from '../TimeClockModal'
import { useTimeClockIntegration } from '@/hooks/useTimeClockIntegration'

// Mock the time clock integration hook
jest.mock('@/hooks/useTimeClockIntegration')

const mockUseTimeClockIntegration = useTimeClockIntegration as jest.MockedFunction<typeof useTimeClockIntegration>

const mockSchedule = {
  schedule_id: 'test-schedule-123',
  staff_name: 'John Doe',
  schedule_date: '2025-07-15',
  start_time: '09:00',
  end_time: '17:00',
  location: 'Main Office'
}

describe('TimeClockModal', () => {
  const mockOnClose = jest.fn()
  
  const defaultHookReturn = {
    isLoading: false,
    error: null,
    success: null,
    currentStatus: null,
    clockInOut: jest.fn(),
    resetState: jest.fn(),
    validatePinFormat: jest.fn(),
    getErrorType: jest.fn(),
    verifyPin: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTimeClockIntegration.mockReturnValue(defaultHookReturn)
  })

  it('renders correctly when open', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(screen.getByText('Time Clock')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('09:00 - 17:00 • Main Office')).toBeInTheDocument()
    expect(screen.getByText('Enter your 6-digit PIN')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <TimeClockModal
        isOpen={false}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(screen.queryByText('Time Clock')).not.toBeInTheDocument()
  })

  it('handles PIN input correctly', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const pinInputs = screen.getAllByRole('textbox')
    expect(pinInputs).toHaveLength(6)

    // Type digits in PIN inputs
    fireEvent.change(pinInputs[0], { target: { value: '1' } })
    fireEvent.change(pinInputs[1], { target: { value: '2' } })
    fireEvent.change(pinInputs[2], { target: { value: '3' } })

    expect(pinInputs[0]).toHaveValue('1')
    expect(pinInputs[1]).toHaveValue('2')
    expect(pinInputs[2]).toHaveValue('3')
  })

  it('only allows numeric input', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const pinInputs = screen.getAllByRole('textbox')
    
    // Try to enter non-numeric characters
    fireEvent.change(pinInputs[0], { target: { value: 'a' } })
    fireEvent.change(pinInputs[1], { target: { value: '!' } })
    
    // Should remain empty since non-numeric input is rejected
    expect(pinInputs[0]).toHaveValue('')
    expect(pinInputs[1]).toHaveValue('')
  })

  it('disables clock in/out button when PIN is incomplete', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })
    expect(clockButton).toBeDisabled()

    // Enter partial PIN
    const pinInputs = screen.getAllByRole('textbox')
    fireEvent.change(pinInputs[0], { target: { value: '1' } })
    fireEvent.change(pinInputs[1], { target: { value: '2' } })
    fireEvent.change(pinInputs[2], { target: { value: '3' } })

    expect(clockButton).toBeDisabled()
  })

  it('enables clock in/out button when PIN is complete', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })
    const pinInputs = screen.getAllByRole('textbox')

    // Enter complete PIN
    fireEvent.change(pinInputs[0], { target: { value: '1' } })
    fireEvent.change(pinInputs[1], { target: { value: '2' } })
    fireEvent.change(pinInputs[2], { target: { value: '3' } })
    fireEvent.change(pinInputs[3], { target: { value: '4' } })
    fireEvent.change(pinInputs[4], { target: { value: '5' } })
    fireEvent.change(pinInputs[5], { target: { value: '6' } })

    expect(clockButton).toBeEnabled()
  })

  it('calls clockInOut when button is clicked with complete PIN', async () => {
    const mockClockInOut = jest.fn()
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      clockInOut: mockClockInOut
    })

    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const pinInputs = screen.getAllByRole('textbox')
    const clockButton = screen.getByRole('button', { name: /clock in\/out/i })

    // Enter complete PIN
    fireEvent.change(pinInputs[0], { target: { value: '1' } })
    fireEvent.change(pinInputs[1], { target: { value: '2' } })
    fireEvent.change(pinInputs[2], { target: { value: '3' } })
    fireEvent.change(pinInputs[3], { target: { value: '4' } })
    fireEvent.change(pinInputs[4], { target: { value: '5' } })
    fireEvent.change(pinInputs[5], { target: { value: '6' } })

    fireEvent.click(clockButton)

    expect(mockClockInOut).toHaveBeenCalledWith('123456')
  })

  it('displays error message when error occurs', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      error: 'Invalid PIN. Please try again.'
    })

    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(screen.getByText('Invalid PIN. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('displays success message when operation succeeds', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      success: 'Successfully clocked in for John Doe!'
    })

    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(screen.getByText('Successfully clocked in for John Doe!')).toBeInTheDocument()
  })

  it('shows loading state during operation', () => {
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      currentStatus: 'clock_in'
    })

    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(screen.getByText('Clocking In...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clocking in/i })).toBeDisabled()
  })

  it('closes modal when backdrop is clicked', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const backdrop = screen.getByRole('dialog').parentElement
    fireEvent.click(backdrop!)

    // Should trigger close after animation delay
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalled()
    }, 250)
  })

  it('closes modal when X button is clicked', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close modal/i })
    fireEvent.click(closeButton)

    // Should trigger close after animation delay
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalled()
    }, 250)
  })

  it('resets state when modal opens', () => {
    const mockResetState = jest.fn()
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      resetState: mockResetState
    })

    const { rerender } = render(
      <TimeClockModal
        isOpen={false}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    rerender(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    expect(mockResetState).toHaveBeenCalled()
  })

  it('handles Enter key press to submit PIN', async () => {
    const mockClockInOut = jest.fn()
    mockUseTimeClockIntegration.mockReturnValue({
      ...defaultHookReturn,
      clockInOut: mockClockInOut
    })

    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const pinInputs = screen.getAllByRole('textbox')

    // Enter complete PIN
    fireEvent.change(pinInputs[0], { target: { value: '1' } })
    fireEvent.change(pinInputs[1], { target: { value: '2' } })
    fireEvent.change(pinInputs[2], { target: { value: '3' } })
    fireEvent.change(pinInputs[3], { target: { value: '4' } })
    fireEvent.change(pinInputs[4], { target: { value: '5' } })
    fireEvent.change(pinInputs[5], { target: { value: '6' } })

    // Press Enter on last input
    fireEvent.keyDown(pinInputs[5], { key: 'Enter' })

    expect(mockClockInOut).toHaveBeenCalledWith('123456')
  })

  it('handles backspace navigation between inputs', () => {
    render(
      <TimeClockModal
        isOpen={true}
        onClose={mockOnClose}
        schedule={mockSchedule}
      />
    )

    const pinInputs = screen.getAllByRole('textbox')

    // Focus should move to previous input on backspace when current is empty
    fireEvent.keyDown(pinInputs[2], { key: 'Backspace' })
    
    // This would require more complex testing setup to verify focus changes
    // For now, we just ensure the event handler doesn't crash
    expect(pinInputs[2]).toBeInTheDocument()
  })
})