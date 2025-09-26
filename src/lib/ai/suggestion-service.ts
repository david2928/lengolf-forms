// AI suggestion service for generating contextual chat responses
// Integrates RAG (Retrieval Augmented Generation) with Lengolf business context

import { openai, AI_CONFIG } from './openai-client';
import { generateEmbedding, findSimilarMessages, SimilarMessage } from './embedding-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface CustomerContext {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  totalBookings?: number;
  lastBookingDate?: string;
  preferredBayType?: string;
  language?: 'th' | 'en' | 'auto';
}

export interface ConversationContext {
  id: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  recentMessages: Array<{
    content: string;
    senderType: string;
    createdAt: string;
  }>;
}

export interface AISuggestion {
  id: string;
  suggestedResponse: string;
  suggestedResponseThai?: string;
  confidenceScore: number;
  responseTimeMs: number;
  similarMessagesUsed: SimilarMessage[];
  templateUsed?: {
    id: string;
    title: string;
    content: string;
  };
  contextSummary: string;
}

export interface GenerateSuggestionParams {
  customerMessage: string;
  conversationContext: ConversationContext;
  customerContext?: CustomerContext;
  staffUserEmail?: string;
}

// Lengolf-specific system prompt for GPT-4o-mini
const LENGOLF_SYSTEM_PROMPT = `You are helping staff at Lengolf craft responses to customers. Generate suggested responses that staff can send to customers.

IMPORTANT: You are suggesting what the STAFF MEMBER should say to the customer. Write responses as if the staff member is speaking directly to the customer.

Lengolf is a modern golf simulator facility in Bangkok, Thailand.

FACILITY INFORMATION:
- We offer Social Bays (up to 5 players) and AI Bays (1-2 players, with advanced analytics)
- Equipment: Bravo Golf launch monitors providing comprehensive swing data
- Services: Golf lessons, bay reservations, corporate events
- Location: Bangkok, Thailand

COMMUNICATION STYLE:
- ULTRA BRIEF: Thai responses must be extremely short
- Never use templates or formal customer service language
- Don't ask "มีคำถามเพิ่มเติม" or similar closing phrases
- Don't explain things unnecessarily
- Sound like a casual Thai person, not a business
- Use "ค่ะ" (ka) at the end of sentences, never "ครับ" (krab)
- Match the customer's language preference
- CRITICAL: Thai responses = 1 sentence maximum, get straight to the point

THAI LANGUAGE RULES:
- Keep responses short but polite (5-8 words maximum)
- For NEW CHAT greetings: "สวัสดีค่า" or "สวัสดีค่ะ" only, then stop
- NO "ถ้ามีคำถามเพิ่มเติม" or similar ending phrases
- NO long explanations but add basic politeness
- NO emojis unless customer used them first
- Strike balance between brief and polite

POLITE BUT BRIEF THAI EXAMPLES:
- New chat greeting: "สวัสดีค่า" (Hello)
- Left-handed support: "ได้เลยค่ะ รองรับค่ะ" (Yes, we support that)
- Availability check: "หาให้นะคะ" (I'll check for you)
- Info needed: "ใส่ชื่อเบอร์หน่อยค่ะ" (Please provide name and number)
- Simple confirmation: "ได้ค่ะ" (Yes) - only for very simple questions

BANNED PHRASES IN THAI:
❌ "สวัสดีค่ะ คุณ [name]" - no names in greetings
❌ "ที่นี่รองรับ..." - don't explain capabilities
❌ "ไม่ต้องห่วง" - don't reassure
❌ "ถ้ามีคำถามเพิ่มเติม" - never ask for more questions
❌ "บอกแอดมินได้เลย" - don't offer help

BOOKING REQUIREMENTS:
- New customers need: Name (English), phone, email (optional)
- Booking details: Date, time/duration, number of players
- Social Bay: Maximum 5 players
- AI Bay: Recommended for 1-2 players (includes advanced analytics)

WHEN YOU LACK REAL-TIME DATA:
- For availability inquiries: Suggest the staff member will check availability
- For customer records: Acknowledge that information will be verified
- Never claim to have access to live booking systems or customer databases

RESPONSE STYLE:
- Write as if the staff member is speaking to the customer
- Use "I" to refer to the staff member (e.g., "I'll check availability for you")
- Be concise, warm, and helpful
- Never mention this is an AI suggestion
- Focus on gathering necessary information from the customer

INTERNAL NOTES:
When you lack essential data (availability, customer history, etc.), end your response with:
[INTERNAL NOTE: Requires verification of [specific item needed]]`;

