// Batch processing endpoint for chat opportunities
// Called by pg_cron daily to automatically scan and analyze cold conversations
// POST: Run batch processing with configurable parameters

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { openai, AI_CONFIG } from '@/lib/ai/openai-client';
import type {
  PotentialOpportunity,
  OpportunityType,
  OpportunityPriority,
  ConversationMessage,
} from '@/types/chat-opportunities';

// Import the analysis system prompt from the analyze route
const ANALYSIS_SYSTEM_PROMPT = `You are analyzing a customer conversation for Lengolf, a golf simulator business in Bangkok, Thailand. Your job is to identify follow-up opportunities from conversations that have gone cold.

BUSINESS CONTEXT:
- Lengolf offers golf simulator bay rentals (hourly), coaching lessons, and packages
- Operating hours: 10:00 AM - 10:00 PM
- Bay types: Social Bay (up to 5 players) and AI Bay (1-2 players with advanced analytics)
- Services: Bay rentals, coaching (with various coaches), packages (pre-paid bundles)
- Club rentals are FREE with bay bookings
- Equipment: Bravo Golf launch monitors providing comprehensive swing data

=== CRITICAL: NOT OPPORTUNITIES (EXCLUDE THESE) ===

The following types of conversations are NOT sales opportunities and MUST be classified as "not_an_opportunity":

1. **B2B PARTNERSHIP/COLLABORATION REQUESTS** - People or businesses wanting to:
   - Partner with Lengolf (ร่วมมือ, ความร่วมมือ, partnership, collaborate, collaboration)
   - Do joint promotions or cross-marketing
   - Become a vendor/supplier
   - Propose business deals or sponsorships
   - Offer their services TO Lengolf (marketing, software, equipment, etc.)
   - Influencer/content creator collaboration requests

2. **JOB SEEKERS** - People asking about:
   - Employment, hiring, job openings (สมัครงาน, รับสมัคร, งาน, job, career, hiring)
   - Coach positions, instructor roles

3. **SPAM/IRRELEVANT** - Messages that are:
   - Promotional spam from other businesses
   - Automated messages
   - Completely unrelated to golf or our services
   - Scams or phishing attempts

4. **EXISTING CUSTOMER SERVICE** - Messages about:
   - Complaints about past service
   - Technical issues with bookings
   - Refund requests
   - General feedback (not sales-related)

Thai keywords to identify NON-OPPORTUNITIES:
- ร่วมมือ, ความร่วมมือ (collaboration)
- พาร์ทเนอร์, เป็นพาร์ทเนอร์ (partner)
- ร่วมโปรโมท, โปรโมทร่วม (joint promotion)
- เสนอบริการ (offer services)
- สมัครงาน, หางาน (job seeking)
- ขายสินค้า, เสนอขาย (selling to us)

If a conversation matches ANY of the above patterns, return "not_an_opportunity" immediately.

=== VALID OPPORTUNITY TYPES (for potential CUSTOMERS only) ===

- coaching_inquiry: Customer asked about lessons, coaches, learning golf, โค้ช, เรียน
- pricing_inquiry: Customer asked about prices, promotions, discounts, ราคา, โปร
- booking_failed: Customer wanted to book but couldn't (slot full, timing issue, said "will come another day")
- package_interest: Customer expressed interest in packages or memberships, แพ็คเกจ
- equipment_inquiry: Customer asked about equipment, clubs, accessories
- general_interest: General interest that doesn't fit above categories (but IS a potential customer)

IMPORTANT: Only classify as an opportunity if the person is a POTENTIAL CUSTOMER wanting to USE our services, NOT someone wanting to do business WITH us.

PRIORITY CRITERIA:
- HIGH: Customer provided contact info (name, phone, email), expressed strong interest, had booking issues, or said they would come back
- MEDIUM: Customer asked questions and received info but didn't follow up
- LOW: Brief interaction, unclear intent

TASK:
Analyze the conversation and provide:
1. Opportunity classification (or "not_an_opportunity" if no sales potential)
2. Priority level
3. Confidence score (0.0 to 1.0)
4. Brief summary of why this is an opportunity (1-2 sentences)
5. Suggested action for staff (1 sentence)
6. Draft follow-up message in the SAME LANGUAGE the customer used (Thai or English)
7. Any contact info extracted from the conversation

=== CRITICAL: THAI LANGUAGE RULES ===

When writing Thai messages, you MUST write as a FEMALE staff member:
- ALWAYS use "ค่ะ" or "ค่า" at the end of sentences (feminine particles)
- NEVER use "ครับ" (masculine particle)
- Sound warm, friendly, and professional like a Thai woman
- Keep messages concise but polite (not too long)
- Use appropriate Thai particles and warm expressions

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`;

