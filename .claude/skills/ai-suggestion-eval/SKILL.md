# AI Chat Suggestion Evaluation & Improvement

Evaluate, test, and improve the AI suggestion system that generates staff response suggestions for customer messages across LINE, Instagram, and website chat.

## When to Use

- After modifying any AI suggestion code (prompts, skills, intent classifier, function executor)
- When acceptance rate drops or staff reports quality issues
- Periodic quality audits (weekly/monthly)
- After adding new business knowledge or skills to the system

## Architecture Overview

The AI suggestion pipeline:
1. **Intent Classification** — Two-tier: regex fast-path (first messages only, 0ms) → LLM classifier via GPT-4o-mini (~1s, all follow-ups)
2. **Skill Loading** — Intent determines which skill prompts are loaded (core + booking/pricing/facility/coaching/general)
3. **Context Assembly** — Customer data, conversation history, FAQ matches, similar message embeddings
4. **Response Generation** — GPT-4.1-mini with all 12 tools available every turn (model selects which to use). Write tools require staff approval via `requiresApproval` flag.
5. **Post-processing** — Confidence scoring, management tag extraction, internal note stripping

**Note (March 2026):** Intent-based tool filtering was removed. The classifier still selects skills/prompts but no longer gates which tools the model can see. See `docs/superpowers/specs/2026-03-22-ai-tool-selection-redesign.md` for details.

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai/suggestion-service.ts` | Main orchestrator — composable stages (prepare → generate/stream → postProcess) |
| `src/lib/ai/suggest-response-helpers.ts` | Shared route helpers (auth, validation, context loading, rate limiting) |
| `src/lib/ai/intent-classifier.ts` | Two-tier intent classification (regex + LLM) |
| `src/lib/ai/skills/core-skill.ts` | Base persona, language rules, safety rules |
| `src/lib/ai/skills/booking-skill.ts` | Booking intent prompt + rules |
| `src/lib/ai/skills/pricing-skill.ts` | Pricing/package/promotion knowledge |
| `src/lib/ai/skills/facility-skill.ts` | Hours, location, equipment, parking |
| `src/lib/ai/skills/coaching-skill.ts` | Coach availability, rates, sessions |
| `src/lib/ai/skills/general-skill.ts` | Fallback for unmatched intents |
| `src/lib/ai/embedding-service.ts` | Vector search, FAQ matching, hybrid search |
| `src/lib/ai/function-executor.ts` | Function calling (bookings, availability) |
| `src/lib/ai/function-schemas.ts` | Zod tool definitions per intent |
| `app/api/ai/suggest-response/route.ts` | JSON API endpoint (eval, dryRun) |
| `app/api/ai/suggest-response/stream/route.ts` | SSE streaming endpoint (production) |
| `src/hooks/useAISuggestionsStream.ts` | Frontend streaming consumer hook |

### Eval & Test Scripts

| Script | Purpose |
|--------|---------|
| `scripts/eval-intent-classifier.ts` | Unit tests for intent classification (65 test cases) |
| `scripts/eval-e2e-suggestions.ts` | Curated E2E tests with known expected outcomes |
| `scripts/sample-e2e-suggestions.ts` | Random sampling tool for discovery & regression testing |
| `scripts/judge-sample-results.ts` | LLM-as-a-judge scoring for sample results |
| `scripts/lib/judge.ts` | Core judge module (GPT-4o-mini, 4-dimension scoring) |
| `scripts/lib/judge-aggregator.ts` | Score aggregation, regression detection, summary output |
| `scripts/lib/eval-persistence.ts` | Write eval runs/samples to Supabase `ai_eval` schema |
| `scripts/lib/prompt-version.ts` | Prompt version tracking (git hash, date, label) |

### Automated Weekly Eval (LLM-as-a-Judge)

The system runs an automated weekly evaluation via a Supabase Edge Function + pg_cron:

| Component | Location |
|-----------|----------|
| Edge Function | `supabase/functions/ai-eval-run/index.ts` |
| Weekly Cron | `supabase/migrations/20260302130000_add_ai_eval_weekly_cron.sql` |
| DB Schema | `supabase/migrations/20260302120000_create_ai_eval_tables.sql` |
| Admin Dashboard | `app/admin/ai-eval/page.tsx` |
| Dashboard Components | `src/components/ai-eval/` (7 components) |
| API Routes | `app/api/ai-eval/` (trigger, runs, runs/[runId], samples, trends) |

**Schedule:** Every Sunday at 04:00 UTC (11:00 AM Bangkok time)
**Sample size:** 150 conversations, batch size 10
**Judge model:** GPT-4o-mini, temperature=0

### Judge Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Appropriateness** | 0.30 | Addresses customer need, correct language, no hallucination |
| **Helpfulness** | 0.30 | Resolves question/request, actionable and complete |
| **Tone Match** | 0.20 | Thai premium service tone, warm, professional, polite particles |
| **Brevity** | 0.20 | Ideal length (1-2 sentences, matching staff style) |

Overall score = weighted average (1-5 scale).

### Database Schema (`ai_eval`)

**`ai_eval.eval_runs`** — One row per eval run:
- Metadata: status, trigger_type (cron/manual/ci), timestamps
- Versioning: prompt_version, prompt_hash, git_commit_hash, prompt_label
- Aggregates: avg_overall, avg_appropriateness, avg_helpfulness, avg_tone_match, avg_brevity
- Distribution: score_distribution (JSONB), by_intent (JSONB)
- Batching: batch_current, batch_total, conversation_ids
- Errors: error_count, error_message

**`ai_eval.eval_samples`** — One row per judged sample:
- Context: conversation_id, customer_name, channel_type, customer_message, conversation_history
- AI output: ai_response, ai_response_thai
- Classification: intent, intent_source, confidence_score, function_called
- Judge scores: judge_overall, judge_appropriateness/helpfulness/tone_match/brevity (1-5)
- Judge reasoning: judge_reasoning (JSONB), judge_model, judge_latency_ms

## Step 1: Run Intent Classifier Eval

Tests the two-tier intent classifier against 65 test cases covering regex fast-path, contextual follow-ups, Thai/English/Chinese messages, and real-world edge cases.

```bash
# Source env vars and run
set -a && source .env && set +a && npx tsx scripts/eval-intent-classifier.ts
```

**Expected:** 95%+ pass rate. LLM non-determinism may cause 1-2 failures per run.

**If failures appear:**
- Check if regex patterns in `intent-classifier.ts` are too aggressive (e.g., greeting regex catching Thai messages with questions)
- Check if LLM classifier prompt needs new rules for edge cases
- Add `acceptableIntents` to test cases for genuinely ambiguous messages

### Adding New Intent Test Cases

Edit `scripts/eval-intent-classifier.ts` and add to the `testCases` array:

```typescript
{
  input: 'customer message here',
  expectedIntent: 'booking_request',
  category: 'real_world',
  description: 'REAL: Brief description of the scenario',
  acceptableIntents: ['booking_request', 'availability_check'], // optional: for ambiguous cases
}
```

Categories: `regex_fast_path`, `contextual_followup`, `thai`, `standalone`, `real_world`, `multilingual`

## Step 2: Run E2E Sampling

The sampling script pulls real conversations from the database, runs them through the full AI pipeline, and stores results for review.

### Prerequisites
- Dev server running: `npm run dev` (with `SKIP_AUTH=true`)
- Supabase env vars in `.env`

### Usage

```bash
set -a && source .env && set +a

