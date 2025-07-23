'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Staff, POSStaffSession, POSStaffAuthResponse, POSStaffContext } from '@/types/staff';

const POSStaffAuthContext = createContext<POSStaffContext | null>(null);

export function POSStaffProvider({ children }: { children: ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [session, setSession] = useState<POSStaffSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('pos_staff_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        // Check if session is still valid (within 8 hours)
        const sessionAge = Date.now() - new Date(parsedSession.loginTime).getTime();
        const maxAge = 8 * 60 * 60 * 1000; // 8 hours
        
        if (sessionAge < maxAge) {
          setCurrentStaff(parsedSession.staff);
          setSession(parsedSession);
        } else {
          // Session expired, clear it
          localStorage.removeItem('pos_staff_session');
        }
      } catch (error) {
        console.error('Failed to parse saved staff session:', error);
        localStorage.removeItem('pos_staff_session');
      }
    }
    setIsHydrated(true);
  }, []);

  const login = async (pin: string): Promise<POSStaffAuthResponse> => {
    try {
      const response = await fetch('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (response.ok && data.success && data.staff) {
        const newSession: POSStaffSession = {
          staff: data.staff,
          loginTime: new Date(),
          sessionId: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        setCurrentStaff(data.staff);
        setSession(newSession);
        
        // Save to localStorage
        localStorage.setItem('pos_staff_session', JSON.stringify(newSession));

        return {
          success: true,
          staff: data.staff,
          sessionId: newSession.sessionId
        };
      } else {
        return {
          success: false,
          error: data.message || 'Authentication failed'
        };
      }
    } catch (error) {
      console.error('Staff authentication error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  };

  const logout = () => {
    setCurrentStaff(null);
    setSession(null);
    localStorage.removeItem('pos_staff_session');
  };

  const value: POSStaffContext = {
    currentStaff,
    session,
    isAuthenticated: isHydrated ? !!currentStaff : false,
    login,
    logout
  };

  return React.createElement(
    POSStaffAuthContext.Provider,
    { value },
    children
  );
}

export function usePOSStaffAuth(): POSStaffContext {
  const context = useContext(POSStaffAuthContext);
  if (!context) {
    throw new Error('usePOSStaffAuth must be used within a POSStaffProvider');
  }
  return context;
}