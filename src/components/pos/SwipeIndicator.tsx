'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SwipeIndicatorProps {
  show?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
  message?: string;
  className?: string;
}

export function SwipeIndicator({ 
  show = false, 
  position = 'left', 
  message = 'Swipe right to go back',
  className = ''
}: SwipeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-4 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-4 top-1/2 -translate-y-1/2';
      case 'top':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      default:
        return 'left-4 top-1/2 -translate-y-1/2';
    }
  };

  return (
    <AnimatePresence>
      {(show || isVisible) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className={`
            fixed z-50 ${getPositionClasses()}
            bg-black/80 text-white px-3 py-2 rounded-lg 
            flex items-center space-x-2 text-sm font-medium
            pointer-events-none
            ${className}
          `}
        >
          <motion.div
            animate={{ x: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to show swipe hint for first-time users
export function useSwipeHint(key: string) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Check if user has seen this hint before
    const hasSeenHint = localStorage.getItem(`swipe-hint-${key}`);
    if (!hasSeenHint) {
      // Show hint after a short delay
      const timer = setTimeout(() => {
        setShowHint(true);
        localStorage.setItem(`swipe-hint-${key}`, 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [key]);

  return showHint;
}