# Random conversations (default: 10, last 60 days)
npx tsx scripts/sample-e2e-suggestions.ts

# Today's conversations
npx tsx scripts/sample-e2e-suggestions.ts --today

# Last N days
npx tsx scripts/sample-e2e-suggestions.ts --days 7

# Specific date
npx tsx scripts/sample-e2e-suggestions.ts --date 2026-02-20

# Filter by channel
npx tsx scripts/sample-e2e-suggestions.ts --today --channel instagram

# More conversations
npx tsx scripts/sample-e2e-suggestions.ts --today --count 20

# Minimum message count
npx tsx scripts/sample-e2e-suggestions.ts --today --min-msgs 6

# Test a specific conversation
npx tsx scripts/sample-e2e-suggestions.ts --conversation <conversation-id>

# Review latest results
npx tsx scripts/sample-e2e-suggestions.ts --review
```

Results are saved to `scripts/e2e-samples/sample-{label}-{timestamp}.json`.

## Step 2b: LLM-as-a-Judge Scoring

After sampling, score AI responses using GPT-4o-mini as a judge across 4 dimensions.

### Local Judging (CLI)

```bash
set -a && source .env && set +a

# Judge most recent sample file
npx tsx scripts/judge-sample-results.ts

# Judge a specific file
npx tsx scripts/judge-sample-results.ts --file sample-today-2026-03-22.json

