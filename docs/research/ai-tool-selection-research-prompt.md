# Deep Research: LLM Tool Selection Architecture for Production Chatbots

## Research Objective

Evaluate whether our current intent-gated tool filtering architecture is optimal, or whether we should give the LLM access to all tools on every turn. This research should produce a concrete recommendation with cost modeling, accuracy benchmarks, and an implementation plan.

---

## Our Current System (as of March 2026)

### Architecture Overview

We run a **staff-facing AI suggestion engine** for a golf simulator business (Lengolf, Bangkok). The bot doesn't talk to customers directly — it suggests responses that staff review and send. It handles ~1,000 suggestions/day across LINE, website chat, Facebook, Instagram, and WhatsApp.

```
Customer message
  → Embedding generation (text-embedding-3-small)
  → Two-tier intent classification:
      Tier 1: Regex fast-path (0ms, $0) — catches ~35% of messages
      Tier 2: LLM classifier (gpt-4o-mini, ~200ms) — handles the rest
  → Intent determines TWO things:
      1. Which SKILLS (prompt modules) to compose into the system prompt
      2. Which TOOLS (function definitions) to make available to the LLM
  → Context retrieval (parallel):
      - Conversation history (7-day window, up to 100 messages)
      - Customer profile (packages, bookings, lifetime value)
      - Vector-similar past conversations (top 3)
      - FAQ matches (vector search)
      - Business context (pricing, promotions, operating hours)
  → LLM generation (gpt-5-mini, reasoning_effort='low') with filtered tools
  → Post-processing (extract management flags, store embeddings)
  → Return suggestion to staff UI
```

### Models & Costs

| Component | Model | Pricing (per 1M tokens) |
|-----------|-------|------------------------|
| Main generation | gpt-5-mini (reasoning model) | Input: $1.25, Output: $5.00, Reasoning: $1.25 |
| Intent classifier | gpt-4o-mini | Input: $0.15, Output: $0.60 |
| Embeddings | text-embedding-3-small | $0.02 |

Config: `maxOutputTokens=500` (non-reasoning) / `1500` (reasoning), `temperature=0.7`, `reasoning_effort='low'`, `maxSteps=5`

### Our 12 Tools

| # | Tool | Type | Approval Required | Avg Description Tokens |
|---|------|------|-------------------|----------------------|
| 1 | `check_bay_availability` | Read | No | ~180 |
| 2 | `get_coaching_availability` | Read | No | ~90 |
| 3 | `check_club_availability` | Read | No | ~100 |
| 4 | `create_booking` | Write | YES | ~180 |
| 5 | `cancel_booking` | Write | YES | ~220 |
| 6 | `modify_booking` | Write | YES | ~230 |
| 7 | `lookup_booking` | Read | No | ~170 |
| 8 | `lookup_customer` | Read | No | ~70 |
| 9 | `get_customer_context` | Context | No | ~80 |
| 10 | `search_knowledge` | Context | No | ~80 |
| 11 | `suggest_images` | Context | No | ~60 + dynamic catalog |
| 12 | (suggest_images is conditional, so effectively 11 core tools) | | | |

**Total tool definition tokens (all 11-12):** ~1,500-1,800 tokens

### Current Intent-to-Tool Mapping

```typescript
const INTENT_TOOLS: Record<string, string[]> = {
  availability_check: ['check_bay_availability', 'get_customer_context', 'search_knowledge'],                    // 3 tools
  booking_request: ['check_bay_availability', 'get_coaching_availability', 'create_booking', 'get_customer_context'], // 4 tools
  cancellation: ['cancel_booking', 'lookup_booking', 'get_customer_context'],                                      // 3 tools
  modification_request: ['modify_booking', 'lookup_booking', 'get_customer_context'],                              // 3 tools
  coaching_inquiry: ['get_coaching_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'], // 5 tools
  pricing_inquiry: ['search_knowledge', 'suggest_images'],                                                         // 2 tools
  promotion_inquiry: ['check_bay_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'], // 5 tools
  facility_inquiry: ['search_knowledge', 'suggest_images'],                                                        // 2 tools
  equipment_inquiry: ['check_club_availability', 'search_knowledge', 'suggest_images'],                            // 3 tools
  payment_inquiry: ['search_knowledge'],                                                                           // 1 tool
  location_inquiry: ['search_knowledge', 'get_customer_context', 'suggest_images'],                                // 3 tools
  general_inquiry: ['check_bay_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'], // 5 tools
  greeting: ['get_customer_context'],                                                                               // 1 tool
  // arrival_notification: no tools
};
```

Average tools per request: ~3.5 (weighted by intent frequency).

### Our 7 Skills (Prompt Modules)

