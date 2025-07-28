'use client'

import { useState, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className = '',
  disabled = false 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const PULL_THRESHOLD = 80
  const MAX_PULL_DISTANCE = 120

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return
    
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return
    
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return
    
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    if (distance > 0) {
      e.preventDefault()
      const adjustedDistance = Math.min(distance * 0.5, MAX_PULL_DISTANCE)
      setPullDistance(adjustedDistance)
    }
  }, [isPulling, disabled, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return
    
    setIsPulling(false)
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Error during refresh:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled])

  const refreshIndicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const refreshIndicatorScale = Math.min(0.5 + (pullDistance / PULL_THRESHOLD) * 0.5, 1)

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling || isRefreshing ? `translateY(${Math.min(pullDistance, MAX_PULL_DISTANCE)}px)` : 'translateY(0)',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-slate-50"
        style={{
          transform: `translateY(-100%) scale(${refreshIndicatorScale})`,
          opacity: refreshIndicatorOpacity,
          transition: isPulling ? 'none' : 'all 0.3s ease-out'
        }}
      >
        <div className="flex items-center space-x-2 text-slate-600">
          <RefreshCw 
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : pullDistance >= PULL_THRESHOLD 
              ? 'Release to refresh' 
              : 'Pull to refresh'
            }
          </span>
        </div>
      </div>
      
      {children}
    </div>
  )
}