# Re-judge (overwrite existing scores)
npx tsx scripts/judge-sample-results.ts --rejudge

# Judge all unjudged sample files
npx tsx scripts/judge-sample-results.ts --all

# Persist results to Supabase ai_eval schema
npx tsx scripts/judge-sample-results.ts --persist

# Persist with a label (for prompt version tracking)
npx tsx scripts/judge-sample-results.ts --persist --label "v2 tool selection"
```

**Output:** Per-sample scores (A:appropriateness H:helpfulness T:tone B:brevity), overall weighted average, by-intent breakdown, and regression detection vs. previous run.

### Automated Weekly Eval

Runs automatically every Sunday at 11:00 AM Bangkok time via pg_cron + Supabase Edge Function:

1. Edge Function (`ai-eval-run`) samples 150 random conversations from last 60 days
2. For each sample: calls `/api/ai/suggest-response` in dry-run mode, then judges the response
3. Processes in batches of 10 (self-invoking between batches)
4. Stores results in `ai_eval.eval_runs` + `ai_eval.eval_samples`
5. Computes aggregates (mean/median/stddev per dimension, score distribution, by-intent breakdown)

**Circuit breaker:** Max 1 hour, max 30 batches.

**To trigger manually:**

```bash
# Via API (requires dev server running)
curl -X POST http://localhost:3000/api/ai-eval/trigger \
  -H "Content-Type: application/json" \
  -d '{"sample_count": 50, "batch_size": 10}'
