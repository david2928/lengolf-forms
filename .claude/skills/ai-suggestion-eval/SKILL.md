# AI Chat Suggestion Evaluation & Improvement

Evaluate, test, and improve the AI suggestion system that generates staff response suggestions for customer messages across LINE, Instagram, and website chat.

## When to Use

- After modifying any AI suggestion code (prompts, skills, intent classifier, function executor)
- When acceptance rate drops or staff reports quality issues
- Periodic quality audits (weekly/monthly)
- After adding new business knowledge or skills to the system

## Architecture Overview

The AI suggestion pipeline:
1. **Intent Classification** — Two-tier: regex fast-path (0ms) → LLM classifier via GPT-4o-mini (~1s)
2. **Skill Loading** — Intent determines which skill prompts are loaded (core + booking/pricing/facility/coaching/general)
3. **Context Assembly** — Customer data, conversation history, FAQ matches, similar message embeddings
4. **Response Generation** — OpenAI with function calling (check_bay_availability, create_booking, cancel_booking, etc.)
5. **Post-processing** — Confidence scoring, management tag extraction, internal note stripping

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai/suggestion-service.ts` | Main orchestrator — prompt assembly, OpenAI calls, confidence scoring |
| `src/lib/ai/intent-classifier.ts` | Two-tier intent classification (regex + LLM) |
| `src/lib/ai/skills/core-skill.ts` | Base persona, language rules, safety rules |
| `src/lib/ai/skills/booking-skill.ts` | Booking intent prompt + rules |
| `src/lib/ai/skills/pricing-skill.ts` | Pricing/package/promotion knowledge |
| `src/lib/ai/skills/facility-skill.ts` | Hours, location, equipment, parking |
| `src/lib/ai/skills/coaching-skill.ts` | Coach availability, rates, sessions |
| `src/lib/ai/skills/general-skill.ts` | Fallback for unmatched intents |
| `src/lib/ai/embedding-service.ts` | Vector search, FAQ matching, hybrid search |
| `src/lib/ai/function-executor.ts` | Function calling (bookings, availability) |
| `src/lib/ai/function-schemas.ts` | OpenAI function definitions per intent |
| `app/api/ai/suggest-response/route.ts` | API endpoint for suggestions |

### Eval & Test Scripts

| Script | Purpose |
|--------|---------|
| `scripts/eval-intent-classifier.ts` | Unit tests for intent classification (65 test cases) |
| `scripts/eval-e2e-suggestions.ts` | Curated E2E tests with known expected outcomes |
| `scripts/sample-e2e-suggestions.ts` | Random sampling tool for discovery & regression testing |

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

## Step 3: Review Results & Identify Issues

Compare AI responses vs actual staff responses. Look for these common quality issues:

### Issue Checklist

| Issue | What to Look For | Severity |
|-------|-----------------|----------|
| **Verbosity** | AI response 3x+ longer than staff's. Staff averages ~10 words. | HIGH |
| **Greeting hallucination** | AI invents context from a simple "hello" (booking confirmation, job application, etc.) | HIGH |
| **Internal text leak** | Raw function results shown as customer message (e.g., "Cancel booking for 2026-02-26 - Name") | HIGH |
| **Promotion auto-apply** | AI applies promotions or quotes pricing without being asked | MEDIUM |
| **Language mismatch** | Thai customer gets English response or vice versa | HIGH |
| **Mid-conversation greeting** | AI says "Hello [Name]!" on message #7 of a conversation | LOW |
| **Over-asking** | AI asks 3-5 clarifying questions at once instead of 1 | MEDIUM |
| **Hedging** | AI says "we can usually..." instead of being direct | MEDIUM |
| **Missing warmth** | Staff references personal details; AI gives generic response | LOW |
| **Multi-booking ignored** | Customer requests 4 slots; AI processes only 1 | MEDIUM |

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

| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Intent accuracy | >95% | 98% (64/65) |
| Avg confidence | >65% | 69% |
| Avg response time | <12s | 8.9s |
| Greeting hallucination | 0 | 0 (fixed) |
| Internal text leaks | 0 | 0 (fixed) |

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
