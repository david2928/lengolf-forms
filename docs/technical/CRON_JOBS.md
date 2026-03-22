# Cron Jobs and Scheduled Tasks

## Overview

LENGOLF uses two categories of scheduled tasks: **Vercel-triggered cron endpoints** (Next.js API routes called by an external scheduler) and **pg_cron jobs** (PostgreSQL-native scheduled tasks running inside Supabase). This document catalogs all automated jobs, their schedules, what they do, and how to monitor them.

## Table of Contents

1. [Summary Table](#summary-table)
2. [Vercel API Cron Endpoints](#vercel-api-cron-endpoints)
3. [pg_cron Database Jobs](#pgcron-database-jobs)
4. [Authentication](#authentication)
5. [Monitoring and Debugging](#monitoring-and-debugging)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Adding New Cron Jobs](#adding-new-cron-jobs)
8. [Troubleshooting](#troubleshooting)

---

## Summary Table

### Vercel API Cron Endpoints

| Job | Endpoint | Schedule | Trigger | Purpose |
|-----|----------|----------|---------|---------|
| Bank Reconciliation | `GET /api/cron/bank-reconciliation` | Daily ~10:00 AM BKK | External scheduler | Compare yesterday's bank, merchant, POS data; alert on discrepancies via LINE |
| Weekly Business Report | `GET /api/cron/weekly-report` | Weekly (Monday) | External scheduler | Send weekly revenue, bookings, ads, traffic summary via LINE |
| Welcome Back Campaign | `GET /api/cron/welcome-back` | Monthly (15th) | External scheduler | Re-engage lapsed customers (90+ days inactive) via LINE flex messages |
| Inventory Weekly Report | `GET /api/inventory/weekly-report` | Weekly | External scheduler / pg_cron | Check inventory levels, send low-stock alerts via LINE |

### pg_cron Database Jobs

| Job Name | Schedule | Purpose |
|----------|----------|---------|
| `refresh-chat-sla-metrics-15min` | Every 15 minutes | Refresh `chat_sla_metrics` materialized view (concurrent) |
| `google-reviews-sync-6h` | Every 6 hours | Sync Google Reviews via Edge Function |
| `ai-eval-weekly` | Sundays 04:00 UTC (11:00 BKK) | Run AI response evaluation batch via Edge Function |
| `refresh_all_mv` (jobid 20) | Hourly | Refresh all POS materialized views (5 views) |

---

## Vercel API Cron Endpoints

### Bank Reconciliation

**Endpoint**: `GET /api/cron/bank-reconciliation`
**Schedule**: Daily, approximately 10:00 AM Bangkok time
**Files**: `app/api/cron/bank-reconciliation/route.ts`, `build-flex-message.ts`

#### What It Does

1. Calculates yesterday's date in Bangkok timezone (UTC+7)
2. Fetches data from four sources for yesterday (and today for eWallet T+1 settlement):
   - Bank statement transactions
   - Merchant settlement files (card and eWallet)
   - POS daily closing data
   - POS daily sales data
3. Runs the reconciliation engine to compare all sources
4. Sends a LINE notification based on the result:

| Scenario | Action |
|----------|--------|
| All data sources empty | Sends "Data Missing" flex message |
| Some data sources missing | Sends "Partial Data Missing" flex message |
| All matched or N/A | No notification (silent success) |
| Variance within 10 THB threshold | No notification (within tolerance) |
| Significant variance detected | Sends "Discrepancy" flex message with details |
| Error during processing | Sends error alert via LINE text message |

#### Configuration

- **Gap threshold**: 10 THB (variances below this are ignored)
- **eWallet adjustment**: When eWallet merchant files are pending but POS shows eWallet sales, the gap is adjusted to avoid false alerts
- **LINE target**: General group (`LINE_MESSAGING.groups.general`)

---

### Weekly Business Report

**Endpoint**: `GET /api/cron/weekly-report`
**Schedule**: Weekly (typically Monday morning)
**Files**: `app/api/cron/weekly-report/route.ts`, `fetch-weekly-data.ts`, `build-flex-message.ts`

#### What It Does

1. Fetches the previous week's data (Monday to Sunday):
   - POS revenue by category (bay rentals, coaching, packages, club rentals, F&B, other)
   - Payment breakdown (cash, card, QR)
   - Booking metrics (total, unique customers, new vs. returning, hours, types)
   - Coaching session metrics
   - Google Ads performance (spend, clicks, impressions, conversions, CTR, CPC)
   - Meta Ads performance (spend, clicks, impressions, reach, conversions)
   - Website traffic (sessions, users, new users, page views, booking conversions)
2. Builds a LINE flex message carousel summarizing all metrics
3. Sends to the general LINE group (or a test user if `testUserId` is provided)

#### Test Mode

Pass `?testUserId={LINE_USER_ID}` to send the report to a specific user instead of the group. In development with `SKIP_AUTH=true`, authentication is bypassed.

---

### Welcome Back Campaign

**Endpoint**: `GET /api/cron/welcome-back`
**Schedule**: Monthly, 15th of each month
**Files**: `app/api/cron/welcome-back/route.ts`

#### What It Does

1. Checks if a campaign was already sent this month (prevents duplicates)
2. Fetches flex message templates for Thai and English versions
3. Calls `get_lapsed_customers_for_reengagement` RPC to identify lapsed customers:
   - 90+ days since last activity
   - No active packages
   - Not sent a Welcome Back message in the last 90 days
4. For each language (Thai and English):
   - Creates a LINE audience
   - Populates audience members
   - Creates a broadcast campaign
   - Triggers send via `POST /api/line/campaigns/{id}/send`
5. Returns summary with counts and campaign results

#### Dry Run

Pass `?dryRun=true` to see which customers would be targeted without actually sending messages.

#### Template IDs

| Language | Template ID |
|----------|-------------|
| Thai | `6c06cdad-a6de-4c88-90d4-603e2a937f29` |
| English | `176b9d9b-fe77-4792-bce9-32b66e351466` |

---

### Inventory Weekly Report

**Endpoint**: `GET /api/inventory/weekly-report`
**Schedule**: Weekly
**Files**: `app/api/inventory/weekly-report/route.ts`

#### What It Does

1. Fetches the latest inventory submission data (or a specific date via `?date=YYYY-MM-DD`)
2. Analyzes stock levels against reorder thresholds for each product
3. Handles multiple input types:
   - **Number**: Compares against reorder threshold
   - **Stock slider**: Checks for "Need to Order" or "Out of Stock" values
   - **Glove sizes**: Parses JSON to check individual size quantities
4. Builds a LINE flex message with:
   - Status bar (OK count vs. low count with progress bar)
   - Low-stock items grouped by category with color-coded severity
   - Special handling for cash items (highlighted as "COLLECT NOW")
   - Supplier order summary (grouped by supplier with item counts)
5. Sends to the general LINE group (or test user via `?testUserId`)

#### Endpoint Methods

Both `GET` and `POST` are supported (`POST` delegates to `GET` for pg_cron compatibility since cron jobs may send POST requests).

---

## pg_cron Database Jobs

### Chat SLA Metrics Refresh

**Job name**: `refresh-chat-sla-metrics-15min`
**Schedule**: `*/15 * * * *` (every 15 minutes)
**Migration**: `20251214164200_add_pgcron_chat_sla_refresh.sql`, `20251214164306_fix_chat_sla_concurrent_refresh.sql`

Refreshes the `public.chat_sla_metrics` materialized view concurrently (requires a unique index). This keeps chat SLA tracking data near-real-time without blocking reads.

---

### Google Reviews Sync

**Job name**: `google-reviews-sync-6h`
**Schedule**: `0 */6 * * *` (every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC)
**Migration**: `20260213070000_add_google_reviews_sync_cron.sql`

Uses `pg_net` to make an HTTP POST to the `google-reviews-sync` Supabase Edge Function. The Edge Function fetches latest Google Reviews and stores them in the database.

---

### AI Evaluation Weekly

**Job name**: `ai-eval-weekly`
**Schedule**: `0 4 * * 0` (Sundays at 04:00 UTC / 11:00 AM Bangkok time)
**Migration**: `20260302130000_add_ai_eval_weekly_cron.sql`

Uses `pg_net` to call the `ai-eval-run` Supabase Edge Function with parameters:
- `sample_count`: 150
- `batch_size`: 10
- `timeout`: 150 seconds

Evaluates AI-suggested chat responses against quality criteria. Wrapped in a `DO` block with exception handling so environments without `pg_cron`/`pg_net` (e.g., preview branches) skip gracefully.

---

### POS Materialized Views Refresh

**Job name**: (jobid 20 -- pre-existing)
**Schedule**: Hourly
**Function**: `pos.refresh_all_mv()`
**Migration**: `20260108220000_fix_refresh_all_mv_function.sql`

Refreshes 5 materialized views in dependency order:

1. `pos.customer_first_purchase_dates` (must be first -- other views depend on it)
2. `pos.mv_weekly_sales_summary`
3. `pos.mv_monthly_sales_summary`
4. `pos.mv_weekly_reports_cache`
5. `pos.mv_monthly_reports_cache`

All refreshes use `CONCURRENTLY` to avoid locking.

---

## Authentication

### Vercel API Endpoints

All cron API endpoints authenticate via the `CRON_SECRET` environment variable:

```
Authorization: Bearer {CRON_SECRET}
```

The pattern is consistent across all endpoints:

```typescript
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Development bypass**: Some endpoints (weekly-report, welcome-back) support a development bypass when `NODE_ENV=development` and `SKIP_AUTH=true`.

### pg_cron Jobs

pg_cron jobs run within the database context and do not require HTTP authentication. Jobs that call Edge Functions include the Supabase anon key in the request headers (this key is intentionally public).

---

## Monitoring and Debugging

### Vercel API Endpoints

- **Vercel Logs**: Check the Vercel dashboard for function execution logs
- **Response payloads**: All endpoints return structured JSON with `status`, `reason`, and relevant data
- **LINE error alerts**: Bank reconciliation and weekly report endpoints attempt to send LINE alerts if processing fails

### pg_cron Jobs

Check job status and execution history:

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- View recent execution history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Check a specific job
SELECT * FROM cron.job WHERE jobname = 'refresh-chat-sla-metrics-15min';
```

### Common Log Prefixes

| Prefix | Endpoint |
|--------|----------|
| `[bank-recon-cron]` | Bank reconciliation |
| `[weekly-report]` | Weekly business report |
| `[welcome-back]` | Welcome back campaign |
| `[inventory-report]` | Inventory weekly report |

---

## Error Handling Patterns

### LINE Error Alerts

Both the bank reconciliation and weekly report endpoints have a `sendLineError` helper that sends a text message to the general LINE group when processing fails:

```typescript
async function sendLineError(message: string): Promise<void> {
  try {
    const client = createLineClient(token);
    await client.pushTextMessage(groupId, message);
  } catch (e) {
    console.error('Failed to send LINE error alert:', e);
  }
}
```

### Idempotency

- **Welcome Back**: Checks for existing campaigns with the same month label before creating new ones
- **Bank Reconciliation**: Runs for yesterday only; re-running produces the same result
- **Inventory Report**: Reads latest submission data; safe to re-run

### Graceful Degradation

- pg_cron jobs for Edge Functions are wrapped in `DO $$ ... EXCEPTION WHEN OTHERS THEN ... $$` blocks so preview branches without pg_cron skip setup gracefully
- LINE notification failures are caught and logged without failing the overall cron job

---

## Adding New Cron Jobs

### Vercel API Endpoint Pattern

1. Create route at `app/api/cron/{job-name}/route.ts`
2. Add `CRON_SECRET` authentication check
3. Implement the job logic
4. Return structured JSON response
5. Add LINE error alerting for critical failures
6. Configure the external scheduler to call the endpoint

```typescript
export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Job logic here
    return NextResponse.json({ status: 'ok', ... });
  } catch (error) {
    console.error('[job-name] Error:', error);
    // Optionally send LINE alert
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
```

### pg_cron Job Pattern

Create a migration in `supabase/migrations/`:

```sql
-- Wrap in DO block for graceful degradation on preview branches
DO $$
BEGIN
  PERFORM cron.schedule(
    'job-name',
    '0 */6 * * *',  -- cron expression
    $cron$
      -- SQL to execute, or pg_net HTTP call for Edge Functions
      SELECT net.http_post(
        url := 'https://....supabase.co/functions/v1/function-name',
        headers := '{"Authorization":"Bearer ..."}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      ) AS request_id;
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END;
$$;

-- To unschedule: SELECT cron.unschedule('job-name');
-- To check status: SELECT * FROM cron.job WHERE jobname = 'job-name';
```

---

## Troubleshooting

### Cron Endpoint Returns 401

- Verify `CRON_SECRET` is set in the Vercel environment variables
- Confirm the scheduler sends the header: `Authorization: Bearer {CRON_SECRET}`

### LINE Notifications Not Sending

- Check `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_GROUP_ID` environment variables
- Verify the LINE channel is not rate-limited
- Check Vercel function logs for LINE API errors

### pg_cron Job Not Running

```sql
-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'your-job-name';

-- Check recent execution results
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'your-job-name')
ORDER BY start_time DESC
LIMIT 5;
```

### Bank Reconciliation Missing Data Alerts

This is expected behavior when data sources have not been populated for the previous day. Common causes:
- Bank statement not yet imported
- Merchant settlement file not yet available (especially eWallet T+1)
- POS closing not performed
- Holiday or closed day

### Welcome Back Sends Duplicate Campaigns

The endpoint checks for existing campaigns by month label. If a campaign was partially sent (status = `sending`), it will not create a new one. If the status is `draft` or `failed`, manual cleanup may be needed.

---

*Last updated: 2026-03-21*