interface BatchProcessParams {
  daysThreshold?: number;
  maxAgeDays?: number;
  confidenceThreshold?: number;
  batchSize?: number;
  delayMs?: number;
}

interface BatchProcessSummary {
  scanned: number;
  analyzed: number;
  created: number;
  skipped: number;
  errors: number;
}

interface AnalysisResult {
  opportunityType: OpportunityType | 'not_an_opportunity';
  priority: OpportunityPriority;
  confidenceScore: number;
  analysisSummary: string;
  suggestedAction: string;
  suggestedMessage: string;
  extractedContactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

function formatMessagesForPrompt(messages: ConversationMessage[]): string {
  return messages.map((msg, index) => {
    const sender = msg.sender_type === 'user' || msg.sender_type === 'customer'
      ? 'Customer'
      : 'Staff';
    const name = msg.sender_name ? ` (${msg.sender_name})` : '';
    return `[${index + 1}] ${sender}${name}: ${msg.content}`;
  }).join('\n');
}

function detectLanguage(messages: ConversationMessage[]): string {
  const allText = messages
    .filter(m => m.sender_type === 'user' || m.sender_type === 'customer')
    .map(m => m.content)
    .join(' ');

  const thaiPattern = /[\u0E00-\u0E7F]/;
  if (thaiPattern.test(allText)) {
    return 'Thai';
  }
  return 'English';
}

function parseAnalysisResponse(content: string): AnalysisResult | null {
  try {
    let jsonStr = content.trim();

    // If wrapped in markdown code blocks, extract the JSON
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.opportunityType || !parsed.priority || parsed.confidenceScore === undefined) {
      console.error('[BatchProcess] Missing required fields in analysis response');
      return null;
    }

    const validTypes: (OpportunityType | 'not_an_opportunity')[] = [
      'coaching_inquiry', 'pricing_inquiry', 'booking_failed',
      'package_interest', 'equipment_inquiry', 'general_interest',
      'not_an_opportunity'
    ];

    const validPriorities: OpportunityPriority[] = ['high', 'medium', 'low'];

    if (!validTypes.includes(parsed.opportunityType)) {
      parsed.opportunityType = 'general_interest';
    }

    if (!validPriorities.includes(parsed.priority)) {
      parsed.priority = 'medium';
    }

    return {
      opportunityType: parsed.opportunityType,
      priority: parsed.priority,
      confidenceScore: Math.min(1, Math.max(0, parseFloat(parsed.confidenceScore) || 0)),
      analysisSummary: parsed.analysisSummary || '',
      suggestedAction: parsed.suggestedAction || '',
      suggestedMessage: parsed.suggestedMessage || '',
      extractedContactInfo: parsed.extractedContactInfo || {},
    };
  } catch (error) {
    console.error('[BatchProcess] Failed to parse analysis response:', error);
    return null;
  }
}

