import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { prepareStreamingSuggestion, postProcessSuggestion, writeTraces, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
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

// Same timeout as non-streaming route
export const maxDuration = 30;

/**
 * Streaming AI suggestion endpoint.
 * Same validation/auth/dedup as /api/ai/suggest-response, but streams text incrementally.
 *
 * SSE protocol:
 *   event: text-delta    data: {"delta":"..."}     — incremental text chunk
 *   event: metadata      data: {full suggestion}   — final metadata after stream completes
 *   event: error         data: {"error":"..."}      — error during streaming
 *   event: done          data: {}                   — stream complete
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!checkRateLimit(session.user.email)) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded. Please wait a moment before requesting another suggestion.'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      return new Response(JSON.stringify({
        error: 'AI suggestions not available',
        reason: configCheck.error,
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: SuggestResponseRequest = await request.json();

    // Validate required fields
    if ((!body.customerMessage && !body.imageUrl) || !body.conversationId || !body.channelType) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: customerMessage (or imageUrl), conversationId, channelType',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.customerMessage && body.customerMessage.length > MAX_CUSTOMER_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({
        error: `Customer message too long (max ${MAX_CUSTOMER_MESSAGE_LENGTH} characters)`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate imageUrl (SSRF prevention)
    if (body.imageUrl) {
      try {
        const parsed = new URL(body.imageUrl);
        if (parsed.protocol !== 'https:') {
          return new Response(JSON.stringify({ error: 'Image URL must use HTTPS' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const trustedHosts = ['bisimqmtxjsptehhqpeg.supabase.co', 'api-data.line.me'];
        if (!trustedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.supabase.co'))) {
          return new Response(JSON.stringify({ error: 'Image URL must be from a trusted source' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid image URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (!UUID_RE.test(body.conversationId)) {
      return new Response(JSON.stringify({ error: 'Invalid conversationId format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Server-side dedup: return cached suggestion as instant SSE burst
    if (body.messageId && UUID_RE.test(body.messageId) && refacSupabaseAdmin) {
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
      const selectCols = 'id, suggested_response, suggested_response_thai, confidence_score, response_time_ms, similar_messages_count, context_used, suggested_images, follow_up_message';

      const { data: existingLine } = await refacSupabaseAdmin
        .from('ai_suggestions')
        .select(selectCols)
        .eq('line_message_id', body.messageId)
        .gte('created_at', thirtySecondsAgo)
        .limit(1)
        .maybeSingle();

      let existing = existingLine;
      if (!existing) {
        const { data: existingWeb } = await refacSupabaseAdmin
          .from('ai_suggestions')
          .select(selectCols)
          .eq('web_message_id', body.messageId)
          .gte('created_at', thirtySecondsAgo)
          .limit(1)
          .maybeSingle();
        existing = existingWeb;
      }
      if (!existing) {
        const { data: existingMeta } = await refacSupabaseAdmin
          .from('ai_suggestions')
          .select(selectCols)
          .eq('meta_message_id', body.messageId)
          .gte('created_at', thirtySecondsAgo)
          .limit(1)
          .maybeSingle();
        existing = existingMeta;
      }

      if (existing) {
        // Return dedup hit as a complete SSE stream (instant)
        const encoder = new TextEncoder();
        const dedupStream = new ReadableStream({
          start(controller) {
            const text = existing.suggested_response || '';
            controller.enqueue(encoder.encode(`event: text-delta\ndata: ${JSON.stringify({ delta: text })}\n\n`));
            controller.enqueue(encoder.encode(`event: metadata\ndata: ${JSON.stringify({
              id: existing.id,
              suggestedResponse: text,
              suggestedResponseThai: existing.suggested_response_thai,
              confidenceScore: existing.confidence_score,
              responseTime: existing.response_time_ms,
              contextSummary: 'Returned cached suggestion (dedup)',
              similarMessagesCount: existing.similar_messages_count || 0,
              suggestedImages: existing.suggested_images,
              followUpMessage: existing.follow_up_message || null,
            })}\n\n`));
            controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
            controller.close();
          },
        });

        return new Response(dedupStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }

    // Get conversation context from database (streaming always fetches from DB)
    const dbContext = await getConversationContext(body.conversationId, body.channelType);
    const conversationContext = dbContext.conversationContext;
    const customerId = dbContext.customerId;

    const customerIdToUse = body.customerId || customerId;
    const businessContext = await getBusinessContext();

    const suggestionParams: GenerateSuggestionParams = {
      customerMessage: body.customerMessage || '',
      conversationContext,
      businessContext: businessContext || undefined,
      staffUserEmail: session.user.email,
      messageId: body.messageId,
      imageUrl: body.imageUrl,
      dryRun: false, // streaming not used for evaluation
      overrideModel: (body.overrideModel && ALLOWED_MODELS.has(body.overrideModel)) ? body.overrideModel : undefined,
      includeDebugContext: body.includeDebugContext || false,
      customerIdForTools: customerIdToUse || undefined,
      getCustomerContextFn: getCustomerContext,
    };

    // Run pre-processing (embedding, intent, FAQ, prompt assembly)
    const { ctx, streamTextOptions } = await prepareStreamingSuggestion(suggestionParams);

    // Create SSE stream
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText(streamTextOptions);

          let fullText = '';

          // Stream text deltas
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              fullText += part.text;
              controller.enqueue(
                encoder.encode(`event: text-delta\ndata: ${JSON.stringify({ delta: part.text })}\n\n`)
              );
            }
            // Tool calls/results handled internally by SDK multi-step loop
          }

          // Stream done — run post-processing
          const suggestion = await postProcessSuggestion(fullText, ctx);

          // Send metadata as final event
          controller.enqueue(encoder.encode(`event: metadata\ndata: ${JSON.stringify({
            id: suggestion.id,
            suggestedResponse: suggestion.suggestedResponse,
            suggestedResponseThai: suggestion.suggestedResponseThai,
            confidenceScore: suggestion.confidenceScore,
            responseTime: suggestion.responseTimeMs,
            contextSummary: suggestion.contextSummary,
            templateUsed: suggestion.templateUsed,
            similarMessagesCount: suggestion.similarMessagesUsed.length,
            suggestedImages: suggestion.suggestedImages,
            functionCalled: suggestion.functionCalled,
            functionResult: suggestion.functionResult,
            functionParameters: suggestion.functionResult?.data,
            requiresApproval: suggestion.requiresApproval,
            approvalMessage: suggestion.approvalMessage,
            managementNote: suggestion.managementNote || null,
            followUpMessage: suggestion.followUpMessage || null,
            ...(body.includeDebugContext && suggestion.debugContext && { debugContext: suggestion.debugContext }),
            // If approval-gated, suggestedResponse may differ from streamed text
            ...(suggestion.requiresApproval && {
              approvalOverrideText: suggestion.suggestedResponse,
            }),
          })}\n\n`));

          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
          controller.close();

          console.log(`[AI Suggestion Stream] conv=${body.conversationId.slice(0, 8)} confidence=${suggestion.confidenceScore} time=${suggestion.responseTimeMs}ms`);

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
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in streaming AI suggestion:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate suggestion',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
