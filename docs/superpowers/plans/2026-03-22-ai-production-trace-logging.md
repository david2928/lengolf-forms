# AI Production Request Tracing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add always-on step-by-step trace logging for production AI suggestion requests, stored in `ai_eval.ai_suggestion_traces` with 14-day retention.

**Architecture:** Extend the existing `onStepFinish` callback in `buildLLMOptions()` to run for all requests (not just dry-run), collect steps in memory, and fire-and-forget write to a new DB table after suggestion storage. The streaming route removes its `onStepFinish: undefined` override and adds error-path trace writes.

**Tech Stack:** Supabase (Postgres), Next.js API routes, AI SDK (`ai` package), pg_cron

**Spec:** `docs/superpowers/specs/2026-03-22-ai-production-trace-logging.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260322200000_create_ai_suggestion_traces.sql` | Create | DB table, indexes, RLS, grants |
| `src/lib/ai/suggestion-service.ts` | Modify | `TraceStep` type, `traceSteps` on context, always-on `onStepFinish`, `writeTraces()`, fire-and-forget calls |
| `app/api/ai/suggest-response/stream/route.ts` | Modify | Remove `onStepFinish: undefined`, add error-path trace write |

---

### Task 1: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260322200000_create_ai_suggestion_traces.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260322200000_create_ai_suggestion_traces.sql`:

```sql
-- AI Suggestion Production Traces
-- Stores step-by-step LLM execution traces for debugging AI suggestion behavior.
-- Retention: 14 days (cleaned by pg_cron).

-- ─── Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_eval.ai_suggestion_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Step data
  step_number INT NOT NULL,
  finish_reason TEXT,

  -- Tool call data (JSONB arrays to support multiple tool calls per step)
  tool_calls JSONB,       -- [{toolCallId, toolName, args}, ...]
  tool_results JSONB,     -- [{toolCallId, toolName, result}, ...]

  -- Text output (null if step was tool-only)
  text_output TEXT,

  -- Token usage
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,

  -- Request metadata
  model TEXT,
  channel_type TEXT,
  intent TEXT
);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_traces_conversation_id
  ON ai_eval.ai_suggestion_traces(conversation_id);

CREATE INDEX IF NOT EXISTS idx_traces_created_at
  ON ai_eval.ai_suggestion_traces(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_suggestion_id
  ON ai_eval.ai_suggestion_traces(suggestion_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE ai_eval.ai_suggestion_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traces_select_authenticated"
  ON ai_eval.ai_suggestion_traces FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "traces_all_service_role"
  ON ai_eval.ai_suggestion_traces FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── Grants ────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA ai_eval TO authenticated;
GRANT USAGE ON SCHEMA ai_eval TO service_role;

GRANT SELECT ON ai_eval.ai_suggestion_traces TO authenticated;
GRANT ALL ON ai_eval.ai_suggestion_traces TO service_role;
```

- [ ] **Step 2: Apply the migration to production**

Run: `mcp__supabase__apply_migration` with the SQL above and name `create_ai_suggestion_traces`.

- [ ] **Step 3: Verify the table exists**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'ai_eval' AND table_name = 'ai_suggestion_traces'
ORDER BY ordinal_position;
```

Expected: 15 columns matching the schema above.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260322200000_create_ai_suggestion_traces.sql
git commit -m "feat: create ai_suggestion_traces table for production trace logging"
```

---

### Task 2: Add TraceStep Type and traceSteps to SuggestionContext

**Files:**
- Modify: `src/lib/ai/suggestion-service.ts:192-212` (SuggestionContext interface)
- Modify: `src/lib/ai/suggestion-service.ts:1196-1219` (prepareSuggestionContext return)

- [ ] **Step 1: Add TraceStep interface**

In `src/lib/ai/suggestion-service.ts`, add before the `SuggestionContext` interface (before line 193):

```typescript
// Step-level trace data collected by onStepFinish for production debugging
interface TraceStep {
  stepNumber: number;
  finishReason: string;
  toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }> | null;
  toolResults: Array<{ toolCallId: string; toolName: string; result: unknown }> | null;
  textOutput: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}
```

- [ ] **Step 2: Add traceSteps field to SuggestionContext**