| Skill | Intents | Est. Tokens |
|-------|---------|-------------|
| **core** (always loaded) | `*` | ~760 (base + language rules) |
| **booking** | booking_request, availability_check, cancellation, modification_request | ~550 |
| **pricing** | pricing_inquiry, promotion_inquiry, payment_inquiry, booking_request | ~50 static + ~300 dynamic |
| **coaching** | coaching_inquiry | ~200 |
| **facility** | facility_inquiry, equipment_inquiry, location_inquiry | ~150 |
| **club_rental** | equipment_inquiry | ~350 |
| **general** | greeting, general_inquiry, arrival_notification | ~60 |

Skills are composited based on intent: core + matched skills + dynamic business context.

### Known Problems with Current Approach

1. **Tool gating by intent**: If classifier says `pricing_inquiry`, the LLM literally cannot call `create_booking` or `check_bay_availability` — those tools don't exist in its context for that turn. Customer says "how much?" then "ok book 3pm" → second message gets `booking_request` intent but the first message's turn was limited.

2. **Regex fast-path ignores conversation context**: "ว่างมั้ย" (available?) always matches `availability_check` via regex, even mid-coaching conversation. The LLM classifier (Tier 2) handles this correctly but regex short-circuits it.

3. **Single intent per message**: "How much is coaching and is Min available tomorrow?" is both `pricing_inquiry` AND `coaching_inquiry`. System picks one.

4. **Intent drift within a single turn**: Customer starts asking about price, then says "actually just book me in" — the LLM can't act on the booking because it doesn't have booking tools.

5. **`general_inquiry` is a catch-all workaround**: Notice it has 5 tools including `create_booking` — this was added as a band-aid because the classifier sometimes falls back to `general_inquiry` and the bot needs to still be able to book.

### Current Cost Estimates

| Scenario | Input Tokens | Output Tokens | Cost/Request | Monthly (30K req) |
|----------|-------------|---------------|-------------|-------------------|
| Current (filtered, ~3.5 tools avg) | ~3,200 | ~465 | ~$0.005 | ~$150 |
| All 12 tools every request | ~4,400 | ~465 | ~$0.0065 | ~$195 |
| Delta | +1,200 | — | +$0.0015 | +$45 (+30%) |

---

## Research Questions

### 1. Industry Best Practices (2025-2026)

- What do OpenAI, Anthropic, and Google officially recommend for tool count management?
- What is the recommended upper limit for direct tool loading vs. deferred/search-based loading?
- Has the "filter tools by intent" pattern been deprecated in favor of "give all tools + trust the model"?
- What is the current state of OpenAI's `allowed_tools` parameter? How does it interact with prompt caching?
- What is Anthropic's Tool Search pattern and when should it be used vs. direct loading?
- Are there published case studies of production chatbots that switched from filtered to full tool access? What were the results?

### 2. Model Capability for Tool Selection

- Can gpt-5-mini (reasoning model, effort='low') reliably select from 12 tools with detailed, non-overlapping descriptions?
- At what tool count do mini models start making selection errors? What benchmarks exist?
- Does using a reasoning model (gpt-5-mini) help or hurt tool selection compared to a non-reasoning model (gpt-4.1-mini)?
- Is reasoning_effort='low' sufficient for accurate tool selection with 12 tools, or does it cut corners?
- What's the accuracy delta between gpt-4o-mini, gpt-4.1-mini, gpt-5-mini, and gpt-4.1 for tool selection specifically?
- Are there published function-calling benchmarks (e.g., Berkeley Function Calling Leaderboard) with results for these models?

### 3. Cost Deep Dive

- How does OpenAI's prompt caching work with tool definitions? If tool definitions are stable across requests, what's the cache hit rate and cost savings?
- What's the actual token count for our 12 tool definitions? (Measure precisely, not estimate)
- Is gpt-5-mini the right model for our use case? It's a reasoning model — we're paying for reasoning tokens on every request. Would gpt-4.1-mini produce equivalent quality at lower cost for a task that's primarily "select tool + generate short response"?
- Cost comparison table for all candidate models at our volume (1K req/day):
  - gpt-4o-mini
  - gpt-4.1-nano
  - gpt-4.1-mini
  - gpt-5-nano
  - gpt-5-mini (current)
  - gpt-4.1
- What's the reasoning token overhead for gpt-5-mini at effort='low'? What fraction of output tokens are reasoning vs. visible?

### 4. Architecture Patterns

- **Full tools + intent-based prompt selection**: Keep the intent classifier for skill/prompt composition but remove tool filtering. Is this the recommended hybrid?
- **Multi-intent classification**: Should the classifier return an array of intents instead of a single one? How does this affect tool selection?
- **Dynamic tool injection**: OpenAI's `allowed_tools` lets you toggle tool availability without changing the definition payload (preserving prompt cache). Is this better than our current approach of physically filtering the tool objects?
- **Vercel AI SDK patterns**: We use `generateText` with `stopWhen` and `maxSteps`. Are there newer patterns in AI SDK 5/6 (e.g., `prepareStep` for per-step model switching, agent abstraction) that we should adopt?
- **Two-model approach**: Use a cheap model (gpt-4.1-nano) for simple intents (greetings, facility questions) and a capable model (gpt-5-mini) for complex intents (booking, multi-step). Is this worth the complexity?
- **Consolidation**: Should we merge related tools (e.g., `check_bay_availability` + `check_club_availability` + `get_coaching_availability` into one `check_availability` tool with a `type` parameter)?

