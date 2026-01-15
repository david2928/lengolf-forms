// Google Business Profile API Types

export type StarRating = 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';

export interface GoogleReviewReply {
  comment: string;
  updateTime: string;
}

export interface GoogleReview {
  name: string; // Full resource path: accounts/{account}/locations/{location}/reviews/{review}
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: StarRating;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: GoogleReviewReply;
}

export interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

// Database types
export interface GoogleReviewDB {
  id: string;
  google_review_name: string;
  reviewer_name: string;
  star_rating: StarRating;
  comment: string | null;
  language: 'EN' | 'TH' | 'OTHER';
  review_created_at: string;
  review_updated_at: string;
  has_reply: boolean;
  reply_text: string | null;
  reply_updated_at: string | null;
  // Audit fields for replies posted from our system
  replied_by: string | null;        // First name of admin who posted
  replied_at_local: string | null;  // When we posted (our timestamp)
  synced_at: string;
  created_at: string;
  updated_at: string;
}

// API response types
export interface SyncResult {
  success: boolean;
  synced: number;
  new: number;
  updated: number;
  error?: string;
}

export interface ListReviewsParams {
  hasReply?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created' | 'rating';
  orderDirection?: 'asc' | 'desc';
}

// Result type for posting replies
export interface PostReplyResult {
  success: boolean;
  error?: string;
  warning?: string;
  replyText?: string;
  repliedAt?: string;
  repliedBy?: string;
}
