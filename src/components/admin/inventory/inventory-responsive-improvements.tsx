'use client'

import { useEffect, useState } from 'react'

// Hook to detect screen size for responsive behavior
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      })
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return screenSize
}

// Enhanced card grid that adjusts based on screen size
export function ResponsiveCardGrid({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const { isMobile, isTablet } = useScreenSize()
  
  const gridClasses = isMobile 
    ? 'grid gap-3 grid-cols-1' 
    : isTablet 
    ? 'grid gap-4 grid-cols-2' 
    : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
  
  return (
    <div className={`${gridClasses} ${className}`}>
      {children}
    </div>
  )
}

// Touch-friendly button wrapper
export function TouchFriendlyButton({ 
  children, 
  className = '',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  children: React.ReactNode 
}) {
  return (
    <button
      className={`min-h-[44px] min-w-[44px] touch-manipulation ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Accessibility helpers
export const accessibilityProps = {
  searchInput: {
    'aria-label': 'Search products by name',
    'role': 'searchbox',
    'aria-expanded': false
  },
  categorySelect: {
    'aria-label': 'Filter by category',
    'role': 'combobox'
  },
  clearFilters: {
    'aria-label': 'Clear all filters'
  },
  productCard: {
    'role': 'article',
    'tabIndex': 0
  },
  statusBadge: {
    'role': 'status',
    'aria-live': 'polite'
  },
  editButton: {
    'aria-label': 'Edit product details'
  },
  purchaseButton: {
    'aria-label': 'View purchase information'
  },
  trendButton: {
    'aria-label': 'View usage trends'
  }
}

// Modal sizing utilities
export function getModalMaxWidth(screenWidth: number): string {
  if (screenWidth < 640) return 'max-w-[95vw]'  // Mobile
  if (screenWidth < 768) return 'max-w-[90vw]'  // Small tablet
  if (screenWidth < 1024) return 'max-w-[80vw]' // Tablet
  return 'max-w-[700px]' // Desktop
}

// Performance optimization for large lists
export function useVirtualizedList<T>(
  items: T[], 
  itemHeight: number, 
  containerHeight: number
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })
  
  useEffect(() => {
    const itemsPerPage = Math.ceil(containerHeight / itemHeight)
    const buffer = Math.floor(itemsPerPage / 2)
    
    setVisibleRange(prevRange => ({
      start: Math.max(0, prevRange.start - buffer),
      end: Math.min(items.length, prevRange.start + itemsPerPage + buffer)
    }))
  }, [items.length, itemHeight, containerHeight])
  
  return {
    visibleItems: items.slice(visibleRange.start, visibleRange.end),
    startIndex: visibleRange.start,
    endIndex: visibleRange.end
  }
} 