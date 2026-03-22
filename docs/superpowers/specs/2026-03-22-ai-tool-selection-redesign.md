# AI Tool Selection Redesign

**Date:** 2026-03-22
**Status:** Implemented (2026-03-22)
**Scope:** Remove intent-based tool filtering, switch model, fix regex classifier

## Problem

The AI suggestion bot pre-filters which tools the LLM can see based on intent classification. This creates three issues:

1. **Tool gating by intent** — If the classifier says `pricing_inquiry`, the LLM cannot call `create_booking` or `check_bay_availability`. Conversations that drift from pricing to booking are broken.
2. **Regex fast-path ignores conversation context** — "ว่างมั้ย" always matches `availability_check` via regex, even mid-coaching conversation where the LLM classifier would correctly return `coaching_inquiry`.
3. **Single intent per message** — Multi-intent messages ("How much is coaching and is Min available?") get one intent, losing half the request.

Additionally, the system uses gpt-5-mini (a reasoning model) for suggestion generation. At current volume (~8.5 suggestions/day), reasoning tokens add cost without measurable quality benefit for tool selection tasks.

## Solution

### Approach: Minimal Surgery

Remove tool filtering, switch model, fix regex — 4 files changed, mostly deletions.

**What changes:**
- All 12 tools available every turn (model selects using its judgment)
- Default model: gpt-5-mini → gpt-4.1-mini (non-reasoning, better tool-selection benchmarks)
- Regex fast-path skipped when conversation has history (LLM classifier handles context)
- Reasoning-model branching removed from codebase

**What stays:**
- Intent classifier (still selects skills/prompts — valuable for focused context)
- Skill-based prompt composition
- `requiresApproval` safety gating on write tools
- `createAITools()` structural conditionals (customerId, image catalog)
- `ALLOWED_MODELS` set (gpt-5-mini available via `overrideModel` for A/B testing)
- Weekly eval system (LLM-as-a-judge)

## Detailed Changes

### 1. Remove Tool Filtering (`function-schemas.ts`)

**Delete:**
- `INTENT_TOOLS` mapping (lines 14-29) — the entire intent-to-tool-names record
- `getActiveToolsForIntent()` function (lines 35-37)

**Keep:**
- `createAITools()` — unchanged, still conditionally includes context tools
- `ToolExecutionState`, `stopOnApproval`, all tool definitions — unchanged
- Export of `createAITools` and `createToolExecutionState`

### 2. Pass All Tools in Suggestion Service (`suggestion-service.ts`)

**In `prepareSuggestionContext()` (~line 1135):**

Replace lines 1135, 1193-1195:
```typescript
// BEFORE (line 1135):
const activeToolNames = getActiveToolsForIntent(intent);
// BEFORE (lines 1193-1195):
const validActiveTools = activeToolNames.filter(name => name in allTools);
const hasTools = validActiveTools.length > 0;

// AFTER (replace both with):
const hasTools = Object.keys(allTools).length > 0;
```

Remove `validActiveTools` from `SuggestionContext` type (~line 192).

**In `buildLLMOptions()` (~line 1453):**

Before:
```typescript
...(ctx.hasTools ? {
  tools: ctx.allTools,
  activeTools: ctx.validActiveTools as Array<keyof typeof ctx.allTools>,
  toolChoice: 'auto' as const,
} : {}),
```

After:
```typescript
...(ctx.hasTools ? {
  tools: ctx.allTools,
  toolChoice: 'auto' as const,
} : {}),
```

**In debug context assembly:**
- Remove references to `validActiveTools` in `debugInfo` and `onStepFinish` logging

**In import statement:**
- Remove `getActiveToolsForIntent` from the import from `'./function-schemas'`

**In image catalog loading (~line 1136):**
- Remove: `if (activeToolNames.includes('suggest_images') && refacSupabaseAdmin)` guard
- Change to: always load image catalog when `refacSupabaseAdmin` is available (the `suggest_images` tool will only be created if catalog is non-empty, which is the existing behavior in `createAITools`)
- **Note:** This means every request now queries the image catalog (2 small DB queries). At 8.5 req/day this is negligible. If the catalog grows large, `suggest_images` should become a search-based tool — but that's a future concern, not a blocker.

**Step count limit (`stepCountIs(5)`):**
- **Reviewed and kept at 5.** With all tools visible, the model could theoretically chain more calls. However, the typical max path is 3 steps (`get_customer_context` → `check_bay_availability` → `create_booking`), and the `stopOnApproval` condition halts on write operations anyway. 5 steps provides adequate headroom. Monitor in production — if truncation is observed, increase to 7.

### 3. Switch Default Model (`openai-client.ts`)

**Change default model:**
```typescript
// Before:
model: process.env.OPENAI_MODEL || 'gpt-5-mini',

// After:
model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
```

**Update file header comment (line 2):**
```typescript
// Before: // Uses GPT-5-mini for reasoning + cost-effective generation
// After:  // Uses GPT-4.1-mini for cost-effective generation with strong tool selection
```

**In `testOpenAIConnection()`:**
- Remove `isReasoningModel` check and reasoning-specific params
- Use standard `max_tokens: 5` for all models

**Confirmed:** `gpt-4.1-mini` is already in `ALLOWED_MODELS` set in `suggest-response-helpers.ts` (line 14). No change needed there.

### 4. Remove Reasoning Model Branching (`suggestion-service.ts`)

**Remove throughout:**
- `const isReasoningModel = /^(gpt-5|o1|o3)/i.test(modelToUse);` variable
- `isReasoningModel` field from `SuggestionContext` type

