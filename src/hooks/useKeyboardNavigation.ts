/**
 * useKeyboardNavigation Hook
 * Provides keyboard navigation functionality for schedule visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { ProcessedScheduleBlock } from '@/types/schedule-visualization'
import { getNextFocusableBlock, manageFocus } from '@/lib/schedule-accessibility'

interface UseKeyboardNavigationOptions {
  scheduleBlocks: ProcessedScheduleBlock[]
  onBlockFocus?: (block: ProcessedScheduleBlock | null) => void
  onBlockSelect?: (block: ProcessedScheduleBlock) => void
  enabled?: boolean
}

interface KeyboardNavigationState {
  focusedBlockId: string | null
  isNavigationMode: boolean
  focusedGridCell: { day: number; hour: number } | null
}

export function useKeyboardNavigation({
  scheduleBlocks,
  onBlockFocus,
  onBlockSelect,
  enabled = true
}: UseKeyboardNavigationOptions) {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedBlockId: null,
    isNavigationMode: false,
    focusedGridCell: null
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map())
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Register block element refs
  const registerBlockRef = useCallback((blockId: string, element: HTMLElement | null) => {
    if (element) {
      blockRefs.current.set(blockId, element)
    } else {
      blockRefs.current.delete(blockId)
    }
  }, [])

  // Focus a specific block
  const focusBlock = useCallback((blockId: string | null) => {
    if (!blockId) {
      setState(prev => ({ ...prev, focusedBlockId: null }))
      onBlockFocus?.(null)
      return
    }

    const block = scheduleBlocks.find(b => b.id === blockId)
    const element = blockRefs.current.get(blockId)
    
    if (block && element) {
      setState(prev => ({ ...prev, focusedBlockId: blockId }))
      manageFocus(element, { preventScroll: false })
      onBlockFocus?.(block)
      
      // Announce to screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Focused on ${block.staffName} shift from ${block.startTime} to ${block.endTime}`
      }
    }
  }, [scheduleBlocks, onBlockFocus])

  // Navigate to next/previous block
  const navigateBlocks = useCallback((direction: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right') => {
    const nextBlockId = getNextFocusableBlock(state.focusedBlockId, scheduleBlocks, direction)
    if (nextBlockId) {
      focusBlock(nextBlockId)
    }
  }, [state.focusedBlockId, scheduleBlocks, focusBlock])

  // Enter navigation mode
  const enterNavigationMode = useCallback(() => {
    setState(prev => ({ ...prev, isNavigationMode: true }))
    
    // Focus first block if none is focused
    if (!state.focusedBlockId && scheduleBlocks.length > 0) {
      focusBlock(scheduleBlocks[0].id)
    }
    
    // Announce navigation mode
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Navigation mode activated. Use arrow keys to navigate between schedule blocks.'
    }
  }, [state.focusedBlockId, scheduleBlocks, focusBlock])

  // Exit navigation mode
  const exitNavigationMode = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isNavigationMode: false, 
      focusedBlockId: null,
      focusedGridCell: null 
    }))
    onBlockFocus?.(null)
    
    // Return focus to container
    if (containerRef.current) {
      manageFocus(containerRef.current)
    }
    
    // Announce exit
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Navigation mode deactivated'
    }
  }, [onBlockFocus])

  // Select current block
  const selectCurrentBlock = useCallback(() => {
    if (state.focusedBlockId) {
      const block = scheduleBlocks.find(b => b.id === state.focusedBlockId)
      if (block) {
        onBlockSelect?.(block)
        
        // Announce selection
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `Selected ${block.staffName} shift`
        }
      }
    }
  }, [state.focusedBlockId, scheduleBlocks, onBlockSelect])

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't interfere with form inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return
    }

    switch (event.key) {
      case 'Tab':
        // Allow normal tab navigation, but enter navigation mode on focus
        if (!state.isNavigationMode && containerRef.current?.contains(event.target as Node)) {
          enterNavigationMode()
        }
        break

      case 'Escape':
        if (state.isNavigationMode) {
          event.preventDefault()
          exitNavigationMode()
        }
        break

      case 'Enter':
      case ' ':
        if (state.isNavigationMode && state.focusedBlockId) {
          event.preventDefault()
          selectCurrentBlock()
        }
        break

      case 'ArrowUp':
        if (state.isNavigationMode) {
          event.preventDefault()
          navigateBlocks('up')
        }
        break

      case 'ArrowDown':
        if (state.isNavigationMode) {
          event.preventDefault()
          navigateBlocks('down')
        }
        break

      case 'ArrowLeft':
        if (state.isNavigationMode) {
          event.preventDefault()
          navigateBlocks('left')
        }
        break

      case 'ArrowRight':
        if (state.isNavigationMode) {
          event.preventDefault()
          navigateBlocks('right')
        }
        break

      case 'Home':
        if (state.isNavigationMode && scheduleBlocks.length > 0) {
          event.preventDefault()
          focusBlock(scheduleBlocks[0].id)
        }
        break

      case 'End':
        if (state.isNavigationMode && scheduleBlocks.length > 0) {
          event.preventDefault()
          focusBlock(scheduleBlocks[scheduleBlocks.length - 1].id)
        }
        break

      case '?':
        if (state.isNavigationMode) {
          event.preventDefault()
          // Show help
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = 'Keyboard shortcuts: Arrow keys to navigate, Enter or Space to select, Escape to exit, Home/End for first/last block'
          }
        }
        break
    }
  }, [enabled, state, enterNavigationMode, exitNavigationMode, selectCurrentBlock, navigateBlocks, focusBlock, scheduleBlocks])

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])

  // Clean up refs when blocks change
  useEffect(() => {
    const currentBlockIds = new Set(scheduleBlocks.map(block => block.id))
    const refKeys = Array.from(blockRefs.current.keys())
    
    // Remove refs for blocks that no longer exist
    refKeys.forEach(blockId => {
      if (!currentBlockIds.has(blockId)) {
        blockRefs.current.delete(blockId)
      }
    })
    
    // Reset focus if focused block no longer exists
    if (state.focusedBlockId && !currentBlockIds.has(state.focusedBlockId)) {
      setState(prev => ({ ...prev, focusedBlockId: null }))
      onBlockFocus?.(null)
    }
  }, [scheduleBlocks, state.focusedBlockId, onBlockFocus])

  return {
    // State
    focusedBlockId: state.focusedBlockId,
    isNavigationMode: state.isNavigationMode,
    focusedGridCell: state.focusedGridCell,
    
    // Refs
    containerRef,
    liveRegionRef,
    
    // Functions
    registerBlockRef,
    focusBlock,
    navigateBlocks,
    enterNavigationMode,
    exitNavigationMode,
    selectCurrentBlock,
    
    // Event handlers for components
    onContainerFocus: enterNavigationMode,
    onContainerBlur: (event: React.FocusEvent) => {
      // Only exit navigation mode if focus is leaving the container entirely
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        exitNavigationMode()
      }
    }
  }
}

export default useKeyboardNavigation