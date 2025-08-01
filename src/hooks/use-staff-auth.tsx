'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';

interface Staff {
  id: number;
  staff_name: string;
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContext {
  staff: Staff | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetTimeout: () => void; // Reset the 5-minute timeout
}

const StaffAuthContext = createContext<AuthContext | null>(null);

// Simple module-level state to prevent duplicate calls
let loginInProgress = false;

// Session timeout configuration
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(0);

  // Logout function
  const logout = useCallback(() => {
    setStaff(null);
    localStorage.removeItem('pos_staff');
    localStorage.removeItem('pos_staff_login_time');
    
    // Clear the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start/reset the 5-minute session timeout
  const resetTimeout = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set timeout if staff is logged in
    if (staff) {
      timeoutRef.current = setTimeout(() => {
        console.log('Session timeout - logging out after 5 minutes of inactivity');
        logout();
      }, SESSION_TIMEOUT);
    }
  }, [staff, logout]);

  // Load saved session on mount and check if it's still valid
  useEffect(() => {
    const savedStaff = localStorage.getItem('pos_staff');
    const loginTime = localStorage.getItem('pos_staff_login_time');
    
    if (savedStaff && loginTime) {
      try {
        const parsedStaff = JSON.parse(savedStaff);
        const loginTimestamp = parseInt(loginTime);
        const now = Date.now();
        
        // Check if session is still valid (within 5 minutes)
        if (now - loginTimestamp < SESSION_TIMEOUT) {
          setStaff(parsedStaff);
          // Start timeout for remaining time
          const remainingTime = SESSION_TIMEOUT - (now - loginTimestamp);
          timeoutRef.current = setTimeout(() => {
            console.log('Session timeout - logging out after 5 minutes of inactivity');
            logout();
          }, remainingTime);
        } else {
          // Session expired, clear it
          localStorage.removeItem('pos_staff');
          localStorage.removeItem('pos_staff_login_time');
        }
      } catch {
        localStorage.removeItem('pos_staff');
        localStorage.removeItem('pos_staff_login_time');
      }
    }
  }, [logout]);

  // Reset timeout when staff logs in or when resetTimeout is called
  useEffect(() => {
    resetTimeout();
  }, [resetTimeout]);

  // Track user activity to reset session timeout
  useEffect(() => {
    if (!staff) return; // Only track activity when logged in

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity tracking to once per 30 seconds to avoid excessive timeout resets
      if (now - lastActivityRef.current > 30000) {
        lastActivityRef.current = now;
        resetTimeout(); // Reset the 5-minute timer on any activity
      }
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup event listeners
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [staff, resetTimeout]);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // Prevent duplicate calls
    if (loginInProgress) {
      return { success: false, error: 'Login in progress' };
    }

    loginInProgress = true;
    setIsLoading(true);

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (data.success && data.staff) {
        setStaff(data.staff);
        const loginTime = Date.now();
        localStorage.setItem('pos_staff', JSON.stringify(data.staff));
        localStorage.setItem('pos_staff_login_time', loginTime.toString());
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
      loginInProgress = false;
    }
  };

  return (
    <StaffAuthContext.Provider value={{
      staff,
      isAuthenticated: !!staff,
      isLoading,
      login,
      logout,
      resetTimeout
    }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth(): AuthContext {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error('useStaffAuth must be used within StaffAuthProvider');
  }
  return context;
}