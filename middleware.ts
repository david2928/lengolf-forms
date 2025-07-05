import { NextRequest, NextResponse } from 'next/server';
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent } from 'next/server';

// Custom middleware that completely bypasses auth in development
function customMiddleware(request: NextRequest, event: NextFetchEvent) {
  console.log('🔧 Middleware called for:', request.nextUrl.pathname);
  console.log('🔧 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    SKIP_AUTH: process.env.SKIP_AUTH,
    VERCEL_ENV: process.env.VERCEL_ENV
  });
  
  // Development bypass - skip all auth checks
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_AUTH === 'true'
  );
  
  if (shouldBypass) {
    console.log('🔧 Development middleware: Complete auth bypass active');
    const response = NextResponse.next();
    response.headers.set('x-pathname', request.nextUrl.pathname);
    return response;
  }

  console.log('🔧 Using production auth middleware');

  // Production - use NextAuth middleware
  return withAuth(
    (req) => {
      const response = NextResponse.next();
      response.headers.set('x-pathname', req.nextUrl.pathname);
      return response;
    },
    {
      callbacks: {
        authorized: ({ token }) => !!token,
      },
    }
  )(request as NextRequestWithAuth, event);
}

export default customMiddleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes)
     * - _next
     * - public (static files)
     * - auth (auth pages)
     */
    "/((?!api|_next|public|auth).*)",
  ],
};