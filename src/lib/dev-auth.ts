/**
 * Development Authentication Bypass System
 * 
 * Provides comprehensive auth bypass for development while maintaining security.
 * Works for both frontend sessions and API Bearer tokens.
 */

import { NextRequest } from 'next/server';
import { Session } from 'next-auth';

/**
 * Check if development auth bypass is enabled
 * Multiple checks prevent accidental production deployment
 */
export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.VERCEL_ENV !== 'production' &&
    process.env.SKIP_AUTH === 'true'
  );
}

/**
 * Check if development auth bypass is enabled (middleware-safe version)
 * For use in Edge Runtime middleware
 */
export function isDevAuthBypassEnabledMiddleware(): boolean {
  const isDev = process.env.NODE_ENV === 'development';
  const notProd = process.env.VERCEL_ENV !== 'production';
  const skipAuth = process.env.SKIP_AUTH === 'true';
  
  console.log('🔧 Middleware auth check:', { isDev, notProd, skipAuth });
  
  return isDev && notProd && skipAuth;
}

/**
 * Create mock session for development
 * Matches production session structure exactly
 */
export function createMockSession(): Session {
  if (!isDevAuthBypassEnabled()) {
    throw new Error('Mock session can only be created in development');
  }

  return {
    user: {
      email: 'dev@lengolf.local',
      name: 'Development User',
      isAdmin: true,
      image: null
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}

/**
 * Create mock JWT token for development
 * Compatible with existing Bearer token system
 */
export function createMockJWTPayload() {
  if (!isDevAuthBypassEnabled()) {
    throw new Error('Mock JWT can only be created in development');
  }

  return {
    email: 'dev@lengolf.local',
    name: 'Development User',
    isAdmin: true,
    picture: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
}

/**
 * Enhanced session getter that supports development bypass
 * Integrates with existing dev-session.ts system
 */
export async function getDevSessionWithBypass(
  getSessionFn: () => Promise<Session | null>,
  request?: NextRequest
): Promise<Session | null> {
  // If development bypass is enabled, return mock session
  if (isDevAuthBypassEnabled()) {
    console.log('🔧 Development auth bypass: Using mock session');
    return createMockSession();
  }

  // Otherwise, use normal session logic
  return await getSessionFn();
}