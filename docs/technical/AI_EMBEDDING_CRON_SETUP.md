# AI Embedding Generation - Daily Cron Setup

## Overview
Automated daily embedding generation using Supabase pg_cron to keep AI chat suggestions up-to-date.

---

## Prerequisites

1. ✅ OpenAI API configured in environment
2. ✅ AI embedding endpoint deployed: `/api/ai/generate-embeddings`
3. ✅ `AI_EMBEDDING_SECRET` in environment variables
4. ✅ pg_cron extension installed (already done)

---

## Setup Instructions

### Step 1: Deploy the API Endpoint

The endpoint is located at:
```
app/api/ai/generate-embeddings/route.ts
```

Deploy to Vercel production:
```bash
git add .
git commit -m "feat: Add daily AI embedding generation cron job"
git push origin main
```

### Step 2: Add Environment Variable to Vercel

In Vercel dashboard, add:
```
AI_EMBEDDING_SECRET=d4394ae4b093724886759686ae1a738fefc986f5e9228eb554d0f3d7eacc40bd
```

**Important:** Redeploy after adding the environment variable.

### Step 3: Create pg_cron Job in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- Create daily pg_cron job for AI embedding generation
SELECT cron.schedule(
    'daily-ai-embeddings',              -- Job name
    '0 2 * * *',                        -- Schedule: 2 AM UTC daily
    $$
    SELECT net.http_get(
        url := 'https://lengolf-forms.vercel.app/api/ai/generate-embeddings',
        headers := jsonb_build_object(
            'Authorization', 'Bearer d4394ae4b093724886759686ae1a738fefc986f5e9228eb554d0f3d7eacc40bd'
        )
    ) AS request_id;
    $$
);
```

### Step 4: Verify Job Creation

```sql
-- Check the job was created
SELECT
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname = 'daily-ai-embeddings';
```

Expected output:
```
jobid | jobname              | schedule      | active | command
------|---------------------|---------------|--------|--------
 XX   | daily-ai-embeddings | 0 2 * * *     | true   | SELECT net.http_get...
```

### Step 5: Test the Endpoint Manually

Before waiting for the cron job, test manually:

```bash
curl -X GET https://lengolf-forms.vercel.app/api/ai/generate-embeddings \
  -H "Authorization: Bearer d4394ae4b093724886759686ae1a738fefc986f5e9228eb554d0f3d7eacc40bd"
```

Expected response:
```json
{
  "success": true,
  "processed": 10,
  "errors": 0,
  "processingTimeMs": 5432,
  "timestamp": "2025-01-15T02:00:00.000Z"
}
```

---

## Monitoring

### Check Cron Job History

```sql
-- View recent job runs
SELECT
    runid,
    jobid,
    job_name,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE job_name = 'daily-ai-embeddings'
ORDER BY start_time DESC
LIMIT 10;
```

### Check Embedding Coverage

```sql
-- Verify embeddings are being generated daily
SELECT
    channel_type,
    COUNT(*) as total_embeddings,
    MAX(created_at) as latest_embedding,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h
FROM message_embeddings
GROUP BY channel_type;
```

---

## Troubleshooting

### Job Not Running

```sql
-- Check if job is active
SELECT jobid, jobname, active
FROM cron.job
WHERE jobname = 'daily-ai-embeddings';

-- If inactive, activate it
UPDATE cron.job
SET active = true
WHERE jobname = 'daily-ai-embeddings';
```

### Job Running But Failing

```sql
-- Check error messages
SELECT
    status,
    return_message,
    start_time
FROM cron.job_run_details
WHERE job_name = 'daily-ai-embeddings'
ORDER BY start_time DESC
LIMIT 5;
```

Common issues:
- **401 Unauthorized**: Check `AI_EMBEDDING_SECRET` matches in both places
- **503 Service Unavailable**: OpenAI API key not configured
- **Timeout**: Increase timeout if processing many messages

### No New Embeddings

If job runs successfully but no new embeddings:
- Check if there are new messages in `unified_messages`
- Verify messages aren't already embedded (check `message_embeddings`)
- Run manual batch embed to backfill:

```bash
curl -X POST http://localhost:3000/api/ai/batch-embed \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 7, "batchSize": 10}'
```

---

## Manual Operations

### Disable Cron Job

```sql
UPDATE cron.job
SET active = false
WHERE jobname = 'daily-ai-embeddings';
```

### Change Schedule

```sql
-- Change to run every 6 hours
SELECT cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-ai-embeddings'),
    schedule := '0 */6 * * *'
);
```

### Delete Job

```sql
SELECT cron.unschedule('daily-ai-embeddings');
```

### Manually Trigger Job

```sql
-- Force immediate run (useful for testing)
SELECT cron.run_job('daily-ai-embeddings');
```

---

## Cost Estimation

**Daily Embedding Generation:**
- Average: 50-100 new messages/day
- Cost per embedding: ~$0.0001
- **Daily cost: $0.005-0.01**
- **Monthly cost: ~$0.15-0.30**

**Total AI System Cost:**
- Embeddings: $0.30/month
- Suggestions: $5-10/month
- **Total: ~$5.30-10.30/month**

---

## Related Documentation

- [AI Chat Suggestions Documentation](../features/public/customer-chat/AI_CHAT_SUGGESTIONS.md)
- [Embedding Service](../../src/lib/ai/embedding-service.ts)
- [Batch Embed API](../../app/api/ai/batch-embed/route.ts)
- [Existing pg_cron Jobs](#existing-jobs)

### Existing Jobs

Our current pg_cron jobs:
1. `check review requests` - Every 5 minutes
2. `weekly-inventory-report` - Mondays at 2 AM
3. `daily-package-sync` - Daily at 2 AM (inactive)
4. `hourly-sales-sync` - Hourly (inactive)
5. `data-freshness-email-alerts` - Every 2 hours
6. `hourly-sales-etl` - Every 15 minutes
7. `calendar-sync-15min` - Every 15 minutes
8. `hourly-mv-refresh` - Hourly at 3 minutes past
9. `customer-kpi-cache-refresh` - Every 6 hours
10. `competitor-sync` - Daily at 8 PM

Our new job will be #11: `daily-ai-embeddings` at 2 AM UTC.

---

## Setup Status

### ✅ Development Complete (October 19, 2025)

1. ✅ **API endpoint created:** `/api/ai/generate-embeddings`
2. ✅ **Environment variable added:** `AI_EMBEDDING_SECRET` in `.env.local`
3. ✅ **Manual batch backfill completed:** 379 messages processed (30 days)
4. ✅ **Database constraints updated:** Support for Meta platforms (Facebook, Instagram, WhatsApp)
5. ✅ **Embedding analysis completed:** See [AI_EMBEDDING_ANALYSIS.md](./AI_EMBEDDING_ANALYSIS.md)

### 📋 Production Deployment Checklist

**Before deploying to production:**

1. ⏳ Deploy endpoint to Vercel production
2. ⏳ Add `AI_EMBEDDING_SECRET` to Vercel environment variables
3. ⏳ Create pg_cron job in Supabase (SQL provided below)
4. ⏳ Test manually with production URL
5. ⏳ Wait 24 hours for first automatic run
6. ⏳ Verify embeddings are being generated
7. ⏳ Monitor for errors
