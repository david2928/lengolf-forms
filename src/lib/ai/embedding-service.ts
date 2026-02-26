// Embedding service for processing chat messages into vector embeddings
// Handles text preprocessing, language detection, and OpenAI API calls

import { openai, AI_CONFIG } from './openai-client';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { regexFullClassify } from './intent-classifier';

export interface MessageEmbedding {
  id?: string;
  lineMessageId?: string;
  webMessageId?: string;
  conversationId: string;
  customerId?: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  content: string;
  contentTranslated?: string;
  embedding?: number[];
  messageCategory?: string;
  intentDetected?: string;
  responseUsed?: string;
  languageDetected?: 'th' | 'en' | 'auto';
  senderType?: 'customer' | 'staff'; // Track message source
  // Image support for multi-modal embeddings
  curatedImageId?: string; // Reference to curated image sent in response
  imageDescription?: string; // GPT-4 Vision description of the image
}

export interface SimilarMessage {
  lineMessageId?: string;
  webMessageId?: string;
  content: string;
  responseUsed: string;
  similarityScore: number;
  messageCategory?: string;
  channelType: 'line' | 'website';
  createdAt: string;
  // Image metadata for multi-modal suggestions
  curatedImageId?: string;
  imageDescription?: string;
}

// Intent detection consolidated into intent-classifier.ts (regexFullClassify)
// The old INTENT_PATTERNS dict has been removed to avoid pattern drift across files

// Language detection patterns
function detectLanguage(text: string): 'th' | 'en' | 'auto' {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const englishPattern = /[a-zA-Z]/;

  const hasThai = thaiPattern.test(text);
  const hasEnglish = englishPattern.test(text);

  if (hasThai && !hasEnglish) return 'th';
  if (hasEnglish && !hasThai) return 'en';
  return 'auto'; // Mixed or unclear
}

// Intent detection — delegates to the canonical regex classifier in intent-classifier.ts
function detectIntent(content: string): string {
  return regexFullClassify(content).intent;
}

// Message category mapping from intent
function getMessageCategory(intent: string): string {
  const categoryMap: Record<string, string> = {
    booking_request: 'booking',
    availability_check: 'availability',
    cancellation: 'cancellation',
    modification_request: 'booking',
    arrival_notification: 'arrival',
    pricing_inquiry: 'pricing',
    promotion_inquiry: 'pricing',
    equipment_inquiry: 'facility',
    payment_inquiry: 'pricing',
    location_inquiry: 'facility',
    coaching_inquiry: 'coaching',
    facility_inquiry: 'facility',
    greeting: 'general',
    general_inquiry: 'general',
  };
  return categoryMap[intent] || 'general';
}

// Preprocess text for better embedding quality
function preprocessText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[📱🌐📋✅❌📝⛳🏌]/g, '') // Remove common emojis
    .substring(0, 8191); // OpenAI token limit for embeddings
}

// Generate embedding for a text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const processedText = preprocessText(text);

    const response = await openai.embeddings.create({
      model: AI_CONFIG.embeddingModel,
      input: processedText,
      dimensions: 1536, // Explicit: OpenAI silently routes some inputs to a variant that defaults to 384
    });

    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Store message embedding in database
export async function storeMessageEmbedding(embedding: MessageEmbedding): Promise<string> {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    const { data, error } = await refacSupabaseAdmin
      .from('message_embeddings')
      .insert({
        line_message_id: embedding.lineMessageId || null,
        web_message_id: embedding.webMessageId || null,
        conversation_id: embedding.conversationId,
        customer_id: embedding.customerId || null,
        channel_type: embedding.channelType,
        content: embedding.content,
        content_translated: embedding.contentTranslated || null,
        embedding: embedding.embedding ? `[${embedding.embedding.join(',')}]` : null,
        message_category: embedding.messageCategory || null,
        intent_detected: embedding.intentDetected || null,
        response_used: embedding.responseUsed || null,
        language_detected: embedding.languageDetected || 'auto',
        sender_type: embedding.senderType || 'customer', // Default to customer for backward compatibility
        // Image support for multi-modal embeddings
        curated_image_id: embedding.curatedImageId || null,
        image_description: embedding.imageDescription || null,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data.id;
  } catch (error) {
    console.error('Error storing message embedding:', error);
    throw error;
  }
}

// Process a message to create and store embedding
export async function processMessageEmbedding(
  messageId: string,
  content: string,
  conversationId: string,
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp',
  customerId?: string,
  responseUsed?: string,
  senderType: 'customer' | 'staff' = 'customer' // NEW: Track message source
): Promise<string> {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Detect language and intent
    const language = detectLanguage(content);
    const intent = detectIntent(content);
    const category = getMessageCategory(intent);

    // Prepare embedding object
    // For Meta platforms (Facebook/Instagram/WhatsApp), we don't store message FK
    // since message_embeddings table only has foreign keys for line_messages and web_chat_messages
    const embeddingData: MessageEmbedding = {
      conversationId,
      customerId,
      channelType,
      content,
      embedding,
      messageCategory: category,
      intentDetected: intent,
      responseUsed,
      languageDetected: language,
      senderType, // Track whether this is customer or staff message
    };

    // Only set message ID foreign keys for LINE and Website channels
    if (channelType === 'line') {
      embeddingData.lineMessageId = messageId;
    } else if (channelType === 'website') {
      embeddingData.webMessageId = messageId;
    }
    // For Meta channels (facebook, instagram, whatsapp), we skip the message FK
    // The conversation_id is sufficient for linking embeddings to conversations

    // Store in database
    return await storeMessageEmbedding(embeddingData);
  } catch (error) {
    console.error('Error processing message embedding:', error);
    throw error;
  }
}

