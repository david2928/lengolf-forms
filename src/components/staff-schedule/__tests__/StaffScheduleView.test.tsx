import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StaffScheduleView } from '../StaffScheduleView'

// Mock the hooks
jest.mock('@/hooks/useStaffScheduleSWR', () => ({
  useStaffScheduleSWR: jest.fn(),
}))

jest.mock('@/hooks/useTimeClockIntegration', () => ({
  useTimeClockIntegration: () => ({
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

const mockUseStaffScheduleSWR = require('@/hooks/useStaffScheduleSWR').useStaffScheduleSWR

const mockScheduleData = [
  {
    schedule_id: 'schedule-1',
    staff_name: 'John Doe',
    schedule_date: '2025-07-15',
    start_time: '09:00',
    end_time: '17:00',
    location: 'Main Office',
    notes: 'Regular shift',
    shift_color: '#06B6D4',
  },
  {
    schedule_id: 'schedule-2',
    staff_name: 'Jane Smith',
    schedule_date: '2025-07-15',
    start_time: '14:00',
    end_time: '22:00',
    location: 'Branch Office',
    notes: 'Evening shift',
    shift_color: '#F59E0B',
  },
]

describe('StaffScheduleView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseStaffScheduleSWR.mockReturnValue({
      data: mockScheduleData,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    })
  })

  it('renders staff name selector initially', () => {
    render(<StaffScheduleView />)
    
    expect(screen.getByText(/select your name/i)).toBeInTheDocument()
  })

  it('shows personal schedule after staff selection', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    // Mock staff selection
    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    expect(screen.getByText("John Doe's Schedule")).toBeInTheDocument()
  })

  it('displays horizontal date picker', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    expect(screen.getByTestId('horizontal-date-picker')).toBeInTheDocument()
  })

  it('shows schedule cards for selected date', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
    expect(screen.getByText('Main Office')).toBeInTheDocument()
  })

  it('switches between personal and team view', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    // Switch to team view
    const everyoneTab = screen.getByText('Everyone')
    await user.click(everyoneTab)

    expect(screen.getByText('Team Schedule')).toBeInTheDocument()
  })

  it('opens shift detail modal when card is tapped', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    const scheduleCard = screen.getByText('09:00 - 17:00').closest('button')
    await user.click(scheduleCard!)

    expect(screen.getByText('Shift Details')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    mockUseStaffScheduleSWR.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
      mutate: jest.fn(),
    })

    render(<StaffScheduleView />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', () => {
    mockUseStaffScheduleSWR.mockReturnValue({
      data: null,
      error: 'Failed to load schedules',
      isLoading: false,
      mutate: jest.fn(),
    })

    render(<StaffScheduleView />)
    
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('shows empty state when no schedules', async () => {
    const user = userEvent.setup()
    
    mockUseStaffScheduleSWR.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    })

    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    expect(screen.getByText(/no shifts scheduled/i)).toBeInTheDocument()
  })

  it('persists selected staff in session storage', async () => {
    const user = userEvent.setup()
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    expect(setItemSpy).toHaveBeenCalledWith('selectedStaff', JSON.stringify({
      id: 1,
      name: 'John Doe'
    }))
  })

  it('restores selected staff from session storage', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
    getItemSpy.mockReturnValue(JSON.stringify({ id: 1, name: 'John Doe' }))
    
    render(<StaffScheduleView />)

    expect(screen.getByText("John Doe's Schedule")).toBeInTheDocument()
  })

  it('handles date navigation', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    const nextWeekButton = screen.getByRole('button', { name: /next week/i })
    await user.click(nextWeekButton)

    // Should trigger new data fetch for next week
    expect(mockUseStaffScheduleSWR).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      })
    )
  })

  it('supports pull-to-refresh on mobile', async () => {
    const user = userEvent.setup()
    const mutateSpy = jest.fn()
    
    mockUseStaffScheduleSWR.mockReturnValue({
      data: mockScheduleData,
      error: null,
      isLoading: false,
      mutate: mutateSpy,
    })

    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    // Simulate pull-to-refresh gesture
    const container = screen.getByTestId('schedule-container')
    fireEvent.touchStart(container, {
      touches: [{ clientY: 100 }]
    })
    fireEvent.touchMove(container, {
      touches: [{ clientY: 200 }]
    })
    fireEvent.touchEnd(container)

    await waitFor(() => {
      expect(mutateSpy).toHaveBeenCalled()
    })
  })

  it('handles offline state gracefully', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    mockUseStaffScheduleSWR.mockReturnValue({
      data: mockScheduleData,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    })

    render(<StaffScheduleView />)
    
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it('maintains selected date when switching views', async () => {
    const user = userEvent.setup()
    render(<StaffScheduleView />)

    const johnCard = screen.getByText('John Doe')
    await user.click(johnCard)

    // Select a different date
    const dateButton = screen.getByRole('button', { name: /16/ })
    await user.click(dateButton)

    // Switch to team view
    const everyoneTab = screen.getByText('Everyone')
    await user.click(everyoneTab)

    // Switch back to personal view
    const onlyMeTab = screen.getByText('Only me')
    await user.click(onlyMeTab)

    // Date should still be selected
    expect(dateButton).toHaveClass('selected') // or appropriate selected class
  })
})