```

Or use the "Run Eval" button in the admin dashboard.

### Admin Dashboard (`/admin/ai-eval/`)

Visual dashboard with three tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | KPI cards (latest vs previous run), score trends chart, score distribution histogram, performance by intent |
| **Run History** | List of eval runs with metadata, prompt version comparison chart |
| **Sample Explorer** | Filter samples by intent, view detailed judge scores and reasoning per sample |

**Key metrics to watch:**
- Overall score trending down > 0.5 points = regression flag
- By-intent breakdown reveals which conversation types are degrading
- Score distribution shift (more 1-2 scores appearing) = quality problem

### Regression Detection

The judge-aggregator automatically compares the current run to the previous run:
- Flags if any dimension drops > 0.5 points
- Flags if overall average drops > 0.3 points
- Prints comparison table in CLI output
- Dashboard KPI cards show delta arrows (green/red)

## Step 3: Review Results & Identify Issues

Compare AI responses vs actual staff responses. Look for these common quality issues:

### Issue Checklist

| Issue | What to Look For | Severity | Current Rate |
|-------|-----------------|----------|-------------|
| **Over-asking** | AI asks "would you like to confirm?" when staff just books | HIGH | 26% |
| **Mid-conversation greeting** | AI says "สวัสดีค่า" / "Hi [Name]!" on message #3+ | MEDIUM | 40% (partly test artifact) |
| **Missed function calls** | Staff created booking (📋), AI only asked a question | HIGH | 74% of booking actions |
| **Sticker/photo generic response** | All stickers get "Hi!" instead of context-aware action | MEDIUM | 100% of sticker msgs |
| **Verbosity** | AI response 3x+ longer than staff's | MEDIUM | 12% (improved from HIGH) |
| **Greeting hallucination** | AI invents context from a simple "hello" | HIGH | 0% (fixed) |
| **Internal text leak** | Raw function results shown as customer message | HIGH | 0% (fixed) |
| **Language mismatch** | Thai customer gets English response or vice versa | HIGH | 0% |
| **Hedging** | AI says "we can usually..." instead of being direct | MEDIUM | 0.8% |
| **Promotion auto-apply** | AI applies promotions or quotes pricing without being asked | MEDIUM | ~0% |
| **Missing warmth** | Staff references personal details; AI gives generic response | LOW | - |
| **Multi-booking ignored** | Customer requests 4 slots; AI processes only 1 | MEDIUM | - |

### Where to Fix Each Issue

| Issue | Fix Location |
|-------|-------------|
| Verbosity | `core-skill.ts` BREVITY rules + language-specific rules |
| Greeting hallucination | `suggestion-service.ts` (clear embeddings for greetings) + `core-skill.ts` GREETINGS rules |
| Internal text leak | `suggestion-service.ts` approval handling (~line 1064) |
| Promotion auto-apply | `core-skill.ts` PROMOTIONS & PRICING rules |
| Language mismatch | `suggestion-service.ts` language detection + user content instructions |
| Mid-conversation greeting | `suggestion-service.ts` `hasGreetedToday`/`hasAssistantMessageToday` logic |
| Over-asking | `core-skill.ts` BREVITY rules |
| Hedging | `core-skill.ts` DECISIVENESS rules |
| Missing warmth | `core-skill.ts` WARMTH & PERSONALIZATION rules |
| Multi-booking ignored | `core-skill.ts` MULTI-PART REQUESTS rules |

## Step 4: Implement Fixes

### Prompt Changes (most common)

Edit skill files in `src/lib/ai/skills/`. Changes take effect immediately (no build needed, just restart dev server or test via API).

**Pattern for adding rules:**
```
RULE NAME — CRITICAL:
- Specific instruction (what to do)
- Negative instruction (what NOT to do)
- Example of good behavior
- Example of bad behavior (if helpful)
```

### Intent Classifier Changes

Edit `src/lib/ai/intent-classifier.ts`:
- **Regex fast-path:** Add/modify patterns in `classifyWithRegex()`. These are instant (0ms) but must be precise.
- **LLM classifier:** Add rules to the `CRITICAL RULES` section in the classifier prompt.
- **Exclusion patterns:** When regex is too aggressive, add exclusion checks before returning (e.g., "available" regex excludes messages with "lesson/coach").

### Function Executor Changes

Edit `src/lib/ai/function-executor.ts` for how function calls (booking, cancellation) are processed.

### Confidence Scoring Changes

Edit `calculateConfidenceScore()` in `suggestion-service.ts`. Current signals:
- Base: 0.4
- Similar messages: up to +0.2
- Template match: +0.05
- Customer context: +0.05
- High-confidence intents (greeting, facility, location): +0.1
- Low-confidence intents (general_inquiry): -0.05
- Function call success: +0.1 / failure: -0.1

## Step 5: Verify Fixes

After making changes:

```bash
# 1. TypeScript check (MUST pass)
npm run typecheck

# 2. Lint (MUST pass)
npm run lint

# 3. Intent classifier regression test
set -a && source .env && set +a && npx tsx scripts/eval-intent-classifier.ts

# 4. Re-run sampling to verify improvements
set -a && source .env && set +a && npx tsx scripts/sample-e2e-suggestions.ts --today
```

### What Good Looks Like

| Metric | Target | Current Baseline (Post-Change 3) |
|--------|--------|--------------------------------|
| Intent accuracy | >95% | 100% (13/13 curated), ~98% (sampler) |
| Avg confidence | >65% | 63% (sampler), 65% (curated) |
| Avg response time | <12s | 7.2s |
| Response length ratio (AI/staff) | 0.8-1.2x | 0.9x |
| Over-asking rate | <15% | 26% (needs improvement) |
| Function call alignment | >60% | 26% (needs improvement) |
| Language mismatch | 0% | 0% |
| Hedging | <2% | 0.8% |
| Greeting hallucination | 0 | 0 |
| Internal text leaks | 0 | 0 |

## Step 6: Qualitative Review (Periodic)

Beyond automated metrics, periodically review response quality:

### Quick Quality Audit

```bash
# Run sampler on recent conversations (all messages)
set -a && source .env && set +a
npx tsx scripts/sample-e2e-suggestions.ts --days 7 --count 20 --all

