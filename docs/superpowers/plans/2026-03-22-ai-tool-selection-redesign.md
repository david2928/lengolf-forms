# AI Tool Selection Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove intent-based tool filtering so all 12 tools are available every turn, switch from gpt-5-mini to gpt-4.1-mini, and fix the regex fast-path classifier bug.

**Architecture:** The AI suggestion pipeline currently gates tool access by classified intent. This plan removes that gate while keeping the intent classifier for prompt/skill selection. The model switch eliminates unnecessary reasoning token overhead.

**Tech Stack:** Next.js 15.5, TypeScript, Vercel AI SDK v5, OpenAI API (gpt-4.1-mini), Supabase Edge Functions (Deno)

**Spec:** `docs/superpowers/specs/2026-03-22-ai-tool-selection-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/ai/function-schemas.ts` | Modify | Delete `INTENT_TOOLS` mapping and `getActiveToolsForIntent()` |
| `src/lib/ai/suggestion-service.ts` | Modify | Remove tool filtering, `validActiveTools`, `isReasoningModel` branching |
| `src/lib/ai/openai-client.ts` | Modify | Change default model, simplify test function |
| `src/lib/ai/intent-classifier.ts` | Modify | Add conversation history check to regex fast-path |
| `supabase/functions/ai-eval-run/index.ts` | Modify | Track `suggestion_model` from API response |
| `docs/research/ai-tool-selection-research-prompt.md` | Modify | Update cost data with actuals |

---

### Task 1: Remove INTENT_TOOLS from function-schemas.ts

**Files:**
- Modify: `src/lib/ai/function-schemas.ts:14-37`

- [ ] **Step 1: Delete `INTENT_TOOLS` mapping (lines 14-29)**

Remove this entire block:
```typescript
const INTENT_TOOLS: Record<string, string[]> = {
  availability_check: ['check_bay_availability', 'get_customer_context', 'search_knowledge'],
  booking_request: ['check_bay_availability', 'get_coaching_availability', 'create_booking', 'get_customer_context'],
  cancellation: ['cancel_booking', 'lookup_booking', 'get_customer_context'],
  modification_request: ['modify_booking', 'lookup_booking', 'get_customer_context'],
  coaching_inquiry: ['get_coaching_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'],
  pricing_inquiry: ['search_knowledge', 'suggest_images'],
  promotion_inquiry: ['check_bay_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'],
  facility_inquiry: ['search_knowledge', 'suggest_images'],
  equipment_inquiry: ['check_club_availability', 'search_knowledge', 'suggest_images'],
  payment_inquiry: ['search_knowledge'],
  location_inquiry: ['search_knowledge', 'get_customer_context', 'suggest_images'],
  general_inquiry: ['check_bay_availability', 'create_booking', 'get_customer_context', 'search_knowledge', 'suggest_images'],
  greeting: ['get_customer_context'],
};
```

- [ ] **Step 2: Delete `getActiveToolsForIntent()` function (lines 35-37)**

Remove:
```typescript
export function getActiveToolsForIntent(intent: string): string[] {
  return INTENT_TOOLS[intent] || [];
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: FAIL — `suggestion-service.ts` still imports `getActiveToolsForIntent`

Do NOT fix yet — Task 2 handles the consumer side.

---

### Task 2: Remove tool filtering from suggestion-service.ts

**Files:**
- Modify: `src/lib/ai/suggestion-service.ts`

- [ ] **Step 1: Update import (line 9)**

Change:
```typescript
// Before:
import { createAITools, getActiveToolsForIntent, createToolExecutionState, stopOnApproval, ContextProviders, ToolExecutionState, ImageCatalogEntry } from './function-schemas';

// After:
import { createAITools, createToolExecutionState, stopOnApproval, ContextProviders, ToolExecutionState, ImageCatalogEntry } from './function-schemas';
```

- [ ] **Step 2: Remove `validActiveTools` and `isReasoningModel` from SuggestionContext type (lines 208, 211)**

Change the interface at lines 194-214:
```typescript
// Remove these two lines:
  validActiveTools: string[];      // line 208 — DELETE
  isReasoningModel: boolean;       // line 211 — DELETE
