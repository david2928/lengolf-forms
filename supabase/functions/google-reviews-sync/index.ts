import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleReview {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  nextPageToken?: string;
}

/**
 * Detect language of review comment
 */
function detectLanguage(comment: string | undefined): 'EN' | 'TH' | 'OTHER' {
  if (!comment) return 'EN';

  const thaiPattern = /[\u0E00-\u0E7F]/;
  if (thaiPattern.test(comment)) {
    return 'TH';
  }

  const englishPattern = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
  if (englishPattern.test(comment.slice(0, 100))) {
    return 'EN';
  }

  return 'OTHER';
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  refreshToken: string,
  tokenId: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to refresh token:', error);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update token in database
    await supabase
      .schema('backoffice')
      .from('google_business_oauth')
      .update({
        access_token: newAccessToken,
        token_expires_at: newExpiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', tokenId);

    console.log('Successfully refreshed access token');
    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .schema('backoffice')
    .from('google_business_oauth')
    .select('*')
    .single();

  if (error || !tokenData) {
    console.error('No Google Business OAuth tokens found');
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.token_expires_at);

  // If token is still valid (with 5 minute buffer), return it
  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    await supabase
      .schema('backoffice')
      .from('google_business_oauth')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return tokenData.access_token;
  }

  // Token expired - refresh it
  console.log('Access token expired, refreshing...');
  return refreshAccessToken(supabase, tokenData.refresh_token, tokenData.id);
}

/**
 * Fetch all reviews from Google Business Profile API
 */
async function fetchAllReviews(accessToken: string): Promise<GoogleReview[]> {
  const accountId = Deno.env.get('GOOGLE_BUSINESS_ACCOUNT_ID');
  const locationId = Deno.env.get('GOOGLE_BUSINESS_LOCATION_ID');

  if (!accountId || !locationId) {
    throw new Error('Missing GOOGLE_BUSINESS_ACCOUNT_ID or GOOGLE_BUSINESS_LOCATION_ID');
  }

  const allReviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    pageCount++;
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`
    );
    url.searchParams.set('pageSize', '50');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    console.log(`Fetching reviews page ${pageCount}...`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as GoogleReviewsResponse;

    if (data.reviews) {
      allReviews.push(...data.reviews);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Fetched ${allReviews.length} reviews in ${pageCount} pages`);
  return allReviews;
}

/**
 * Convert Google Review to database format
 */
function convertToDBFormat(review: GoogleReview) {
  return {
    google_review_name: review.name,
    reviewer_name: review.reviewer.displayName || 'Anonymous',
    star_rating: review.starRating,
    comment: review.comment || null,
    language: detectLanguage(review.comment),
    review_created_at: review.createTime,
    review_updated_at: review.updateTime,
    has_reply: !!review.reviewReply,
    reply_text: review.reviewReply?.comment || null,
    reply_updated_at: review.reviewReply?.updateTime || null,
    replied_by: null,
    replied_at_local: null,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Business account not connected or token refresh failed',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all reviews from Google
    const googleReviews = await fetchAllReviews(accessToken);

    if (googleReviews.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          new: 0,
          updated: 0,
          message: 'No reviews found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Get existing review names to count new vs updated
    const reviewNames = googleReviews.map(r => r.name);
    const { data: existingReviews } = await supabase
      .schema('backoffice')
      .from('google_reviews')
      .select('google_review_name')
      .in('google_review_name', reviewNames);

    const existingNames = new Set(existingReviews?.map(r => r.google_review_name) || []);

    // Convert to DB format with synced_at timestamp
    const dbReviews = googleReviews.map(review => ({
      ...convertToDBFormat(review),
      synced_at: now,
    }));

    // Batch upsert
    const { error: upsertError } = await supabase
      .schema('backoffice')
      .from('google_reviews')
      .upsert(dbReviews, {
        onConflict: 'google_review_name',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Error upserting reviews:', upsertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: upsertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count new vs updated
    const newCount = dbReviews.filter(r => !existingNames.has(r.google_review_name)).length;
    const updatedCount = dbReviews.length - newCount;

    console.log(`Sync completed: ${newCount} new, ${updatedCount} updated, ${dbReviews.length} total`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: dbReviews.length,
        new: newCount,
        updated: updatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing reviews:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
