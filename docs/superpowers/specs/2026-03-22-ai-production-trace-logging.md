# AI Production Request Tracing

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Add step-by-step trace logging for production AI suggestion requests

## Problem

The AI suggestion system captures detailed step-by-step traces (tool calls, arguments, results, text output, finish reason, token usage) only during dry-run/eval mode via `onStepFinish` in `buildLLMOptions()`. Production streaming requests don't persist this data anywhere.

When debugging issues like "why did the bot call the wrong tool" or "why didn't it call any tool," the only data available is the final suggestion stored in `ai_suggestions` — no intermediate steps.

## Solution

### Approach: Always-On Step Tracing with Fire-and-Forget Storage

Extend the existing `onStepFinish` callback to run for all requests (not just dry-run), collect step data in memory, and write traces to a new database table after the suggestion is stored — without blocking the response.

**What changes:**
- `onStepFinish` runs for all requests, collecting steps into a `traceSteps` array on `SuggestionContext`
- New `writeTraces()` function does a single batch INSERT after `postProcessSuggestion`
- Fire-and-forget: trace write is non-blocking, failures are logged but don't affect the response
- Streaming route removes its `onStepFinish: undefined` override
- 14-day automatic retention cleanup via pg_cron

**What stays:**
- Dry-run mode still gets its existing `debugInfo` logging (console output, debug context)
- `ai_suggestions` table unchanged
- No new API endpoints or UI
- No impact on response latency

## Database Schema

New table in the `ai_eval` schema (collocated with existing eval infrastructure):

```sql
CREATE TABLE ai_eval.ai_suggestion_traces (
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
```

**`conversation_id`:** Stored as TEXT (not UUID) for robustness — matches the TypeScript `string` type in `ConversationContext.id` and avoids silent insert failures if a non-UUID value ever appears.

**`suggestion_id`:** Links to `ai_suggestions.id`. Stored as TEXT (not UUID FK) because dry-run IDs are prefixed `eval-` and missing-messageId IDs are prefixed `temp-`. No foreign key constraint — traces should survive even if the suggestion record is deleted or was never created.

### Indexes

```sql
CREATE INDEX idx_traces_conversation_id ON ai_eval.ai_suggestion_traces(conversation_id);
CREATE INDEX idx_traces_created_at ON ai_eval.ai_suggestion_traces(created_at DESC);
CREATE INDEX idx_traces_suggestion_id ON ai_eval.ai_suggestion_traces(suggestion_id);
```

Note: With tool data now stored as JSONB arrays, querying by tool name uses `tool_calls @> '[{"toolName": "check_bay_availability"}]'`. A GIN index could be added later if needed, but at current volume plain scans are fast enough.

### RLS & Grants

Same pattern as existing `ai_eval` tables:
- Authenticated users: SELECT only
- Service role: ALL
- Schema usage granted to both roles

### Retention

pg_cron job running daily at 3 AM Bangkok time (8 PM UTC):

```sql
SELECT cron.schedule(
  'cleanup_ai_suggestion_traces',
  '0 20 * * *',
  $$DELETE FROM ai_eval.ai_suggestion_traces WHERE created_at < now() - interval '14 days'$$
);
```

## Implementation Details

### 1. SuggestionContext Changes (`suggestion-service.ts`)

Add a `traceSteps` array to `SuggestionContext`:

