import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleForm } from '../ScheduleForm'

const mockStaffList = [
  { id: 1, staff_name: 'John Doe', is_active: true },
  { id: 2, staff_name: 'Jane Smith', is_active: true },
  { id: 3, staff_name: 'Mike Johnson', is_active: true },
  { id: 4, staff_name: 'Sarah Wilson', is_active: false },
]

describe('ScheduleForm', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    staffList: mockStaffList,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('renders form in create mode', () => {
      render(<ScheduleForm {...defaultProps} />)

      expect(screen.getByText('Add New Schedule')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create schedule/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('shows all form fields', () => {
      render(<ScheduleForm {...defaultProps} />)

      expect(screen.getByLabelText(/staff member/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('shows only active staff members in dropdown', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const staffSelect = screen.getByLabelText(/staff member/i)
      await user.click(staffSelect)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Sarah Wilson')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    const existingSchedule = {
      id: 'schedule-123',
      staff_id: 1,
      schedule_date: '2025-07-15',
      start_time: '09:00',
      end_time: '17:00',
      location: 'Main Office',
      notes: 'Regular shift',
    }

    it('renders form in edit mode', () => {
      render(<ScheduleForm {...defaultProps} schedule={existingSchedule} />)

      expect(screen.getByText('Edit Schedule')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update schedule/i })).toBeInTheDocument()
    })

    it('pre-populates form with existing data', () => {
      render(<ScheduleForm {...defaultProps} schedule={existingSchedule} />)

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2025-07-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Main Office')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Regular shift')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/staff member is required/i)).toBeInTheDocument()
      expect(screen.getByText(/date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/start time is required/i)).toBeInTheDocument()
      expect(screen.getByText(/end time is required/i)).toBeInTheDocument()
      expect(screen.getByText(/location is required/i)).toBeInTheDocument()
    })

    it('validates time range', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '17:00')
      await user.type(screen.getByLabelText(/end time/i), '09:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument()
    })

    it('validates date is not in the past', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), pastDate)
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '17:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/date cannot be in the past/i)).toBeInTheDocument()
    })

    it('validates business hours', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '05:00')
      await user.type(screen.getByLabelText(/end time/i), '06:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/schedule must be within business hours/i)).toBeInTheDocument()
    })

    it('validates minimum shift duration', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '09:30')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/minimum shift duration is 1 hour/i)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '17:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')
      await user.type(screen.getByLabelText(/notes/i), 'Regular shift')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        staff_id: 1,
        schedule_date: '2025-07-15',
        start_time: '09:00',
        end_time: '17:00',
        location: 'Main Office',
        notes: 'Regular shift',
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock slow submission
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '17:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/creating/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('handles submission errors', async () => {
      const user = userEvent.setup()
      
      mockOnSave.mockRejectedValue(new Error('Schedule conflict detected'))
      
      render(<ScheduleForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '17:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/schedule conflict detected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Recurring Schedule Options', () => {
    it('shows recurring schedule checkbox', () => {
      render(<ScheduleForm {...defaultProps} />)

      expect(screen.getByLabelText(/create recurring schedule/i)).toBeInTheDocument()
    })

    it('shows recurring options when checkbox is checked', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const recurringCheckbox = screen.getByLabelText(/create recurring schedule/i)
      await user.click(recurringCheckbox)

      expect(screen.getByLabelText(/repeat every/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    })

    it('validates recurring schedule end date', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const recurringCheckbox = screen.getByLabelText(/create recurring schedule/i)
      await user.click(recurringCheckbox)

      await user.selectOptions(screen.getByLabelText(/staff member/i), '1')
      await user.type(screen.getByLabelText(/date/i), '2025-07-15')
      await user.type(screen.getByLabelText(/end date/i), '2025-07-10') // Before start date
      await user.type(screen.getByLabelText(/start time/i), '09:00')
      await user.type(screen.getByLabelText(/end time/i), '17:00')
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('shows confirmation dialog when form has changes', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      // Make changes to form
      await user.type(screen.getByLabelText(/location/i), 'Main Office')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ScheduleForm {...defaultProps} />)

      const requiredFields = ['staff member', 'date', 'start time', 'end time', 'location']
      
      requiredFields.forEach(field => {
        const input = screen.getByLabelText(new RegExp(field, 'i'))
        expect(input).toHaveAttribute('required')
      })
    })

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      const staffInput = screen.getByLabelText(/staff member/i)
      const errorMessage = screen.getByText(/staff member is required/i)
      
      expect(staffInput).toHaveAttribute('aria-describedby')
      expect(errorMessage).toHaveAttribute('id')
    })

    it('manages focus correctly', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create schedule/i })
      await user.click(submitButton)

      // First field with error should receive focus
      const staffInput = screen.getByLabelText(/staff member/i)
      expect(staffInput).toHaveFocus()
    })
  })

  describe('Time Input Helpers', () => {
    it('provides time suggestions', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const startTimeInput = screen.getByLabelText(/start time/i)
      await user.click(startTimeInput)

      // Should show common time options
      expect(screen.getByText('09:00')).toBeInTheDocument()
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('14:00')).toBeInTheDocument()
    })

    it('auto-suggests end time based on start time', async () => {
      const user = userEvent.setup()
      render(<ScheduleForm {...defaultProps} />)

      const startTimeInput = screen.getByLabelText(/start time/i)
      await user.type(startTimeInput, '09:00')

      const endTimeInput = screen.getByLabelText(/end time/i)
      expect(endTimeInput).toHaveValue('17:00') // Default 8-hour shift
    })
  })
})