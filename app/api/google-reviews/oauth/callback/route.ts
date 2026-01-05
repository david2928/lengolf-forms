import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-business-oauth';

/**
 * GET /api/google-reviews/oauth/callback
 *
 * OAuth callback endpoint for Google Business Profile
 * - Receives authorization code from Google
 * - Exchanges code for access and refresh tokens
 * - Stores tokens in database
 * - Redirects back to admin page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/google-reviews?error=oauth_failed&message=${encodeURIComponent(error)}`
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/google-reviews?error=no_code`
      );
    }

    // Exchange code for tokens and store in database
    const result = await exchangeCodeForTokens(code);

    if (!result.success) {
      console.error('Failed to exchange code for tokens:', result.error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/google-reviews?error=token_exchange_failed&message=${encodeURIComponent(result.error || 'Unknown error')}`
      );
    }

    // Success - redirect back to Google Reviews admin page
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/google-reviews?success=connected`
    );
  } catch (error) {
    console.error('Error in GET /api/google-reviews/oauth/callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/google-reviews?error=server_error`
    );
  }
}