In the `SuggestionContext` interface (~line 210, after `debugInfo`), add:

```typescript
  traceSteps: TraceStep[];
```

- [ ] **Step 3: Initialize traceSteps in prepareSuggestionContext**

In `prepareSuggestionContext()`, after `debugInfo` is initialized (~line 1199), add:

```typescript
  const traceSteps: TraceStep[] = [];
```

Then add `traceSteps` to the return object (~line 1218, after `debugInfo`):

```typescript
    traceSteps,
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no type errors — `traceSteps` is added but not yet used)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/suggestion-service.ts
git commit -m "feat: add TraceStep type and traceSteps to SuggestionContext"
```

---

### Task 3: Make onStepFinish Always-On

**Files:**
- Modify: `src/lib/ai/suggestion-service.ts:1447-1487` (buildLLMOptions function)

- [ ] **Step 1: Replace conditional onStepFinish with always-on version**

In `buildLLMOptions()` (~lines 1460-1486), replace the entire `onStepFinish` property:

**Before** (lines 1460-1486):
```typescript
    onStepFinish: ctx.params.dryRun ? (step: any) => {
      const stepNum = step.stepNumber + 1;
      ctx.debugInfo.openAIRequests.push({
        iteration: stepNum,
        payload: { model: ctx.modelToUse, system: '(see finalContextPrompt)', messages: '(see conversationMessages)', tools: ctx.hasTools ? Object.keys(ctx.allTools) : undefined }
      });
      ctx.debugInfo.openAIResponses.push({
        iteration: stepNum,
        response: {
          text: step.text,
          toolCalls: step.toolCalls,
          toolResults: step.toolResults,
          finishReason: step.finishReason,
          usage: step.usage,
        }
      });
      console.log(`\n========== AI SDK STEP ${stepNum} ==========`);
      console.log(`Model: ${ctx.modelToUse}${ctx.params.overrideModel ? ' (OVERRIDE)' : ''}`);
      console.log(`Finish reason: ${step.finishReason}`);
      if (step.toolCalls.length > 0) {
        console.log(`Tool calls: ${step.toolCalls.map((tc: { toolName: string }) => tc.toolName).join(', ')}`);
      }
      if (step.text) {
        console.log(`Text: ${step.text.substring(0, 200)}${step.text.length > 200 ? '...' : ''}`);
      }
      console.log(`========== END STEP ${stepNum} ==========\n`);
    } : undefined,
```

**After:**
```typescript
    onStepFinish: (step: any) => {
      const stepNum = step.stepNumber + 1;

      // Always collect trace steps for production logging
      ctx.traceSteps.push({
        stepNumber: stepNum,
        finishReason: step.finishReason,
        toolCalls: step.toolCalls?.length > 0
          ? step.toolCalls.map((tc: any) => ({ toolCallId: tc.toolCallId, toolName: tc.toolName, args: tc.args }))
          : null,
        toolResults: step.toolResults?.length > 0
          ? step.toolResults.map((tr: any) => ({ toolCallId: tr.toolCallId, toolName: tr.toolName, result: tr.result }))
          : null,
        textOutput: step.text || null,
        promptTokens: step.usage?.promptTokens ?? null,
        completionTokens: step.usage?.completionTokens ?? null,
        totalTokens: step.usage?.totalTokens ?? null,
      });

      // Dry-run: also do existing debug logging
      if (ctx.params.dryRun) {
        ctx.debugInfo.openAIRequests.push({
          iteration: stepNum,
          payload: { model: ctx.modelToUse, system: '(see finalContextPrompt)', messages: '(see conversationMessages)', tools: ctx.hasTools ? Object.keys(ctx.allTools) : undefined }
        });
        ctx.debugInfo.openAIResponses.push({
          iteration: stepNum,
          response: {
            text: step.text,
            toolCalls: step.toolCalls,
            toolResults: step.toolResults,
            finishReason: step.finishReason,
            usage: step.usage,
          }
        });
        console.log(`\n========== AI SDK STEP ${stepNum} ==========`);
        console.log(`Model: ${ctx.modelToUse}${ctx.params.overrideModel ? ' (OVERRIDE)' : ''}`);
        console.log(`Finish reason: ${step.finishReason}`);
        if (step.toolCalls.length > 0) {
          console.log(`Tool calls: ${step.toolCalls.map((tc: { toolName: string }) => tc.toolName).join(', ')}`);
        }
        if (step.text) {
          console.log(`Text: ${step.text.substring(0, 200)}${step.text.length > 200 ? '...' : ''}`);
        }
        console.log(`========== END STEP ${stepNum} ==========\n`);
      }
    },
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/suggestion-service.ts
git commit -m "feat: make onStepFinish always-on to collect trace steps"
```