```

- [ ] **Step 3: Remove image catalog intent guard (~line 1136)**

Change:
```typescript
// Before:
if (activeToolNames.includes('suggest_images') && refacSupabaseAdmin) {

// After:
if (refacSupabaseAdmin) {
```

**Note:** This means every request now queries the image catalog (2 small DB queries for curated images + active promotions). At 8.5 req/day this is negligible — acknowledged trade-off per spec.

- [ ] **Step 4: Remove tool filtering lines and reasoning model check (~lines 1135, 1193-1199)**

Remove line 1135:
```typescript
const activeToolNames = getActiveToolsForIntent(intent);
```

Replace lines 1193-1199:
```typescript
// Before:
const validActiveTools = activeToolNames.filter(name => name in allTools);
const hasTools = validActiveTools.length > 0;

// Model configuration
const modelToUse = params.overrideModel || AI_CONFIG.model;
const isReasoningModel = /^(gpt-5|o1|o3)/i.test(modelToUse);

// After:
const hasTools = Object.keys(allTools).length > 0;

// Model configuration
const modelToUse = params.overrideModel || AI_CONFIG.model;
```

- [ ] **Step 5: Remove `validActiveTools` and `isReasoningModel` from context object assembly**

In the return object of `prepareSuggestionContext()` (around line 1210-1220), remove:
```typescript
    validActiveTools,     // DELETE
    isReasoningModel,     // DELETE
```

- [ ] **Step 6: Update `buildLLMOptions()` (~line 1453)**

Change:
```typescript
// Before:
    ...(ctx.hasTools ? {
      tools: ctx.allTools,
      activeTools: ctx.validActiveTools as Array<keyof typeof ctx.allTools>,
      toolChoice: 'auto' as const,
    } : {}),
    maxOutputTokens: ctx.isReasoningModel ? 1500 : AI_CONFIG.maxTokens,
    temperature: ctx.isReasoningModel ? undefined : AI_CONFIG.temperature,
    providerOptions: ctx.isReasoningModel ? { openai: { reasoningEffort: 'low' } } : undefined,

// After:
    ...(ctx.hasTools ? {
      tools: ctx.allTools,
      toolChoice: 'auto' as const,
    } : {}),
    maxOutputTokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
```

- [ ] **Step 7: Update debug context (~line 1381)**

Change:
```typescript
// Before:
functionSchemas: ctx.hasTools ? ctx.validActiveTools : undefined,

// After:
functionSchemas: ctx.hasTools ? Object.keys(ctx.allTools) : undefined,
```

- [ ] **Step 8: Update `onStepFinish` debug logging (~line 1472)**

Change:
```typescript
// Before:
payload: { model: ctx.modelToUse, system: '(see finalContextPrompt)', messages: '(see conversationMessages)', tools: ctx.hasTools ? ctx.validActiveTools : undefined }

// After:
payload: { model: ctx.modelToUse, system: '(see finalContextPrompt)', messages: '(see conversationMessages)', tools: ctx.hasTools ? Object.keys(ctx.allTools) : undefined }
```

- [ ] **Step 9: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/lib/ai/function-schemas.ts src/lib/ai/suggestion-service.ts
git commit -m "refactor: remove intent-based tool filtering — all tools available every turn"
```

---

### Task 3: Switch default model to gpt-4.1-mini

**Files:**
- Modify: `src/lib/ai/openai-client.ts`

- [ ] **Step 1: Update default model and file header**

Change line 2:
```typescript
// Before:
// Uses GPT-5-mini for reasoning + cost-effective generation

// After:
// Uses GPT-4.1-mini for cost-effective generation with strong tool selection
```

Change line 23:
```typescript
// Before:
model: process.env.OPENAI_MODEL || 'gpt-5-mini',

// After:
model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
```

- [ ] **Step 2: Simplify `testOpenAIConnection()` (lines 46-77)**

Replace lines 53-63:
```typescript
// Before:
    const isReasoningModel = /^(gpt-5|o1|o3)/i.test(AI_CONFIG.model);
    // as any: reasoning_effort param not fully typed in SDK
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [{ role: 'user', content: 'Hello' }],
      ...(isReasoningModel
        ? { max_completion_tokens: 100, reasoning_effort: 'low' as const }
        : { max_tokens: 5 }),
    } as any);

// After:
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/openai-client.ts
git commit -m "refactor: switch default model from gpt-5-mini to gpt-4.1-mini"
```

---

### Task 4: Fix regex fast-path to respect conversation history

**Files:**
- Modify: `src/lib/ai/intent-classifier.ts:222-235`

- [ ] **Step 1: Add conversation history check**

Change in `classifyIntent()` at line 228:
```typescript
// Before:
  // Tier 1: Regex fast-path for obvious, unambiguous intents
  const fastResult = regexFastPath(customerMessage);
  if (fastResult) {
    return {
      ...fastResult,
      source: 'regex',
      classificationTimeMs: Date.now() - startTime,
    };
  }

// After:
  // Tier 1: Regex fast-path — only for first messages (no conversation history).
  // Follow-up messages go through the LLM classifier which sees conversation context.
  // recentMessages includes the current message, so length <= 1 means first message.
  const hasHistory = recentMessages && recentMessages.length > 1;
  if (!hasHistory) {
    const fastResult = regexFastPath(customerMessage);
    if (fastResult) {
      return {
        ...fastResult,
        source: 'regex',
        classificationTimeMs: Date.now() - startTime,
      };
    }
  }
```

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Run intent classifier eval**

Run: `set -a && source .env && set +a && npx tsx scripts/eval-intent-classifier.ts`
Expected: 95%+ pass rate. Some test cases in `regex_fast_path` category that had `history: []` will still pass via regex. Cases with history will now route to LLM.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/intent-classifier.ts
git commit -m "fix: regex fast-path now defers to LLM classifier when conversation has history"
```

---

### Task 5: Track suggestion_model in eval edge function

**Files:**
- Modify: `supabase/functions/ai-eval-run/index.ts`

- [ ] **Step 1: Capture model from first successful sample (~line 355)**

After line 357 (`const debug = suggestion.debugContext`), add tracking:
```typescript
      const debug = suggestion.debugContext
      const detectedModel = debug?.model || null

      // Track suggestion model on the run (first sample wins)
      if (detectedModel && !modelTracked) {
        await supabase
          .schema('ai_eval')
          .from('eval_runs')
          .update({ suggestion_model: detectedModel })
          .eq('id', runId)
        modelTracked = true
      }
```

- [ ] **Step 2: Add `modelTracked` variable in `processBatch()` function**

Find the `processBatch` function (~line 256) and add a tracking flag after the existing `let errors = 0` (~line 264):

```typescript
  let modelTracked = false
```

Note: `processBatch` is called once per batch. The `modelTracked` flag resets each batch, so it updates on the first successful sample of each batch. Since the value is the same model every time, the updates are idempotent.

- [ ] **Step 3: Deploy edge function**

Run: Use `mcp__supabase__deploy_edge_function` to deploy `ai-eval-run`

Or manually:
```bash
npx supabase functions deploy ai-eval-run
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-eval-run/index.ts
git commit -m "feat: track suggestion_model in eval runs for model comparison"
```

---

### Task 6: Verify everything works end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Run full typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS with no errors or warnings

- [ ] **Step 2: Run intent classifier eval**

Run: `set -a && source .env && set +a && npx tsx scripts/eval-intent-classifier.ts`
Expected: 95%+ pass rate

- [ ] **Step 3: Start dev server and test a suggestion**

Run: `npm run dev`

Then test with a real conversation:
```bash
set -a && source .env && set +a
npx tsx scripts/sample-e2e-suggestions.ts --count 5 --days 3
```

Check output for:
- AI responses are coherent
- Function calls are being made (check `functionCalled` field)
- No errors in dev.log

- [ ] **Step 4: Run judge scoring with label**

Run: `set -a && source .env && set +a && npx tsx scripts/judge-sample-results.ts --persist --label "post-tool-redesign-gpt41mini"`
Expected: Scores comparable to previous baseline (avg_overall >= 4.0)

- [ ] **Step 5: Update research doc with actual costs**

Edit `docs/research/ai-tool-selection-research-prompt.md`, update the "Current Cost Estimates" section:
- Volume: ~8.5 suggestions/day (254/month), not 1,000/day
- Monthly cost: $15.43 (actual), not $150 (estimated)
- gpt-5-mini is 94% of cost at $14.57
- After switch to gpt-4.1-mini: estimated ~$5.75/month

- [ ] **Step 6: Final commit**

```bash
git add docs/research/ai-tool-selection-research-prompt.md
git commit -m "docs: update research doc with actual OpenAI usage costs"
```
