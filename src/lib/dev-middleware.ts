/**
 * Development-Enhanced Middleware
 * 
 * Provides comprehensive authentication with development bypass capabilities.
 * Replaces standard withAuth middleware with dev-aware version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from "next-auth/middleware";
import { isDevAuthBypassEnabled, createMockSession } from './dev-auth';

/**
 * Enhanced middleware that supports development bypass
 */
export function createDevAwareMiddleware() {
  return withAuth(
    function middleware(req: NextRequest & { nextauth?: any }) {
      // Development bypass check
      if (isDevAuthBypassEnabled()) {
        // Create response with mock session headers
        const response = NextResponse.next();
        response.headers.set('x-pathname', req.nextUrl.pathname);
        
        // Inject mock session data for consistency
        const mockSession = createMockSession();
        response.headers.set('x-dev-session', JSON.stringify(mockSession));
        
        return response;
      }

      // Production middleware logic
      const response = NextResponse.next();
      response.headers.set('x-pathname', req.nextUrl.pathname);
      
      // Check admin routes
      if (req.nextUrl.pathname.startsWith('/admin')) {
        const isAdmin = req.nextauth?.token?.isAdmin;
        if (!isAdmin) {
          console.log('Admin access denied for user:', req.nextauth?.token?.email);
          return NextResponse.redirect(new URL('/', req.url));
        }
      }
      
      return response;
    },
    {
      callbacks: {
        authorized: ({ token, req }) => {
          // Development bypass
          if (isDevAuthBypassEnabled()) {
            return true;
          }

          // Production authorization logic
          return !!token;
        },
      },
    }
  );
}

/**
 * Check if request should bypass auth (for API routes)
 */
export function shouldBypassAuth(request: NextRequest): boolean {
  return isDevAuthBypassEnabled();
}

/**
 * Get session with development bypass support
 * For use in API routes and server components
 */
export async function getSessionWithDevBypass(
  getServerSessionFn: () => Promise<any>
): Promise<any> {
  if (isDevAuthBypassEnabled()) {
    return createMockSession();
  }

  return await getServerSessionFn();
}