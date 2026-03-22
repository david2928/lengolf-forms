import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { generateAISuggestion, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import {
  ALLOWED_MODELS,
  MAX_CUSTOMER_MESSAGE_LENGTH,
  UUID_RE,
  SuggestResponseRequest,
  checkRateLimit,
  getConversationContext,
  getCustomerContext,
  getBusinessContext,
} from '@/lib/ai/suggest-response-helpers';

// AI pipeline: embedding + intent classification + DB queries + LLM generation + function calling
export const maxDuration = 30;

/**
 * Generate AI-powered response suggestion for customer message
 * POST /api/ai/suggest-response
 */
export async function POST(request: NextRequest) {
  // Allow internal service calls (e.g., AI eval Edge Function) via CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isInternalCall = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

  let userEmail = 'ai-eval@internal';
  if (!isInternalCall) {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userEmail = session.user.email;

    // Rate limit: prevent excessive API cost from rapid-fire requests
    if (!checkRateLimit(userEmail)) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait a moment before requesting another suggestion.'
      }, { status: 429 });
    }
  }

  try {
    // Validate OpenAI configuration
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      return NextResponse.json({
        error: 'AI suggestions not available',
        reason: configCheck.error
      }, { status: 503 });
    }

    // Parse request body
    const body: SuggestResponseRequest = await request.json();

    // Validate required fields (customerMessage can be empty if imageUrl is provided)
    if ((!body.customerMessage && !body.imageUrl) || !body.conversationId || !body.channelType) {
      return NextResponse.json({
        error: 'Missing required fields: customerMessage (or imageUrl), conversationId, channelType'
      }, { status: 400 });
    }

    // Validate message length to prevent excessive token usage
    if (body.customerMessage && body.customerMessage.length > MAX_CUSTOMER_MESSAGE_LENGTH) {
      return NextResponse.json({
        error: `Customer message too long (max ${MAX_CUSTOMER_MESSAGE_LENGTH} characters)`
      }, { status: 400 });
    }

    // Validate imageUrl if provided — restrict to trusted domains to prevent SSRF
    if (body.imageUrl) {
      try {
        const parsed = new URL(body.imageUrl);
        if (parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'Image URL must use HTTPS' }, { status: 400 });
        }
        const trustedHosts = ['bisimqmtxjsptehhqpeg.supabase.co', 'api-data.line.me'];
        if (!trustedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.supabase.co'))) {
          return NextResponse.json({ error: 'Image URL must be from a trusted source' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 });
      }
    }

    // Validate conversationId format
    if (!UUID_RE.test(body.conversationId)) {
      return NextResponse.json({
        error: 'Invalid conversationId format'
      }, { status: 400 });
    }

    // Server-side dedup: check if we already generated a suggestion for this message
    if (body.messageId && UUID_RE.test(body.messageId) && refacSupabaseAdmin) {
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

      // Use separate queries instead of .or() to avoid filter injection risk
      const selectCols = 'id, suggested_response, suggested_response_thai, confidence_score, response_time_ms, similar_messages_count, context_used, suggested_images';
      const { data: existingLine } = await refacSupabaseAdmin
        .from('ai_suggestions')
        .select(selectCols)
        .eq('line_message_id', body.messageId)
        .gte('created_at', thirtySecondsAgo)
        .limit(1)
        .maybeSingle();

      let existing = existingLine;
      if (!existing) {
        const { data: existingWeb, error: webError } = await refacSupabaseAdmin
          .from('ai_suggestions')
          .select(selectCols)
          .eq('web_message_id', body.messageId)
          .gte('created_at', thirtySecondsAgo)
          .limit(1)
          .maybeSingle();
        if (webError) {
          console.warn('Dedup web query error:', webError.message);
        }
        existing = existingWeb;
      }
      if (!existing) {
        const { data: existingMeta, error: metaError } = await refacSupabaseAdmin
          .from('ai_suggestions')
          .select(selectCols)
          .eq('meta_message_id', body.messageId)
          .gte('created_at', thirtySecondsAgo)
          .limit(1)
          .maybeSingle();
        if (metaError) {
          console.warn('Dedup meta query error:', metaError.message);
        }
        existing = existingMeta;
      }

      if (existing) {
        return NextResponse.json({
          success: true,
          suggestion: {
            id: existing.id,
            suggestedResponse: existing.suggested_response,
            suggestedResponseThai: existing.suggested_response_thai,
            confidenceScore: existing.confidence_score,
            responseTime: existing.response_time_ms,
            contextSummary: 'Returned cached suggestion (dedup)',
            similarMessagesCount: existing.similar_messages_count || 0,
            suggestedImages: existing.suggested_images,
          }
        });
      }
    }

    // Get conversation context — use client-provided context in dry-run test mode,
    // otherwise fetch from database
    let conversationContext;
    let customerId: string | null = null;

    if (body.dryRun && body.conversationContext && body.conversationContext.length > 0) {
      // Test mode: use client-provided conversation history
      conversationContext = {
        id: body.conversationId,
        channelType: body.channelType,
        channelDisplayName: body.channelDisplayName,
        recentMessages: body.conversationContext.map(msg => ({
          content: msg.content,
          senderType: msg.senderType,
          createdAt: msg.createdAt,
        })),
      };
    } else {
      const dbContext = await getConversationContext(
        body.conversationId,
        body.channelType
      );
      conversationContext = dbContext.conversationContext;
      customerId = dbContext.customerId;
    }

    // Customer context is now loaded on-demand by AI tools (Phase 2)
    const customerIdToUse = body.customerId || customerId;

    // Fetch business context (pricing, packages, coaching rates) - cached for 5 min
    const businessContext = await getBusinessContext();

    // Prepare parameters for AI suggestion
    const suggestionParams: GenerateSuggestionParams = {
      customerMessage: body.customerMessage || '',
      conversationContext,
      // customerContext removed — loaded on-demand by get_customer_context tool
      businessContext: businessContext || undefined,
      staffUserEmail: userEmail,
      messageId: body.messageId, // Pass message ID for database storage
      imageUrl: body.imageUrl, // Customer image URL for vision support
      dryRun: body.dryRun || false, // Support evaluation mode
      overrideModel: (body.overrideModel && ALLOWED_MODELS.has(body.overrideModel)) ? body.overrideModel : undefined,
      includeDebugContext: body.includeDebugContext || false, // Support context transparency
      // Phase 2: on-demand context loading
      customerIdForTools: customerIdToUse || undefined,
      getCustomerContextFn: getCustomerContext,
    };

    // Generate AI suggestion
    const suggestion = await generateAISuggestion(suggestionParams);

    // Log suggestion details for debugging
    console.log(`[AI Suggestion] conv=${body.conversationId.slice(0, 8)} confidence=${suggestion.confidenceScore} time=${suggestion.responseTimeMs}ms response="${suggestion.suggestedResponse?.slice(0, 80)}..." mgmt=${suggestion.managementNote || 'none'}`);

    // Return suggestion
    return NextResponse.json({
      success: true,
      suggestion: {
        id: suggestion.id,
        suggestedResponse: suggestion.suggestedResponse,
        suggestedResponseThai: suggestion.suggestedResponseThai,
        confidenceScore: suggestion.confidenceScore,
        responseTime: suggestion.responseTimeMs,
        contextSummary: suggestion.contextSummary,
        templateUsed: suggestion.templateUsed,
        similarMessagesCount: suggestion.similarMessagesUsed.length,
        // Image suggestions for multi-modal responses
        suggestedImages: suggestion.suggestedImages,
        // Function calling metadata
        functionCalled: suggestion.functionCalled,
        functionResult: suggestion.functionResult,
        functionParameters: suggestion.functionResult?.data,
        requiresApproval: suggestion.requiresApproval,
        approvalMessage: suggestion.approvalMessage,
        managementNote: suggestion.managementNote || null,
        // Full context for transparency (when enabled)
        ...(body.includeDebugContext && suggestion.debugContext && { debugContext: suggestion.debugContext })
      }
    });

  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}