'use client';

import { useCallback, useRef, useEffect } from 'react';

export interface SwipeConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventDefaultTouchmove?: boolean;
  passive?: boolean;
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (event: TouchEvent | MouseEvent) => void;
  onSwipeMove?: (event: TouchEvent | MouseEvent) => void;
  onSwipeEnd?: (event: TouchEvent | MouseEvent) => void;
}

export interface SwipeState {
  isTracking: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export const useCategorySwipes = (
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) => {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventDefaultTouchmove = true,
    passive = false
  } = config;

  const swipeStateRef = useRef<SwipeState>({
    isTracking: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    direction: null,
    distance: 0
  });

  // Get touch/mouse coordinates
  const getEventCoords = useCallback((event: TouchEvent | MouseEvent) => {
    if ('touches' in event) {
      return {
        x: event.touches[0]?.clientX || 0,
        y: event.touches[0]?.clientY || 0
      };
    }
    return {
      x: event.clientX,
      y: event.clientY
    };
  }, []);

  // Handle swipe start
  const handleSwipeStart = useCallback((event: TouchEvent | MouseEvent) => {
    const coords = getEventCoords(event);
    
    swipeStateRef.current = {
      isTracking: true,
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
      startTime: Date.now(),
      direction: null,
      distance: 0
    };

    handlers.onSwipeStart?.(event);
  }, [getEventCoords, handlers]);

  // Handle swipe move
  const handleSwipeMove = useCallback((event: TouchEvent | MouseEvent) => {
    if (!swipeStateRef.current.isTracking) return;

    const coords = getEventCoords(event);
    const deltaX = coords.x - swipeStateRef.current.startX;
    const deltaY = coords.y - swipeStateRef.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    swipeStateRef.current.currentX = coords.x;
    swipeStateRef.current.currentY = coords.y;
    swipeStateRef.current.distance = distance;

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      swipeStateRef.current.direction = deltaX > 0 ? 'right' : 'left';
    } else {
      swipeStateRef.current.direction = deltaY > 0 ? 'down' : 'up';
    }

    // Prevent default if configured and we're in a horizontal swipe
    if (preventDefaultTouchmove && Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    handlers.onSwipeMove?.(event);
  }, [getEventCoords, preventDefaultTouchmove, handlers]);

  // Handle swipe end
  const handleSwipeEnd = useCallback((event: TouchEvent | MouseEvent) => {
    if (!swipeStateRef.current.isTracking) return;

    const swipeTime = Date.now() - swipeStateRef.current.startTime;
    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const deltaY = swipeStateRef.current.currentY - swipeStateRef.current.startY;
    const distance = swipeStateRef.current.distance;

    // Check if swipe meets criteria
    const isValidSwipe = distance >= minSwipeDistance && swipeTime <= maxSwipeTime;

    if (isValidSwipe) {
      const direction = swipeStateRef.current.direction;
      
      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.();
          break;
        case 'right':
          handlers.onSwipeRight?.();
          break;
        case 'up':
          handlers.onSwipeUp?.();
          break;
        case 'down':
          handlers.onSwipeDown?.();
          break;
      }
    }

    // Reset state
    swipeStateRef.current.isTracking = false;
    handlers.onSwipeEnd?.(event);
  }, [minSwipeDistance, maxSwipeTime, handlers]);

  // Touch event handlers
  const touchHandlers = {
    onTouchStart: handleSwipeStart,
    onTouchMove: handleSwipeMove,
    onTouchEnd: handleSwipeEnd,
    onTouchCancel: handleSwipeEnd
  };

  // Mouse event handlers (for testing on desktop)
  const mouseHandlers = {
    onMouseDown: handleSwipeStart,
    onMouseMove: (event: MouseEvent) => {
      if (swipeStateRef.current.isTracking) {
        handleSwipeMove(event);
      }
    },
    onMouseUp: handleSwipeEnd,
    onMouseLeave: (event: MouseEvent) => {
      if (swipeStateRef.current.isTracking) {
        handleSwipeEnd(event);
      }
    }
  };

  // Combined handlers for convenience
  const swipeHandlers = {
    ...touchHandlers,
    ...mouseHandlers
  };

  // Get current swipe state (read-only)
  const getCurrentSwipeState = useCallback((): Readonly<SwipeState> => {
    return { ...swipeStateRef.current };
  }, []);

  // Check if currently swiping
  const isCurrentlySwiping = useCallback((): boolean => {
    return swipeStateRef.current.isTracking;
  }, []);

  // Cancel current swipe
  const cancelSwipe = useCallback(() => {
    swipeStateRef.current.isTracking = false;
  }, []);

  return {
    // Event handlers
    swipeHandlers,
    touchHandlers,
    mouseHandlers,
    
    // Individual handlers
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    
    // State utilities
    getCurrentSwipeState,
    isCurrentlySwiping,
    cancelSwipe,
    
    // Configuration
    config: {
      minSwipeDistance,
      maxSwipeTime,
      preventDefaultTouchmove,
      passive
    }
  };
};

// Hook specifically for category navigation swipes
export const useCategorySwipeNavigation = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  customConfig?: SwipeConfig
) => {
  return useCategorySwipes(
    {
      onSwipeLeft,
      onSwipeRight
    },
    {
      minSwipeDistance: 80, // Larger threshold for category changes
      maxSwipeTime: 400,
      preventDefaultTouchmove: true,
      ...customConfig
    }
  );
};

// Hook for product grid swipes (shorter distance)
export const useProductGridSwipes = (
  handlers: SwipeHandlers,
  customConfig?: SwipeConfig
) => {
  return useCategorySwipes(
    handlers,
    {
      minSwipeDistance: 30, // Shorter for product scrolling
      maxSwipeTime: 200,
      preventDefaultTouchmove: false, // Allow normal scrolling
      ...customConfig
    }
  );
};