**In `buildLLMOptions()`:**
- `maxOutputTokens`: always use `AI_CONFIG.maxTokens` (500)
- `temperature`: always use `AI_CONFIG.temperature` (0.7)
- `providerOptions`: remove entirely (no `reasoningEffort`)

**Keep unchanged:**
- `intent-classifier.ts` reasoning model detection (independent, for `INTENT_CLASSIFIER_MODEL` env var)
- `ALLOWED_MODELS` in `suggest-response-helpers.ts` (gpt-5-mini stays for override)

### 5. Fix Regex Fast-Path (`intent-classifier.ts`)

**In `classifyIntent()` (~line 222):**

Before:
```typescript
const fastResult = regexFastPath(customerMessage);
if (fastResult) {
  return { ...fastResult, source: 'regex', classificationTimeMs: Date.now() - startTime };
}
```

After:
```typescript
const hasHistory = recentMessages && recentMessages.length > 1;
if (!hasHistory) {
  const fastResult = regexFastPath(customerMessage);
  if (fastResult) {
    return { ...fastResult, source: 'regex', classificationTimeMs: Date.now() - startTime };
  }
}
```

**Why `> 1` not `> 0`:** The `recentMessages` array includes the current message itself (see `llmClassify` lines 140-146 which deduplicates). The suggestion service also uses `recentMessages.length <= 1` to detect "no history" (line 874). So `length <= 1` = first message, `length > 1` = has prior conversation context.

First messages still get the free regex path. Follow-ups go through the LLM classifier which sees conversation context.

### 6. Track suggestion_model in Eval (`supabase/functions/ai-eval-run/index.ts`)

The `eval_runs` table already has a `suggestion_model TEXT` column (migration line 26), but the edge function never populates it. The dry-run API response includes `suggestion.debugContext.model` (set at `suggestion-service.ts` line 1384).

**In `processBatch()` (~line 355):**
- Extract: `const suggestionModel = suggestData?.suggestion?.debugContext?.model || null;`

**In the run creation insert (~line 133) or first batch completion:**
- Add: `suggestion_model: suggestionModel` to the run update

No DB migration needed — column already exists.

### 7. Update Research Doc

Update `docs/research/ai-tool-selection-research-prompt.md` cost section with actual data:
- Volume: ~8.5 suggestions/day (not 1,000)
- Monthly cost: $15.43 (not $150)
- gpt-5-mini is 94% of cost
- gpt-4.1-mini switch saves ~$9.64/month (66%)

## Cost Impact

**Actual current usage (30 days ending March 22, 2026):**

| Model | Requests | Cost |
|-------|----------|------|
| gpt-5-mini (suggestions) | 3,352 | $14.57 |
| gpt-4o-mini (classifier + judge) | 4,868 | $0.78 |
| text-embedding-3-small | 2,256 | ~$0.00 |
| Other (testing) | 184 | $0.08 |
| **Total** | **10,660** | **$15.43** |

**After redesign (estimated):**

| Change | Effect |
|--------|--------|
| gpt-5-mini → gpt-4.1-mini | $14.57 → ~$4.92 (-66%) |
| All tools (stable prefix, better caching) | Cache hits should improve from 36.6% |
| Regex fast-path change | ~35% more LLM classifier calls, +~$0.05/month |
| **New monthly total** | **~$5.75** |

## Safety

| Concern | Mitigation |
|---------|-----------|
| Model calls wrong tool | Tool descriptions have detailed "Use when" / "Do NOT use" guidance; 12 tools with non-overlapping purposes |
| Accidental booking/cancellation | `requiresApproval` flag on all write tools; staff reviews before sending |
| Quality regression | Weekly eval (LLM-as-a-judge) auto-detects >0.5 point drops |
| Model switch degrades Thai | gpt-4.1-mini benchmarks well on multilingual tasks; eval covers Thai specifically via tone_match dimension |

## Rollback

Primary approach: `git revert <commit>` — all changes are in one commit.

Individual reversals if needed:
- **Model**: change one line in `openai-client.ts` back to `gpt-5-mini`, restore `isReasoningModel` branching
- **Tool filtering**: re-add `INTENT_TOOLS`, `getActiveToolsForIntent`, `validActiveTools` in SuggestionContext, and `activeTools` in `buildLLMOptions`
- **Regex fix**: remove the `hasHistory` guard in `classifyIntent()`

## Verification Plan

1. `npm run typecheck` + `npm run lint` — must pass
2. `npx tsx scripts/eval-intent-classifier.ts` — verify no regression (95%+ pass rate)
3. `npx tsx scripts/sample-e2e-suggestions.ts --today` — spot-check suggestion quality
4. `npx tsx scripts/judge-sample-results.ts --persist --label "post-tool-redesign"` — baseline judge scores
5. Deploy to production, monitor first weekly eval run for regression
6. Check OpenAI usage after 1 week to confirm cost reduction

## Files Changed

| File | Change Type |
|------|-------------|
| `src/lib/ai/function-schemas.ts` | Delete `INTENT_TOOLS`, `getActiveToolsForIntent` |
| `src/lib/ai/suggestion-service.ts` | Remove tool filtering, reasoning branching |
| `src/lib/ai/openai-client.ts` | Change default model, simplify test function |
| `src/lib/ai/intent-classifier.ts` | Add conversation history check to regex fast-path |
| `supabase/functions/ai-eval-run/index.ts` | Track suggestion_model |
| `docs/research/ai-tool-selection-research-prompt.md` | Update cost data |
