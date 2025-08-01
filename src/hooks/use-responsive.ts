'use client';

import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < 640,
        isTablet: width >= 600 && width <= 1024,
        isDesktop: width > 1024,
        width,
        height,
      });
    };

    // Set initial state
    updateResponsiveState();

    // Add event listener
    window.addEventListener('resize', updateResponsiveState);

    // Cleanup
    return () => window.removeEventListener('resize', updateResponsiveState);
  }, []);

  return state;
}

export function useBreakpoint() {
  const { width } = useResponsive();
  
  return {
    xs: width >= 475,
    sm: width >= 640,
    md: width >= 768,
    lg: width >= 1024,
    xl: width >= 1280,
    '2xl': width >= 1536,
    tablet: width >= 600 && width <= 1024,
    mobile: width < 640,
    desktop: width > 1024,
  };
}