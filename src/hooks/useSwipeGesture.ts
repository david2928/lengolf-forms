'use client';

import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  restraint?: number; // Maximum distance perpendicular to swipe direction
  allowedTime?: number; // Maximum time for swipe
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const elementRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    restraint = 100,
    allowedTime = 500
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = new Date().getTime();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchEndTime = new Date().getTime();
      
      const elapsedTime = touchEndTime - touchStartTime.current;
      const distanceX = touchEndX - touchStartX.current;
      const distanceY = touchEndY - touchStartY.current;
      
      // Check if swipe was quick enough
      if (elapsedTime > allowedTime) return;
      
      // Horizontal swipes
      if (Math.abs(distanceX) >= threshold && Math.abs(distanceY) <= restraint) {
        if (distanceX > 0 && onSwipeRight) {
          e.preventDefault();
          onSwipeRight();
        } else if (distanceX < 0 && onSwipeLeft) {
          e.preventDefault();
          onSwipeLeft();
        }
      }
      
      // Vertical swipes
      if (Math.abs(distanceY) >= threshold && Math.abs(distanceX) <= restraint) {
        if (distanceY > 0 && onSwipeDown) {
          e.preventDefault();
          onSwipeDown();
        } else if (distanceY < 0 && onSwipeUp) {
          e.preventDefault();
          onSwipeUp();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, restraint, allowedTime]);

  return elementRef;
}