---

### Task 4: Add writeTraces Function and Fire-and-Forget Calls

**Files:**
- Modify: `src/lib/ai/suggestion-service.ts` — add `writeTraces()`, call in `postProcessSuggestion()` and `generateAISuggestion()` catch block

- [ ] **Step 1: Add writeTraces function**

Add the following function in `src/lib/ai/suggestion-service.ts`, after the `storeSuggestion()` function (after line ~744, before `prepareSuggestionContext`):

```typescript
// Write step-level traces to ai_eval.ai_suggestion_traces (fire-and-forget)
export async function writeTraces(
  suggestionId: string,
  ctx: SuggestionContext
): Promise<void> {
  if (!refacSupabaseAdmin || ctx.traceSteps.length === 0) return;

  const rows = ctx.traceSteps.map(step => ({
    suggestion_id: suggestionId,
    conversation_id: ctx.params.conversationContext.id,
    step_number: step.stepNumber,
    finish_reason: step.finishReason,
    tool_calls: step.toolCalls,
    tool_results: step.toolResults,
    text_output: step.textOutput,
    prompt_tokens: step.promptTokens,
    completion_tokens: step.completionTokens,
    total_tokens: step.totalTokens,
    model: ctx.modelToUse,
    channel_type: ctx.params.conversationContext.channelType,
    intent: ctx.intent,
  }));

  const { error } = await refacSupabaseAdmin
    .schema('ai_eval')
    .from('ai_suggestion_traces')
    .insert(rows);

  if (error) {
    console.error('[AI Traces] Insert failed:', error.message);
  }
}
```

- [ ] **Step 2: Add fire-and-forget call in postProcessSuggestion**

In `postProcessSuggestion()`, after `suggestionId` is assigned (~line 1439, just before the final `return`), add:

```typescript
  // Fire-and-forget trace storage
  writeTraces(suggestionId, ctx).catch(err =>
    console.error('[AI Traces] Failed to write:', err)
  );
```

- [ ] **Step 3: Add error-path trace write in generateAISuggestion**

In `generateAISuggestion()`, the `catch` block (~line 1499) doesn't have access to `ctx` because it's declared inside `try`. Restructure to hoist `ctx`:

**Before** (lines 1491-1513):
```typescript
export async function generateAISuggestion(params: GenerateSuggestionParams): Promise<AISuggestion> {
  const startTime = Date.now();

  try {
    const ctx = await prepareSuggestionContext(params);
    const generateResult = await generateText(buildLLMOptions(ctx));
    return await postProcessSuggestion(generateResult.text, ctx);

  } catch (error) {
    console.error('Error generating AI suggestion:', error);

    // Return a low-confidence fallback suggestion
    const fallbackSuggestion: AISuggestion = {
      id: 'fallback',
      suggestedResponse: 'Thank you for your message. Let me help you with that.',
      confidenceScore: 0.3,
      responseTimeMs: Date.now() - startTime,
      similarMessagesUsed: [],
      contextSummary: 'Fallback response due to error: ' + (error instanceof Error ? error.message : 'Unknown error')
    };

    return fallbackSuggestion;
  }
}
```

