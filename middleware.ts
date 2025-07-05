import { NextRequest, NextResponse } from 'next/server';
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent } from 'next/server';

// Custom middleware that completely bypasses auth in development
function customMiddleware(request: NextRequest, event: NextFetchEvent) {
  // Development bypass - skip all auth checks
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_AUTH === 'true'
  );
  
  if (shouldBypass) {
    const response = NextResponse.next();
    response.headers.set('x-pathname', request.nextUrl.pathname);
    return response;
  }

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