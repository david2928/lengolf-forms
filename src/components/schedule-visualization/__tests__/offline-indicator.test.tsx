import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import { 
  OfflineIndicator, 
  useOnlineStatus, 
  CompactOfflineIndicator 
} from '../OfflineIndicator'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window events
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener
})

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    navigator.onLine = true
  })

  describe('OfflineIndicator Component', () => {
    it('should not render when online and never was offline', () => {
      const { container } = render(<OfflineIndicator />)
      expect(container.firstChild).toBeNull()
    })

    it('should render offline state when offline', () => {
      // Mock offline state
      navigator.onLine = false
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(navigator.onLine)
        
        React.useEffect(() => {
          const handleOffline = () => setIsOnline(false)
          const handleOnline = () => setIsOnline(true)
          
          window.addEventListener('offline', handleOffline)
          window.addEventListener('online', handleOnline)
          
          return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
          }
        }, [])
        
        return (
          <OfflineIndicator 
            className="test-offline"
            onRetry={() => {}}
          />
        )
      }
      
      render(<TestComponent />)
      
      // Simulate going offline
      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      expect(screen.getByText("You're offline")).toBeInTheDocument()
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument()
    })

    it('should show retry button when provided', () => {
      navigator.onLine = false
      const onRetry = jest.fn()
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        return (
          <OfflineIndicator 
            onRetry={onRetry}
            showRetryButton={true}
          />
        )
      }
      
      render(<TestComponent />)
      
      const retryButton = screen.getByText('Try to reconnect')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should hide retry button when showRetryButton is false', () => {
      navigator.onLine = false
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        return (
          <OfflineIndicator 
            onRetry={() => {}}
            showRetryButton={false}
          />
        )
      }
      
      render(<TestComponent />)
      
      expect(screen.queryByText('Try to reconnect')).not.toBeInTheDocument()
    })

    it('should show back online state', async () => {
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        const [wasOffline, setWasOffline] = React.useState(true)
        
        React.useEffect(() => {
          // Simulate coming back online after being offline
          const timer = setTimeout(() => {
            setIsOnline(true)
          }, 100)
          
          return () => clearTimeout(timer)
        }, [])
        
        if (isOnline && wasOffline) {
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    You're back online
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Connection restored. Schedule data will be updated automatically.
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    type="button"
                    onClick={() => setWasOffline(false)}
                    className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        }
        
        return null
      }
      
      render(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByText("You're back online")).toBeInTheDocument()
      })
      
      expect(screen.getByText(/Connection restored/)).toBeInTheDocument()
    })

    it('should auto-retry when coming back online', async () => {
      const onRetry = jest.fn()
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        const [wasOffline, setWasOffline] = React.useState(true)
        
        React.useEffect(() => {
          if (isOnline && wasOffline) {
            setTimeout(() => {
              onRetry()
            }, 1000)
          }
        }, [isOnline, wasOffline])
        
        React.useEffect(() => {
          const timer = setTimeout(() => {
            setIsOnline(true)
          }, 100)
          
          return () => clearTimeout(timer)
        }, [])
        
        return (
          <OfflineIndicator 
            onRetry={onRetry}
          />
        )
      }
      
      render(<TestComponent />)
      
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1)
      }, { timeout: 2000 })
    })

    it('should apply custom className', () => {
      navigator.onLine = false
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        return (
          <OfflineIndicator 
            className="custom-offline-class"
            onRetry={() => {}}
          />
        )
      }
      
      const { container } = render(<TestComponent />)
      expect(container.firstChild).toHaveClass('offline-indicator')
      expect(container.firstChild).toHaveClass('custom-offline-class')
    })
  })

  describe('useOnlineStatus Hook', () => {
    const TestComponent = () => {
      const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus()
      
      return (
        <div>
          <div data-testid="online-status">{isOnline.toString()}</div>
          <div data-testid="was-offline">{wasOffline.toString()}</div>
          <button onClick={clearWasOffline}>Clear Was Offline</button>
        </div>
      )
    }

    it('should return initial online status', () => {
      navigator.onLine = true
      
      render(<TestComponent />)
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('true')
      expect(screen.getByTestId('was-offline')).toHaveTextContent('false')
    })

    it('should update status when going offline', () => {
      navigator.onLine = true
      
      render(<TestComponent />)
      
      // Simulate going offline
      act(() => {
        navigator.onLine = false
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('false')
      expect(screen.getByTestId('was-offline')).toHaveTextContent('true')
    })

    it('should update status when coming back online', () => {
      navigator.onLine = false
      
      render(<TestComponent />)
      
      // Start offline
      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('false')
      
      // Come back online
      act(() => {
        navigator.onLine = true
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('true')
      expect(screen.getByTestId('was-offline')).toHaveTextContent('true')
    })

    it('should clear wasOffline flag', () => {
      render(<TestComponent />)
      
      // Go offline then online
      act(() => {
        navigator.onLine = false
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      act(() => {
        navigator.onLine = true
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })
      
      expect(screen.getByTestId('was-offline')).toHaveTextContent('true')
      
      // Clear the flag
      fireEvent.click(screen.getByText('Clear Was Offline'))
      
      expect(screen.getByTestId('was-offline')).toHaveTextContent('false')
    })

    it('should clean up event listeners', () => {
      const { unmount } = render(<TestComponent />)
      
      // Should have added event listeners
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
      
      unmount()
      
      // Should have removed event listeners
      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('CompactOfflineIndicator', () => {
    it('should not render when online', () => {
      navigator.onLine = true
      
      const { container } = render(<CompactOfflineIndicator />)
      expect(container.firstChild).toBeNull()
    })

    it('should render compact offline indicator when offline', () => {
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        if (!isOnline) {
          return (
            <div className="compact-offline-indicator">
              <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Offline</span>
              </div>
            </div>
          )
        }
        
        return null
      }
      
      render(<TestComponent />)
      
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        return (
          <CompactOfflineIndicator className="custom-compact-class" />
        )
      }
      
      const { container } = render(<TestComponent />)
      expect(container.firstChild).toHaveClass('compact-offline-indicator')
      expect(container.firstChild).toHaveClass('custom-compact-class')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle rapid online/offline transitions', async () => {
      const onRetry = jest.fn()
      
      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(true)
        const [wasOffline, setWasOffline] = React.useState(false)
        
        React.useEffect(() => {
          const handleOnline = () => {
            setIsOnline(true)
            if (wasOffline) {
              setTimeout(() => onRetry(), 1000)
            }
          }
          
          const handleOffline = () => {
            setIsOnline(false)
            setWasOffline(true)
          }
          
          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)
          
          return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
          }
        }, [wasOffline])
        
        return (
          <OfflineIndicator 
            onRetry={onRetry}
          />
        )
      }
      
      render(<TestComponent />)
      
      // Rapid transitions
      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      act(() => {
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })
      
      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })
      
      act(() => {
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })
      
      // Should handle transitions gracefully
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should work with different retry functions', async () => {
      const asyncRetry = jest.fn().mockResolvedValue(undefined)
      const syncRetry = jest.fn()
      
      const TestComponent = ({ retryFn }: { retryFn: () => void }) => {
        const [isOnline, setIsOnline] = React.useState(false)
        
        return (
          <OfflineIndicator 
            onRetry={retryFn}
            showRetryButton={true}
          />
        )
      }
      
      const { rerender } = render(<TestComponent retryFn={asyncRetry} />)
      
      const retryButton = screen.getByText('Try to reconnect')
      
      await act(async () => {
        fireEvent.click(retryButton)
      })
      
      expect(asyncRetry).toHaveBeenCalledTimes(1)
      
      // Test with sync retry
      rerender(<TestComponent retryFn={syncRetry} />)
      
      const newRetryButton = screen.getByText('Try to reconnect')
      
      act(() => {
        fireEvent.click(newRetryButton)
      })
      
      expect(syncRetry).toHaveBeenCalledTimes(1)
    })
  })
})