# AI Evaluation System

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Evaluation Framework](#evaluation-framework)
5. [How Evaluations Run](#how-evaluations-run)
6. [Sample Analysis](#sample-analysis)
7. [Judge Scoring](#judge-scoring)
8. [Dashboard Tabs](#dashboard-tabs)
9. [AI Suggestion Tester](#ai-suggestion-tester)
10. [API Endpoints](#api-endpoints)
11. [Database Schema](#database-schema)
12. [Component Structure](#component-structure)
13. [Troubleshooting](#troubleshooting)

## Overview

The AI Evaluation System is an automated quality monitoring framework for LENGOLF's AI suggestion engine. It samples real customer conversations, re-runs the AI suggestion pipeline against them, and uses a separate LLM "judge" to score the quality of each response across multiple dimensions. Results are tracked over time to detect regressions and measure improvements as the prompt or model evolves.

The system consists of two admin interfaces:
- **AI Eval Dashboard** (`/admin/ai-eval`) -- Runs, trends, and detailed sample analysis
- **AI Suggestion Tester** (`/admin/ai-test`) -- Interactive sandbox for testing AI responses to individual messages

### Key Capabilities
- **Automated Weekly Evaluations**: Cron-triggered runs every Sunday at 11:00 AM Bangkok time
- **Manual Evaluation Triggers**: On-demand runs with configurable sample count and optional label
- **Multi-dimensional Scoring**: Appropriateness, helpfulness, tone match, and brevity (1-5 scale each)
- **Intent Breakdown**: Performance tracked by detected intent category
- **Prompt Version Tracking**: Compare scores across prompt versions and git commits
- **Score Trends**: Historical line charts showing quality over time
- **Sample Explorer**: Drill into individual samples to see customer message, AI response, and judge reasoning

### Access
- **Eval Dashboard URL**: `/admin/ai-eval`
- **Tester URL**: `/admin/ai-test`
- **Access Level**: Authenticated users (session required)

## Features

### Eval Dashboard Features
1. **KPI Cards**: Latest run's average overall score, sample count, judged count, and comparison with previous run
2. **Score Trends Chart**: Line chart of average scores over time (overall, appropriateness, helpfulness, tone, brevity)
3. **Score Distribution Chart**: Histogram of judge_overall scores for the latest run
4. **Intent Performance Chart**: Bar chart showing average scores per intent category
5. **Run History Table**: Paginated list of all eval runs with status, scores, and metadata
6. **Prompt Comparison Chart**: Side-by-side score comparison across prompt versions
7. **Sample Explorer**: Filterable table of individual samples with full judge reasoning

### AI Suggestion Tester Features
1. **Chat Interface**: Conversational UI for testing customer messages
2. **Session Mode**: Build up multi-turn conversation context (messages carry forward)
3. **Single Mode**: Each message is independent (no conversation history)
4. **Channel Selection**: Test across LINE, Website, Facebook, Instagram, WhatsApp
5. **Preset Questions**: Quick-fire common customer questions in Thai and English
6. **KPI Strip**: Confidence score, response time, similar message count, detected intent
7. **Bilingual Output**: English and Thai response side by side
8. **Function Call Details**: View tool calls, parameters, and results
9. **Suggested Images**: View image suggestions with similarity scores
10. **Debug Context**: System prompt excerpt, skills used, FAQ matches, model info

## Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Recharts for visualizations
- **Data Fetching**: SWR hooks with 30-second deduplication
- **Eval Engine**: Supabase Edge Function (`ai-eval-run`)
- **AI Models**: Configurable suggestion model + separate judge model
- **Scheduling**: pg_cron for weekly automated runs
- **Database**: Dedicated `ai_eval` schema in Supabase

### System Architecture
```
                 ┌──────────────┐
                 │   pg_cron    │ (weekly trigger)
                 └──────┬───────┘
                        │
                        v
┌──────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Admin UI │───>│  Next.js API     │───>│ Supabase Edge    │
│ /ai-eval │    │  /api/ai-eval/*  │    │ Function         │
└──────────┘    └──────────────────┘    │ (ai-eval-run)    │
                                        └───────┬──────────┘
                                                │
                                    ┌───────────┼───────────┐
                                    v           v           v
                              Sample real   Run AI      Judge AI
                              conversations suggestion  scores each
                              from DB       pipeline    response
                                    │           │           │
                                    v           v           v
                              ┌─────────────────────────────────┐
                              │     ai_eval.eval_runs           │
                              │     ai_eval.eval_samples        │
                              └─────────────────────────────────┘
```

### AI Suggestion Tester Architecture
```
Admin UI (/admin/ai-test)
        │
        v
POST /api/ai/suggest-response (dryRun: true, includeDebugContext: true)
        │
        v
AI Suggestion Pipeline (same as production, but dry-run mode)
        │
        v
Response with suggestion, confidence, intent, debug context
```

## Evaluation Framework

### What Gets Evaluated
Each evaluation run:
1. **Samples real conversations** from the database -- recent customer messages with actual staff responses
2. **Re-runs the AI suggestion pipeline** against each customer message, using the current prompt and model
3. **Compares the AI response** to the actual staff response using a separate judge LLM

### Scoring Dimensions

| Dimension | Scale | What It Measures |
|-----------|-------|------------------|
| **Appropriateness** | 1-5 | Is the response suitable for the business context? Does it follow LENGOLF's guidelines? |
| **Helpfulness** | 1-5 | Does the response actually answer the customer's question or address their need? |
| **Tone Match** | 1-5 | Does the tone match LENGOLF's friendly, casual brand voice? |
| **Brevity** | 1-5 | Is the response concise and to-the-point without unnecessary verbosity? |
| **Overall** | 1.0-5.0 | Weighted composite score (decimal, computed by the judge) |

### Metadata Captured Per Sample

Each sample records:
- **Input**: Customer message, conversation history, channel type, customer name
- **AI Output**: English response, Thai response, detected intent, confidence score, function calls
- **Judge Output**: Scores for all 4 dimensions + overall, plus structured reasoning for each dimension
- **Latency**: Both suggestion generation time and judge evaluation time (milliseconds)
- **Classification**: Intent category, intent source, whether customer context was available, whether it needs management escalation

## How Evaluations Run

### Trigger Methods

| Method | Trigger | Sample Count | Schedule |
|--------|---------|-------------|----------|
| **Cron** | pg_cron weekly | 150 samples, batch size 10 | Sunday 04:00 UTC (11:00 AM Bangkok) |
| **Manual** | Admin clicks "Run Eval" | Configurable (1-200), default 50 | On demand |
| **CI** | Placeholder for future CI/CD | Configurable | N/A |

### Manual Trigger Flow

1. Admin enters an optional label in the dashboard text field
2. Clicks "Run Eval" button
3. `POST /api/ai-eval/trigger` is called with parameters:
   - `sample_count`: Number of conversations to evaluate (default 50, max 200)
   - `batch_size`: Concurrent samples per batch (default 5, max 25)
   - `label`: Optional descriptive label for the run
4. API auto-generates a `prompt_version` string from the date and git commit hash (e.g., `v2026.03.15-a1b2c3d`)
5. Request is forwarded to the Supabase Edge Function `ai-eval-run`
6. Edge Function creates an `eval_runs` record with status `running`
7. Edge Function processes samples in batches, updating `batch_current` / `batch_total`
8. On completion, aggregates are computed and `eval_runs` is updated with final scores
9. Dashboard auto-refreshes after 5 seconds to show the new run

### Cron Trigger Flow

The weekly cron job runs via pg_cron and pg_net:
- Calls the `ai-eval-run` Edge Function directly via HTTP POST
- Uses the Supabase anon key for authentication (abuse prevented by input bounds in the Edge Function)
- Parameters: 150 samples, batch size 10
- Wrapped in a `DO` block with exception handling so preview branches without pg_cron skip gracefully

### Run Statuses

| Status | Meaning |
|--------|---------|
| `running` | Evaluation is in progress (batches being processed) |
| `completed` | All samples evaluated and aggregates computed |
| `partial` | Some samples failed but run completed with available results |
| `failed` | Run encountered a critical error and could not complete |

## Sample Analysis

### What Makes a Good Sample
- Conversations where a customer sent a message and staff actually responded
- Samples where `skipped_no_staff` is incremented indicate the conversation had no staff response to compare against
- The system tracks `has_customer_context` (whether customer profile info was available) and `needs_management` (whether the message should be escalated)

### Sample Explorer Features
- **Filter by intent**: Dropdown populated from the selected run's intent breakdown
- **Filter by score range**: `min_score` and `max_score` query parameters
- **Sort by score**: Samples are sorted by `judge_overall` (descending) by default
- **Pagination**: Configurable limit (default 50, max 200) with offset support
- **Full detail view**: Each sample shows customer message, AI responses (EN + TH), all judge scores, and structured reasoning

### Intent Categories
Intents are detected by the AI suggestion pipeline and vary based on the customer message. Common intents include pricing inquiries, booking requests, coaching questions, location/hours queries, and general greetings. The intent breakdown in each run shows average scores per category, helping identify which types of questions the AI handles well or poorly.

## Judge Scoring

### How the Judge Works
1. For each sample, the Edge Function sends the customer message, AI response, and actual staff response to a separate LLM (the "judge model")
2. The judge evaluates the AI response across all 4 dimensions
3. The judge returns structured JSON with integer scores (1-5) for each dimension plus an overall decimal score
4. The judge also provides reasoning text for each dimension, stored as `judge_reasoning` JSONB

### Judge Reasoning Structure
```typescript
interface JudgeReasoning {
  appropriateness: string;  // Why this score for appropriateness
  helpfulness: string;      // Why this score for helpfulness
  toneMatch: string;        // Why this score for tone match
  brevity: string;          // Why this score for brevity
}
```

### Aggregate Scores
After all samples in a run are judged, the Edge Function computes and stores:
- `avg_overall`, `avg_appropriateness`, `avg_helpfulness`, `avg_tone_match`, `avg_brevity` -- Mean scores across all judged samples
- `score_distribution` -- JSONB histogram of overall scores (e.g., `{"1": 2, "2": 5, "3": 12, "4": 20, "5": 11}`)
- `by_intent` -- JSONB array of `{ intent, count, overallMean }` for each detected intent

## Dashboard Tabs

### Overview Tab
- **KPI Cards**: Latest run's average overall, comparison delta with previous run, sample count, judged count
- **Score Trends Chart**: Line chart of all completed runs, plotting each score dimension over time
- **Score Distribution**: Histogram of the latest run's overall scores
- **Intent Performance**: Bar chart showing which intents score highest/lowest

### Run History Tab
- **Run History Table**: All runs with columns for date, status, prompt version, label, sample count, average scores, latency
- **Selectable rows**: Click a run to select it for the Sample Explorer
- **Prompt Comparison Chart**: Grouped bar chart comparing average scores across different prompt versions (completed runs only)

### Sample Explorer Tab
- **Run selector**: Select a run from the History tab first
- **Intent filter**: Dropdown to filter samples by detected intent
- **Sample table**: Shows customer message, AI response, intent, all judge scores, and expandable reasoning
- **Pagination**: Handles large sample sets with offset-based pagination

## AI Suggestion Tester

The AI Suggestion Tester (`/admin/ai-test`) is a separate interactive tool for ad-hoc testing of the AI suggestion pipeline.

### Testing Modes
- **Session Mode** (default): Messages build up conversation context, simulating a real multi-turn conversation
- **Single Mode**: Each message is independent with no history

### How It Works
1. Admin types a customer message (or selects a preset)
2. Message is sent to `POST /api/ai/suggest-response` with `dryRun: true` and `includeDebugContext: true`
3. The AI suggestion pipeline runs identically to production but does not persist the suggestion
4. Response includes: suggested response (EN + TH), confidence score, response time, detected intent, similar messages count, debug context, suggested images, and function calls

### Preset Questions
Quick-test buttons for common customer scenarios:
- **Thai**: Pricing, Buy 1 Get 1 promo, coaching inquiry, operating hours, club rental
- **English**: Booking request, packages inquiry, location/directions

### Debug Context
The tester provides full debug output:
- **System prompt excerpt**: The actual prompt sent to the model
- **Intent detected**: What the system classified the message as
- **Skills used**: Which pipeline skills were activated
- **Business context**: Whether LENGOLF business data was included
- **FAQ matches**: Top matching FAQ entries with similarity scores
- **Model**: Which model processed the request

## API Endpoints

### Eval Dashboard APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai-eval/runs` | List eval runs (paginated) |
| `GET` | `/api/ai-eval/runs/[runId]` | Get single run detail |
| `GET` | `/api/ai-eval/runs/[runId]/samples` | List samples for a run (paginated) |
| `GET` | `/api/ai-eval/trends` | Get completed runs for trend charts |
| `POST` | `/api/ai-eval/trigger` | Trigger a new eval run |

### AI Tester API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/suggest-response` | Run AI suggestion pipeline (used with `dryRun: true`) |

### Endpoint Details

#### GET /api/ai-eval/runs
```
Query params:
  limit: number (1-100, default: 20)
  offset: number (default: 0)
  prompt_version: string (optional) - Filter by prompt version
  from: string (optional) - ISO date, filter runs after this date
  to: string (optional) - ISO date, filter runs before this date

Response: { data: EvalRun[], total: number, limit: number, offset: number }
```

#### GET /api/ai-eval/runs/[runId]
```
Path params:
  runId: UUID

Response: { data: EvalRun }
```

#### GET /api/ai-eval/runs/[runId]/samples
```
Path params:
  runId: UUID

Query params:
  limit: number (1-200, default: 50)
  offset: number (default: 0)
  intent: string (optional) - Filter by intent category
  min_score: number (optional) - Minimum judge_overall score
  max_score: number (optional) - Maximum judge_overall score

Response: { data: EvalSample[], total: number, limit: number, offset: number }
```

#### GET /api/ai-eval/trends
```
Query params:
  limit: number (max: 50, default: 20) - Number of completed runs to return

Response: { data: EvalTrendPoint[] }
  Returns completed runs ordered by started_at ASC (oldest first, for charting)
```

#### POST /api/ai-eval/trigger
```
Body:
  sample_count: number (1-200, default: 50)
  batch_size: number (1-25, default: 10)
  date_filter: string (optional, YYYY-MM-DD format)
  label: string (optional, max 100 chars)

Response: { success: boolean, data: { run_id: string, ... } }
```

## Database Schema

All tables reside in the dedicated `ai_eval` schema.

### ai_eval.eval_runs

Stores metadata and aggregate scores for each evaluation run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated run identifier |
| `started_at` | TIMESTAMPTZ | When the run began |
| `completed_at` | TIMESTAMPTZ | When the run finished (null if still running) |
| `status` | TEXT | Run status: running, completed, failed, partial |
| `trigger_type` | TEXT | How the run was triggered: cron, manual, ci |
| `prompt_version` | TEXT | Auto-generated version string (e.g., `v2026.03.15-a1b2c3d`) |
| `prompt_hash` | TEXT | Hash of the system prompt used |
| `git_commit_hash` | TEXT | Git commit SHA at time of run |
| `prompt_label` | TEXT | Optional human-readable label |
| `suggestion_model` | TEXT | Model used for AI suggestions |
| `judge_model` | TEXT | Model used for judging |
| `sample_count_requested` | INT | Number of samples requested |
| `total_samples` | INT | Actual number of samples processed |
| `judged_samples` | INT | Number of samples successfully judged |
| `skipped_no_staff` | INT | Samples skipped due to no staff response |
| `avg_overall` | DECIMAL(4,2) | Mean overall score across all samples |
| `avg_appropriateness` | DECIMAL(4,2) | Mean appropriateness score |
| `avg_helpfulness` | DECIMAL(4,2) | Mean helpfulness score |
| `avg_tone_match` | DECIMAL(4,2) | Mean tone match score |
| `avg_brevity` | DECIMAL(4,2) | Mean brevity score |
| `score_distribution` | JSONB | Histogram of overall scores |
| `by_intent` | JSONB | Array of `{ intent, count, overallMean }` |
| `avg_suggestion_latency_ms` | INT | Mean suggestion generation time |
| `avg_judge_latency_ms` | INT | Mean judge evaluation time |
| `batch_current` | INT | Current batch being processed |
| `batch_total` | INT | Total number of batches |
| `conversation_ids` | JSONB | IDs of sampled conversations |
| `error_count` | INT | Number of sample-level errors |
| `error_message` | TEXT | Error details if run failed |

### ai_eval.eval_samples

Stores individual sample results within a run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated sample identifier |
| `run_id` | UUID (FK) | References eval_runs.id (CASCADE delete) |
| `conversation_id` | UUID | Source conversation from the database |
| `customer_name` | TEXT | Customer name from the conversation |
| `channel_type` | TEXT | Channel: line, website, facebook, etc. |
| `customer_message` | TEXT | The customer message that was evaluated |
| `conversation_history` | JSONB | Prior messages for context |
| `actual_staff_response` | TEXT | What staff actually replied |
| `ai_response` | TEXT | AI-generated English response |
| `ai_response_thai` | TEXT | AI-generated Thai response |
| `intent` | TEXT | Detected intent category |
| `intent_source` | TEXT | How intent was classified |
| `confidence_score` | DECIMAL(3,2) | AI confidence in its response |
| `function_called` | TEXT | Tool/function called by the AI (if any) |
| `has_customer_context` | BOOLEAN | Whether customer profile data was available |
| `needs_management` | BOOLEAN | Whether the message requires escalation |
| `suggestion_latency_ms` | INT | Time to generate the AI suggestion |
| `judge_overall` | DECIMAL(3,1) | Judge's overall score (1.0-5.0) |
| `judge_appropriateness` | INT | Judge's appropriateness score (1-5) |
| `judge_helpfulness` | INT | Judge's helpfulness score (1-5) |
| `judge_tone_match` | INT | Judge's tone match score (1-5) |
| `judge_brevity` | INT | Judge's brevity score (1-5) |
| `judge_reasoning` | JSONB | Structured reasoning for each dimension |
| `judge_model` | TEXT | Which model judged this sample |
| `judge_latency_ms` | INT | Time for the judge to evaluate |

### Row-Level Security

- **Authenticated users**: SELECT access on both tables
- **Service role**: Full access (INSERT, UPDATE, DELETE) on both tables
- Schema grants ensure `ai_eval` schema is accessible to both roles

### Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `idx_eval_samples_run_id` | eval_samples | run_id | Join samples to runs |
| `idx_eval_samples_intent` | eval_samples | intent | Filter by intent |
| `idx_eval_samples_judge_overall` | eval_samples | judge_overall | Sort/filter by score |
| `idx_eval_samples_conversation_id` | eval_samples | conversation_id | Link back to source |
| `idx_eval_runs_started_at` | eval_runs | started_at DESC | Sort runs by date |
| `idx_eval_runs_prompt_hash` | eval_runs | prompt_hash | Find runs by prompt |

### Migrations

| File | Description |
|------|-------------|
| `20260302120000_create_ai_eval_tables.sql` | Creates `ai_eval` schema, `eval_runs` and `eval_samples` tables, indexes, RLS policies, and grants |
| `20260302130000_add_ai_eval_weekly_cron.sql` | Schedules weekly cron job (Sundays 04:00 UTC) with graceful fallback for environments without pg_cron |

## Component Structure

### Dashboard Components

| File | Description |
|------|-------------|
| `app/admin/ai-eval/page.tsx` | Main eval dashboard page |
| `src/components/ai-eval/EvalKPICards.tsx` | KPI cards comparing latest vs previous run |
| `src/components/ai-eval/ScoreTrendsChart.tsx` | Line chart of score trends over time |
| `src/components/ai-eval/ScoreDistributionChart.tsx` | Histogram of score distribution |
| `src/components/ai-eval/IntentPerformanceChart.tsx` | Bar chart of scores by intent |
| `src/components/ai-eval/RunHistoryTable.tsx` | Paginated table of all eval runs |
| `src/components/ai-eval/PromptComparisonChart.tsx` | Comparison chart across prompt versions |
| `src/components/ai-eval/SampleExplorerTable.tsx` | Expandable sample detail table |

### Tester Page

| File | Description |
|------|-------------|
| `app/admin/ai-test/page.tsx` | Interactive AI suggestion tester |

### Hooks and Types

| File | Description |
|------|-------------|
| `src/hooks/useAiEvalDashboard.ts` | SWR hooks: `useEvalRuns`, `useEvalTrends`, `useEvalRunDetail`, `useEvalSamples` |
| `src/types/ai-eval.ts` | TypeScript types: `EvalRun`, `EvalSample`, `EvalTrendPoint`, `JudgeReasoning`, `IntentBreakdown`, query param interfaces |

## Troubleshooting

### Eval Run Issues
- **Run stuck in "running" status**: The Edge Function may have timed out. Check Supabase Edge Function logs. Runs will remain in `running` status indefinitely if the function crashes -- manually update the status via SQL if needed.
- **High `skipped_no_staff` count**: Many sampled conversations did not have a staff response to compare against. This is normal for conversations that are still in progress or where staff used a different channel.
- **Low sample count vs requested**: The Edge Function samples from available conversations with both customer messages and staff responses. If fewer qualifying conversations exist, the actual count will be lower.

### Score Interpretation
- **Average overall below 3.0**: Indicates significant quality issues -- review the worst-scoring samples in the Sample Explorer to identify patterns.
- **Dimension-specific drops**: A drop in `tone_match` without other dimension drops may indicate a prompt change affected the voice but not content quality.
- **Intent-specific poor performance**: Use the Intent Performance Chart to find which customer question types need prompt improvements.

### Tester Issues
- **"Network error" in AI Tester**: The `/api/ai/suggest-response` endpoint may be down. Check that the dev server is running and the AI suggestion pipeline is configured.
- **No Thai response**: Not all messages generate a Thai translation. This depends on the suggestion pipeline configuration.
- **Session mode context lost**: Clearing the conversation or switching between session/single mode resets all context.

### Cron Job Issues
- **Weekly eval not running**: Check cron status with `SELECT * FROM cron.job WHERE jobname = 'ai-eval-weekly'`. The cron setup uses a `DO` block that silently skips if pg_cron is not available (e.g., on preview branches).
- **To manually unschedule**: `SELECT cron.unschedule('ai-eval-weekly')`
- **To check recent executions**: Review Supabase Edge Function invocation logs for `ai-eval-run`