// Find similar messages using vector similarity
export async function findSimilarMessages(
  queryEmbedding: number[],
  maxResults: number = AI_CONFIG.maxSimilarMessages,
  similarityThreshold: number = 0.7,
  excludeMessageId?: { line?: string; web?: string },
  filterLanguage?: 'th' | 'en'
): Promise<SimilarMessage[]> {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    const { data, error } = await refacSupabaseAdmin
      .rpc('find_similar_messages', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        similarity_threshold: similarityThreshold,
        max_results: maxResults,
        exclude_line_message_id: excludeMessageId?.line || null,
        exclude_web_message_id: excludeMessageId?.web || null,
        filter_language: filterLanguage || null,
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      lineMessageId: row.line_message_id,
      webMessageId: row.web_message_id,
      content: row.content,
      responseUsed: row.response_used || '',
      similarityScore: row.similarity_score,
      messageCategory: row.message_category,
      channelType: row.channel_type,
      createdAt: row.created_at,
      // Image metadata for multi-modal suggestions
      curatedImageId: row.curated_image_id || undefined,
      imageDescription: row.image_description || undefined,
    }));
  } catch (error) {
    console.error('Error finding similar messages:', error);
    return [];
  }
}

// ─── FAQ Knowledge Base Integration ──────────────────────────────────────────

export interface FAQMatch {
  id: string;
  question: string;
  answer: string;
  category: string;
  similarityScore?: number;
  matchType: 'vector' | 'keyword';
}

// Map intents to FAQ categories for filtering
const INTENT_TO_FAQ_CATEGORY: Record<string, string[]> = {
  pricing_inquiry: ['pricing', 'packages', 'general'],
  promotion_inquiry: ['pricing', 'promotions', 'packages'],
  equipment_inquiry: ['facility', 'equipment', 'general'],
  facility_inquiry: ['facility', 'hours', 'general'],
  location_inquiry: ['facility', 'location', 'general'],
  coaching_inquiry: ['coaching', 'pricing', 'general'],
  booking_request: ['booking', 'general'],
  availability_check: ['booking', 'hours', 'general'],
  payment_inquiry: ['pricing', 'payment', 'general'],
  bay_inquiry: ['facility', 'booking', 'general'],
};

/**
 * Find relevant FAQ entries using hybrid search (vector + keyword).
 * Intent-aware: prioritizes FAQ entries matching the detected intent category.
 */
export async function findRelevantFAQs(
  queryEmbedding: number[],
  customerMessage: string,
  intent: string,
  maxResults: number = 3,
  vectorThreshold: number = 0.5 // Lower threshold for FAQ (well-written entries)
): Promise<FAQMatch[]> {
  if (!refacSupabaseAdmin) return [];

  const results: FAQMatch[] = [];
  const seenIds = new Set<string>();

  try {
    // 1. Vector search skipped — no find_similar_faq RPC exists in database.
    // FAQ entries don't have embeddings, so we rely entirely on keyword search.
    // TODO: Create find_similar_faq RPC and FAQ embeddings for vector search support.

    // 2. Keyword search (primary method since no vector search for FAQ)
    {
      const keywordMatches = await searchFAQByKeyword(customerMessage, intent);
      for (const match of keywordMatches) {
        if (!seenIds.has(match.id)) {
          seenIds.add(match.id);
          results.push(match);
        }
      }
    }

    // 3. Sort: intent-matching category entries first, then by similarity score
    const faqCategories = INTENT_TO_FAQ_CATEGORY[intent] || ['general'];
    results.sort((a, b) => {
      const aMatchesIntent = faqCategories.includes(a.category) ? 1 : 0;
      const bMatchesIntent = faqCategories.includes(b.category) ? 1 : 0;
      if (aMatchesIntent !== bMatchesIntent) return bMatchesIntent - aMatchesIntent;
      return (b.similarityScore || 0) - (a.similarityScore || 0);
    });

    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Error finding relevant FAQs:', error);
    return [];
  }
}

/**
 * Keyword-based FAQ search: matches against question and answer text.
 */
