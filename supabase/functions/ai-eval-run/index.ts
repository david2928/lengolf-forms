import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvalRequest {
  action: 'start' | 'continue'
  sample_count?: number
  batch_size?: number
  run_id?: string
  date_filter?: string // ISO date string (YYYY-MM-DD) to filter conversations to a specific day
}

interface ConversationMessage {
  content: string
  sender_type: string
  created_at: string
}

const JUDGE_MODEL = 'gpt-4o-mini'
const MAX_BATCHES = 30
const MAX_DURATION_MS = 60 * 60 * 1000 // 1 hour circuit breaker

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for a Thai golf simulator business (LENGOLF) AI assistant.
The AI generates staff-facing response suggestions. Score the AI's suggested response on 4 dimensions (1-5 scale):
- appropriateness (0.3 weight): Addresses customer need, correct language, no hallucinated info
- helpfulness (0.3 weight): Resolves question/request, actionable and complete
- toneMatch (0.2 weight): Thai premium service tone, warm, professional, polite particles
- brevity (0.2 weight): Ideal length, concise and complete (1-2 sentences)
Respond in JSON: {"appropriateness":{"score":N,"reasoning":"..."},"helpfulness":{"score":N,"reasoning":"..."},"toneMatch":{"score":N,"reasoning":"..."},"brevity":{"score":N,"reasoning":"..."}}`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    const vercelUrl = Deno.env.get('VERCEL_PRODUCTION_URL') || 'https://lengolf-forms.vercel.app'

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body: EvalRequest = await req.json()
    const { action } = body
    // Clamp inputs to prevent abuse (max 200 samples, max 25 per batch)
    const sample_count = Math.min(Math.max(1, Number(body.sample_count) || 50), 200)
    const batch_size = Math.min(Math.max(1, Number(body.batch_size) || 10), 25)

    if (action === 'start') {
      return await handleStart(supabase, supabaseUrl, supabaseKey, openaiKey, vercelUrl, sample_count, batch_size, body.date_filter)
    } else if (action === 'continue') {
      if (!body.run_id) {
        return jsonResponse({ error: 'run_id required for continue action' }, 400)
      }
      return await handleContinue(supabase, supabaseUrl, supabaseKey, openaiKey, vercelUrl, body.run_id, batch_size)
    }

    return jsonResponse({ error: 'Invalid action' }, 400)
  } catch (error) {
    console.error('Edge function error:', error)
    return jsonResponse({ success: false, error: String(error) }, 500)
  }
})

async function handleStart(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  openaiKey: string,
  vercelUrl: string,
  sampleCount: number,
  batchSize: number,
  dateFilter?: string,
) {
  // Build conversation query — either specific date or last 60 days
  let query = supabase
    .from('unified_conversations')
    .select('id')

  if (dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    // Filter to conversations with messages on the specific date (Bangkok time = UTC+7)
    const dateStart = `${dateFilter}T00:00:00+07:00`
    const dateEnd = `${dateFilter}T23:59:59+07:00`
    query = query.gte('last_message_at', dateStart).lte('last_message_at', dateEnd)
  } else {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('last_message_at', sixtyDaysAgo)
  }

  const { data: conversations, error: convError } = await query.limit(500)

  if (convError || !conversations?.length) {
    return jsonResponse({ error: `No conversations found: ${convError?.message || 'empty'}` }, 500)
  }

  // Shuffle and pick N
  const shuffled = conversations.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, sampleCount).map((c: { id: string }) => c.id)
  const totalBatches = Math.ceil(selected.length / batchSize)

  // Create eval run
  const { data: run, error: runError } = await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .insert({
      status: 'running',
      trigger_type: 'cron',
      sample_count_requested: sampleCount,
      judge_model: JUDGE_MODEL,
      batch_current: 0,
      batch_total: totalBatches,
      conversation_ids: selected,
    })
    .select('id')
    .single()

  if (runError || !run) {
    return jsonResponse({ error: `Failed to create run: ${runError?.message}` }, 500)
  }

  const runId = run.id

  // Process first batch
  const firstBatch = selected.slice(0, batchSize)
  const { processed } = await processBatch(supabase, openaiKey, vercelUrl, runId, firstBatch)

  // Update progress
  await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .update({ batch_current: 1 })
    .eq('id', runId)

  // If more batches, self-invoke
  if (totalBatches > 1) {
    selfInvoke(supabaseUrl, supabaseKey, runId, batchSize)
  } else {
    await finalizeRun(supabase, runId, 'completed')
  }

  return jsonResponse({
    success: true,
    run_id: runId,
    batch: 1,
    total_batches: totalBatches,
    processed_in_batch: processed,
  })
}

async function handleContinue(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  openaiKey: string,
  vercelUrl: string,
  runId: string,
  batchSize: number,
) {
  // Get run details
  const { data: run, error: runError } = await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return jsonResponse({ error: `Run not found: ${runError?.message}` }, 404)
  }

  // Circuit breaker
  const startedAt = new Date(run.started_at).getTime()
  if (Date.now() - startedAt > MAX_DURATION_MS) {
    await finalizeRun(supabase, runId, 'partial', 'Circuit breaker: exceeded 1 hour')
    return jsonResponse({ success: false, error: 'Circuit breaker triggered' })
  }

  // Check batch limits
  if (run.batch_current >= MAX_BATCHES) {
    await finalizeRun(supabase, runId, 'partial', `Max batches (${MAX_BATCHES}) reached`)
    return jsonResponse({ success: false, error: 'Max batches reached' })
  }

  const conversationIds: string[] = run.conversation_ids || []
  const currentBatch = run.batch_current || 0
  const start = currentBatch * batchSize
  const batchIds = conversationIds.slice(start, start + batchSize)

  if (batchIds.length === 0) {
    await finalizeRun(supabase, runId, 'completed')
    return jsonResponse({ success: true, run_id: runId, status: 'completed' })
  }

  const { processed } = await processBatch(supabase, openaiKey, vercelUrl, runId, batchIds)
  const newBatchCurrent = currentBatch + 1

  await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .update({ batch_current: newBatchCurrent })
    .eq('id', runId)

  // Check if more batches
  const hasMore = (newBatchCurrent * batchSize) < conversationIds.length
  if (hasMore) {
    selfInvoke(supabaseUrl, supabaseKey, runId, batchSize)
  } else {
    await finalizeRun(supabase, runId, 'completed')
  }

  return jsonResponse({
    success: true,
    run_id: runId,
    batch: newBatchCurrent,
    total_batches: run.batch_total,
    processed_in_batch: processed,
    has_more: hasMore,
  })
}

async function processBatch(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  vercelUrl: string,
  runId: string,
  conversationIds: string[],
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  for (const convId of conversationIds) {
    try {
      // Fetch messages for this conversation
      const { data: messages } = await supabase
        .from('unified_messages')
        .select('content, sender_type, created_at')
        .eq('conversation_id', convId)
        .not('content', 'is', null)
        .not('content', 'eq', '')
        .order('created_at', { ascending: true })

      if (!messages || messages.length < 3) continue

      // Fetch conversation metadata
      const { data: conv } = await supabase
        .from('unified_conversations')
        .select('customer_id, channel_type')
        .eq('id', convId)
        .single()

      // Find a customer message with staff response
      let testMsg: ConversationMessage | null = null
      let staffResponse: string | null = null
      let history: ConversationMessage[] = []

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        if ((msg.sender_type === 'user' || msg.sender_type === 'customer') && msg.content.length >= 5) {
          // Find next staff response
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].sender_type === 'admin' || messages[j].sender_type === 'staff') {
              testMsg = msg
              staffResponse = messages[j].content
              history = messages.slice(0, i)
              break
            }
          }
          if (testMsg) break
        }
      }

      if (!testMsg) continue

      // Call production API for AI suggestion
      const suggestStart = Date.now()
      const suggestResp = await fetch(`${vercelUrl}/api/ai/suggest-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerMessage: testMsg.content,
          conversationId: convId,
          channelType: conv?.channel_type || 'line',
          customerId: conv?.customer_id || null,
          dryRun: true,
          conversationContext: history,
        }),
      })

      const suggestData = await suggestResp.json()
      const suggestLatency = Date.now() - suggestStart

      if (!suggestData.success || !suggestData.suggestion) continue

      const suggestion = suggestData.suggestion
      const aiResponse = suggestion.suggestedResponse || suggestion.suggestedResponseThai || ''
      const debug = suggestion.debugContext

      // Judge the response
      const judgeStart = Date.now()
      const judgeResult = await judgeResponse(openaiKey, testMsg.content, aiResponse, staffResponse, history, conv?.channel_type || 'line', debug?.intentDetected || 'unknown')
      const judgeLatency = Date.now() - judgeStart

      // Insert sample
      const { error: insertError } = await supabase
        .schema('ai_eval')
        .from('eval_samples')
        .insert({
          run_id: runId,
          conversation_id: convId,
          customer_name: null,
          channel_type: conv?.channel_type || 'line',
          customer_message: testMsg.content,
          conversation_history: history,
          actual_staff_response: staffResponse,
          ai_response: aiResponse,
          ai_response_thai: suggestion.suggestedResponseThai || null,
          intent: debug?.intentDetected || 'unknown',
          intent_source: debug?.intentSource || 'unknown',
          confidence_score: suggestion.confidenceScore,
          function_called: suggestion.functionCalled || null,
          has_customer_context: !!debug?.customerData,
          needs_management: !!suggestion.managementNote,
          suggestion_latency_ms: suggestLatency,
          judge_overall: judgeResult?.overallScore || null,
          judge_appropriateness: judgeResult?.appropriateness || null,
          judge_helpfulness: judgeResult?.helpfulness || null,
          judge_tone_match: judgeResult?.toneMatch || null,
          judge_brevity: judgeResult?.brevity || null,
          judge_reasoning: judgeResult?.reasoning || null,
          judge_model: JUDGE_MODEL,
          judge_latency_ms: judgeLatency,
        })

      if (!insertError) processed++
    } catch (err) {
      console.error(`Error processing conversation ${convId}:`, err)
      errors++
    }
  }

  // Update error count on run
  if (errors > 0) {
    await supabase
      .schema('ai_eval')
      .from('eval_runs')
      .update({ error_count: errors })
      .eq('id', runId)
  }

  return { processed, errors }
}

