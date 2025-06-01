import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

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