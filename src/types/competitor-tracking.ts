export type Platform = 'instagram' | 'facebook' | 'line' | 'google_reviews';
export type ScrapeStatus = 'pending' | 'success' | 'failed';

export interface Competitor {
  id: number;
  name: string;
  business_type: string;
  location?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CompetitorSocialAccount {
  id: number;
  competitor_id: number;
  platform: Platform;
  account_handle?: string;
  account_url: string;
  account_id?: string;
  is_verified: boolean;
  last_scraped_at?: string;
  scrape_status: ScrapeStatus;
  error_message?: string;
  created_at: string;
}

export interface CompetitorMetrics {
  id?: number;
  competitor_id: number;
  platform: Platform;
  // Common metrics
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  engagement_rate?: number;
  // Platform-specific metrics
  page_likes?: number; // Facebook
  check_ins?: number; // Facebook
  google_rating?: number; // Google Reviews
  google_review_count?: number;
  line_friends_count?: number; // LINE
  stories_count?: number; // Instagram
  reels_count?: number; // Instagram
  // Metadata
  raw_data?: any;
  recorded_at: string;
  scrape_duration_ms?: number;
}

export interface CompetitorMetricChange {
  id: number;
  competitor_id: number;
  platform: Platform;
  metric_name: string;
  old_value?: string;
  new_value?: string;
  change_percentage?: number;
  detected_at: string;
}

export interface CompetitorWithAccounts extends Competitor {
  social_accounts?: CompetitorSocialAccount[];
  latest_metrics?: CompetitorMetrics[];
}

export interface ScrapeResult {
  success: boolean;
  platform: Platform;
  metrics?: Partial<CompetitorMetrics>;
  error?: string;
  duration_ms: number;
  screenshot?: string;
}

export interface CompetitorAnalytics {
  competitor_id: number;
  competitor_name: string;
  platform: Platform;
  follower_growth_rate: number; // % per month
  engagement_trend: 'increasing' | 'stable' | 'decreasing';
  last_30_days_growth: number;
  average_engagement_rate: number;
  peak_activity_time?: string;
}