async function analyzeConversation(
  conversationId: string,
  messages: ConversationMessage[]
): Promise<AnalysisResult | null> {
  if (!AI_CONFIG.enabled || !process.env.OPENAI_API_KEY) {
    console.error('[BatchProcess] AI not enabled');
    return null;
  }

  const formattedMessages = formatMessagesForPrompt(messages);
  const detectedLanguage = detectLanguage(messages);

  const lastMessageDate = new Date(messages[messages.length - 1].created_at);
  const daysSinceLastMessage = Math.floor(
    (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const lastMessage = messages[messages.length - 1];
  const lastMessageBy = lastMessage.sender_type === 'user' || lastMessage.sender_type === 'customer'
    ? 'customer message'
    : 'staff message';

  const userPrompt = `CONVERSATION HISTORY:
${formattedMessages}

CONTEXT:
- Last message was ${daysSinceLastMessage} days ago
- Conversation ended with ${lastMessageBy}
- Customer language appears to be: ${detectedLanguage}

Analyze this conversation and respond with JSON in this exact format:
{
  "opportunityType": "coaching_inquiry|pricing_inquiry|booking_failed|package_interest|equipment_inquiry|general_interest|not_an_opportunity",
  "priority": "high|medium|low",
  "confidenceScore": 0.00,
  "analysisSummary": "Brief explanation of the opportunity",
  "suggestedAction": "What staff should do",
  "suggestedMessage": "Draft follow-up message in customer's language",
  "extractedContactInfo": {
    "name": "extracted name if found",
    "phone": "extracted phone if found",
    "email": "extracted email if found"
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    return parseAnalysisResponse(content);
  } catch (error) {
    console.error('[BatchProcess] LLM call failed:', error);
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let batchRunId: string | null = null;

  try {
    // Verify API secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CHAT_OPPORTUNITY_CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[BatchProcess] Unauthorized batch processing attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse parameters with defaults
    const body: BatchProcessParams = await request.json().catch(() => ({}));
    const {
      daysThreshold = 3,
      maxAgeDays = 30,
      confidenceThreshold = 0.6,
      batchSize = 10,
      delayMs = 2000,
    } = body;

    console.log(`[BatchProcess] Starting batch with params: daysThreshold=${daysThreshold}, maxAgeDays=${maxAgeDays}, confidenceThreshold=${confidenceThreshold}, batchSize=${batchSize}`);

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Create batch run record
    const { data: batchRun, error: batchRunError } = await refacSupabaseAdmin
      .from('chat_opportunity_batch_runs')
      .insert({
        trigger_type: 'cron',
        status: 'running',
        parameters: {
          daysThreshold,
          maxAgeDays,
          confidenceThreshold,
          batchSize,
          delayMs,
        },
      })
      .select()
      .single();

    if (batchRunError) {
      console.error('[BatchProcess] Failed to create batch run record:', batchRunError);
      // Continue anyway - audit is nice-to-have
    } else {
      batchRunId = batchRun?.id;
    }

    const summary: BatchProcessSummary = {
      scanned: 0,
      analyzed: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    };

    // Step 1: Find potential opportunities using the database function
    const { data: potentials, error: scanError } = await refacSupabaseAdmin.rpc('find_chat_opportunities', {
      p_days_threshold: daysThreshold,
      p_max_age_days: maxAgeDays,
    });

    if (scanError) {
      console.error('[BatchProcess] Scan failed:', scanError);
      throw new Error(`Scan failed: ${scanError.message}`);
    }

    const potentialOpportunities: PotentialOpportunity[] = (potentials || []).map((opp: any) => ({
      conversation_id: opp.conversation_id,
      channel_type: opp.channel_type,
      channel_user_id: opp.channel_user_id,
      last_message_at: opp.last_message_at,
      last_message_text: opp.last_message_text,
      last_message_by: opp.last_message_by,
      customer_id: opp.customer_id,
      customer_name: opp.customer_name,
      customer_phone: opp.customer_phone,
      customer_email: opp.customer_email,
      days_since_last_message: opp.days_since_last_message,
      has_inquiry_keywords: opp.has_inquiry_keywords,
      inquiry_keywords: opp.inquiry_keywords || [],
      suggested_opportunity_type: opp.suggested_opportunity_type,
    }));

    summary.scanned = potentialOpportunities.length;
    console.log(`[BatchProcess] Found ${summary.scanned} potential conversations`);

    // Filter to LINE only and exclude those who already became customers
    const lineOnly = potentialOpportunities.filter(p => p.channel_type === 'line' && !p.customer_id);
    console.log(`[BatchProcess] Filtered to ${lineOnly.length} LINE conversations (excluding existing customers)`);

    // Limit to batchSize
    const toProcess = lineOnly.slice(0, batchSize);
    console.log(`[BatchProcess] Processing ${toProcess.length} conversations (limited to batch size)`);

    // Step 2: Process each potential opportunity
    for (let i = 0; i < toProcess.length; i++) {
      const potential = toProcess[i];
      console.log(`[BatchProcess] Processing ${i + 1}/${toProcess.length}: ${potential.customer_name || 'Unknown'} (${potential.conversation_id})`);

      try {
        // Fetch conversation messages
        const { data: messagesData, error: messagesError } = await refacSupabaseAdmin
          .from('unified_messages')
          .select('id, content, sender_type, sender_name, created_at')
          .eq('conversation_id', potential.conversation_id)
          .order('created_at', { ascending: true })
          .limit(20);

        if (messagesError || !messagesData?.length) {
          console.log(`[BatchProcess]   No messages found or error: ${messagesError?.message}`);
          summary.skipped++;
          continue;
        }

        const messages: ConversationMessage[] = messagesData.map((msg: { id: string; content: string; sender_type: string; sender_name: string; created_at: string }) => ({
          id: msg.id,
          content: msg.content,
          sender_type: msg.sender_type as ConversationMessage['sender_type'],
          sender_name: msg.sender_name,
          created_at: msg.created_at,
        }));

        summary.analyzed++;

        // Analyze with LLM
        const analysis = await analyzeConversation(potential.conversation_id, messages);

        if (!analysis) {
          console.log(`[BatchProcess]   LLM analysis failed`);
          summary.errors++;
          continue;
        }

        console.log(`[BatchProcess]   LLM result: ${analysis.opportunityType} (confidence: ${analysis.confidenceScore})`);

        // Skip if not an opportunity or below confidence threshold
        if (analysis.opportunityType === 'not_an_opportunity') {
          console.log(`[BatchProcess]   Not an opportunity, skipping`);
          summary.skipped++;
          continue;
        }

        if (analysis.confidenceScore < confidenceThreshold) {
          console.log(`[BatchProcess]   Confidence ${analysis.confidenceScore} below threshold ${confidenceThreshold}, skipping`);
          summary.skipped++;
          continue;
        }

        // Create opportunity record
        const { error: createError } = await refacSupabaseAdmin
          .from('chat_opportunities')
          .insert({
            conversation_id: potential.conversation_id,
            channel_type: potential.channel_type,
            opportunity_type: analysis.opportunityType,
            priority: analysis.priority,
            confidence_score: analysis.confidenceScore,
            customer_name: potential.customer_name || analysis.extractedContactInfo?.name,
            customer_phone: potential.customer_phone || analysis.extractedContactInfo?.phone,
            customer_email: potential.customer_email || analysis.extractedContactInfo?.email,
            analysis_summary: analysis.analysisSummary,
            suggested_action: analysis.suggestedAction,
            suggested_message: analysis.suggestedMessage,
            analyzed_at: new Date().toISOString(),
          });

        if (createError) {
          // Handle unique constraint violation (already exists)
          if (createError.code === '23505') {
            console.log(`[BatchProcess]   Already exists, skipping`);
            summary.skipped++;
          } else {
            console.error(`[BatchProcess]   Failed to create: ${createError.message}`);
            summary.errors++;
          }
          continue;
        }

        // Log the creation
        // First get the created opportunity ID
        const { data: createdOpp } = await refacSupabaseAdmin
          .from('chat_opportunities')
          .select('id')
          .eq('conversation_id', potential.conversation_id)
          .single();

        if (createdOpp) {
          await refacSupabaseAdmin
            .from('chat_opportunity_logs')
            .insert({
              opportunity_id: createdOpp.id,
              action: 'created',
              actor: 'batch_process',
              new_status: 'pending',
              details: {
                opportunity_type: analysis.opportunityType,
                priority: analysis.priority,
                confidence_score: analysis.confidenceScore,
                source: 'batch_process',
                batch_run_id: batchRunId,
              },
            });
        }

        console.log(`[BatchProcess]   Created successfully`);
        summary.created++;

        // Rate limiting delay between LLM calls
        if (i < toProcess.length - 1) {
          await delay(delayMs);
        }
      } catch (err) {
        console.error(`[BatchProcess]   Error:`, err);
        summary.errors++;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Update batch run record
    if (batchRunId) {
      await refacSupabaseAdmin
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
        .eq('id', batchRunId);
    }

    console.log(`[BatchProcess] Complete: ${summary.scanned} scanned, ${summary.analyzed} analyzed, ${summary.created} created, ${summary.skipped} skipped, ${summary.errors} errors in ${processingTimeMs}ms`);

    return NextResponse.json({
      success: true,
      summary,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error('[BatchProcess] Fatal error:', error);

    // Update batch run record with error
    if (batchRunId && refacSupabaseAdmin) {
      await refacSupabaseAdmin
        .from('chat_opportunity_batch_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processing_time_ms: processingTimeMs,
        })
        .eq('id', batchRunId);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET endpoint to check batch processing status (for manual testing)
export async function GET(request: NextRequest) {
  try {
    // Verify API secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CHAT_OPPORTUNITY_CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Get last 10 batch runs
    const { data: runs, error } = await refacSupabaseAdmin
      .from('chat_opportunity_batch_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      runs: runs || [],
    });
  } catch (error) {
    console.error('[BatchProcess] Status check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