### 5. Specific to Our System

- **Regex fast-path fix**: Should we disable regex fast-path when conversation history exists (>1 message)? Or is there a better approach?
- **The `general_inquiry` workaround**: If we give all tools to every request, we can remove the hack where `general_inquiry` has booking tools. What other workarounds become unnecessary?
- **Skills still valuable?**: Even if we remove tool filtering, should we keep skill-based prompt composition by intent? (Hypothesis: yes — focused prompts improve response quality even when all tools are available)
- **Image catalog scaling**: `suggest_images` embeds the full image catalog in the tool description. As the catalog grows, this inflates every request. Should images be a separate search tool instead?
- **Conversation context as tools vs. pre-loaded**: Currently `get_customer_context` and `search_knowledge` are lazy-loaded via tool calls. Alternative: always pre-load them and include in the system prompt. Tradeoff analysis?

### 6. Safety & Quality

- With all tools available, does the model ever call inappropriate tools? (e.g., `cancel_booking` when customer just said "hi")
- Our write tools (`create_booking`, `cancel_booking`, `modify_booking`) require staff approval via `requiresApproval` flag. Is this sufficient safety, or do we need additional guardrails?
- Does giving the model more tools increase or decrease hallucination about capabilities?
- What monitoring/observability should we add if we switch to full tool access? (e.g., tracking tool selection accuracy, unexpected tool calls)

---

## Deliverables Expected

1. **Recommendation**: Filter tools by intent vs. give all tools vs. hybrid approach, with justification
2. **Model recommendation**: Best model for our specific use case (12 tools, bilingual Thai/English, short responses, reasoning not always needed)
3. **Cost model**: Precise monthly cost comparison across approaches and models
4. **Implementation plan**: If changes recommended, step-by-step migration with rollback strategy
5. **Benchmarking plan**: How to A/B test the change (e.g., shadow mode, canary %, metrics to track)
6. **Risk assessment**: What could go wrong and how to mitigate

---

## Context Files to Read

If you have access to the codebase, read these files for full context:

```
src/lib/ai/suggestion-service.ts          # Main orchestrator (~1,500 lines)
src/lib/ai/function-schemas.ts            # Tool definitions + intent-to-tool mapping
src/lib/ai/intent-classifier.ts           # Two-tier classification (regex + LLM)
src/lib/ai/skills/index.ts                # Skill registry + prompt composition
src/lib/ai/skills/core-skill.ts           # Base persona + rules (~760 tokens)
src/lib/ai/skills/booking-skill.ts        # Booking flow rules (~550 tokens)
src/lib/ai/skills/pricing-skill.ts        # Dynamic pricing injection
src/lib/ai/skills/coaching-skill.ts       # Coaching-specific rules
src/lib/ai/skills/facility-skill.ts       # Facility FAQ answers
src/lib/ai/skills/club-rental-skill.ts    # Club rental tiers + pricing
src/lib/ai/skills/general-skill.ts        # Fallback skill
src/lib/ai/openai-client.ts               # Model config, AI_CONFIG constants
src/lib/ai/suggest-response-helpers.ts     # Rate limiter, business context loading
src/lib/ai/embedding-service.ts           # Vector search, FAQ matching
src/lib/ai/function-executor.ts           # Tool execution implementation
src/lib/pricing-service.ts                # Dynamic pricing catalog
app/api/ai/suggest-response/route.ts      # API endpoint
app/api/ai/suggest-response/stream/route.ts # Streaming endpoint
```

---

## Key Constraints

- **Budget**: Actual cost is ~$15.43/month (measured Feb 20 - Mar 22, 2026). gpt-5-mini suggestion generation is 94% of cost ($14.57). After switching to gpt-4.1-mini: estimated ~$5.75/month.
- **Latency**: Staff see suggestions in real-time. Current p95 is ~2-3 seconds. Cannot exceed ~5 seconds.
- **Languages**: Thai (primary, ~70%) and English (~30%). Thai is harder for LLMs.
- **Volume**: ~8.5 suggestions/day (254/month), ~355 total API requests/day (includes classifier, eval, embeddings). Peak day: ~37 suggestions.
- **Safety**: Write operations require staff approval. Bot suggests, staff decides.
- **Framework**: Vercel AI SDK (currently v5). Next.js 15.5 on Vercel.
- **Provider**: OpenAI only (no multi-provider setup currently).
- **OpenAI Budget**: $20/month limit set in OpenAI dashboard.