**After:**
```typescript
export async function generateAISuggestion(params: GenerateSuggestionParams): Promise<AISuggestion> {
  const startTime = Date.now();
  let ctx: SuggestionContext | undefined;

  try {
    ctx = await prepareSuggestionContext(params);
    const generateResult = await generateText(buildLLMOptions(ctx));
    return await postProcessSuggestion(generateResult.text, ctx);

  } catch (error) {
    console.error('Error generating AI suggestion:', error);

    // Write any traces collected before the error
    if (ctx) {
      writeTraces(`error-${crypto.randomUUID()}`, ctx).catch(err =>
        console.error('[AI Traces] Failed to write error traces:', err)
      );
    }

    // Return a low-confidence fallback suggestion
    const fallbackSuggestion: AISuggestion = {
      id: 'fallback',
      suggestedResponse: 'Thank you for your message. Let me help you with that.',
      confidenceScore: 0.3,
      responseTimeMs: Date.now() - startTime,
      similarMessagesUsed: [],
      contextSummary: 'Fallback response due to error: ' + (error instanceof Error ? error.message : 'Unknown error')
    };

    return fallbackSuggestion;
  }
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS (no warnings)

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/suggestion-service.ts
git commit -m "feat: add writeTraces function with fire-and-forget storage"
```

---

### Task 5: Update Streaming Route

**Files:**
- Modify: `app/api/ai/suggest-response/stream/route.ts:1-292`

- [ ] **Step 1: Add writeTraces import**

In `app/api/ai/suggest-response/stream/route.ts`, update the import from `suggestion-service.ts` (line 6):

**Before:**
```typescript
import { prepareStreamingSuggestion, postProcessSuggestion, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
```

**After:**
```typescript
import { prepareStreamingSuggestion, postProcessSuggestion, writeTraces, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
```

- [ ] **Step 2: Remove onStepFinish override**

In the SSE stream setup (~line 212-214), remove the `onStepFinish: undefined` override:

**Before:**
```typescript
          const result = streamText({
            ...streamTextOptions,
            onStepFinish: undefined,
          });
```

**After:**
```typescript
          const result = streamText(streamTextOptions);
```

- [ ] **Step 3: Add error-path trace write**

In the `catch` block inside `ReadableStream.start()` (~line 262), add trace writing before the error SSE event:

**Before:**
```typescript
        } catch (error) {
          console.error('[AI Suggestion Stream] Error during streaming:', error);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: error instanceof Error ? error.message : 'Streaming failed',
          })}\n\n`));
          controller.close();
        }
```

**After:**
```typescript
        } catch (error) {
          console.error('[AI Suggestion Stream] Error during streaming:', error);

          // Write any traces collected before the error
          writeTraces(`error-${crypto.randomUUID()}`, ctx).catch(err =>
            console.error('[AI Traces] Failed to write error traces:', err)
          );

          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: error instanceof Error ? error.message : 'Streaming failed',
          })}\n\n`));
          controller.close();
        }
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS (no warnings)

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/suggest-response/stream/route.ts
git commit -m "feat: enable trace collection in streaming route"
```

---

### Task 6: Set Up pg_cron Retention Job

**Files:**
- No file changes — executed via `mcp__supabase__execute_sql`

- [ ] **Step 1: Check existing pg_cron jobs**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT jobid, schedule, command, jobname
FROM cron.job
ORDER BY jobname;
```

Verify no existing job named `cleanup_ai_suggestion_traces`.

- [ ] **Step 2: Schedule the retention cleanup job**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT cron.schedule(
  'cleanup_ai_suggestion_traces',
  '0 20 * * *',
  $$DELETE FROM ai_eval.ai_suggestion_traces WHERE created_at < now() - interval '14 days'$$
);
```

Expected: Returns the job ID.

- [ ] **Step 3: Verify the job is scheduled**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT jobid, schedule, command, jobname
FROM cron.job
WHERE jobname = 'cleanup_ai_suggestion_traces';
```

Expected: One row with schedule `0 20 * * *`.

---

### Task 7: Production Verification

- [ ] **Step 1: Final typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: Both PASS with no errors or warnings.

- [ ] **Step 2: Verify table is queryable**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT COUNT(*) FROM ai_eval.ai_suggestion_traces;
```

Expected: 0 rows (no traces yet — traces will appear after first production request).

- [ ] **Step 3: Verify the complete change set**

Run: `git diff master --stat` to confirm only expected files changed:
- `supabase/migrations/20260322200000_create_ai_suggestion_traces.sql` (new)
- `src/lib/ai/suggestion-service.ts` (modified)
- `app/api/ai/suggest-response/stream/route.ts` (modified)
