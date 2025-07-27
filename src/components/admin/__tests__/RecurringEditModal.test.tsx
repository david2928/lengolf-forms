import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecurringEditModal } from '../RecurringEditModal'

describe('RecurringEditModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onEditSingle: jest.fn(),
    onEditSeries: jest.fn(),
    scheduleDate: '2025-07-26',
    staffName: 'John Doe'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when open', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    expect(screen.getByText('Edit Recurring Schedule')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText('Edit this occurrence only')).toBeInTheDocument()
    expect(screen.getByText('Edit entire recurring series')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<RecurringEditModal {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Edit Recurring Schedule')).not.toBeInTheDocument()
  })

  it('allows selecting single edit option', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const singleOption = screen.getByDisplayValue('single')
    fireEvent.click(singleOption)
    
    expect(singleOption).toBeChecked()
  })

  it('allows selecting series edit option', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    expect(seriesOption).toBeChecked()
  })

  it('calls onEditSingle when single option is selected and continue is clicked', async () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const singleOption = screen.getByDisplayValue('single')
    fireEvent.click(singleOption)
    
    const continueButton = screen.getByText('Continue')
    fireEvent.click(continueButton)
    
    await waitFor(() => {
      expect(mockProps.onEditSingle).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onEditSeries when series option is selected and continue is clicked', async () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    const continueButton = screen.getByText('Continue')
    fireEvent.click(continueButton)
    
    await waitFor(() => {
      expect(mockProps.onEditSeries).toHaveBeenCalledTimes(1)
    })
  })

  it('disables continue button when no option is selected', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  it('calls onClose when cancel is clicked', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when X button is clicked', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('shows warning for series edit', () => {
    render(<RecurringEditModal {...mockProps} />)
    
    const seriesOption = screen.getByDisplayValue('series')
    fireEvent.click(seriesOption)
    
    expect(screen.getByText(/Caution:/)).toBeInTheDocument()
    expect(screen.getByText(/This will update all future occurrences/)).toBeInTheDocument()
  })
})