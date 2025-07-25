import { NextRequest, NextResponse } from 'next/server';
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Custom middleware that completely bypasses auth in development
async function customMiddleware(request: NextRequest, event: NextFetchEvent) {
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

  // Production - use NextAuth middleware with proper redirect
  return withAuth(
    async (req) => {
      const response = NextResponse.next();
      response.headers.set('x-pathname', req.nextUrl.pathname);
      
      // Role-based access control for coaches
      if (req.nextUrl.pathname.startsWith('/coaching') || req.nextUrl.pathname === '/coaching') {
        // Coaching portal access - allow coaches and admins
        return response;
      } else {
        // For all other routes (including root '/'), check if user is coach-only
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
            process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
          );

          const { data: user } = await supabase
            .schema('backoffice')
            .from('allowed_users')
            .select('is_coach, is_admin')
            .eq('email', req.nextauth.token?.email)
            .single();

          // If user is coach-only (not admin), redirect to coaching portal
          if (user?.is_coach && !user?.is_admin) {
            return NextResponse.redirect(new URL('/coaching', req.url));
          }
        } catch (error) {
          // If there's an error checking roles, allow access
          console.error('Error checking user roles:', error);
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
     * Match all request paths except for the ones starting with:
     * - api (all API routes)
     * - _next
     * - public (static files)
     * - auth (auth pages)
     */
    "/((?!api|_next|public|auth).*)",
  ],
};