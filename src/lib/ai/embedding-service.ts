// Embedding service for processing chat messages into vector embeddings
// Handles text preprocessing, language detection, and OpenAI API calls

import { openai, AI_CONFIG } from './openai-client';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface MessageEmbedding {
  id?: string;
  lineMessageId?: string;
  webMessageId?: string;
  conversationId: string;
  customerId?: string;
  channelType: 'line' | 'website';
  content: string;
  contentTranslated?: string;
  embedding?: number[];
  messageCategory?: string;
  intentDetected?: string;
  responseUsed?: string;
  languageDetected?: 'th' | 'en' | 'auto';
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
}

// Intent detection patterns based on analysis of existing messages
const INTENT_PATTERNS = {
  booking_request: [
    /จอง|book|reservation|reserve/i,
    /ต้องการจอง|want to book|would like to book/i,
    /book.*\d{1,2}(pm|am|:\d{2})/i, // "book 8pm", "book 8:00"
  ],
  availability_check: [
    /available|ว่าง|มี.*ว่าง/i,
    /any.*bay.*available/i,
    /เบย์.*ว่าง|ว่าง.*เบย์/i,
  ],
  cancellation: [
    /cancel|ยกเลิก/i,
    /cancel.*booking|ยกเลิก.*จอง/i,
  ],
  modification_request: [
    /change|เปลี่ยน|เลื่อน|reschedule/i,
    /move.*booking|เลื่อน.*จอง/i,
  ],
  arrival_notification: [
    /arrived|ถึงแล้ว|มาถึง/i,
    /here|อยู่แล้ว/i,
  ],
  bay_inquiry: [
    /bay|เบย์/i,
    /social.*bay|ai.*bay/i,
  ],
  general_inquiry: [
    /hello|hi|สวัสดี|หวัดดี/i,
    /how|อย่างไร|ยังไง/i,
  ],
};

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

// Intent detection based on message content
function detectIntent(content: string): string {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return intent;
      }
    }
  }
  return 'general_inquiry';
}

// Message category mapping from intent
function getMessageCategory(intent: string): string {
  const categoryMap: Record<string, string> = {
    booking_request: 'booking',
    availability_check: 'availability',
    cancellation: 'cancellation',
    modification_request: 'booking',
    arrival_notification: 'arrival',
    bay_inquiry: 'inquiry',
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
  channelType: 'line' | 'website',
  customerId?: string,
  responseUsed?: string
): Promise<string> {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Detect language and intent
    const language = detectLanguage(content);
    const intent = detectIntent(content);
    const category = getMessageCategory(intent);

    // Prepare embedding object
    const embeddingData: MessageEmbedding = {
      [channelType === 'line' ? 'lineMessageId' : 'webMessageId']: messageId,
      conversationId,
      customerId,
      channelType,
      content,
      embedding,
      messageCategory: category,
      intentDetected: intent,
      responseUsed,
      languageDetected: language,
    };

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
  excludeMessageId?: { line?: string; web?: string }
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
    }));
  } catch (error) {
    console.error('Error finding similar messages:', error);
    return [];
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

    // Get messages from unified view that don't have embeddings yet
    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('*')
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
            const { data: existing } = await refacSupabaseAdmin
              .from('message_embeddings')
              .select('id')
              .eq(message.channel_type === 'line' ? 'line_message_id' : 'web_message_id', message.id)
              .single();

            if (existing) {
              return; // Skip if already processed
            }

            await processMessageEmbedding(
              message.id,
              message.content,
              message.conversation_id,
              message.channel_type,
              message.customer_id
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