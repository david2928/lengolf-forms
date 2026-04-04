import { NextRequest, NextResponse } from 'next/server';
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent } from 'next/server';

// Custom middleware that completely bypasses auth in development
// Role checks use JWT token values (set in auth-config.ts jwt callback)
// instead of querying Supabase on every request — saves edge requests
async function customMiddleware(request: NextRequest, event: NextFetchEvent) {
  // Development bypass - skip all auth checks
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_AUTH === 'true'
  );

  if (shouldBypass) {
    // If trying to access auth pages in dev mode, redirect to home
    if (request.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-pathname', request.nextUrl.pathname);

    return response;
  }

  // Production - use NextAuth middleware with proper redirect
  // Roles (isAdmin, isCoach, isStaff) are already in the JWT token
  // from the jwt callback in auth-config.ts — no DB queries needed here
  return withAuth(
    async (req) => {
      const response = NextResponse.next();
      response.headers.set('x-pathname', req.nextUrl.pathname);

      const token = req.nextauth.token;
      const isAdmin = token?.isAdmin === true;
      const isCoach = token?.isCoach === true;
      const isStaff = token?.isStaff === true;

      // Role-based access control using JWT token values
      if (req.nextUrl.pathname.startsWith('/coaching') || req.nextUrl.pathname === '/coaching') {
        // Coaching portal access - allow coaches and admins
        return response;
      } else if (req.nextUrl.pathname.startsWith('/admin/staff-scheduling')) {
        // Admin staff scheduling - require admin privileges
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/staff-schedule', req.url));
        }
      } else if (req.nextUrl.pathname.startsWith('/staff-schedule')) {
        // Staff scheduling interface - allow all authenticated users
        return response;
      } else if (req.nextUrl.pathname.startsWith('/staff')) {
        // Staff panel - require is_staff flag
        if (!isStaff) {
          return NextResponse.redirect(new URL('/', req.url));
        }
        return response;
      } else if (req.nextUrl.pathname.startsWith('/pos') || req.nextUrl.pathname === '/pos') {
        // POS system access - allow all authenticated users
        // The POS system has its own internal authentication using staff PINs
        return response;
      } else {
        // For all other routes (including root '/'), check if user is coach-only
        if (isCoach && !isAdmin) {
          return NextResponse.redirect(new URL('/coaching', req.url));
        }
      }

      return response;
    },
    {
      callbacks: {
        authorized: ({ token }) => !!token,
      },
      pages: {
        signIn: '/auth/signin',
      },
    }
  )(request as NextRequestWithAuth, event);
}

export default customMiddleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (all API routes)
     * - _next (Next.js internals)
     * - public (static files in public folder)
     * - Static assets (favicon, robots, manifest files, images, etc.)
     * This reduces edge requests by excluding static files from middleware
     */
    "/((?!api|_next|public|favicon|robots.txt|site.webmanifest|apple-touch-icon|web-app-manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};