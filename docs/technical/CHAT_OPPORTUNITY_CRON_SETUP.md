# Chat Opportunity Batch Processing - Cron Setup

## Overview

Automated daily batch processing using a Supabase Edge Function to scan for cold conversations, analyze them with AI, and create sales opportunities automatically.

**Schedule:** Daily at 2 AM UTC (9 AM Bangkok time)

---

## Architecture

```
pg_cron (2 AM UTC)
    ↓
Supabase Edge Function: chat-opportunity-scan
    ↓
OpenAI GPT-4o-mini (analyze conversations)
    ↓
Database: chat_opportunities table
```

---

## URLs & Endpoints

| Resource | URL |
|----------|-----|
| **Edge Function** | `https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/chat-opportunity-scan` |
| **Supabase Dashboard** | `https://supabase.com/dashboard/project/bisimqmtxjsptehhqpeg/functions/chat-opportunity-scan` |
| **Function Logs** | `https://supabase.com/dashboard/project/bisimqmtxjsptehhqpeg/functions/chat-opportunity-scan/logs` |
| **Cron Jobs** | `https://supabase.com/dashboard/project/bisimqmtxjsptehhqpeg/integrations/cron/jobs` |

---

## Current Setup

### Cron Job (Already Created)

| Property | Value |
|----------|-------|
| **Job ID** | 32 |
| **Job Name** | `daily-chat-opportunity-scan` |
| **Schedule** | `0 2 * * *` (2 AM UTC / 9 AM Bangkok) |
| **Status** | Active |
| **Target** | Edge Function via `net.http_post` |

### Edge Function

| Property | Value |
|----------|-------|
| **Name** | `chat-opportunity-scan` |
| **Status** | ACTIVE |
| **Timeout** | 150 seconds (Free) / 400 seconds (Pro) |
| **Source** | `supabase/functions/chat-opportunity-scan/index.ts` |

### Required Secrets (Edge Function)

In Supabase Dashboard → Edge Functions → `chat-opportunity-scan` → Secrets:

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini analysis |

> Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available.

---

## How It Works

1. **pg_cron triggers** the Edge Function at 2 AM UTC daily
2. **Edge Function** calls `find_chat_opportunities()` RPC to find cold conversations
3. **For each conversation**:
   - Fetches last 20 messages from `unified_messages`
   - Sends to OpenAI GPT-4o-mini for analysis
   - If opportunity detected (confidence ≥ 0.6), creates record in `chat_opportunities`
4. **Results logged** to `chat_opportunity_batch_runs` table

### Parameters (Defaults)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `daysThreshold` | 3 | Minimum days since last message |
| `maxAgeDays` | 30 | Maximum age of conversation |
| `confidenceThreshold` | 0.6 | Minimum AI confidence to create opportunity |
| `batchSize` | 10 | Max conversations per run |
| `delayMs` | 2000 | Delay between LLM calls (rate limiting) |

---

## Monitoring

### Check Batch Run History

```sql
SELECT
    id,
    started_at,
    completed_at,
    status,
    scanned,
    analyzed,
    created,
    skipped,
    errors,
    processing_time_ms
FROM chat_opportunity_batch_runs
ORDER BY started_at DESC
LIMIT 10;
```

### Check Cron Job Status

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'daily-chat-opportunity-scan';
```

### Check Recent Cron Runs

```sql
SELECT
    runid,
    job_name,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE job_name = 'daily-chat-opportunity-scan'
ORDER BY start_time DESC
LIMIT 10;
```

### View Edge Function Logs

Supabase Dashboard → Edge Functions → `chat-opportunity-scan` → Logs

Or via CLI:
```bash
npx supabase functions logs chat-opportunity-scan --project-ref bisimqmtxjsptehhqpeg
```

---

## Manual Testing

### Invoke Edge Function Directly

```bash
curl -X POST https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/chat-opportunity-scan \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE" \
  -H "Content-Type: application/json"
```

### With Custom Parameters

```bash
curl -X POST https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/chat-opportunity-scan \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "maxAgeDays": 60}'
```

### Force Run Cron Job Now

```sql
SELECT cron.run_job('daily-chat-opportunity-scan');
```

---

## Troubleshooting

### Edge Function Errors

**"Missing OPENAI_API_KEY"**
- Add the secret in Supabase Dashboard → Edge Functions → Secrets

**Timeout errors**
- Reduce `batchSize` parameter
- Increase `delayMs` to avoid rate limits

### Cron Job Not Running

```sql
-- Check if active
SELECT active FROM cron.job WHERE jobname = 'daily-chat-opportunity-scan';

-- Activate if needed
UPDATE cron.job SET active = true WHERE jobname = 'daily-chat-opportunity-scan';
```

### No Opportunities Created

1. Check if eligible conversations exist:
```sql
SELECT * FROM find_chat_opportunities(3, 30) LIMIT 5;
```

2. Check Edge Function logs for "not_an_opportunity" classifications

3. Verify confidence threshold isn't too high

---

## Management

### Disable Cron Job

```sql
UPDATE cron.job SET active = false WHERE jobname = 'daily-chat-opportunity-scan';
```

### Change Schedule

```sql
SELECT cron.alter_job(
    job_id := 32,
    schedule := '0 */6 * * *'  -- Every 6 hours
);
```

### Delete Cron Job

```sql
SELECT cron.unschedule('daily-chat-opportunity-scan');
```

### Redeploy Edge Function

```bash
cd supabase/functions/chat-opportunity-scan
npx supabase functions deploy chat-opportunity-scan --project-ref bisimqmtxjsptehhqpeg
```

---

## Cost Estimation

| Item | Cost |
|------|------|
| Edge Function invocations | Free (within limits) |
| OpenAI GPT-4o-mini (~10 conversations/day) | ~$0.01-0.05/day |
| **Monthly estimate** | ~$0.30-1.50 |

---

## Related Files

| File | Purpose |
|------|---------|
| `supabase/functions/chat-opportunity-scan/index.ts` | Edge Function source |
| `supabase/migrations/20260205120000_create_chat_opportunities.sql` | Main tables & functions |
| `supabase/migrations/20260205130000_add_chat_opportunity_batch_runs.sql` | Audit table |
| `src/components/chat-opportunities/OpportunitiesTab.tsx` | UI (shows batch status) |
| `app/api/chat-opportunities/batch-process/status/route.ts` | Status API for UI |

---

## Setup Checklist

- [x] Edge Function deployed (`chat-opportunity-scan`)
- [x] Cron job created (`daily-chat-opportunity-scan`, Job ID 32)
- [x] Database migration applied (`chat_opportunity_batch_runs` table)
- [x] UI updated (scan button removed, batch status added)
- [ ] **Add OPENAI_API_KEY secret** in Supabase Dashboard → Edge Functions → Secrets
- [ ] Wait for first automated run (2 AM UTC)
- [ ] Verify results in `chat_opportunity_batch_runs` table
