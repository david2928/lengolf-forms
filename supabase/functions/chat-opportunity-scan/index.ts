import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Analysis system prompt for LLM
const ANALYSIS_SYSTEM_PROMPT = `You are analyzing a customer conversation for Lengolf, a golf simulator business in Bangkok, Thailand. Your job is to identify follow-up opportunities from conversations that have gone cold.

BUSINESS CONTEXT:
- Lengolf offers golf simulator bay rentals (hourly), coaching lessons, and packages
- Operating hours: 9:00 AM - 11:00 PM
- Bay types: Social Bay (up to 5 players) and AI Bay (1-2 players with advanced analytics)
- Services: Bay rentals, coaching (with various coaches), packages (pre-paid bundles)
- Club rentals are FREE with bay bookings

=== CRITICAL: NOT OPPORTUNITIES (EXCLUDE THESE) ===

The following are NOT sales opportunities - classify as "not_an_opportunity":

1. **B2B PARTNERSHIP/COLLABORATION** - Partnership requests, joint promotions, vendors, sponsors, influencer collaborations
2. **JOB SEEKERS** - Employment inquiries, coach positions
3. **SPAM/IRRELEVANT** - Promotional spam, automated messages, unrelated content
4. **CUSTOMER SERVICE** - Complaints, technical issues, refunds, feedback

Thai keywords for NON-OPPORTUNITIES: ร่วมมือ, พาร์ทเนอร์, สมัครงาน, ขายสินค้า

=== VALID OPPORTUNITY TYPES ===

- coaching_inquiry: Asked about lessons, coaches, learning golf
- pricing_inquiry: Asked about prices, promotions, discounts
- booking_failed: Wanted to book but couldn't
- package_interest: Interest in packages or memberships
- equipment_inquiry: Asked about equipment, clubs
- general_interest: General interest (potential customer)

PRIORITY: HIGH (contact info, strong interest, booking issues) | MEDIUM (asked questions) | LOW (brief, unclear)

=== THAI MESSAGE RULES ===
Write as FEMALE staff: Use ค่ะ/ค่า (NEVER ครับ). Be warm and friendly.

Respond ONLY with valid JSON:
{
  "opportunityType": "...",
  "priority": "high|medium|low",
  "confidenceScore": 0.00,
  "analysisSummary": "...",
  "suggestedAction": "...",
  "suggestedMessage": "...",
  "extractedContactInfo": { "name": "", "phone": "", "email": "" }
}`

interface ConversationMessage {
  id: string
  content: string
  sender_type: string
  sender_name: string
  created_at: string
}

interface AnalysisResult {
  opportunityType: string
  priority: string
  confidenceScore: number
  analysisSummary: string
  suggestedAction: string
  suggestedMessage: string
  extractedContactInfo?: {
    name?: string
    phone?: string
    email?: string
  }
}

interface BatchSummary {
  scanned: number
  analyzed: number
  created: number
  skipped: number
  errors: number
}

function formatMessagesForPrompt(messages: ConversationMessage[]): string {
  return messages.map((msg, index) => {
    const sender = msg.sender_type === 'user' || msg.sender_type === 'customer' ? 'Customer' : 'Staff'
    const name = msg.sender_name ? ` (${msg.sender_name})` : ''
    return `[${index + 1}] ${sender}${name}: ${msg.content}`
  }).join('\n')
}

function detectLanguage(messages: ConversationMessage[]): string {
  const allText = messages
    .filter(m => m.sender_type === 'user' || m.sender_type === 'customer')
    .map(m => m.content)
    .join(' ')

  const thaiPattern = /[\u0E00-\u0E7F]/
  return thaiPattern.test(allText) ? 'Thai' : 'English'
}

function parseAnalysisResponse(content: string): AnalysisResult | null {
  try {
    let jsonStr = content.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    if (!parsed.opportunityType || !parsed.priority || parsed.confidenceScore === undefined) {
      return null
    }

    return {
      opportunityType: parsed.opportunityType,
      priority: parsed.priority,
      confidenceScore: Math.min(1, Math.max(0, parseFloat(parsed.confidenceScore) || 0)),
      analysisSummary: parsed.analysisSummary || '',
      suggestedAction: parsed.suggestedAction || '',
      suggestedMessage: parsed.suggestedMessage || '',
      extractedContactInfo: parsed.extractedContactInfo || {},
    }
  } catch {
    return null
  }
}

