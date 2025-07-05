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
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 getDevSession called');
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 Request provided:', !!request);
  }
  
  // Check for complete development bypass first
  if (isDevAuthBypassEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development auth bypass: Returning mock session');
    }
    return createMockSession();
  }
  
  // Try NextAuth session first (works for browser/Puppeteer with cookies)
  const session = await getServerSession(authOptions);
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 NextAuth session:', session ? 'FOUND' : 'NULL');
  }
  if (session) {
    return session;
  }

  // In development, also try Bearer token (works for API testing with curl/fetch)
  if (process.env.NODE_ENV === 'development' && request) {
    console.log('🔧 Checking Bearer token...');
    const authHeader = request.headers.get('Authorization');
    console.log('🔧 Auth header:', authHeader ? 'PRESENT' : 'MISSING');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔧 Bearer token extracted, length:', token.length);
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
        const { payload } = await jwtVerify(token, secret);
        
        console.log('🔧 JWT payload decoded:', JSON.stringify(payload, null, 2));
        
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
        
        console.log('🔧 Session created from JWT:', JSON.stringify(session, null, 2));
        return session;
      } catch (error) {
        console.log('🔧 Invalid Bearer token in development mode:', error instanceof Error ? error.message : 'Unknown error');
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