interface JudgeResult {
  overallScore: number
  appropriateness: number
  helpfulness: number
  toneMatch: number
  brevity: number
  reasoning: Record<string, string>
}

async function judgeResponse(
  openaiKey: string,
  customerMessage: string,
  aiResponse: string,
  staffResponse: string | null,
  history: ConversationMessage[],
  channelType: string,
  intent: string,
): Promise<JudgeResult | null> {
  const userContent = [
    `CHANNEL: ${channelType}`,
    `INTENT: ${intent}`,
    history.length > 0 ? `\nCONVERSATION HISTORY:\n${history.slice(-6).map((m) => `  ${m.sender_type === 'user' || m.sender_type === 'customer' ? 'CUSTOMER' : 'STAFF'}: ${m.content}`).join('\n')}` : '',
    `\nCUSTOMER MESSAGE: "${customerMessage}"`,
    `\nAI RESPONSE: "${aiResponse}"`,
    staffResponse ? `\nSTAFF RESPONSE: "${staffResponse}"` : '\nSTAFF RESPONSE: (not available)',
  ].join('\n')

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    })

    if (!resp.ok) return null

    const data = await resp.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    const a = Math.max(1, Math.min(5, Math.round(parsed.appropriateness?.score || 3)))
    const h = Math.max(1, Math.min(5, Math.round(parsed.helpfulness?.score || 3)))
    const t = Math.max(1, Math.min(5, Math.round(parsed.toneMatch?.score || 3)))
    const b = Math.max(1, Math.min(5, Math.round(parsed.brevity?.score || 3)))
    const overall = Math.round((a * 0.3 + h * 0.3 + t * 0.2 + b * 0.2) * 10) / 10

    return {
      overallScore: overall,
      appropriateness: a,
      helpfulness: h,
      toneMatch: t,
      brevity: b,
      reasoning: {
        appropriateness: parsed.appropriateness?.reasoning || '',
        helpfulness: parsed.helpfulness?.reasoning || '',
        toneMatch: parsed.toneMatch?.reasoning || '',
        brevity: parsed.brevity?.reasoning || '',
      },
    }
  } catch (err) {
    console.error('Judge error:', err)
    return null
  }
}