# Review results side-by-side
npx tsx scripts/sample-e2e-suggestions.ts --review
```

### What to Check

1. **Over-asking** — Does AI ask a question when staff would just act? Count instances where AI response ends with "?" but staff response doesn't. Target: <15% of responses.
2. **Action alignment** — When staff created a booking (📋) or cancelled (❌), did AI call the corresponding function? Target: >60%.
3. **Tone match** — Does AI sound like a helpful friend or a corporate chatbot? Thai responses should be ultra-brief (5-8 words).
4. **Sticker/photo handling** — Sticker-only messages should be handled contextually, not with generic greetings.
5. **Unnecessary greetings** — After first exchange, AI should never greet again mid-conversation.

### Analyzing Results with Node.js

```bash
# Quick stats from a sample file
node -e "
const data = require('./scripts/e2e-samples/SAMPLE_FILE.json');
const overAsk = data.filter(d => (d.aiResponse||'').includes('?') && !(d.testPoint?.actualStaffResponse||'').includes('?')).length;
const staffActions = data.filter(d => (d.testPoint?.actualStaffResponse||'').match(/📋|❌|Booking/));
const aiMatched = staffActions.filter(d => d.functionCalled).length;
console.log('Over-asking:', overAsk + '/' + data.length + ' (' + (overAsk/data.length*100).toFixed(0) + '%)');
console.log('Function alignment:', aiMatched + '/' + staffActions.length);
console.log('Avg confidence:', (data.reduce((a,d) => a + (d.confidenceScore||0), 0) / data.length * 100).toFixed(0) + '%');
"
```

See full quality review: `docs/technical/AI_ARCHITECTURE_RECOMMENDATIONS.md` Section 11.

## Key Business Rules (CRITICAL)

These are commonly violated by the AI and cause staff to reject suggestions:

- **Club rentals are FREE** — standard clubs included with bay booking
- **Parking is FREE** — show Lengolf receipt at counter
- **Operating hours:** 10:00 to 23:00 daily, last booking 22:00
- **Bay types:** Social Bay (up to 5 players), AI Bay (1-2 players, advanced analytics)
- **Staff tone:** Casual, warm, brief. Thai staff uses "ค่ะ" (ka), never "ครับ" (krab). Staff sounds like a helpful friend, not a corporate chatbot.
- **Thai brevity:** 5-8 words maximum. Ultra-brief.
- **English brevity:** 1-2 sentences maximum. ~15-20 words.
- **Never auto-apply promotions** — only discuss when customer asks
- **Never fabricate availability** — if uncertain, say "let me check"
- **`[NEEDS MANAGEMENT]` tag** — for policy decisions, custom pricing, refunds, complaints
- **`[INTERNAL NOTE]` tag** — for missing data flags (stripped from customer response)

## Database Tables (Reference)

| Table | Purpose |
|-------|---------|
| `ai_suggestions` | Stored suggestions with acceptance/rejection tracking |
| `unified_messages` | All customer/staff messages across channels |
| `unified_conversations` | Conversation metadata (channel, customer link) |
| `customers` | Customer profiles (name, phone, notes) |
| `faq_knowledge_base` | FAQ entries with embeddings for RAG |
| `message_embeddings` | Message embeddings for similarity search |
| `ai_eval.eval_runs` | Eval run metadata, aggregates, prompt versioning, batch tracking |
| `ai_eval.eval_samples` | Individual judged samples with scores, reasoning, and AI output |
