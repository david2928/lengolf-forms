# Social Media Competitor Tracking System Design

## Overview

This document outlines the design and implementation plan for a comprehensive social media competitor tracking system for Lengolf Forms. The system will automatically collect and analyze competitor metrics across multiple social media platforms (Instagram, Facebook, LINE, Google Reviews) using web scraping techniques with Playwright, storing the data in Supabase, and presenting insights through the admin dashboard.

## Business Requirements

### Core Objectives
- **Automated Daily Tracking**: Collect competitor social media metrics daily without manual intervention
- **Multi-Platform Support**: Track Instagram, Facebook, LINE Official Accounts, and Google Business Reviews
- **Historical Analysis**: Store time-series data to analyze growth trends and patterns
- **Competitor Insights**: Provide actionable insights about competitor performance
- **Cost-Effective**: Zero API costs by using web scraping techniques
- **Admin Integration**: Seamless integration with existing admin dashboard

### Key Metrics to Track

**Instagram**
- Followers count
- Following count
- Total posts
- Recent post engagement (likes, comments)
- Bio changes
- Story highlights count

**Facebook Pages**
- Page likes
- Followers
- Check-ins (if applicable)
- Recent post engagement
- Page rating

**LINE Official Account**
- Friend count (if publicly visible)
- Account verification status
- Recent post timestamps

