# Staff Scheduling System Performance Optimizations

This document outlines the comprehensive performance optimizations implemented for the staff scheduling system.

## Overview

The performance optimization implementation includes:

1. **SWR Data Fetching with Cache Invalidation**
2. **Database Query Optimization with Additional Indexes**
3. **Image Optimization for Staff Profile Photos**
4. **Code Splitting for Admin Components**
5. **Enhanced Service Worker for Offline Caching**
6. **Performance Monitoring and Analytics**

## Implementation Details

### 1. SWR Data Fetching (`src/hooks/useStaffScheduleSWR.ts`)

**Features:**
- Optimized cache invalidation strategies
- Network-aware caching with different TTL values
- Automatic retry with exponential backoff
- Preloading capabilities for better UX
- Cache hit/miss tracking

**Usage:**
```typescript
import { useStaff, useSchedules, useTeamSchedule } from '@/hooks/useStaffScheduleSWR'

// Use optimized hooks instead of the original useStaffSchedule
const { staff, staffLoading, refreshStaff } = useStaff()
const { schedules, indicators, refreshSchedules } = useSchedules({ staff_id: 1 })
```

**Cache Configuration:**
- Staff data: 10 minutes TTL
- Schedule data: 5 minutes TTL
- Team schedule: 3 minutes TTL
- Admin data: 2 minutes TTL

### 2. Database Optimizations (`scripts/optimize-staff-scheduling-performance.sql`)

**New Indexes:**
```sql
-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_staff_schedules_staff_date_time 
ON backoffice.staff_schedules(staff_id, schedule_date, start_time, end_time);

CREATE INDEX CONCURRENTLY idx_staff_schedules_team_view 
ON backoffice.staff_schedules(schedule_date, start_time, staff_id, end_time, location);

-- Partial indexes for active staff only
CREATE INDEX CONCURRENTLY idx_staff_active 
ON backoffice.staff(id, staff_name, is_active) WHERE is_active = true;
```

**Optimized Functions:**
- `get_staff_schedule_optimized()` - Better index usage
- `get_schedule_indicators_optimized()` - Improved performance
- `get_team_schedule_for_date_optimized()` - Enhanced JSON aggregation
- `get_schedule_statistics()` - Dashboard KPI calculations

**Materialized View:**
- `mv_current_week_schedules` - Pre-computed current week data

### 3. Image Optimization (`src/components/common/OptimizedImage.tsx`)

**Features:**
- Next.js Image component integration
- WebP/AVIF format support
- Automatic blur placeholders
- Fallback to initials with consistent colors
- Lazy loading with intersection observer
- Error handling and retry mechanisms

**Usage:**
```typescript
import { StaffProfileImage } from '@/components/common/OptimizedImage'

<StaffProfileImage
  src={staff.profile_photo}
  staffName={staff.name}
  size="md"
  priority={true}
/>
```

**Optimization Settings:**
- Formats: WebP, AVIF fallback to JPEG
- Cache TTL: 7 days for images
- Device sizes: Responsive breakpoints
- Quality: 85% for profile photos

### 4. Code Splitting (`src/components/admin/LazyAdminComponents.tsx`)

**Lazy Loaded Components:**
- `LazyScheduleDashboard` - Main admin dashboard
- `LazyScheduleForm` - Schedule creation/editing form
- `LazyScheduleGrid` - Weekly schedule grid
- `LazyConfirmDialog` - Confirmation dialogs

**Features:**
- Custom loading states for each component
- Preloading on hover/focus for better UX
- Error boundaries for graceful failures
- Bundle size reduction for initial page load

**Usage:**
```typescript
import { LazyScheduleForm, useAdminComponentPreloader } from '@/components/admin/LazyAdminComponents'

const { preloadOnHover } = useAdminComponentPreloader()

<Button {...preloadOnHover('form')}>
  Add Schedule
</Button>
```

### 5. Enhanced Service Worker (`public/sw.js`)

**Caching Strategies:**
- **Network First with TTL** - API data (5 minutes)
- **Cache First with TTL** - Images (24 hours), Static assets (7 days)
- **Stale While Revalidate** - Background updates for aging cache

**Features:**
- Automatic cache cleanup for expired entries
- Network-aware timeout adjustments
- Offline fallback pages
- Background sync for failed requests
- Cache versioning and migration

**Cache Structure:**
```javascript
const CACHE_TTL = {
  API: 5 * 60 * 1000,      // 5 minutes
  IMAGES: 24 * 60 * 60 * 1000, // 24 hours
  STATIC: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

### 6. Performance Monitoring (`src/lib/performance-monitor.ts`)

**Metrics Tracked:**
- API response times
- Component render times
- Cache hit/miss rates
- Network performance
- User interactions

**Features:**
- Automatic performance observer integration
- Development-only logging
- Export capabilities for analysis
- Memory management with cleanup
- Performance thresholds and alerts

**Usage:**
```typescript
import { performanceMonitor } from '@/lib/performance-monitor'