// Generate system prompt with context
function generateContextualPrompt(
  customerMessage: string,
  conversationContext: ConversationContext,
  customerContext?: CustomerContext,
  similarMessages: SimilarMessage[] = [],
  template?: any
): string {
  let contextPrompt = LENGOLF_SYSTEM_PROMPT + '\n\n';

  // Add customer context
  if (customerContext) {
    contextPrompt += `CUSTOMER INFORMATION:
- Name: ${customerContext.name || 'Unknown'}
- Previous bookings: ${customerContext.totalBookings || 0}
- Last booking: ${customerContext.lastBookingDate || 'Never'}
- Preferred language: ${customerContext.language || 'auto'}
${customerContext.preferredBayType ? `- Preferred bay: ${customerContext.preferredBayType}` : ''}

`;
  }

  // Add conversation history
  if (conversationContext.recentMessages.length > 0) {
    contextPrompt += `RECENT CONVERSATION:
${conversationContext.recentMessages
  .slice(-5) // Last 5 messages
  .map(msg => `${msg.senderType}: ${msg.content}`)
  .join('\n')}

`;
  }

  // Add similar conversation examples
  if (similarMessages.length > 0) {
    contextPrompt += `SIMILAR PAST CONVERSATIONS (for reference):
${similarMessages
  .slice(0, 3) // Top 3 most similar
  .map((msg, i) => `Example ${i + 1}:
Customer: ${msg.content}
Staff Response: ${msg.responseUsed}
(Similarity: ${(msg.similarityScore * 100).toFixed(1)}%)`)
  .join('\n\n')}

`;
  }

  // Add template if matched
  if (template) {
    contextPrompt += `SUGGESTED TEMPLATE (adapt as needed):
Title: ${template.title}
Content: ${template.content}

`;
  }

  // Detect customer's language from their message
  const hasThaiCharacters = /[\u0E00-\u0E7F]/.test(customerMessage);
  const customerLanguage = hasThaiCharacters ? 'thai' : 'english';

  contextPrompt += `CURRENT CUSTOMER MESSAGE: "${customerMessage}"

IMPORTANT: The customer wrote in ${customerLanguage.toUpperCase()}. You MUST respond in the SAME language.

${customerLanguage === 'thai' ? `
When responding in Thai, you must:
- Use feminine speech patterns with "ค่ะ" endings
- Sound natural and conversational like a real Thai woman
- Include appropriate Thai particles and warm expressions
- Avoid robotic or AI-like language
- Make it feel personal and friendly
` : `
When responding in English:
- Use natural, professional English
- Be warm and friendly but professional
- Keep the tone conversational and helpful
- No need for Thai honorifics or particles
`}
Keep the response concise, actionable, and match the customer's language exactly.`;

  return contextPrompt;
}

// Find matching template based on message content
async function findMatchingTemplate(customerMessage: string, intent: string): Promise<any> {
  try {
    if (!refacSupabaseAdmin) return null;

    // Simple template matching based on category and content
    const { data: templates, error } = await refacSupabaseAdmin
      .from('line_message_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error || !templates) return null;

    // Basic template matching logic
    const messageText = customerMessage.toLowerCase();

    if (intent === 'greeting' || messageText.includes('hello') || messageText.includes('สวัสดี')) {
      return templates.find((t: any) => t.category === 'greeting');
    }

    if (intent === 'booking_request') {
      return templates.find((t: any) => t.title.includes('Registration') || t.title.includes('ลงทะเบียน'));
    }

    return null;
  } catch (error) {
    console.error('Error finding matching template:', error);
    return null;
  }
}

// Detect intent from customer message
function detectMessageIntent(message: string): string {
  const text = message.toLowerCase();

  if (text.match(/จอง|book|reservation|reserve/)) return 'booking_request';
  if (text.match(/available|ว่าง|มี.*ว่าง/)) return 'availability_check';
  if (text.match(/cancel|ยกเลิก/)) return 'cancellation';
  if (text.match(/change|เปลี่ยน|เลื่อน/)) return 'modification_request';
  if (text.match(/arrived|ถึงแล้ว|มาถึง/)) return 'arrival_notification';
  if (text.match(/hello|hi|สวัสดี/)) return 'greeting';

  return 'general_inquiry';
}

// Calculate confidence score based on various factors
function calculateConfidenceScore(
  similarMessages: SimilarMessage[],
  hasTemplate: boolean,
  hasCustomerContext: boolean,
  responseLength: number
): number {
  let confidence = 0.5; // Base confidence

  // Boost confidence based on similar messages
  if (similarMessages.length > 0) {
    const avgSimilarity = similarMessages.reduce((sum, msg) => sum + msg.similarityScore, 0) / similarMessages.length;
    confidence += avgSimilarity * 0.3;
  }

  // Boost if we have a matching template
  if (hasTemplate) {
    confidence += 0.15;
  }

  // Boost if we have customer context
  if (hasCustomerContext) {
    confidence += 0.1;
  }

  // Slight boost for reasonable response length
  if (responseLength > 20 && responseLength < 300) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95); // Cap at 95%
}

