import { google } from 'googleapis';
import type {
  GoogleReview,
  GoogleReviewsResponse,
  GoogleReviewDB,
  SyncResult,
} from '@/types/google-reviews';
import { refacSupabaseAdmin } from './refac-supabase';

const ACCOUNT_ID = process.env.GOOGLE_BUSINESS_ACCOUNT_ID!;
const LOCATION_ID = process.env.GOOGLE_BUSINESS_LOCATION_ID!;

/**
 * Detect language of review comment
 */
function detectLanguage(comment: string | undefined): 'EN' | 'TH' | 'OTHER' {
  if (!comment) return 'EN';

  // Simple Thai detection (check for Thai Unicode range)
  const thaiPattern = /[\u0E00-\u0E7F]/;
  if (thaiPattern.test(comment)) {
    return 'TH';
  }

  // Check if mostly English (basic check)
  const englishPattern = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
  if (englishPattern.test(comment.slice(0, 100))) {
    return 'EN';
  }

  return 'OTHER';
}

/**
 * Fetch all reviews from Google Business Profile API
 * Uses REST API directly as googleapis library doesn't support reviews endpoint properly
 */
export async function fetchAllReviews(
  accessToken: string
): Promise<GoogleReview[]> {
  try {
    const allReviews: GoogleReview[] = [];
    let pageToken: string | undefined;

    do {
      // Build API URL - Using v4 API endpoint
      const url = new URL(
        `https://mybusiness.googleapis.com/v4/accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}/reviews`
      );
      url.searchParams.set('pageSize', '50');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      // Make direct REST API call
      console.log('Fetching reviews from:', url.toString());
      console.log('Using access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'missing');

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

    console.log(`Fetched ${allReviews.length} reviews from Google Business Profile`);
    return allReviews;
  } catch (error) {
    console.error('Error fetching reviews from Google:', error);
    throw new Error(
      `Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert Google Review to database format
 */
function convertToDBFormat(review: GoogleReview): Omit<GoogleReviewDB, 'id' | 'synced_at' | 'created_at' | 'updated_at'> {
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
  };
}

/**
 * Sync reviews from Google to Supabase
 * - Inserts new reviews
 * - Updates existing reviews if they've changed
 */
export async function syncReviewsToSupabase(
  accessToken: string
): Promise<SyncResult> {
  try {
    // Fetch all reviews from Google
    const googleReviews = await fetchAllReviews(accessToken);

    let newCount = 0;
    let updatedCount = 0;

    // Process each review
    for (const googleReview of googleReviews) {
      const dbReview = convertToDBFormat(googleReview);

      // Try to upsert the review
      const { data: existing, error: fetchError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('google_reviews')
        .select('id, review_updated_at')
        .eq('google_review_name', dbReview.google_review_name)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('Error checking existing review:', fetchError);
        continue;
      }

      if (existing) {
        // Review exists - check if it needs updating
        if (existing.review_updated_at !== dbReview.review_updated_at) {
          const { error: updateError } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('google_reviews')
            .update({ ...dbReview, synced_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Error updating review:', updateError);
          } else {
            updatedCount++;
          }
        }
      } else {
        // New review - insert it
        const { error: insertError } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('google_reviews')
          .insert(dbReview);

        if (insertError) {
          console.error('Error inserting review:', insertError);
        } else {
          newCount++;
        }
      }
    }

    const result: SyncResult = {
      success: true,
      synced: googleReviews.length,
      new: newCount,
      updated: updatedCount,
    };

    console.log('Sync completed:', result);
    return result;
  } catch (error) {
    console.error('Error syncing reviews:', error);
    return {
      success: false,
      synced: 0,
      new: 0,
      updated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get reviews from Supabase database
 */
export async function getReviewsFromDB(filters?: {
  hasReply?: boolean;
  limit?: number;
  offset?: number;
}) {
  let query = refacSupabaseAdmin
    .schema('backoffice')
    .from('google_reviews')
    .select('*')
    .order('review_created_at', { ascending: false });

  if (filters?.hasReply !== undefined) {
    query = query.eq('has_reply', filters.hasReply);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reviews from DB:', error);
    throw new Error(`Failed to fetch reviews from database: ${error.message}`);
  }

  return data as GoogleReviewDB[];
}