// Measure async operations
const result = await performanceMonitor.measureAsync('api.getSchedules', async () => {
  return await fetchSchedules()
})

// Record cache performance
performanceMonitor.recordCacheHit('schedules', true)
```

## Configuration Files

### Cache Configuration (`src/lib/cache-config.ts`)

Centralized configuration for all caching strategies:

```typescript
export const CACHE_TTL = {
  STAFF: 10 * 60 * 1000,        // 10 minutes
  SCHEDULES: 5 * 60 * 1000,     // 5 minutes
  TEAM_SCHEDULE: 3 * 60 * 1000, // 3 minutes
  ADMIN_DATA: 2 * 60 * 1000,    // 2 minutes
  IMAGES: 24 * 60 * 60 * 1000,  // 24 hours
  STATIC: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

### Next.js Configuration (`next.config.js`)

Optimized build configuration:

```javascript
module.exports = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
  webpack: (config, { dev, isServer }) => {
    // Bundle optimization
    // Code splitting configuration
    // Admin component chunking
  }
}
```

## Performance Metrics

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Page Load | ~3s | ~1.5s | 50% faster |
| API Response Cache Hit | 0% | 75%+ | Significant |
| Image Load Time | ~2s | ~500ms | 75% faster |
| Admin Bundle Size | ~500KB | ~200KB | 60% smaller |
| Offline Functionality | None | Full | New feature |

### Monitoring Thresholds

```typescript
export const performanceThresholds = {
  api: {
    FAST: 200,      // < 200ms
    ACCEPTABLE: 1000, // < 1s
    SLOW: 3000      // > 3s
  },
  cache: {
    EXCELLENT: 90,  // > 90% hit rate
    GOOD: 75,       // > 75% hit rate
    POOR: 50        // < 50% hit rate
  }
}
```

## Deployment Instructions

### 1. Database Optimizations

Execute the database optimization script:

```bash
# Connect to your database and run:
psql -d your_database -f scripts/optimize-staff-scheduling-performance.sql
```

### 2. Application Deployment

```bash
# Install dependencies (if needed)
npm install

# Run performance optimization script
node scripts/apply-performance-optimizations.js

# Build with optimizations
npm run build

# Optional: Analyze bundle
ANALYZE=true npm run build
```

### 3. Service Worker Registration

Ensure the service worker is properly registered in your main layout or app component:

```typescript
// In your main layout or _app.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

## Monitoring and Maintenance

### Development Monitoring

Performance metrics are automatically logged in development mode:

```bash
# Start development server
npm run dev

# Performance summary is logged every 30 seconds
# Check browser console for detailed metrics
```

### Production Monitoring

For production, integrate with your monitoring solution:

```typescript
// Example integration with monitoring service
performanceMonitor.exportMetrics() // Get metrics for external monitoring
```

### Cache Maintenance

```typescript
// Manual cache invalidation when needed
import { scheduleCache } from '@/hooks/useStaffScheduleSWR'

// Invalidate specific caches
scheduleCache.invalidateStaff()
scheduleCache.invalidateSchedules()
scheduleCache.invalidateAll()
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check cache size limits in `src/lib/cache-config.ts`
   - Adjust cleanup intervals if needed

2. **Slow Database Queries**
   - Verify indexes are created: `\d+ backoffice.staff_schedules`
   - Check query execution plans: `EXPLAIN ANALYZE`

3. **Service Worker Not Updating**
   - Clear browser cache
   - Check service worker registration
   - Verify cache versioning

4. **Bundle Size Too Large**
   - Run bundle analyzer: `ANALYZE=true npm run build`
   - Check for unused dependencies
   - Verify code splitting is working

### Performance Debugging

```typescript
// Enable detailed logging in development
localStorage.setItem('debug-performance', 'true')

// View performance summary
performanceMonitor.logSummary()

// Export metrics for analysis
const metrics = performanceMonitor.exportMetrics()
console.log(metrics)
```

## Future Enhancements

1. **CDN Integration** - Serve static assets from CDN
2. **Edge Caching** - Implement edge-side caching
3. **Prefetching** - Intelligent prefetching based on user behavior
4. **Compression** - Implement Brotli compression
5. **Critical CSS** - Extract and inline critical CSS
6. **Resource Hints** - Add preload/prefetch hints

## Conclusion

These performance optimizations provide significant improvements in:
- Page load times
- API response caching
- Image loading performance
- Bundle size reduction
- Offline functionality
- User experience

The implementation is designed to be maintainable and scalable, with comprehensive monitoring and configuration options.