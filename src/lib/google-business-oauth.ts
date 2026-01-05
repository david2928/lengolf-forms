/**
 * Google Business Profile OAuth Service
 *
 * Handles OAuth authentication separately from NextAuth user authentication.
 * Stores tokens in database for the dedicated Google Business account (info@len.golf).
 */

import { google } from 'googleapis';
import { refacSupabaseAdmin } from './refac-supabase';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CALLBACK_URL = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/google-reviews/oauth/callback`
  : 'http://localhost:3000/api/google-reviews/oauth/callback';

const GOOGLE_BUSINESS_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage'
];

/**
 * Create OAuth2 client for Google Business Profile
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    CALLBACK_URL
  );
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_BUSINESS_SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    login_hint: 'info@len.golf', // Suggest the correct account
  });
}

/**
 * Exchange authorization code for tokens and store in database
 */
export async function exchangeCodeForTokens(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = createOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return { success: false, error: 'Missing tokens from Google' };
    }

    // Get user info to verify email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email;
    if (!email) {
      return { success: false, error: 'Could not get email from Google account' };
    }

    // Calculate token expiration (default to 1 hour if not provided)
    const expiresIn = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Store tokens in database
    const { error: dbError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_business_oauth')
      .upsert({
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresIn.toISOString(),
        scope: tokens.scope || GOOGLE_BUSINESS_SCOPES.join(' '),
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'email',
      });

    if (dbError) {
      console.error('Error storing tokens:', dbError);
      return { success: false, error: 'Failed to store tokens in database' };
    }

    console.log(`Successfully stored Google Business OAuth tokens for ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get valid access token (refresh if expired)
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    // Get tokens from database
    const { data: tokenData, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_business_oauth')
      .select('*')
      .single();

    if (error || !tokenData) {
      console.error('No Google Business OAuth tokens found in database');
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.token_expires_at);

    // If token is still valid (with 5 minute buffer), return it
    if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      // Update last used timestamp
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('google_business_oauth')
        .update({ last_used_at: now.toISOString() })
        .eq('id', tokenData.id);

      return tokenData.access_token;
    }

    // Token expired - refresh it
    console.log('Access token expired, refreshing...');
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      console.error('Failed to refresh access token');
      return null;
    }

    // Calculate new expiration
    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Update tokens in database
    await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_business_oauth')
      .update({
        access_token: credentials.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        last_used_at: now.toISOString(),
      })
      .eq('id', tokenData.id);

    console.log('Successfully refreshed access token');
    return credentials.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

/**
 * Check if Google Business account is connected
 */
export async function isGoogleBusinessConnected(): Promise<boolean> {
  const { data, error } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('google_business_oauth')
    .select('id')
    .single();

  return !error && !!data;
}

/**
 * Get connected Google Business account email
 */
export async function getConnectedAccountEmail(): Promise<string | null> {
  const { data, error } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('google_business_oauth')
    .select('email')
    .single();

  if (error || !data) {
    return null;
  }

  return data.email;
}

/**
 * Disconnect Google Business account (remove tokens)
 */
export async function disconnectGoogleBusiness(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_business_oauth')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
