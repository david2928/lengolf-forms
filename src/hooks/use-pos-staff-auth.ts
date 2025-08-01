'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Staff, POSStaffSession, POSStaffAuthResponse, POSStaffContext } from '@/types/staff';

const POSStaffAuthContext = createContext<POSStaffContext | null>(null);

export function POSStaffProvider({ children }: { children: ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [session, setSession] = useState<POSStaffSession | null>(null);
  const [currentPin, setCurrentPin] = useState<string | null>(null); // Store raw PIN for API calls
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      // Always require PIN authentication - no development bypass
      const savedSession = localStorage.getItem('pos_staff_session');
      const savedPin = sessionStorage.getItem('pos_staff_pin'); // Get PIN from session storage
      
      if (savedSession) {
        try {
          const parsedSession = JSON.parse(savedSession);
          // Check if session is still valid (within 8 hours)
          const sessionAge = Date.now() - new Date(parsedSession.loginTime).getTime();
          const maxAge = 8 * 60 * 60 * 1000; // 8 hours
          
          if (sessionAge < maxAge) {
            setCurrentStaff(parsedSession.staff);
            setSession(parsedSession);
            setCurrentPin(savedPin); // Restore PIN if available
          } else {
            // Session expired, clear it
            localStorage.removeItem('pos_staff_session');
            sessionStorage.removeItem('pos_staff_pin');
          }
        } catch (error) {
          console.error('Failed to parse saved staff session:', error);
          localStorage.removeItem('pos_staff_session');
          sessionStorage.removeItem('pos_staff_pin');
        }
      }
      setIsHydrated(true);
    };
    
    loadSession();
  }, []);

  const login = async (pin: string): Promise<POSStaffAuthResponse> => {
    setIsLoggingIn(true);
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
        setCurrentPin(pin); // Store the raw PIN
        
        // Save to localStorage and sessionStorage
        localStorage.setItem('pos_staff_session', JSON.stringify(newSession));
        sessionStorage.setItem('pos_staff_pin', pin); // Store PIN for API calls

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
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    setCurrentStaff(null);
    setSession(null);
    setCurrentPin(null);
    localStorage.removeItem('pos_staff_session');
    sessionStorage.removeItem('pos_staff_pin');
  };

  const value: POSStaffContext = {
    currentStaff,
    session,
    currentPin,
    isAuthenticated: isHydrated ? !!currentStaff : false,
    isLoggingIn,
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