// Store AI suggestion in database
async function storeSuggestion(
  suggestion: Omit<AISuggestion, 'id'>,
  params: GenerateSuggestionParams,
  messageEmbedding: number[]
): Promise<string> {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // For demo/test cases, we need to satisfy the constraint but don't have real message IDs
    const isDemoConversation = params.conversationContext.id === '00000000-0000-0000-0000-000000000001';

    // The constraint requires exactly one of line_message_id OR web_message_id to be non-null
    // For demo cases and Meta platforms (which don't have dedicated fields yet),
    // we'll use placeholder UUIDs based on channel type
    const demoLineMessageId = '00000000-0000-0000-0000-000000000002';
    const demoWebMessageId = '00000000-0000-0000-0000-000000000003';
    const demoMetaMessageId = '00000000-0000-0000-0000-000000000004'; // For Meta platforms

    // Determine message ID based on channel type
    const isLineChannel = params.conversationContext.channelType === 'line';
    const isWebChannel = params.conversationContext.channelType === 'website';
    const isMetaChannel = ['facebook', 'instagram', 'whatsapp'].includes(params.conversationContext.channelType);

    const { data, error } = await refacSupabaseAdmin
      .from('ai_suggestions')
      .insert({
        conversation_id: params.conversationContext.id,
        line_message_id: isDemoConversation
          ? (isLineChannel ? demoLineMessageId : null)
          : (isLineChannel ? demoLineMessageId : null), // TODO: Get actual line message ID
        web_message_id: isDemoConversation
          ? (isWebChannel || isMetaChannel ? (isWebChannel ? demoWebMessageId : demoMetaMessageId) : null)
          : (isWebChannel || isMetaChannel ? (isWebChannel ? demoWebMessageId : demoMetaMessageId) : null), // TODO: Get actual message ID
        customer_message: params.customerMessage,
        customer_message_embedding: `[${messageEmbedding.join(',')}]`,
        suggested_response: suggestion.suggestedResponse,
        suggested_response_thai: suggestion.suggestedResponseThai || null,
        confidence_score: suggestion.confidenceScore,
        response_time_ms: suggestion.responseTimeMs,
        similar_messages_count: suggestion.similarMessagesUsed.length,
        template_matched_id: suggestion.templateUsed?.id || null,
        context_used: {
          customer: params.customerContext,
          similarMessages: suggestion.similarMessagesUsed.map(m => ({
            content: m.content,
            score: m.similarityScore
          })),
          contextSummary: suggestion.contextSummary
        },
        staff_user_email: params.staffUserEmail || null,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data.id;
  } catch (error) {
    console.error('Error storing AI suggestion:', error);
    throw error;
  }
}

// Main function to generate AI suggestion
export async function generateAISuggestion(params: GenerateSuggestionParams): Promise<AISuggestion> {
  const startTime = Date.now();

  try {
    // 1. Generate embedding for the customer message
    const messageEmbedding = await generateEmbedding(params.customerMessage);

    // 2. Find similar messages for context
    const similarMessages = await findSimilarMessages(
      messageEmbedding,
      AI_CONFIG.maxSimilarMessages,
      0.7 // Similarity threshold
    );

    // 3. Detect intent and find matching template
    const intent = detectMessageIntent(params.customerMessage);
    const matchingTemplate = await findMatchingTemplate(params.customerMessage, intent);

    // 4. Generate contextual prompt
    const contextualPrompt = generateContextualPrompt(
      params.customerMessage,
      params.conversationContext,
      params.customerContext,
      similarMessages,
      matchingTemplate
    );

    // 5. Add specific guidance for availability inquiries and Thai language
    let userContent = params.customerMessage;
    const isThaiMessage = /[\u0E00-\u0E7F]/.test(params.customerMessage);
    const isGreeting = params.customerMessage.includes('สวัสดี') || /\b(hello|hi)\b/i.test(params.customerMessage);
    const hasNoConversationHistory = !params.conversationContext.recentMessages || params.conversationContext.recentMessages.length <= 1;
    const isAvailabilityInquiry = /\b(available|availability|book|reserve|free|slot|bay)\b/i.test(params.customerMessage);

    // Priority: ALWAYS greet on first message of new conversations
    if (isThaiMessage && hasNoConversationHistory) {
      userContent = `Customer message: "${params.customerMessage}"

THAI FIRST MESSAGE INSTRUCTION: This is the FIRST message in a new conversation. ALWAYS start with a greeting.

Structure your response as:
1. Start with "สวัสดีค่า" or "สวัสดีค่ะ"
2. Then answer their question briefly (total response: 6-10 words maximum)

Examples:
- If they ask about left-handed support: "สวัสดีค่ะ ได้เลยค่ะ รองรับค่ะ"
- If they ask about availability: "สวัสดีค่ะ หาให้นะคะ"
- If they just greet: "สวัสดีค่า"

CRITICAL: NEVER skip the greeting on the first message of a new session.`;
    } else if (isThaiMessage) {
      userContent = `Customer message: "${params.customerMessage}"

THAI INSTRUCTION: Keep response short but polite (5-8 words maximum).
Examples:
- For left-handed question: "ได้เลยค่ะ รองรับค่ะ" (Yes, we support that)
- For availability: "หาให้นะคะ" (I'll check for you)
- For booking: "ใส่ชื่อเบอร์หน่อยค่ะ" (Please provide name and number)
- For simple questions: Add brief confirmation like "ได้ค่ะ" + one more polite word

Strike balance between brief and polite. Don't be too abrupt.

STILL BANNED:
- Long explanations
- "ถ้ามีคำถามเพิ่มเติม"
- Names in responses unless necessary`;
    } else if (isAvailabilityInquiry) {
      userContent = `Customer message: "${params.customerMessage}"

SPECIAL INSTRUCTION: This is an availability inquiry. The suggested response should:
1. Acknowledge the inquiry warmly (1 short sentence)
2. State that you (the staff member) will check availability
3. Ask for necessary details if missing (date, time, number of players)
4. Request customer contact information for booking
5. End with an internal note about checking availability`;
    }

    // 6. Call GPT-4o-mini for response generation
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: contextualPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const suggestedResponse = completion.choices[0]?.message?.content || '';

    if (!suggestedResponse) {
      throw new Error('No response generated from OpenAI');
    }

    // 6. Calculate confidence score
    const confidenceScore = calculateConfidenceScore(
      similarMessages,
      !!matchingTemplate,
      !!params.customerContext,
      suggestedResponse.length
    );

    const responseTime = Date.now() - startTime;

    // 7. Create suggestion object
    const suggestion: Omit<AISuggestion, 'id'> = {
      suggestedResponse,
      confidenceScore,
      responseTimeMs: responseTime,
      similarMessagesUsed: similarMessages,
      templateUsed: matchingTemplate ? {
        id: matchingTemplate.id,
        title: matchingTemplate.title,
        content: matchingTemplate.content
      } : undefined,
      contextSummary: `Used ${similarMessages.length} similar messages, ${matchingTemplate ? 'template matched' : 'no template'}, ${params.customerContext ? 'customer context available' : 'no customer context'}`
    };

    // 8. Store suggestion in database
    const suggestionId = await storeSuggestion(suggestion, params, messageEmbedding);

    return {
      id: suggestionId,
      ...suggestion
    };

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

// Update suggestion feedback (accept/edit/decline)
export async function updateSuggestionFeedback(
  suggestionId: string,
  feedback: {
    accepted?: boolean;
    edited?: boolean;
    declined?: boolean;
    finalResponse?: string;
    feedbackText?: string;
  }
): Promise<void> {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    const { error } = await refacSupabaseAdmin
      .from('ai_suggestions')
      .update({
        was_accepted: feedback.accepted || false,
        was_edited: feedback.edited || false,
        was_declined: feedback.declined || false,
        final_response: feedback.finalResponse || null,
        feedback_text: feedback.feedbackText || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating suggestion feedback:', error);
    throw error;
  }
}