async function finalizeRun(
  supabase: ReturnType<typeof createClient>,
  runId: string,
  status: string,
  errorMessage?: string,
) {
  // Compute aggregates from samples
  const { data: samples } = await supabase
    .schema('ai_eval')
    .from('eval_samples')
    .select('judge_overall, judge_appropriateness, judge_helpfulness, judge_tone_match, judge_brevity, intent, suggestion_latency_ms, judge_latency_ms, actual_staff_response')
    .eq('run_id', runId)

  if (!samples) {
    await supabase.schema('ai_eval').from('eval_runs').update({
      completed_at: new Date().toISOString(),
      status,
      error_message: errorMessage || null,
    }).eq('id', runId)
    return
  }

  const totalSamples = samples.length
  const judged = samples.filter((s: Record<string, unknown>) => s.judge_overall != null)
  const judgedSamples = judged.length
  const skippedNoStaff = samples.filter((s: Record<string, unknown>) => !s.actual_staff_response).length

  const avg = (arr: number[]) => arr.length > 0
    ? Math.round((arr.reduce((a: number, b: number) => a + b, 0) / arr.length) * 100) / 100
    : null

  const avgOverall = avg(judged.map((s: Record<string, unknown>) => s.judge_overall as number))
  const avgApprop = avg(judged.map((s: Record<string, unknown>) => s.judge_appropriateness as number).filter(Boolean))
  const avgHelp = avg(judged.map((s: Record<string, unknown>) => s.judge_helpfulness as number).filter(Boolean))
  const avgTone = avg(judged.map((s: Record<string, unknown>) => s.judge_tone_match as number).filter(Boolean))
  const avgBrev = avg(judged.map((s: Record<string, unknown>) => s.judge_brevity as number).filter(Boolean))

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  judged.forEach((s: Record<string, unknown>) => {
    const bucket = String(Math.max(1, Math.min(5, Math.round(s.judge_overall as number))))
    distribution[bucket] = (distribution[bucket] || 0) + 1
  })

  const intentMap = new Map<string, number[]>()
  judged.forEach((s: Record<string, unknown>) => {
    const intent = (s.intent as string) || 'unknown'
    const existing = intentMap.get(intent)
    if (existing) existing.push(s.judge_overall as number)
    else intentMap.set(intent, [s.judge_overall as number])
  })

  const byIntent: Array<{ intent: string; count: number; overallMean: number }> = []
  intentMap.forEach((scores, intent) => {
    const mean = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    byIntent.push({ intent, count: scores.length, overallMean: mean })
  })
  byIntent.sort((a, b) => b.count - a.count)

  const sugLatencies = samples.map((s: Record<string, unknown>) => s.suggestion_latency_ms as number).filter(Boolean)
  const judgeLatencies = judged.map((s: Record<string, unknown>) => s.judge_latency_ms as number).filter(Boolean)

  await supabase.schema('ai_eval').from('eval_runs').update({
    completed_at: new Date().toISOString(),
    status,
    total_samples: totalSamples,
    judged_samples: judgedSamples,
    skipped_no_staff: skippedNoStaff,
    avg_overall: avgOverall,
    avg_appropriateness: avgApprop,
    avg_helpfulness: avgHelp,
    avg_tone_match: avgTone,
    avg_brevity: avgBrev,
    score_distribution: distribution,
    by_intent: byIntent,
    avg_suggestion_latency_ms: sugLatencies.length > 0 ? Math.round(sugLatencies.reduce((a: number, b: number) => a + b, 0) / sugLatencies.length) : null,
    avg_judge_latency_ms: judgeLatencies.length > 0 ? Math.round(judgeLatencies.reduce((a: number, b: number) => a + b, 0) / judgeLatencies.length) : null,
    error_message: errorMessage || null,
  }).eq('id', runId)
}

function selfInvoke(supabaseUrl: string, supabaseKey: string, runId: string, batchSize: number) {
  // Fire and forget — non-blocking self-invocation
  fetch(`${supabaseUrl}/functions/v1/ai-eval-run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      action: 'continue',
      run_id: runId,
      batch_size: batchSize,
    }),
  }).catch((err) => console.error('Self-invoke failed:', err))
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