**Google Reviews**
- Overall rating
- Total review count
- Recent review trends
- Response rate to reviews

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard UI                        │
│  (Competitor Management, Analytics, Manual Sync Trigger)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Next.js API Routes                           │
│  /api/admin/competitors/*                                    │
│  /api/competitors/sync                                       │
│  /api/competitors/collect/[platform]                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              Playwright Scraping Engine                      │
│  - Instagram Scraper                                         │
│  - Facebook Scraper                                          │
│  - Google Reviews Scraper                                    │
│  - LINE Scraper                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Supabase Database                            │
│  marketing.competitors                                       │
│  marketing.competitor_social_accounts                        │
│  marketing.competitor_metrics                                │
│  marketing.competitor_metric_changes                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    pg_cron Jobs                              │
│  Daily collection at 3:00 AM Thailand time                   │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Create marketing schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS marketing;

-- Core competitor information
CREATE TABLE marketing.competitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  business_type VARCHAR(100) DEFAULT 'golf_academy',
  location VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Social media account mappings
CREATE TABLE marketing.competitor_social_accounts (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'line', 'google_reviews')),
  account_handle VARCHAR(255),
  account_url VARCHAR(500) NOT NULL,
  account_id VARCHAR(255), -- Platform-specific ID if available
  is_verified BOOLEAN DEFAULT false,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  scrape_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competitor_id, platform)
);

-- Time-series metrics data
CREATE TABLE marketing.competitor_metrics (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  -- Common metrics
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  -- Platform-specific metrics
  page_likes INTEGER, -- Facebook
  check_ins INTEGER, -- Facebook
  google_rating DECIMAL(2,1), -- Google Reviews
  google_review_count INTEGER,
  line_friends_count INTEGER, -- LINE
  stories_count INTEGER, -- Instagram
  reels_count INTEGER, -- Instagram
  -- Metadata
  raw_data JSONB, -- Store complete scraped data
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_duration_ms INTEGER,
  UNIQUE(competitor_id, platform, recorded_at)
);

-- Track significant changes
CREATE TABLE marketing.competitor_metric_changes (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_percentage DECIMAL(10,2),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_competitor_metrics_lookup ON marketing.competitor_metrics(competitor_id, platform, recorded_at DESC);
CREATE INDEX idx_competitor_metrics_date ON marketing.competitor_metrics(recorded_at);
CREATE INDEX idx_competitor_changes_date ON marketing.competitor_metric_changes(detected_at);

-- View for latest metrics
CREATE OR REPLACE VIEW marketing.competitor_latest_metrics AS
SELECT DISTINCT ON (competitor_id, platform)
  cm.*,
  c.name as competitor_name,
  csa.account_handle,
  csa.account_url
FROM marketing.competitor_metrics cm
JOIN marketing.competitors c ON c.id = cm.competitor_id
JOIN marketing.competitor_social_accounts csa ON csa.competitor_id = cm.competitor_id AND csa.platform = cm.platform
WHERE c.is_active = true
ORDER BY competitor_id, platform, recorded_at DESC;
```

### API Endpoints

#### Competitor Management
```typescript
// GET /api/admin/competitors
// List all competitors with latest metrics

// POST /api/admin/competitors
// Create new competitor
{
  "name": "Bangkok Golf Academy",
  "location": "Bangkok",
  "social_accounts": [
    {
      "platform": "instagram",
      "account_url": "https://instagram.com/bangkokgolf"
    }
  ]
}

// PUT /api/admin/competitors/[id]
// Update competitor information

// DELETE /api/admin/competitors/[id]
// Soft delete competitor (set is_active = false)
```

#### Metrics & Analytics
```typescript
// GET /api/admin/competitors/[id]/metrics
// Get historical metrics for a competitor
// Query params: platform, startDate, endDate

// GET /api/admin/competitors/analytics
// Get aggregated analytics across all competitors
// Returns growth rates, market share estimates, etc.

// GET /api/admin/competitors/changes
// Get recent significant changes in metrics
```

#### Data Collection
```typescript
// POST /api/competitors/sync
// Trigger full sync for all active competitors
// Called by pg_cron daily or manually from admin

// POST /api/competitors/collect/[platform]
// Collect data for specific platform
// Body: { competitor_ids?: number[] }

// POST /api/competitors/test-scrape
// Test scraping for a single URL
// Body: { platform: string, url: string }
```

## Implementation Details

### Playwright Scraping Architecture

#### Base Scraper Class
```typescript
// src/lib/scrapers/base-scraper.ts
export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  
  abstract platform: string;
  abstract scrapeProfile(url: string): Promise<ScrapeResult>;
  
  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 }
    });
  }
  
  async cleanup() {
    await this.context?.close();
    await this.browser?.close();
  }
  
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    // Retry logic with exponential backoff
  }
  
  protected async randomDelay() {
    const delay = 2000 + Math.random() * 3000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

#### Platform-Specific Scrapers

**Instagram Scraper**
```typescript
// src/lib/scrapers/instagram-scraper.ts
export class InstagramScraper extends BaseScraper {
  platform = 'instagram';
  
  async scrapeProfile(url: string): Promise<InstagramMetrics> {
    const page = await this.context!.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.randomDelay();
      
      // Wait for profile to load
      await page.waitForSelector('header section', { timeout: 10000 });
      
      // Extract metrics
      const metrics = await page.evaluate(() => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || null;
        };
        
        const parseCount = (text: string | null) => {
          if (!text) return 0;
          const match = text.match(/[\d,]+/);
          if (!match) return 0;
          return parseInt(match[0].replace(/,/g, ''));
        };
        
        // Find follower/following links
        const links = Array.from(document.querySelectorAll('a[href*="/followers/"], a[href*="/following/"]'));
        const followersLink = links.find(link => link.getAttribute('href')?.includes('/followers/'));
        const followingLink = links.find(link => link.getAttribute('href')?.includes('/following/'));
        
        // Extract counts
        const followersText = followersLink?.querySelector('span')?.textContent;
        const followingText = followingLink?.querySelector('span')?.textContent;
        
        // Posts count (usually first number in header)
        const postsElement = document.querySelector('header section ul li:first-child span');
        const postsText = postsElement?.textContent;
        
        return {
          followers: parseCount(followersText),
          following: parseCount(followingText),
          posts: parseCount(postsText),
          bio: getTextContent('header section div:nth-child(3)'),
          isVerified: !!document.querySelector('svg[aria-label="Verified"]'),
          profilePicUrl: document.querySelector('header img')?.getAttribute('src')
        };
      });
      
      return {
        ...metrics,
        scrapedAt: new Date(),
        platform: 'instagram'
      };
      
    } finally {
      await page.close();
    }
  }
}
```

**Facebook Scraper**
```typescript
// src/lib/scrapers/facebook-scraper.ts
export class FacebookScraper extends BaseScraper {
  platform = 'facebook';
  
  async scrapeProfile(url: string): Promise<FacebookMetrics> {
    // Similar structure but with Facebook-specific selectors
    // Target public business pages only
  }
}
```

### Automation Workflow

#### Daily Sync Job
```typescript
// app/api/competitors/sync/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Get all active competitors with social accounts
    const competitors = await getActiveCompetitors();
    
    // 2. Initialize scrapers
    const scrapers = {
      instagram: new InstagramScraper(),
      facebook: new FacebookScraper(),
      google_reviews: new GoogleReviewsScraper(),
      line: new LineScraper()
    };
    
    // 3. Process each competitor
    for (const competitor of competitors) {
      for (const account of competitor.social_accounts) {
        try {
          const scraper = scrapers[account.platform];
          await scraper.initialize();
          
          const metrics = await scraper.scrapeProfile(account.account_url);
          
          // 4. Store metrics
          await storeMetrics(competitor.id, account.platform, metrics);
          
          // 5. Check for significant changes
          await detectAndLogChanges(competitor.id, account.platform, metrics);
          
          // 6. Update last_scraped_at
          await updateScrapeStatus(account.id, 'success');
          
        } catch (error) {
          await updateScrapeStatus(account.id, 'failed', error.message);
          console.error(`Failed to scrape ${account.platform} for ${competitor.name}:`, error);
        } finally {
          await scraper.cleanup();
        }
      }
    }
    
    // 7. Send summary notification if configured
    await sendDailySummary();
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Sync job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### pg_cron Configuration
```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily competitor tracking at 3:00 AM Thailand time
SELECT cron.schedule(
  'competitor-social-tracking',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-domain.com/api/competitors/sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET') || '"}'::jsonb
  ) as request_id;
  $$
);

-- Optional: Schedule more frequent checks for specific competitors
SELECT cron.schedule(
  'competitor-instagram-hourly',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url:='https://your-domain.com/api/competitors/collect/instagram',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{"competitor_ids": [1, 2, 3]}'::jsonb
  ) as request_id;
  $$
);
```

### Admin Dashboard Integration

#### Competitor Management UI
```typescript
// app/admin/competitors/page.tsx
export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <CompetitorsList />
      <CompetitorMetricsChart />
      <RecentChangesAlert />
      <ManualSyncButton />
    </div>
  );
}
```

#### Analytics Dashboard Component
```typescript
// src/components/admin/competitors/competitor-analytics.tsx
export function CompetitorAnalytics() {
  // Display:
  // - Follower growth comparison chart
  // - Market share pie chart
  // - Engagement rate trends
  // - Platform performance matrix
}
```

## Security & Performance Considerations

### Security Measures
1. **Rate Limiting**: Implement delays between requests to avoid detection
2. **User Agent Rotation**: Rotate user agents to appear as different browsers
3. **IP Rotation**: Consider proxy rotation for high-volume scraping
4. **Error Handling**: Graceful degradation when selectors change
5. **Data Validation**: Validate scraped data before storage

### Performance Optimization
1. **Parallel Processing**: Run scrapers for different platforms concurrently
2. **Caching**: Cache unchanged data to reduce database writes
3. **Selective Updates**: Only update metrics that have changed
4. **Database Indexes**: Optimize queries with proper indexing
5. **Background Jobs**: Use background processing for large sync operations

### Anti-Detection Strategies
```typescript
// src/lib/scrapers/anti-detection.ts
export const antiDetectionStrategies = {
  // Random viewport sizes
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 }
  ],
  
  // Realistic user agents
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    // ... more user agents
  ],
  
  // Mouse movement simulation
  async simulateHumanBehavior(page: Page) {
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 300, { steps: 10 });
    // Random scrolling
    await page.evaluate(() => {
      window.scrollTo(0, Math.random() * 500);
    });
  }
};
```

## Error Handling & Monitoring

### Error Types & Handling
```typescript
enum ScrapeErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_PRIVATE = 'ACCOUNT_PRIVATE',
  PLATFORM_CHANGE = 'PLATFORM_CHANGE'
}

class ScrapeError extends Error {
  constructor(
    public type: ScrapeErrorType,
    public platform: string,
    public url: string,
    message: string
  ) {
    super(message);
  }
}
```

### Monitoring & Alerts
1. **Failed Scrapes**: Alert when scraping fails repeatedly
2. **Selector Changes**: Detect when platform HTML structure changes
3. **Data Anomalies**: Alert on unusual metric changes
4. **Performance Metrics**: Track scraping duration and success rates

## Testing Strategy

### Unit Tests
```typescript
// src/lib/scrapers/__tests__/instagram-scraper.test.ts
describe('InstagramScraper', () => {
  it('should parse follower counts correctly', () => {
    // Test various number formats: "1,234", "10.5K", "1.2M"
  });
  
  it('should handle private accounts gracefully', () => {
    // Test error handling for private profiles
  });
});
```

### Integration Tests
```typescript
// app/api/competitors/__tests__/sync.test.ts
describe('Competitor Sync API', () => {
  it('should process all active competitors', async () => {
    // Test full sync workflow
  });
  
  it('should handle partial failures', async () => {
    // Test resilience when some scrapes fail
  });
});
```

### Manual Testing Checklist
- [ ] Test scraping each platform with valid URLs
- [ ] Test error handling with invalid URLs
- [ ] Verify data storage and retrieval
- [ ] Check dashboard visualizations
- [ ] Test manual sync trigger
- [ ] Verify pg_cron job execution

## Deployment Considerations

### Environment Variables
```bash
# Scraping configuration
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_RETRIES=3
SCRAPER_USER_AGENT_ROTATION=true

# Rate limiting
SCRAPER_MIN_DELAY=2000
SCRAPER_MAX_DELAY=5000

# Monitoring
SCRAPER_ALERT_WEBHOOK=https://...
```

### Server Requirements
- **Memory**: Minimum 2GB RAM for Playwright
- **CPU**: 2+ cores recommended for parallel scraping
- **Disk**: 10GB+ for browser cache and logs
- **Network**: Stable connection with good bandwidth

### Scaling Considerations
1. **Horizontal Scaling**: Distribute scraping across multiple workers
2. **Queue System**: Implement job queue for large competitor lists
3. **Data Partitioning**: Consider partitioning metrics table by date
4. **CDN/Caching**: Cache dashboard data for better performance

## Future Enhancements

### Phase 2 Features
1. **TikTok Integration**: Add TikTok profile tracking
2. **YouTube Channels**: Track subscriber counts and video metrics
3. **Sentiment Analysis**: Analyze comments and reviews sentiment
4. **Competitor Content**: Archive competitor posts for analysis
5. **AI Insights**: Generate insights using AI/ML models

### Advanced Analytics
1. **Predictive Analytics**: Forecast follower growth trends
2. **Anomaly Detection**: Identify unusual competitor activities
3. **Content Performance**: Track which content types perform best
4. **Market Share Estimation**: Calculate relative market positions
5. **Competitive Intelligence**: Generate strategic recommendations

### Integration Opportunities
1. **Slack/Teams Notifications**: Daily summaries and alerts
2. **Data Export**: CSV/Excel export functionality
3. **API Access**: Provide API for external tools
4. **Custom Dashboards**: Customizable analytics views
5. **Historical Reports**: Monthly/quarterly comparison reports

## Conclusion

This social media competitor tracking system provides Lengolf with automated, cost-effective competitive intelligence across major social platforms. By leveraging Playwright for web scraping, Supabase for data storage, and pg_cron for automation, the system delivers valuable insights without ongoing API costs while integrating seamlessly with the existing admin infrastructure.