async function analyzeWithOpenAI(
  messages: ConversationMessage[],
  openaiApiKey: string
): Promise<AnalysisResult | null> {
  const formattedMessages = formatMessagesForPrompt(messages)
  const detectedLanguage = detectLanguage(messages)

  const lastMessage = messages[messages.length - 1]
  const lastMessageDate = new Date(lastMessage.created_at)
  const daysSinceLastMessage = Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))
  const lastMessageBy = lastMessage.sender_type === 'user' || lastMessage.sender_type === 'customer'
    ? 'customer' : 'staff'

  const userPrompt = `CONVERSATION:
${formattedMessages}

CONTEXT: Last message ${daysSinceLastMessage} days ago by ${lastMessageBy}. Language: ${detectedLanguage}

Analyze and respond with JSON only.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) return null
    return parseAnalysisResponse(content)
  } catch (error) {
    console.error('OpenAI call failed:', error)
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let batchRunId: string | null = null

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials')
    }

    if (!openaiApiKey) {
      throw new Error('Missing OPENAI_API_KEY')
    }

    // Parse parameters
    let params = { daysThreshold: 3, maxAgeDays: 30, confidenceThreshold: 0.6, batchSize: 10, delayMs: 2000 }
    try {
      const body = await req.json()
      params = { ...params, ...body }
    } catch {
      // Use defaults
    }

    console.log(`[BatchProcess] Starting with params:`, params)

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const summary: BatchSummary = { scanned: 0, analyzed: 0, created: 0, skipped: 0, errors: 0 }

    // Create batch run record
    const { data: batchRun } = await supabase
      .from('chat_opportunity_batch_runs')
      .insert({
        trigger_type: 'cron',
        status: 'running',
        parameters: params,
      })
      .select()
      .single()

    if (batchRun) {
      batchRunId = batchRun.id
    }

    // Find potential opportunities
    const { data: potentials, error: scanError } = await supabase.rpc('find_chat_opportunities', {
      p_days_threshold: params.daysThreshold,
      p_max_age_days: params.maxAgeDays,
    })

    if (scanError) {
      throw new Error(`Scan failed: ${scanError.message}`)
    }

    summary.scanned = potentials?.length || 0
    console.log(`[BatchProcess] Found ${summary.scanned} potential conversations`)

    // Filter to LINE only, exclude existing customers
    const toProcess = (potentials || [])
      .filter((p: any) => p.channel_type === 'line' && !p.customer_id)
      .slice(0, params.batchSize)

    console.log(`[BatchProcess] Processing ${toProcess.length} LINE conversations`)

    // Process each conversation
    for (let i = 0; i < toProcess.length; i++) {
      const potential = toProcess[i]
      console.log(`[BatchProcess] ${i + 1}/${toProcess.length}: ${potential.customer_name || potential.conversation_id}`)

      try {
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('unified_messages')
          .select('id, content, sender_type, sender_name, created_at')
          .eq('conversation_id', potential.conversation_id)
          .order('created_at', { ascending: true })
          .limit(20)

        if (messagesError || !messagesData?.length) {
          console.log(`  No messages found`)
          summary.skipped++
          continue
        }

        summary.analyzed++

        // Analyze with LLM
        const analysis = await analyzeWithOpenAI(messagesData, openaiApiKey)

        if (!analysis) {
          console.log(`  LLM analysis failed`)
          summary.errors++
          continue
        }

        console.log(`  Result: ${analysis.opportunityType} (${analysis.confidenceScore})`)

        const isNotOpportunity = analysis.opportunityType === 'not_an_opportunity'
        const belowThreshold = !isNotOpportunity && analysis.confidenceScore < params.confidenceThreshold

        // Skip low confidence (but still save not_an_opportunity to avoid re-processing)
        if (belowThreshold) {
          console.log(`  Below confidence threshold, skipping`)
          summary.skipped++
          continue
        }

        // Create record (including not_an_opportunity to prevent re-analysis)
        const { error: createError } = await supabase
          .from('chat_opportunities')
          .insert({
            conversation_id: potential.conversation_id,
            channel_type: potential.channel_type,
            opportunity_type: analysis.opportunityType,
            priority: isNotOpportunity ? 'low' : analysis.priority,
            confidence_score: analysis.confidenceScore,
            customer_name: potential.customer_name || analysis.extractedContactInfo?.name,
            customer_phone: potential.customer_phone || analysis.extractedContactInfo?.phone,
            customer_email: potential.customer_email || analysis.extractedContactInfo?.email,
            analysis_summary: analysis.analysisSummary,
            suggested_action: isNotOpportunity ? null : analysis.suggestedAction,
            suggested_message: isNotOpportunity ? null : analysis.suggestedMessage,
            status: isNotOpportunity ? 'dismissed' : 'pending',
            analyzed_at: new Date().toISOString(),
          })

        if (createError) {
          if (createError.code === '23505') {
            console.log(`  Already exists`)
            summary.skipped++
          } else {
            console.error(`  Create error: ${createError.message}`)
            summary.errors++
          }
          continue
        }

        // Log creation
        const { data: createdOpp } = await supabase
          .from('chat_opportunities')
          .select('id')
          .eq('conversation_id', potential.conversation_id)
          .single()

        if (createdOpp) {
          await supabase.from('chat_opportunity_logs').insert({
            opportunity_id: createdOpp.id,
            action: 'created',
            actor: 'batch_process',
            new_status: isNotOpportunity ? 'dismissed' : 'pending',
            details: {
              source: 'edge_function',
              batch_run_id: batchRunId,
              confidence_score: analysis.confidenceScore,
              is_not_opportunity: isNotOpportunity,
            },
          })
        }

        if (isNotOpportunity) {
          console.log(`  Marked as not_an_opportunity`)
          summary.skipped++
        } else {
          console.log(`  Created successfully`)
          summary.created++
        }

        // Rate limiting
        if (i < toProcess.length - 1) {
          await delay(params.delayMs)
        }
      } catch (err) {
        console.error(`  Error:`, err)
        summary.errors++
      }
    }

    const processingTimeMs = Date.now() - startTime

    // Update batch run record
    if (batchRunId) {
      await supabase
        .from('chat_opportunity_batch_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          scanned: summary.scanned,
          analyzed: summary.analyzed,
          created: summary.created,
          skipped: summary.skipped,
          errors: summary.errors,
          processing_time_ms: processingTimeMs,
        })
        .eq('id', batchRunId)
    }

    console.log(`[BatchProcess] Complete: ${JSON.stringify(summary)} in ${processingTimeMs}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        processingTimeMs,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    console.error('[BatchProcess] Error:', error)

    // Update batch run with error
    if (batchRunId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabase
        .from('chat_opportunity_batch_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: processingTimeMs,
        })
        .eq('id', batchRunId)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
