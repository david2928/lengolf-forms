/**
 * Tests for useKeyboardNavigation Hook
 */

import { renderHook, act } from '@testing-library/react'
import { useKeyboardNavigation } from '../useKeyboardNavigation'

// Mock the accessibility utilities
const mockGetNextFocusableBlock = jest.fn((currentId, blocks, direction) => {
  if (!blocks.length) return null
  const currentIndex = currentId ? blocks.findIndex(b => b.id === currentId) : -1
  
  switch (direction) {
    case 'next':
      return currentIndex < blocks.length - 1 ? blocks[currentIndex + 1].id : blocks[0].id
    case 'previous':
      return currentIndex > 0 ? blocks[currentIndex - 1].id : blocks[blocks.length - 1].id
    default:
      return blocks[0].id
  }
})

const mockManageFocus = jest.fn()

jest.mock('@/lib/schedule-accessibility', () => ({
  getNextFocusableBlock: mockGetNextFocusableBlock,
  manageFocus: mockManageFocus
}))

// Mock schedule blocks
const mockScheduleBlocks = [
  {
    id: '1',
    staffId: 'staff-1',
    staffName: 'John Doe',
    startTime: '10:00',
    endTime: '12:00',
    duration: 2,
    gridPosition: { dayIndex: 0, startRow: 2, rowSpan: 2 }
  },
  {
    id: '2',
    staffId: 'staff-2',
    staffName: 'Jane Smith',
    startTime: '14:00',
    endTime: '16:00',
    duration: 2,
    gridPosition: { dayIndex: 1, startRow: 4, rowSpan: 2 }
  },
  {
    id: '3',
    staffId: 'staff-3',
    staffName: 'Bob Johnson',
    startTime: '18:00',
    endTime: '20:00',
    duration: 2,
    gridPosition: { dayIndex: 2, startRow: 8, rowSpan: 2 }
  }
]

describe('useKeyboardNavigation', () => {
  let mockOnBlockFocus: jest.Mock
  let mockOnBlockSelect: jest.Mock

  beforeEach(() => {
    mockOnBlockFocus = jest.fn()
    mockOnBlockSelect = jest.fn()
    
    // Mock DOM methods
    document.addEventListener = jest.fn()
    document.removeEventListener = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    expect(result.current.focusedBlockId).toBeNull()
    expect(result.current.isNavigationMode).toBe(false)
    expect(result.current.focusedGridCell).toBeNull()
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.liveRegionRef).toBeDefined()
  })

  it('should register and unregister block refs', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    const mockElement = document.createElement('div')
    
    // Register a block ref
    act(() => {
      result.current.registerBlockRef('1', mockElement)
    })

    // Unregister by passing null
    act(() => {
      result.current.registerBlockRef('1', null)
    })

    // Should not throw errors
    expect(result.current.registerBlockRef).toBeDefined()
  })

  it('should focus a block', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    const mockElement = document.createElement('div')
    
    act(() => {
      result.current.registerBlockRef('1', mockElement)
      result.current.focusBlock('1')
    })

    expect(result.current.focusedBlockId).toBe('1')
    expect(mockOnBlockFocus).toHaveBeenCalledWith(mockScheduleBlocks[0])
  })

  it('should clear focus when focusing null', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.focusBlock('1')
      result.current.focusBlock(null)
    })

    expect(result.current.focusedBlockId).toBeNull()
    expect(mockOnBlockFocus).toHaveBeenLastCalledWith(null)
  })

  it('should enter navigation mode', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.enterNavigationMode()
    })

    expect(result.current.isNavigationMode).toBe(true)
    expect(result.current.focusedBlockId).toBe('1') // Should focus first block
  })

  it('should exit navigation mode', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.enterNavigationMode()
      result.current.exitNavigationMode()
    })

    expect(result.current.isNavigationMode).toBe(false)
    expect(result.current.focusedBlockId).toBeNull()
    expect(mockOnBlockFocus).toHaveBeenLastCalledWith(null)
  })

  it('should navigate between blocks', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.focusBlock('1')
      result.current.navigateBlocks('next')
    })

    expect(result.current.focusedBlockId).toBe('2')
  })

  it('should select current block', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.focusBlock('1')
      result.current.selectCurrentBlock()
    })

    expect(mockOnBlockSelect).toHaveBeenCalledWith(mockScheduleBlocks[0])
  })

  it('should handle keyboard events', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    // Mock keyboard event
    const mockKeyboardEvent = {
      key: 'ArrowRight',
      preventDefault: jest.fn(),
      target: document.body
    } as any

    act(() => {
      result.current.enterNavigationMode()
    })

    // Simulate keyboard event
    const keydownHandler = (document.addEventListener as jest.Mock).mock.calls
      .find(call => call[0] === 'keydown')?.[1]

    if (keydownHandler) {
      act(() => {
        keydownHandler(mockKeyboardEvent)
      })
    }

    expect(mockKeyboardEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle disabled state', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect,
        enabled: false
      })
    )

    // Should not add event listeners when disabled
    expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    unmount()

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should handle schedule blocks changes', () => {
    const { result, rerender } = renderHook(
      ({ scheduleBlocks }) =>
        useKeyboardNavigation({
          scheduleBlocks,
          onBlockFocus: mockOnBlockFocus,
          onBlockSelect: mockOnBlockSelect
        }),
      {
        initialProps: { scheduleBlocks: mockScheduleBlocks }
      }
    )

    act(() => {
      result.current.focusBlock('1')
    })

    expect(result.current.focusedBlockId).toBe('1')

    // Remove the focused block from schedule blocks
    const newScheduleBlocks = mockScheduleBlocks.filter(block => block.id !== '1')
    
    rerender({ scheduleBlocks: newScheduleBlocks })

    // Should clear focus when focused block is removed
    expect(result.current.focusedBlockId).toBeNull()
    expect(mockOnBlockFocus).toHaveBeenLastCalledWith(null)
  })

  it('should handle empty schedule blocks', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: [],
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    act(() => {
      result.current.enterNavigationMode()
    })

    expect(result.current.focusedBlockId).toBeNull()
    expect(result.current.isNavigationMode).toBe(true)
  })

  it('should provide container event handlers', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    expect(result.current.onContainerFocus).toBeDefined()
    expect(result.current.onContainerBlur).toBeDefined()
    expect(typeof result.current.onContainerFocus).toBe('function')
    expect(typeof result.current.onContainerBlur).toBe('function')
  })

  it('should handle container blur correctly', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    const mockBlurEvent = {
      relatedTarget: null
    } as any

    // Mock container ref
    const mockContainer = document.createElement('div')
    mockContainer.contains = jest.fn().mockReturnValue(false)
    
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true
    })

    act(() => {
      result.current.enterNavigationMode()
      result.current.onContainerBlur(mockBlurEvent)
    })

    expect(result.current.isNavigationMode).toBe(false)
  })

  it('should not exit navigation mode if focus stays within container', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        scheduleBlocks: mockScheduleBlocks,
        onBlockFocus: mockOnBlockFocus,
        onBlockSelect: mockOnBlockSelect
      })
    )

    const mockRelatedTarget = document.createElement('div')
    const mockBlurEvent = {
      relatedTarget: mockRelatedTarget
    } as any

    // Mock container ref
    const mockContainer = document.createElement('div')
    mockContainer.contains = jest.fn().mockReturnValue(true) // Focus stays within
    
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true
    })

    act(() => {
      result.current.enterNavigationMode()
      result.current.onContainerBlur(mockBlurEvent)
    })

    expect(result.current.isNavigationMode).toBe(true)
  })
})