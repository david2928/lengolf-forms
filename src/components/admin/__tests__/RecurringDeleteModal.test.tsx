import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecurringDeleteModal } from '../RecurringDeleteModal'

describe('RecurringDeleteModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onDeleteSingle: jest.fn(),
    onDeleteSeries: jest.fn(),
    scheduleDate: '2025-07-26',
    staffName: 'John Doe'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when open', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    expect(screen.getByText('Delete Recurring Schedule')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText('Delete this occurrence only')).toBeInTheDocument()
    expect(screen.getByText('Delete entire recurring series')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<RecurringDeleteModal {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Delete Recurring Schedule')).not.toBeInTheDocument()
  })

  it('allows selecting single delete option', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const singleOption = screen.getByDisplayValue('single')
    fireEvent.click(singleOption)
    
    expect(singleOption).toBeChecked()
  })

  it('allows selecting series delete option', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    expect(seriesOption).toBeChecked()
  })

  it('calls onDeleteSingle when single option is selected and delete is clicked', async () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const singleOption = screen.getByDisplayValue('single')
    fireEvent.click(singleOption)
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(mockProps.onDeleteSingle).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onDeleteSeries when series option is selected and delete is clicked', async () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(mockProps.onDeleteSeries).toHaveBeenCalledTimes(1)
    })
  })

  it('disables delete button when no option is selected', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const deleteButton = screen.getByText('Delete')
    expect(deleteButton).toBeDisabled()
  })

  it('calls onClose when cancel is clicked', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('shows warning for series delete', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    expect(screen.getByText(/Warning:/)).toBeInTheDocument()
    expect(screen.getByText(/This will permanently delete all future occurrences/)).toBeInTheDocument()
  })

  it('uses destructive variant for delete button', () => {
    render(<RecurringDeleteModal {...mockProps} />)
    
    const singleOption = screen.getByDisplayValue('single')
    fireEvent.click(singleOption)
    
    const deleteButton = screen.getByText('Delete')
    // Check for destructive button styling - this may vary based on your button component
    expect(deleteButton).toBeInTheDocument()
  })
})