import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Add pathname to headers for layout access
    const response = NextResponse.next();
    response.headers.set('x-pathname', req.nextUrl.pathname);
    
    // Check admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const isAdmin = req.nextauth.token?.isAdmin;
      if (!isAdmin) {
        console.log('Admin access denied for user:', req.nextauth.token?.email);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    
    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

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