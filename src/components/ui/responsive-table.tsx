'use client'

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
  enableKeyboardNavigation?: boolean
  onCellSelect?: (rowIndex: number, cellIndex: number) => void
}

interface ResponsiveTableContextType {
  selectedCell: { row: number; cell: number } | null
  setSelectedCell: (row: number, cell: number) => void
  keyboardNavEnabled: boolean
}

const ResponsiveTableContext = React.createContext<ResponsiveTableContextType | null>(null)

export function ResponsiveTable({ 
  children, 
  className, 
  enableKeyboardNavigation = false,
  onCellSelect 
}: ResponsiveTableProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; cell: number } | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const checkScrollability = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    )
  }

  useEffect(() => {
    checkScrollability()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollability)
      return () => container.removeEventListener('scroll', checkScrollability)
    }
  }, [])

  useEffect(() => {
    // Check scrollability when content changes
    const resizeObserver = new ResizeObserver(checkScrollability)
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current)
    }
    return () => resizeObserver.disconnect()
  }, [children])

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })
  }

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })
  }

  const handleCellSelect = (row: number, cell: number) => {
    if (enableKeyboardNavigation) {
      setSelectedCell({ row, cell })
      onCellSelect?.(row, cell)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enableKeyboardNavigation || !selectedCell || !tableRef.current) return

    const rows = tableRef.current.querySelectorAll('tr')
    const currentRow = rows[selectedCell.row]
    const cells = currentRow?.querySelectorAll('td, th')
    
    if (!cells) return

    let newRow = selectedCell.row
    let newCell = selectedCell.cell

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        newRow = Math.max(0, selectedCell.row - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        newRow = Math.min(rows.length - 1, selectedCell.row + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        newCell = Math.max(0, selectedCell.cell - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        newCell = Math.min(cells.length - 1, selectedCell.cell + 1)
        break
      case 'Home':
        e.preventDefault()
        newCell = 0
        break
      case 'End':
        e.preventDefault()
        newCell = cells.length - 1
        break
      case 'Escape':
        e.preventDefault()
        setSelectedCell(null)
        return
    }

    if (newRow !== selectedCell.row || newCell !== selectedCell.cell) {
      setSelectedCell({ row: newRow, cell: newCell })
      onCellSelect?.(newRow, newCell)
    }
  }

  return (
    <ResponsiveTableContext.Provider value={{
      selectedCell,
      setSelectedCell: handleCellSelect,
      keyboardNavEnabled: enableKeyboardNavigation
    }}>
      <div className="relative">
        {/* Mobile scroll indicators */}
        <div className="md:hidden flex justify-between items-center mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <MoreHorizontal className="h-3 w-3" />
            <span>Scroll to see more</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable table container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          onScroll={checkScrollability}
        >
          <table
            ref={tableRef}
            className={cn(
              'w-full caption-bottom text-sm',
              'min-w-[640px]', // Ensure minimum width for mobile
              className
            )}
            onKeyDown={handleKeyDown}
            tabIndex={enableKeyboardNavigation ? 0 : undefined}
          >
            {children}
          </table>
        </div>

        {/* Scroll shadows for visual feedback */}
        <div
          className={cn(
            'absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none transition-opacity duration-200',
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          className={cn(
            'absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none transition-opacity duration-200',
            canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    </ResponsiveTableContext.Provider>
  )
}

// Enhanced table components with responsive features
export function ResponsiveTableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b bg-muted/50', className)} {...props} />
  )
}

export function ResponsiveTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y', className)} {...props} />
  )
}

export function ResponsiveTableRow({ 
  className, 
  index,
  ...props 
}: React.HTMLAttributes<HTMLTableRowElement> & { index?: number }) {
  const context = React.useContext(ResponsiveTableContext)
  const isSelected = context?.selectedCell?.row === index

  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        'touch-manipulation', // Optimize for touch devices
        isSelected && context?.keyboardNavEnabled && 'bg-muted',
        className
      )}
      data-state={isSelected ? 'selected' : undefined}
      {...props}
    />
  )
}

export function ResponsiveTableHead({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        'whitespace-nowrap', // Prevent header wrapping on mobile
        'min-w-[100px]', // Ensure minimum touch target size
        className
      )}
      {...props}
    />
  )
}

export function ResponsiveTableCell({ 
  className, 
  index,
  rowIndex,
  colSpan,
  ...props 
}: React.HTMLAttributes<HTMLTableCellElement> & { 
  index?: number; 
  rowIndex?: number;
  colSpan?: number;
}) {
  const context = React.useContext(ResponsiveTableContext)
  const isSelected = context?.selectedCell?.row === rowIndex && context?.selectedCell?.cell === index

  const handleClick = () => {
    if (context?.keyboardNavEnabled && typeof rowIndex === 'number' && typeof index === 'number') {
      context.setSelectedCell(rowIndex, index)
    }
  }

  return (
    <td
      className={cn(
        'p-4 align-middle',
        'min-w-[120px]', // Ensure adequate touch targets
        'whitespace-nowrap md:whitespace-normal', // Handle text wrapping responsively
        context?.keyboardNavEnabled && 'cursor-pointer focus:outline-none focus:bg-muted',
        isSelected && context?.keyboardNavEnabled && 'bg-muted ring-2 ring-primary ring-inset',
        className
      )}
      onClick={handleClick}
      tabIndex={context?.keyboardNavEnabled ? 0 : undefined}
      colSpan={colSpan}
      {...props}
    />
  )
} 