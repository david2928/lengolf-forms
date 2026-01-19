import { google } from 'googleapis';
import type {
  GoogleReview,
  GoogleReviewsResponse,
  GoogleReviewDB,
  SyncResult,
  PostReplyResult,
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
 * Fetch reviews from Google Business Profile API
 * Uses REST API directly as googleapis library doesn't support reviews endpoint properly
 *
 * @param accessToken - OAuth access token
 * @param stopAfterDate - If provided, stops fetching when all reviews in a page are older than this date
 *                        (optimization for delta sync - Google returns newest first)
 */
export async function fetchAllReviews(
  accessToken: string,
  stopAfterDate?: Date
): Promise<GoogleReview[]> {
  try {
    const allReviews: GoogleReview[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      pageCount++;
      // Build API URL - Using v4 API endpoint
      const url = new URL(
        `https://mybusiness.googleapis.com/v4/accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}/reviews`
      );
      url.searchParams.set('pageSize', '50');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      // Make direct REST API call
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

        // Early exit optimization for delta sync
        // Google returns reviews newest-first, so if the oldest review in this page
        // is older than our cutoff, we've seen all the new ones
        if (stopAfterDate && data.reviews.length > 0) {
          const oldestInPage = data.reviews[data.reviews.length - 1];
          const oldestUpdateTime = new Date(oldestInPage.updateTime);

          if (oldestUpdateTime < stopAfterDate) {
            console.log(`Early exit: reached reviews older than ${stopAfterDate.toISOString()}`);
            break;
          }
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log(`Fetched ${allReviews.length} reviews in ${pageCount} pages`);
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
    // Audit fields - only set when posting from our system
    replied_by: null,
    replied_at_local: null,
  };
}

/**
 * Sync reviews from Google to Supabase
 * - Uses batch upsert for performance (1 DB call instead of N*2)
 * - Supports delta mode to only sync reviews updated since last sync
 * - Uses early exit optimization to stop fetching when reaching old reviews
 */
export async function syncReviewsToSupabase(
  accessToken: string,
  deltaOnly: boolean = false
): Promise<SyncResult> {
  try {
    const now = new Date().toISOString();
    let lastSyncTime: Date | undefined;

    // Delta mode: get last sync time first for early exit optimization
    if (deltaOnly) {
      const { data: lastSync } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('google_reviews')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSync?.synced_at) {
        lastSyncTime = new Date(lastSync.synced_at);
        console.log(`Delta mode: looking for reviews updated since ${lastSync.synced_at}`);
      }
    }

    // Fetch reviews from Google (with early exit if delta mode)
    const googleReviews = await fetchAllReviews(accessToken, lastSyncTime);

    if (googleReviews.length === 0) {
      return {
        success: true,
        synced: 0,
        new: 0,
        updated: 0,
        message: 'No reviews found',
      };
    }

    // Filter to only reviews updated since last sync
    let reviewsToProcess = googleReviews;
    if (lastSyncTime) {
      reviewsToProcess = googleReviews.filter(review => {
        const updateTime = new Date(review.updateTime);
        return updateTime > lastSyncTime!;
      });
      console.log(`Delta mode: ${reviewsToProcess.length} reviews to sync`);
    }

    if (reviewsToProcess.length === 0) {
      return {
        success: true,
        synced: 0,
        new: 0,
        updated: 0,
        message: 'No new or updated reviews to sync',
      };
    }

    // Get existing review names to count new vs updated
    const reviewNames = reviewsToProcess.map(r => r.name);
    const { data: existingReviews } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .select('google_review_name')
      .in('google_review_name', reviewNames);

    const existingNames = new Set(existingReviews?.map((r: { google_review_name: string }) => r.google_review_name) || []);

    // Convert to DB format with synced_at timestamp
    const dbReviews = reviewsToProcess.map(review => ({
      ...convertToDBFormat(review),
      synced_at: now,
    }));

    // Batch upsert - single DB call!
    const { error: upsertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .upsert(dbReviews, {
        onConflict: 'google_review_name',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Error upserting reviews:', upsertError);
      return {
        success: false,
        synced: 0,
        new: 0,
        updated: 0,
        error: upsertError.message,
      };
    }

    // Count new vs updated
    const newCount = dbReviews.filter(r => !existingNames.has(r.google_review_name)).length;
    const updatedCount = dbReviews.length - newCount;

    const result: SyncResult = {
      success: true,
      synced: dbReviews.length,
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

/**
 * Post a reply to a Google review
 * Uses the Google Business Profile API to post the reply, then updates our database
 */
export async function postReviewReply(
  reviewId: string,           // Our database UUID
  googleReviewName: string,   // Full Google resource path (accounts/X/locations/Y/reviews/Z)
  replyText: string,
  accessToken: string,
  adminFirstName: string      // First name of admin posting the reply
): Promise<PostReplyResult> {
  try {
    // Validate reply text
    if (!replyText || replyText.trim().length < 10) {
      return {
        success: false,
        error: 'Reply must be at least 10 characters long',
      };
    }

    if (replyText.length > 4096) {
      return {
        success: false,
        error: 'Reply cannot exceed 4096 characters',
      };
    }

    // Build the API URL for posting reply
    // Format: PUT https://mybusiness.googleapis.com/v4/{name}/reply
    const url = `https://mybusiness.googleapis.com/v4/${googleReviewName}/reply`;

    console.log('Posting reply to:', url);

    // Make the API call to Google
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: replyText.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', response.status, errorText);

      // Parse common errors
      if (response.status === 403) {
        return {
          success: false,
          error: 'Permission denied. Please reconnect your Google Business account.',
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          error: 'Review not found. It may have been deleted from Google.',
        };
      }
      if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait a moment and try again.',
        };
      }

      return {
        success: false,
        error: `Failed to post reply: ${errorText}`,
      };
    }

    const replyData = await response.json();
    const now = new Date().toISOString();

    // Update our database with the reply info
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .update({
        has_reply: true,
        reply_text: replyText.trim(),
        reply_updated_at: replyData.updateTime || now,
        replied_by: adminFirstName,
        replied_at_local: now,
        updated_at: now,
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating database after posting reply:', updateError);
      // Reply was posted to Google but DB update failed
      // This is not ideal but the reply is live
      return {
        success: true,
        warning: 'Reply posted to Google but failed to update local database. Please sync reviews.',
      };
    }

    console.log('Reply posted successfully for review:', reviewId);

    return {
      success: true,
      replyText: replyText.trim(),
      repliedAt: now,
      repliedBy: adminFirstName,
    };
  } catch (error) {
    console.error('Error posting review reply:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get a single review by ID from the database
 */
export async function getReviewById(reviewId: string): Promise<GoogleReviewDB | null> {
  const { data, error } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('google_reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error) {
    console.error('Error fetching review by ID:', error);
    return null;
  }

  return data as GoogleReviewDB;
}