```typescript
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

The `SuggestionContext` type gets a new field: `traceSteps: TraceStep[]`.

### 2. Always-On `onStepFinish` (`buildLLMOptions`)

Currently:
```typescript
onStepFinish: ctx.params.dryRun ? (step: any) => { ... } : undefined,
```

After:
```typescript
onStepFinish: (step: any) => {
  // Always collect trace steps
  const stepNum = step.stepNumber + 1;
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
    promptTokens: step.usage?.promptTokens || null,
    completionTokens: step.usage?.completionTokens || null,
    totalTokens: step.usage?.totalTokens || null,
  });

  // Dry-run: also do existing debug logging
  if (ctx.params.dryRun) {
    ctx.debugInfo.openAIRequests.push({ ... });
    ctx.debugInfo.openAIResponses.push({ ... });
    console.log(...);
  }
},
```

### 3. `writeTraces()` Function

New async function in `suggestion-service.ts`:

```typescript
async function writeTraces(
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

### 4. Fire-and-Forget in `postProcessSuggestion()`

After the suggestion is stored and `suggestionId` is assigned (~line 1438):

```typescript
// Fire-and-forget trace storage
writeTraces(suggestionId, ctx).catch(err =>
  console.error('[AI Traces] Failed to write:', err)
);
```

### 5. Error Path Trace Writes

**Non-streaming (`generateAISuggestion`):** The `catch` block returns a fallback suggestion. Before returning, fire-and-forget traces with `suggestionId = 'error-' + crypto.randomUUID()`:

```typescript
} catch (error) {
  // Write any traces collected before the error
  if (ctx) {
    writeTraces(`error-${crypto.randomUUID()}`, ctx).catch(err =>
      console.error('[AI Traces] Failed to write error traces:', err)
    );
  }
  // ... existing fallback logic
}
```

**Streaming route (`stream/route.ts`):** The `catch` block inside `ReadableStream.start()` sends an SSE error event. Before closing, fire-and-forget:

```typescript
} catch (error) {
  // Write traces collected before the error
  writeTraces(`error-${crypto.randomUUID()}`, ctx).catch(err =>
    console.error('[AI Traces] Failed to write error traces:', err)
  );
  // ... existing error SSE event
}
```

This requires exporting `writeTraces` from `suggestion-service.ts` (or adding a wrapper that the stream route can call). The simplest approach: export `writeTraces` alongside `postProcessSuggestion`.

### 6. Streaming Route Fix (`stream/route.ts`)

Remove line 214:
```typescript
// Before:
onStepFinish: undefined,

// After:
// (removed — let buildLLMOptions' onStepFinish run)
```

The streaming route already calls `postProcessSuggestion(fullText, ctx)` which will trigger the fire-and-forget trace write.

## Example Queries

```sql
-- All steps for a specific conversation
SELECT step_number, tool_calls, tool_results, text_output, finish_reason
FROM ai_eval.ai_suggestion_traces
WHERE conversation_id = 'xxx'
ORDER BY created_at, step_number;

-- All requests that called a specific tool in the last 7 days
SELECT suggestion_id, conversation_id, tool_calls, tool_results, created_at
FROM ai_eval.ai_suggestion_traces
WHERE tool_calls @> '[{"toolName": "check_bay_availability"}]'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Requests where no tool was called (text-only responses)
SELECT DISTINCT suggestion_id, conversation_id, created_at
FROM ai_eval.ai_suggestion_traces t
WHERE NOT EXISTS (
  SELECT 1 FROM ai_eval.ai_suggestion_traces t2
  WHERE t2.suggestion_id = t.suggestion_id
    AND t2.tool_calls IS NOT NULL
)
AND created_at > now() - interval '7 days';

-- Token usage by model over the last day
SELECT model, COUNT(*) as steps,
  SUM(prompt_tokens) as total_prompt,
  SUM(completion_tokens) as total_completion
FROM ai_eval.ai_suggestion_traces
WHERE created_at > now() - interval '1 day'
GROUP BY model;

-- Error traces (failed requests — most valuable for debugging)
SELECT suggestion_id, conversation_id, step_number, tool_calls, text_output, created_at
FROM ai_eval.ai_suggestion_traces
WHERE suggestion_id LIKE 'error-%'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

**Note:** Traces only exist from the deployment date forward. Querying older conversations will return no results.

## Volume & Storage Estimates

- ~8.5 suggestions/day, ~2-3 steps each = ~25 rows/day
- Average row size: ~2KB (including full tool results)
- 14-day retention: ~350 rows, ~700KB
- Negligible storage and query cost

## Files Changed

| File | Change Type |
|------|-------------|
| `supabase/migrations/YYYYMMDD_create_ai_suggestion_traces.sql` | New table, indexes, RLS, grants |
| `src/lib/ai/suggestion-service.ts` | `TraceStep` type, `traceSteps` on SuggestionContext, always-on `onStepFinish`, `writeTraces()` (exported), fire-and-forget in `postProcessSuggestion` + error catch block |
| `app/api/ai/suggest-response/stream/route.ts` | Remove `onStepFinish: undefined` override, add error-path trace write |
| pg_cron (via `execute_sql`) | Schedule 14-day cleanup job |

## Safety

| Concern | Mitigation |
|---------|-----------|
| Trace write adds latency | Fire-and-forget, non-blocking |
| Trace write fails | Caught and logged, doesn't affect suggestion delivery |
| Table grows unbounded | 14-day pg_cron cleanup, ~350 rows max at current volume |
| Sensitive data in traces | Tool args/results contain business data (customer names, booking details) — same sensitivity as existing `ai_suggestions.context_used`. RLS restricts to authenticated users. |

## Rollback

Remove the `writeTraces()` calls in `postProcessSuggestion()`, `generateAISuggestion()` catch block, and `stream/route.ts` catch block. Restore `onStepFinish: ctx.params.dryRun ? ... : undefined` in `buildLLMOptions()`. The table can remain (no data written) or be dropped.
