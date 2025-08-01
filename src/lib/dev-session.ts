import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { NextAuthOptions } from 'next-auth';
import { jwtVerify } from 'jose';
import { isDevAuthBypassEnabled, createMockSession } from './dev-auth';

/**
 * Development-enhanced session getter that supports multiple auth methods
 * 
 * In production: Only NextAuth sessions work
 * In development: 
 *   - NextAuth sessions (browser/cookies)
 *   - Bearer tokens from /api/dev-token
 *   - Complete auth bypass (if SKIP_AUTH=true)
 * 
 * Usage: Replace getServerSession(authOptions) with getDevSession(authOptions, request)
 */
export async function getDevSession(
  authOptions: NextAuthOptions,
  request?: NextRequest
) {
  // Check for complete development bypass first
  if (isDevAuthBypassEnabled()) {
    return createMockSession();
  }
  
  // Try NextAuth session first (works for browser/Puppeteer with cookies)
  const session = await getServerSession(authOptions);
  if (session) {
    return session;
  }

  // In development, also try Bearer token (works for API testing with curl/fetch)
  if (process.env.NODE_ENV === 'development' && request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
        const { payload } = await jwtVerify(token, secret);
        
        // Return session-like object that matches NextAuth structure
        const session = {
          user: {
            email: payload.email as string,
            isAdmin: payload.isAdmin as boolean,
            name: payload.name as string,
            picture: payload.picture as string || null
          },
          expires: new Date((payload.exp as number) * 1000).toISOString()
        };
        
        return session;
      } catch (error) {
        // Silent fail for invalid tokens
      }
    }
  }

  return null;
}

/**
 * Alternative import alias to make migration easier
 * Usage: import { getServerSession } from '@/lib/dev-session';
 */
export { getDevSession as getServerSession };