async function searchFAQByKeyword(
  customerMessage: string,
  intent: string
): Promise<FAQMatch[]> {
  if (!refacSupabaseAdmin) return [];

  try {
    // Extract significant keywords (skip very short words)
    const words = customerMessage
      .toLowerCase()
      .replace(/[^\w\sก-๙]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (words.length === 0) return [];

    // Build OR query for keyword matching
    const searchTerms = words.slice(0, 5).join(' | '); // Limit to 5 keywords

    // Text search using ilike for each word (simpler, works without full-text search setup)
    const faqCategories = INTENT_TO_FAQ_CATEGORY[intent] || [];
    // FAQ table has question_en + question_th columns, not a single 'question' column
    let query = refacSupabaseAdmin
      .from('faq_knowledge_base')
      .select('id, question_en, question_th, answer, category')
      .eq('is_active', true);

    // Filter by intent-matching categories if available
    if (faqCategories.length > 0) {
      query = query.in('category', faqCategories);
    }

    const { data: faqs } = await query.limit(200); // FAQ tables are typically small

    if (!faqs || faqs.length === 0) return [];

    // Score each FAQ by keyword overlap (search both English and Thai questions + answer)
    const scored = faqs.map((faq: any) => {
      const faqText = `${faq.question_en || ''} ${faq.question_th || ''} ${faq.answer}`.toLowerCase();
      const matchCount = words.filter(w => faqText.includes(w)).length;
      return {
        ...faq,
        question: faq.question_en || faq.question_th || '',
        score: matchCount / words.length
      };
    }).filter((faq: any) => faq.score > 0.3); // At least 30% keyword overlap

    scored.sort((a: any, b: any) => b.score - a.score);

    return scored.slice(0, 3).map((faq: any) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general',
      similarityScore: faq.score,
      matchType: 'keyword' as const
    }));
  } catch (error) {
    console.error('Error in keyword FAQ search:', error);
    return [];
  }
}

/**
 * Increment usage_count for FAQ entries that were included in an AI prompt.
 * Fire-and-forget — non-critical.
 */
export async function trackFAQUsage(faqIds: string[]): Promise<void> {
  if (!refacSupabaseAdmin || faqIds.length === 0) return;

  try {
    // Increment usage_count for each FAQ entry individually.
    // Note: Not fully atomic (read-then-write per row), but acceptable for
    // non-critical fire-and-forget analytics. Concurrent increments for the
    // same FAQ ID are rare in practice.
    const { data: currentCounts } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .select('id, usage_count')
      .in('id', faqIds);

    if (!currentCounts || currentCounts.length === 0) return;

    await Promise.all(
      currentCounts.map(async (row: { id: string; usage_count: number | null }) => {
        await refacSupabaseAdmin!
          .from('faq_knowledge_base')
          .update({ usage_count: (row.usage_count || 0) + 1 })
          .eq('id', row.id);
      })
    );
  } catch (error) {
    // Non-critical, log and continue
    console.warn('Failed to track FAQ usage:', error);
  }
}

// Batch process historical messages for initial embedding creation
export async function batchProcessHistoricalMessages(
  daysBack: number = 90,
  batchSize: number = 10
): Promise<{ processed: number; errors: number }> {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Get CUSTOMER messages only from unified view that don't have embeddings yet
    // IMPORTANT: Only embed customer messages for intent detection
    // We'll fetch the corresponding staff response separately to store in response_used field
    // Note: sender_type 'user' and 'customer' both represent customer messages in unified_messages
    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('*')
      .in('sender_type', ['user', 'customer']) // ✅ Both user and customer are customer messages
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .not('content', 'is', null)
      .limit(1000) // Process in chunks
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching messages: ${error.message}`);
    }

    let processed = 0;
    let errors = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < (messages || []).length; i += batchSize) {
      const batch = (messages || []).slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (message: any) => {
          try {
            // Check if embedding already exists
            // For LINE and Website, check by message_id FK
            // For Meta channels, check by conversation_id + content (no message FK)
            let existing = null;

            if (message.channel_type === 'line') {
              const { data } = await refacSupabaseAdmin
                .from('message_embeddings')
                .select('id')
                .eq('line_message_id', message.id)
                .single();
              existing = data;
            } else if (message.channel_type === 'website') {
              const { data } = await refacSupabaseAdmin
                .from('message_embeddings')
                .select('id')
                .eq('web_message_id', message.id)
                .single();
              existing = data;
            } else {
              // For Meta channels (facebook, instagram, whatsapp),
              // check by conversation_id + content since we don't have message FK
              const { data } = await refacSupabaseAdmin
                .from('message_embeddings')
                .select('id')
                .eq('conversation_id', message.conversation_id)
                .eq('content', message.content)
                .eq('channel_type', message.channel_type)
                .single();
              existing = data;
            }

            if (existing) {
              return; // Skip if already processed
            }

            // Fetch the staff response that followed this customer message
            // This will be stored in response_used for RAG retrieval
            // Note: staff responses can be 'admin' or 'staff' sender_type
            const { data: staffResponse } = await refacSupabaseAdmin
              .from('unified_messages')
              .select('content')
              .eq('conversation_id', message.conversation_id)
              .in('sender_type', ['admin', 'staff']) // Both admin and staff are staff responses
              .gt('created_at', message.created_at)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();

            await processMessageEmbedding(
              message.id,
              message.content,
              message.conversation_id,
              message.channel_type,
              message.customer_id,
              staffResponse?.content || undefined, // Store staff response for RAG
              'customer' // This is a customer message
            );
            processed++;
          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
            errors++;
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < (messages || []).length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}