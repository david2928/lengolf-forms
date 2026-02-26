// AI suggestion service for generating contextual chat responses
// Integrates RAG (Retrieval Augmented Generation) with Lengolf business context

import { openai, AI_CONFIG } from './openai-client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { generateEmbedding, findSimilarMessages, SimilarMessage, findRelevantFAQs, trackFAQUsage, FAQMatch } from './embedding-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getOpenAITools, getToolsForIntent } from './function-schemas';
import { functionExecutor, FunctionResult } from './function-executor';
import { getSkillsForIntent, composeSkillPromptForLanguage, getSkillExamples } from './skills';
import { classifyIntent, IntentClassification, regexFullClassify } from './intent-classifier';

export interface CustomerContext {
  // Basic info
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  language?: 'th' | 'en' | 'auto';

  // Lifetime stats
  totalVisits?: number;
  lifetimeValue?: number;
  lastVisitDate?: string;

  // Package summary (lightweight)
  activePackages?: {
    count: number;
    totalHoursRemaining: number;
    hasUnlimited: boolean;
    earliestExpiration: string | null;
    packages?: Array<{
      name: string;
      type: string;
      remainingHours: number | string;
      expirationDate: string;
    }>;
  };

  // Upcoming bookings summary
  upcomingBookings?: {
    count: number;
    nextBooking: {
      date: string;
      time: string;
      bayType: string;
      isCoaching: boolean;
      coachName?: string;
    } | null;
  };

  // Recent booking history (last 3)
  recentBookings?: Array<{
    date: string;
    time: string;
    bayType: string;
    isCoaching: boolean;
    coachName?: string;
    status: 'completed' | 'cancelled';
    packageName?: string;
  }>;

  // Customer notes
  notes?: string;

  // Deprecated fields (kept for backward compatibility)
  totalBookings?: number;
  lastBookingDate?: string;
  preferredBayType?: string;
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

// Sanitized customer data for debug context — omits PII fields
interface SanitizedCustomerData {
  name?: string;
  totalVisits?: number;
  lifetimeValue?: number;
  activePackages?: {
    count: number;
    hasUnlimited: boolean;
  };
  upcomingBookings?: {
    count: number;
  };
}

export interface AIDebugContext {
  customerMessage: string;
  conversationHistory: Array<{
    content: string;
    senderType: string;
    createdAt: string;
  }>;
  customerData?: SanitizedCustomerData;
  similarMessagesUsed: SimilarMessage[];
  systemPromptExcerpt: string;
  skillsUsed?: string[];
  intentDetected?: string;
  intentSource?: string;
  intentClassificationMs?: number;
  businessContextIncluded?: boolean;
  faqMatches?: Array<{ question: string; answer: string; score: number }>;
  functionSchemas?: any[];
  toolChoice?: string;
  model: string;
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
  // Function calling metadata
  functionCalled?: string;
  functionResult?: FunctionResult;
  requiresApproval?: boolean;
  approvalMessage?: string;
  // Management escalation note (extracted from [NEEDS MANAGEMENT: ...] tag)
  managementNote?: string | null;
  // Debug context for transparency
  debugContext?: AIDebugContext;
  // Image suggestion metadata for multi-modal responses
  suggestedImages?: Array<{
    imageId: string;
    imageUrl: string;
    title: string;
    description: string;
    reason: string; // Why this image is suggested
    similarityScore?: number;
  }>;
}

export interface BusinessContext {
  packageTypes?: Array<{ name: string; hours: number; validity_days?: number; description: string; type: string }>;
  coachRates?: Array<{ description: string; rate: number }>;
  bayPricing?: {
    socialBay: { hourly: number; description: string };
    aiBay: { hourly: number; description: string };
    note: string;
  };
  operatingHours?: {
    daily: string;
    note: string;
  };
  promotions?: Array<{
    title_en: string;
    title_th: string;
    description_en: string;
    description_th: string;
    valid_until: string | null;
    promo_type: string;
    badge_en: string | null;
    terms_en: string | null;
  }>;
}

export interface GenerateSuggestionParams {
  customerMessage: string;
  conversationContext: ConversationContext;
  customerContext?: CustomerContext;
  businessContext?: BusinessContext;
  staffUserEmail?: string;
  messageId?: string; // Message ID for database storage
  dryRun?: boolean; // Skip database storage during evaluation
  overrideModel?: string; // Override the default model for testing
  includeDebugContext?: boolean; // Include full context for transparency
}

// Legacy monolithic prompt removed — now using skills-based architecture (src/lib/ai/skills/)
// The old ~460-line prompt has been replaced by modular skill files:
// - core-skill.ts: base persona, Thai style, safety rules
// - booking-skill.ts: booking/availability/cancellation
// - pricing-skill.ts: pricing, packages, promotions
// - coaching-skill.ts: coaching availability and rates
// - facility-skill.ts: hours, location, equipment
// - general-skill.ts: greetings, thanks, arrival

// Generate system prompt with context
function generateContextualPrompt(
  customerMessage: string,
  conversationContext: ConversationContext,
  customerContext?: CustomerContext,
  similarMessages: SimilarMessage[] = [],
  template?: any,
  businessContext?: BusinessContext,
  intent?: string,
  faqMatches: FAQMatch[] = []
): string {
  // Get current date and time in Thailand timezone
  const thailandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  const todayDate = thailandTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const todayDayOfWeek = thailandTime.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = thailandTime.toTimeString().slice(0, 5); // HH:MM

  // Calculate tomorrow's date
  const tomorrowTime = new Date(thailandTime);
  tomorrowTime.setDate(tomorrowTime.getDate() + 1);
  const tomorrowDate = tomorrowTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const tomorrowDayOfWeek = tomorrowTime.toLocaleDateString('en-US', { weekday: 'long' });

  // Detect customer language from current message
  const customerLang = /[\u0E00-\u0E7F]/.test(customerMessage) ? 'th' : 'en';
  const messageLanguage: 'thai' | 'english' = customerLang === 'th' ? 'thai' : 'english';

  // Use skills-based prompt: select skills for detected intent and compose
  // Language-aware: only includes Thai rules for Thai messages, English rules for English
  const detectedIntent = intent || regexFullClassify(customerMessage).intent;
  const skills = getSkillsForIntent(detectedIntent);
  const skillsPrompt = composeSkillPromptForLanguage(skills, messageLanguage);

  // Replace date/time placeholders in the composed skills prompt
  let contextPrompt = skillsPrompt
    .replace(/{TODAY_DATE}/g, todayDate)
    .replace(/{TODAY_DAY_OF_WEEK}/g, todayDayOfWeek)
    .replace(/{TOMORROW_DATE}/g, tomorrowDate)
    .replace(/{TOMORROW_DAY_OF_WEEK}/g, tomorrowDayOfWeek)
    .replace(/{CURRENT_TIME}/g, currentTime) + '\n\n';
  const skillExamples = getSkillExamples(skills, customerLang);
  if (skillExamples) {
    contextPrompt += skillExamples + '\n';
  }

  // Add customer context
  if (customerContext) {
    const isNewCustomer = !customerContext.id || (customerContext.totalVisits || 0) === 0;
    const hasContactInfo = customerContext.name && customerContext.name !== 'Unknown' &&
                          customerContext.phone && customerContext.phone !== 'Not provided';

    // Show warning ONLY if contact info is actually missing (not just because totalVisits = 0)
    let customerLabel = '';
    if (!hasContactInfo) {
      customerLabel = '⚠️  NEW CUSTOMER (not in database yet - will need name & phone)\n';
    } else if (isNewCustomer) {
      customerLabel = '✅ CUSTOMER INFO AVAILABLE (first-time customer)\n';
    } else {
      customerLabel = '✅ EXISTING CUSTOMER\n';
    }

    // Only include contact details (phone) for intents that need them for function calling
    const needsContactInfo = ['booking_request', 'availability_check', 'cancellation', 'modification_request'].includes(intent || '');

    contextPrompt += `CUSTOMER INFORMATION:
${customerLabel}- Name: ${customerContext.name || 'Unknown'}
${needsContactInfo ? `- Phone: ${customerContext.phone || 'Not provided'}\n` : ''}- Total visits: ${customerContext.totalVisits || 0}
- Lifetime value: ฿${customerContext.lifetimeValue || 0}
- Preferred language: ${customerContext.language || 'auto'}

`;

    // Show active packages (INCLUDING COACHING PACKAGES!)
    if (customerContext.activePackages && customerContext.activePackages.count > 0) {
      contextPrompt += `ACTIVE PACKAGES:\n`;

      // List each package with details
      if (customerContext.activePackages.packages && customerContext.activePackages.packages.length > 0) {
        customerContext.activePackages.packages.forEach((pkg: any) => {
          const hours = pkg.type === 'Unlimited' ? 'Unlimited' : `${pkg.remainingHours}h`;
          const expiry = pkg.expirationDate ? ` (expires ${pkg.expirationDate})` : '';
          contextPrompt += `- ${pkg.name}: ${hours} remaining${expiry}\n`;
        });
      } else {
        // Fallback to summary if individual packages not available
        contextPrompt += `- ${customerContext.activePackages.count} package(s) active\n`;
        contextPrompt += `- ${customerContext.activePackages.totalHoursRemaining} hours remaining total\n`;
      }
      contextPrompt += '\n';
    }

    // Show upcoming bookings (for direct cancellation!)
    if (customerContext.upcomingBookings && customerContext.upcomingBookings.count > 0) {
      contextPrompt += `UPCOMING BOOKINGS (${customerContext.upcomingBookings.count} total):
`;
      const next = customerContext.upcomingBookings.nextBooking;
      if (next) {
        contextPrompt += `- NEXT: ${next.date} at ${next.time} (${next.bayType} bay)`;
        if (next.isCoaching && next.coachName) {
          contextPrompt += ` - COACHING with ${next.coachName}`;
        }
        contextPrompt += '\n';
      }
      contextPrompt += '\n';
    }

    // Show recent booking history (pattern recognition!)
    if (customerContext.recentBookings && customerContext.recentBookings.length > 0) {
      contextPrompt += `RECENT BOOKINGS (last ${customerContext.recentBookings.length}):
`;
      customerContext.recentBookings.forEach((booking, i) => {
        contextPrompt += `${i + 1}. ${booking.date} at ${booking.time} (${booking.bayType})`;
        if (booking.isCoaching && booking.coachName) {
          contextPrompt += ` - COACHING with ${booking.coachName}`;
        }
        if (booking.packageName) {
          contextPrompt += ` [${booking.packageName}]`;
        }
        contextPrompt += ` (${booking.status})\n`;
      });
      contextPrompt += '\n';
    }
  }

  // Add dynamic business context from database
  // NOTE: Static pricing/coaching/facility data is already in the skill prompts.
  // Only inject DYNAMIC data here: active promotions, operating hours from DB.
  if (businessContext) {
    const msgLower = customerMessage.toLowerCase();
    const isPricingQuestion = /ราคา|price|cost|เท่าไ|how\s*much|rate|ค่า|โปร|promotion|discount|ส่วนลด|deal|special|package|แพ็ค/i.test(msgLower);
    const isFacilityQuestion = /เปิด|ปิด|open|close|hour|เวลา|time|อุปกรณ์|equipment|club|ไม้กอล์ฟ|rental|ยืม/i.test(msgLower);

    // Operating hours from DB (facility questions only)
    if (isFacilityQuestion && businessContext.operatingHours) {
      contextPrompt += `OPERATING HOURS (from database):\n`;
      contextPrompt += `- Daily: ${businessContext.operatingHours.daily}\n`;
      contextPrompt += `- ${businessContext.operatingHours.note}\n\n`;
    }

    // Active promotions from DB (pricing/promo questions only)
    // IMPORTANT: Describe naturally, not as a data dump. The AI should rephrase, not copy verbatim.
    if (isPricingQuestion && businessContext.promotions && businessContext.promotions.length > 0) {
      contextPrompt += `ACTIVE PROMOTIONS (from database, rephrase naturally, do NOT copy verbatim):\n`;
      businessContext.promotions.forEach((promo, i) => {
        contextPrompt += `${i + 1}. ${promo.title_en}`;
        if (promo.badge_en) contextPrompt += ` [${promo.badge_en}]`;
        contextPrompt += `: ${promo.description_en}`;
        if (promo.valid_until) contextPrompt += ` (until ${new Date(promo.valid_until).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        contextPrompt += '\n';
      });
      contextPrompt += '\n';
    }
  }

  // Add FAQ knowledge base matches (placed before similar conversations — higher priority)
  if (faqMatches.length > 0) {
    contextPrompt += `FAQ KNOWLEDGE BASE (use these answers when relevant):\n`;
    faqMatches.forEach((faq, i) => {
      contextPrompt += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n`;
    });
    contextPrompt += '\n';
  }

  // NOTE: Conversation history is now added as proper message objects in the messages array
  // (removed from system prompt to enable better parameter extraction for function calling)

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

  contextPrompt += `CURRENT CUSTOMER MESSAGE: "${customerMessage}"

IMPORTANT: The customer wrote in ${messageLanguage.toUpperCase()}. You MUST respond in the SAME language.
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

// Intent detection consolidated into intent-classifier.ts (regexFullClassify + classifyIntent)
// The old detectMessageIntent function has been removed — use regexFullClassify as fallback

// Format function execution results into customer-facing messages
function formatFunctionResult(functionName: string, result: FunctionResult, customerMessage: string): string {
  const isThaiMessage = /[\u0E00-\u0E7F]/.test(customerMessage);

  switch (functionName) {
    case 'check_bay_availability': {
      const data = result.data;
      const date = data.date;
      const startTime = data.start_time;

      // Determine what customer asked for
      const askedForSocial = data.bay_type === 'social';
      const askedForAI = data.bay_type === 'ai';
      const askedForAny = data.bay_type === 'all';

      const socialAvailable = data.social_bays_available;
      const aiAvailable = data.ai_bay_available;

      if (isThaiMessage) {
        // Thai responses
        if (startTime) {
          // Specific time requested
          if (askedForSocial && socialAvailable) {
            return `Social bay ว่างค่ะ ${startTime} วันที่ ${date}`;
          } else if (askedForAI && aiAvailable) {
            return `AI bay ว่างค่ะ ${startTime} วันที่ ${date}`;
          } else if (askedForAny && (socialAvailable || aiAvailable)) {
            if (socialAvailable && aiAvailable) {
              return `ว่างทั้ง Social และ AI bay ค่ะ ${startTime}`;
            } else if (socialAvailable) {
              return `Social bay ว่างค่ะ ${startTime}`;
            } else {
              return `AI bay ว่างค่ะ ${startTime}`;
            }
          } else {
            return `${startTime} เต็มแล้วค่ะ สนใจเปลี่ยนเวลาหรือวันอื่นมั้ยคะ`;
          }
        } else {
          // General availability
          if (socialAvailable && aiAvailable) {
            return `ว่างค่ะ มี Social และ AI bay`;
          } else if (socialAvailable) {
            return `Social bay ว่างค่ะ`;
          } else if (aiAvailable) {
            return `AI bay ว่างค่ะ`;
          } else {
            return `วันนี้เต็มแล้วค่ะ สนใจดูวันอื่นมั้ยคะ`;
          }
        }
      } else {
        // English responses
        if (startTime) {
          // Specific time requested
          if (askedForSocial && socialAvailable) {
            return `Social bay available at ${startTime} on ${date}`;
          } else if (askedForAI && aiAvailable) {
            return `AI bay available at ${startTime} on ${date}`;
          } else if (askedForAny && (socialAvailable || aiAvailable)) {
            if (socialAvailable && aiAvailable) {
              return `Both Social and AI bays available at ${startTime}`;
            } else if (socialAvailable) {
              return `Social bay available at ${startTime}`;
            } else {
              return `AI bay available at ${startTime}`;
            }
          } else {
            return `Sorry, ${startTime} is fully booked. Would you like to try a different time or another day?`;
          }
        } else {
          // General availability
          if (socialAvailable && aiAvailable) {
            return `We have both Social and AI bays available on ${date}`;
          } else if (socialAvailable) {
            return `Social bay available on ${date}`;
          } else if (aiAvailable) {
            return `AI bay available on ${date}`;
          } else {
            return `Sorry, all bays are fully booked on ${date}. Would you like to check another day?`;
          }
        }
      }
    }

    case 'get_coaching_availability': {
      const data = result.data;
      const coaches = data.coaches || [];
      const hasAvailability = data.has_availability;

      if (isThaiMessage) {
        if (!hasAvailability || coaches.length === 0) {
          return `วันนี้โปรไม่ว่างค่ะ สนใจดูวันอื่นมั้ยคะ`;
        }
        const availableCoaches = coaches.filter((c: any) => c.is_available);
        if (availableCoaches.length === 1) {
          return `โปร${availableCoaches[0].coach_name} ว่างค่ะ`;
        } else {
          const coachNames = availableCoaches.map((c: any) => c.coach_name).join(' และ ');
          return `โปร${coachNames} ว่างค่ะ`;
        }
      } else {
        if (!hasAvailability || coaches.length === 0) {
          return `Sorry, no coaches available on ${data.date}. Would you like to check another day?`;
        }
        const availableCoaches = coaches.filter((c: any) => c.is_available);
        if (availableCoaches.length === 1) {
          return `Coach ${availableCoaches[0].coach_name} is available on ${data.date}`;
        } else {
          const coachNames = availableCoaches.map((c: any) => c.coach_name).join(' and ');
          return `Coaches ${coachNames} are available on ${data.date}`;
        }
      }
    }

    case 'create_booking':
      // This should be handled by the approval workflow
      return result.approvalMessage || 'Booking request ready for review';

    default:
      return "I've processed your request. Let me help you further.";
  }
}

// Calculate confidence score based on various factors
function calculateConfidenceScore(
  similarMessages: SimilarMessage[],
  hasTemplate: boolean,
  hasCustomerContext: boolean,
  responseLength: number,
  intent?: string,
  functionCalled?: string | null,
  functionSuccess?: boolean
): number {
  let confidence = 0.4; // Lower base — earn confidence through signals

  // Boost confidence based on similar messages (up to +0.2)
  if (similarMessages.length > 0) {
    const avgSimilarity = similarMessages.reduce((sum, msg) => sum + msg.similarityScore, 0) / similarMessages.length;
    confidence += avgSimilarity * 0.2;
    // Extra boost for multiple high-quality matches
    if (similarMessages.length >= 2 && avgSimilarity > 0.7) {
      confidence += 0.05;
    }
  }

  // Boost if we have a matching template (+0.15)
  if (hasTemplate) {
    confidence += 0.15;
  }

  // Boost if we have customer context (+0.1)
  if (hasCustomerContext) {
    confidence += 0.1;
  }

  // Boost for reasonable response length (+0.05)
  if (responseLength > 20 && responseLength < 300) {
    confidence += 0.05;
  }

  // Intent-based confidence adjustments
  // Simple factual intents are higher confidence than complex ones
  const highConfidenceIntents = ['greeting', 'location_inquiry', 'facility_inquiry', 'pricing_inquiry'];
  const lowConfidenceIntents = ['general_inquiry', 'modification_request'];
  if (intent && highConfidenceIntents.includes(intent)) {
    confidence += 0.1;
  } else if (intent && lowConfidenceIntents.includes(intent)) {
    confidence -= 0.05;
  }

  // Function call results boost/penalize confidence
  if (functionCalled) {
    if (functionSuccess) {
      confidence += 0.1; // Successfully got real data
    } else {
      confidence -= 0.1; // Function failed, response may be less accurate
    }
  }

  return Math.max(0.2, Math.min(confidence, 0.95)); // Floor at 20%, cap at 95%
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

    // Use the provided message ID and assign to the correct field based on channel type
    // The constraint requires exactly ONE of line_message_id or web_message_id to be non-null
    const { data, error} = await refacSupabaseAdmin
      .from('ai_suggestions')
      .insert({
        conversation_id: params.conversationContext.id,
        // Assign message ID to appropriate field based on channel type
        line_message_id: isLineChannel ? params.messageId : null,
        web_message_id: (isWebChannel || isMetaChannel) ? params.messageId : null,
        customer_message: params.customerMessage,
        customer_message_embedding: `[${messageEmbedding.join(',')}]`,
        suggested_response: suggestion.suggestedResponse,
        suggested_response_thai: suggestion.suggestedResponseThai || null,
        confidence_score: suggestion.confidenceScore,
        response_time_ms: suggestion.responseTimeMs,
        similar_messages_count: suggestion.similarMessagesUsed.length,
        template_matched_id: suggestion.templateUsed?.id || null,
        context_used: {
          customer: params.customerContext ? {
            id: params.customerContext.id,
            name: params.customerContext.name,
            language: params.customerContext.language,
            totalVisits: params.customerContext.totalVisits,
            activePackages: params.customerContext.activePackages,
          } : undefined,
          similarMessages: suggestion.similarMessagesUsed.map(m => ({
            content: m.content,
            score: m.similarityScore
          })),
          contextSummary: suggestion.contextSummary
        },
        suggested_images: suggestion.suggestedImages || null,
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

    // 3. Classify intent using two-tier approach (regex fast-path + LLM classifier)
    const classification = await classifyIntent(params.customerMessage, params.conversationContext?.recentMessages);
    const intent = classification.intent;
    const matchingTemplate = await findMatchingTemplate(params.customerMessage, intent);

    // 3.1 For greeting-only messages, clear similar messages to prevent context contamination
    // Embedding search on "hello" returns random past conversations that cause the AI to
    // fabricate intent (e.g., confirming nonexistent bookings, asking about job applications)
    if (intent === 'greeting') {
      similarMessages.length = 0;
    }

    // 3.5 Find relevant FAQ entries (intent-aware hybrid search)
    const faqMatches = await findRelevantFAQs(
      messageEmbedding,
      params.customerMessage,
      intent,
      3, // max results
      0.5 // lower threshold for FAQ
    );

    // Track FAQ usage (fire-and-forget)
    if (faqMatches.length > 0) {
      trackFAQUsage(faqMatches.map(f => f.id)).catch(() => {});
    }

    // 4. Generate contextual prompt (uses skills-based architecture)
    const contextualPrompt = generateContextualPrompt(
      params.customerMessage,
      params.conversationContext,
      params.customerContext,
      similarMessages,
      matchingTemplate,
      params.businessContext,
      intent,
      faqMatches
    );

    // 5. Detect language from CURRENT message only (not customer profile)
    // This ensures we respond in the language the customer is using RIGHT NOW
    let userContent = params.customerMessage;
    const currentMessageLanguage = /[\u0E00-\u0E7F]/.test(params.customerMessage) ? 'thai' : 'english';
    const isThaiMessage = currentMessageLanguage === 'thai';
    const isGreeting = params.customerMessage.includes('สวัสดี') || /\b(hello|hi)\b/i.test(params.customerMessage);
    const hasNoConversationHistory = !params.conversationContext.recentMessages || params.conversationContext.recentMessages.length <= 1;

    // Priority: ALWAYS greet on first message of new conversations
    if (isThaiMessage && hasNoConversationHistory) {
      userContent = `Customer message: "${params.customerMessage}"

THAI FIRST MESSAGE INSTRUCTION: This is the FIRST message in a new conversation. ALWAYS start with a greeting.

Structure your response as:
1. Start with "สวัสดีค่า" or "สวัสดีค่ะ"
2. If they asked a specific question, answer it briefly (total response: 6-10 words maximum)
3. If they ONLY said a greeting with no question, respond with ONLY "สวัสดีค่า" and STOP. Do NOT add anything else.

Examples:
- If they ask about left-handed support: "สวัสดีค่ะ ได้เลยค่ะ รองรับค่ะ"
- If they ask about pricing: "สวัสดีค่ะ ราคา 700 บาทต่อชั่วโมงค่ะ"
- If they ONLY greet (สวัสดี/สวัสดีค่ะ/สวัสดีครับ): "สวัสดีค่า" — nothing more

CRITICAL:
- NEVER skip the greeting on the first message of a new session.
- NEVER fabricate context. If the customer only says hello, respond with ONLY a hello back. Do NOT assume what they want, do NOT confirm bookings, do NOT offer to search for anything.`;
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
    } else {
      // English message - enforce English response
      userContent = `Customer message: "${params.customerMessage}"

🚨 CRITICAL LANGUAGE REQUIREMENT:
The customer is writing in ENGLISH. You MUST respond in ENGLISH ONLY.
- DO NOT use Thai language in your response
- DO NOT mix languages
- Match the customer's language exactly

Write naturally in English, be friendly and professional. Keep responses to 1 to 2 sentences.
If the customer ONLY says a greeting (hello, hi, good day) with no question, respond with ONLY a short greeting like "Hello! How can I help?" and nothing more. Do NOT assume or predict what they want.`;
    }

    // 6. Add debug reasoning in dry run mode - DISABLED
    // This was causing AI to write about functions instead of calling them!
    // The AI should use actual function calling, not text descriptions
    // if (params.dryRun) {
    //   userContent = userContent + `
    //
    // DEBUG MODE: After generating your response, add an internal reasoning section at the END:
    //
    // [INTERNAL REASONING:
    // - Intent detected: [what you think customer wants]
    // - Function to call: [which function you chose, or "none"]
    // - Why this function: [brief explanation]
    // - Parameters: [list key parameters]
    // ]`;
    // }

    // 7. Multi-step function calling loop
    // Build messages array with system prompt + conversation history + current message

    // Split conversation by date:
    // - Messages from TODAY (same day as current conversation) → send as message objects
    // - Messages from previous days → add as text summary in system prompt

    // Find the date of the current conversation (most recent message or now)
    const conversationDate = params.conversationContext.recentMessages && params.conversationContext.recentMessages.length > 0
      ? new Date(params.conversationContext.recentMessages[params.conversationContext.recentMessages.length - 1].createdAt || new Date()).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const todaysMessages: typeof params.conversationContext.recentMessages = [];
    const previousDaysMessages: typeof params.conversationContext.recentMessages = [];

    if (params.conversationContext.recentMessages && params.conversationContext.recentMessages.length > 0) {
      for (const msg of params.conversationContext.recentMessages) {
        const msgDate = msg.createdAt ? new Date(msg.createdAt).toISOString().split('T')[0] : conversationDate;
        if (msgDate === conversationDate) {
          todaysMessages.push(msg);
        } else {
          previousDaysMessages.push(msg);
        }
      }
    }

    // Check if this is the first staff message of TODAY (greeting each day, not entire conversation)
    // A conversation can span multiple days - customer messages again tomorrow → greet again
    const hasAssistantMessageToday = todaysMessages.some(msg =>
      msg.senderType === 'staff' || msg.senderType === 'assistant'
    );

    // Also check if staff has already greeted today (to prevent "Hello! ... Hello! ..." repetition)
    const hasGreetedToday = todaysMessages.some(msg => {
      if (msg.senderType !== 'staff' && msg.senderType !== 'assistant') return false;
      const content = (msg.content || '').toLowerCase();
      return content.startsWith('hello') || content.startsWith('hi') ||
             content.includes('สวัสดี') || content.startsWith('good morning') ||
             content.startsWith('good afternoon') || content.startsWith('good evening');
    });

    // Add previous days' messages as text summary to system prompt
    let finalContextPrompt = contextualPrompt;
    if (previousDaysMessages.length > 0) {
      finalContextPrompt += `\nPREVIOUS CONVERSATION HISTORY (for context only):
${previousDaysMessages.map(msg => `${msg.senderType}: ${msg.content}`).join('\n')}

`;
    }

    // Add greeting instruction if this is the first staff message of the day
    // Only greet if we haven't found ANY assistant messages in today's conversation
    // AND haven't greeted yet (to prevent "Hello! ... Hello! ..." repetition)
    if (!hasAssistantMessageToday && !hasGreetedToday) {
      finalContextPrompt += `\n👋 FIRST MESSAGE OF THE DAY:
This is the FIRST staff response today in this conversation. You MUST start your response with a greeting.

${isThaiMessage ? `- Thai: Start with "สวัสดีค่า" or "สวัสดีค่ะ" then answer their question
- Example: "สวัสดีค่ะ หาให้นะคะ" (Hello, I'll check for you)` : `- English: Start with a friendly greeting like "Good morning!" or "Hello!" then answer their question
- Example: "Hello! Let me check the availability for you."`}

IMPORTANT:
- Greet on the first message of each new day
- Do NOT greet again during ongoing conversation on the same day
- If customer already received staff response today, skip the greeting

`;
    } else if (hasGreetedToday || hasAssistantMessageToday) {
      // Explicitly tell AI NOT to greet again — either we already greeted, or we've already been talking
      finalContextPrompt += `\n⚠️ DO NOT GREET AGAIN:
Staff has already responded in this conversation today. Do NOT start with "Hello", "Hi", "Good morning", "สวัสดี", or any greeting.
Just answer the customer's question directly. Skip any greeting prefix.

`;
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: finalContextPrompt }
    ];

    // Add ONLY today's conversation as proper message objects with timestamps
    // This gives AI clear context for current conversation flow and temporal understanding
    // Cap at last 20 messages to prevent excessive token usage on busy days
    const recentTodaysMessages = todaysMessages.slice(-20);
    if (recentTodaysMessages.length > 0) {
      for (const msg of recentTodaysMessages) {
        const role = (msg.senderType === 'user' || msg.senderType === 'customer') ? 'user' : 'assistant';

        // Format timestamp in readable format (HH:MM)
        let timePrefix = '';
        if (msg.createdAt) {
          const msgTime = new Date(msg.createdAt);
          const hours = msgTime.getHours().toString().padStart(2, '0');
          const minutes = msgTime.getMinutes().toString().padStart(2, '0');
          timePrefix = `[${hours}:${minutes}] `;
        }

        messages.push({
          role: role,
          content: timePrefix + msg.content
        });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userContent });

    // Only send tools relevant to the detected intent
    // e.g., promotion_inquiry gets NO tools, booking_request gets check_bay + create_booking
    const intentTools = getToolsForIntent(intent);
    const toolChoice = intentTools.length > 0 ? 'auto' : undefined;

    let suggestedResponse = '';
    let functionCalled: string | undefined;
    let functionResult: FunctionResult | undefined;
    let requiresApproval = false;
    let approvalMessage: string | undefined;
    const functionCallHistory: string[] = []; // Track all functions called

    // Debug info (for dry run mode)
    const debugInfo: any = {
      openAIRequests: [],
      openAIResponses: []
    };

    // Multi-step loop: Keep calling API until AI stops requesting functions
    let maxIterations = 5; // Safety limit to prevent infinite loops
    let currentIteration = 0;

    // Use override model if provided, otherwise use default
    const modelToUse = params.overrideModel || AI_CONFIG.model;

    // Newer models (gpt-5-*, o1-*, o3-*) require max_completion_tokens instead of max_tokens
    const usesCompletionTokens = /^(gpt-5|o1|o3)/i.test(modelToUse);

    while (currentIteration < maxIterations) {
      currentIteration++;

      // Build model-specific parameters
      // Reasoning models (gpt-5-*, o1-*, o3-*) use max_completion_tokens, don't support custom temperature,
      // and need a larger token budget because reasoning tokens count against the limit
      const modelSpecificParams = usesCompletionTokens
        ? {
            max_completion_tokens: 1500,    // ~1000 reasoning + ~500 output
            reasoning_effort: 'low' as const, // Reduce reasoning overhead for simple chat replies
          }
        : { max_tokens: AI_CONFIG.maxTokens, temperature: AI_CONFIG.temperature };

      // Capture the EXACT request being sent to OpenAI (in dry run mode)
      // Only include tools/tool_choice if there are relevant tools for this intent
      const toolParams = intentTools.length > 0
        ? { tools: intentTools, tool_choice: toolChoice }
        : {};

      const requestPayload = {
        model: modelToUse,
        messages: messages,
        ...modelSpecificParams,
        ...toolParams
      };

      if (params.dryRun) {
        debugInfo.openAIRequests.push({
          iteration: currentIteration,
          payload: requestPayload
        });
        console.log('\n========== OPENAI REQUEST (Iteration ' + currentIteration + ') ==========');
        console.log(`Model: ${modelToUse}${params.overrideModel ? ' (OVERRIDE)' : ''}`);
        console.log(JSON.stringify(requestPayload, null, 2));
        console.log('========== END OPENAI REQUEST ==========\n');
      }

      // Call OpenAI API (as any: SDK types don't cover reasoning_effort + dynamic tool_choice union)
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: messages,
        ...modelSpecificParams,
        ...toolParams,
      } as any);

      // Capture the EXACT response from OpenAI (in dry run mode)
      if (params.dryRun) {
        debugInfo.openAIResponses.push({
          iteration: currentIteration,
          response: completion
        });
        console.log('\n========== OPENAI RESPONSE (Iteration ' + currentIteration + ') ==========');
        console.log(JSON.stringify(completion, null, 2));
        console.log('========== END OPENAI RESPONSE ==========\n');
      }

      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error('No message in completion');
      }

      // Add assistant's message to conversation history
      messages.push(message);

      // Check if AI wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[Iteration ${currentIteration}] AI requested ${message.tool_calls.length} function call(s)`);

        // Execute all requested function calls
        for (const toolCall of message.tool_calls) {
          // Type guard for function tool calls
          if (toolCall.type === 'function' && 'function' in toolCall) {
            const functionName = toolCall.function.name;
            let functionArgs;
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError) {
              console.error(`Failed to parse function arguments for ${toolCall.function.name}:`, toolCall.function.arguments);
              messages.push({
                role: 'tool' as const,
                content: JSON.stringify({ error: 'Invalid function arguments' }),
                tool_call_id: toolCall.id
              });
              continue;
            }

            console.log(`  → Executing: ${functionName}`, functionArgs);
            functionCallHistory.push(functionName);

            // Execute the function
            const result = await functionExecutor.execute({
              name: functionName,
              parameters: functionArgs
            }, params.customerContext?.id); // Pass customerId for package selection

            // Store the LAST function call details (for backwards compatibility)
            functionCalled = functionName;
            functionResult = result;

            // Check if function requires approval - if so, generate a customer-facing message
            if (result.requiresApproval) {
              requiresApproval = true;
              approvalMessage = result.approvalMessage;

              // Generate a natural customer-facing message instead of exposing internal action text
              // The approvalMessage is for staff review; the suggestedResponse is what staff sends to customer
              const customerFacingMessages: Record<string, string> = {
                'cancel_booking': isThaiMessage
                  ? 'ยกเลิกให้เรียบร้อยค่ะ'
                  : 'Done, I\'ve cancelled that for you.',
                'create_booking': isThaiMessage
                  ? 'จองให้เรียบร้อยค่ะ'
                  : 'Your booking is confirmed!',
                'modify_booking': isThaiMessage
                  ? 'แก้ไขให้เรียบร้อยค่ะ'
                  : 'Done, I\'ve updated your booking.',
              };
              suggestedResponse = customerFacingMessages[functionName] ||
                (isThaiMessage ? 'เรียบร้อยค่ะ' : 'Done!');

              // Break out of function execution loop
              break;
            }

            // Add function result back to conversation
            messages.push({
              role: 'tool',
              content: JSON.stringify(result.data || result.error || {}),
              tool_call_id: toolCall.id
            });

            console.log(`  ✓ Completed: ${functionName}`, result.success ? 'success' : 'error');
          }
        }

        // If approval required, stop the loop
        if (requiresApproval) {
          break;
        }

        // Continue loop to let AI potentially call more functions or generate final response
      } else {
        // No more function calls - AI has generated final response
        suggestedResponse = message.content || '';
        console.log(`[Iteration ${currentIteration}] Final response generated`);
        break;
      }
    }

    if (currentIteration >= maxIterations) {
      console.warn('⚠️  Reached maximum function calling iterations');
    }

    // If we executed functions but no final response, format the last function result
    if (!suggestedResponse && functionCalled && functionResult) {
      if (functionResult.success) {
        suggestedResponse = formatFunctionResult(functionCalled, functionResult, params.customerMessage);
      } else {
        suggestedResponse = functionResult.error ||
          `I encountered an issue while processing your request. Please let me check manually.`;
      }
    }

    if (!suggestedResponse) {
      throw new Error('No response generated from OpenAI');
    }

    // Strip internal tags from customer-facing response
    // [INTERNAL NOTE: ...] and [NEEDS MANAGEMENT: ...] are for staff/admin review only
    // Extract them before removing so they can be stored separately
    const managementMatch = suggestedResponse.match(/\[NEEDS MANAGEMENT:[^\]]*\]/g);
    let managementNote = managementMatch ? managementMatch.join(' ') : null;
    suggestedResponse = suggestedResponse
      .replace(/\s*\[INTERNAL NOTE:[^\]]*\]\s*/g, '')
      .replace(/\s*\[NEEDS MANAGEMENT:[^\]]*\]\s*/g, '')
      .trim();

    // Deterministic management escalation for high-risk topics
    // The LLM sometimes forgets the [NEEDS MANAGEMENT] tag, especially with brevity rules.
    // Detect patterns in the customer message + recent history and flag regardless of LLM output.
    if (!managementNote) {
      // Check current message AND recent customer messages for context
      const recentCustomerMsgs = (params.conversationContext?.recentMessages || [])
        .filter(m => m.senderType === 'user' || m.senderType === 'customer')
        .slice(-5) // Check more history for context
        .map(m => m.content)
        .join(' ');
      const msg = (params.customerMessage + ' ' + recentCustomerMsgs).toLowerCase();
      const hasMoneyKeywords = /refund|คืนเงิน|เงินคืน|จ่ายเพิ่ม|pay extra|pay more|compensation|ชดเชย|รับเพิ่ม/.test(msg);
      const hasPackageChange = /เปลี่ยนแพ[คก]|change package|switch package|upgrade|downgrade|ซื้อแพ[คก]|buy.*package/.test(msg);
      const hasRefund = /refund|คืนเงิน|เงินคืน|ขอเงิน/.test(msg);
      const hasPartnership = /partnership|พันธมิตร|sponsor|สปอนเซอร์|collaborate|ร่วมงาน/.test(msg);
      const hasComplaint = /complaint|ร้องเรียน|ไม่พอใจ|disappointed|unacceptable/.test(msg);
      const hasLargeGroup = /\b(1[0-9]|[2-9][0-9])\s*(คน|people|person|guests|pax)\b/.test(msg);
      const hasPayment = /จ่ายเพิ่ม|pay extra|pay more|โอนเพิ่ม|transfer.*more|จ่าย.*\d{4,}|pay.*\d{4,}/.test(msg);

      if (hasRefund) {
        managementNote = '[NEEDS MANAGEMENT: Refund request]';
      } else if (hasPackageChange) {
        // Package changes always need management, with or without money
        managementNote = hasMoneyKeywords || hasPayment
          ? '[NEEDS MANAGEMENT: Package change with payment adjustment]'
          : '[NEEDS MANAGEMENT: Package change request]';
      } else if (hasPayment) {
        managementNote = '[NEEDS MANAGEMENT: Payment adjustment request]';
      } else if (hasPartnership) {
        managementNote = '[NEEDS MANAGEMENT: Partnership/sponsorship inquiry]';
      } else if (hasComplaint) {
        managementNote = '[NEEDS MANAGEMENT: Customer complaint]';
      } else if (hasLargeGroup) {
        managementNote = '[NEEDS MANAGEMENT: Large group inquiry - may need custom pricing]';
      }
    }

    // 6. Calculate confidence score
    const confidenceScore = calculateConfidenceScore(
      similarMessages,
      !!matchingTemplate,
      !!params.customerContext,
      suggestedResponse.length,
      intent,
      functionCalled,
      functionResult ? functionResult.success !== false : undefined
    );

    const responseTime = Date.now() - startTime;

    // 7. Build debug context if requested (for staff transparency)
    let debugContext: AIDebugContext | undefined;
    if (params.includeDebugContext) {
      // Get skill names that were used for this intent
      const skillNames = getSkillsForIntent(intent).map(s => s.name);
      debugContext = {
        customerMessage: params.customerMessage,
        conversationHistory: params.conversationContext.recentMessages || [],
        // Sanitize customer data — omit PII (email, phone, notes) from debug context
        customerData: params.customerContext ? {
          name: params.customerContext.name,
          totalVisits: params.customerContext.totalVisits,
          lifetimeValue: params.customerContext.lifetimeValue,
          activePackages: params.customerContext.activePackages ? {
            count: params.customerContext.activePackages.count,
            hasUnlimited: params.customerContext.activePackages.hasUnlimited,
          } : undefined,
          upcomingBookings: params.customerContext.upcomingBookings ? {
            count: params.customerContext.upcomingBookings.count,
          } : undefined,
        } : undefined,
        similarMessagesUsed: similarMessages,
        // Only include a short excerpt — never send full system/user prompts to the frontend
        systemPromptExcerpt: contextualPrompt.substring(0, 500) + '...',
        skillsUsed: skillNames,
        intentDetected: intent,
        intentSource: classification.source,
        intentClassificationMs: classification.classificationTimeMs,
        businessContextIncluded: !!params.businessContext,
        faqMatches: faqMatches.map(f => ({
          question: f.question,
          answer: f.answer,
          score: f.similarityScore || 0,
        })),
        functionSchemas: intentTools.length > 0 ? intentTools : undefined,
        toolChoice: intentTools.length > 0 ? toolChoice : 'none',
        model: modelToUse
      };
    }

    // 7.5. Extract image suggestions from similar messages
    const suggestedImages: Array<{
      imageId: string;
      imageUrl: string;
      title: string;
      description: string;
      reason: string;
      similarityScore?: number;
    }> = [];

    // Collect unique image IDs from similar messages that have images
    const imageIds = new Set<string>();
    const imageReasons = new Map<string, { score: number; customerQuestion: string }>();

    for (const msg of similarMessages) {
      if (msg.curatedImageId) {
        imageIds.add(msg.curatedImageId);
        // Store the reason (what customer asked and how similar it is)
        if (!imageReasons.has(msg.curatedImageId) ||
            msg.similarityScore > (imageReasons.get(msg.curatedImageId)?.score || 0)) {
          imageReasons.set(msg.curatedImageId, {
            score: msg.similarityScore,
            customerQuestion: msg.content
          });
        }
      }
    }

    // Fetch image details from database
    if (imageIds.size > 0 && refacSupabaseAdmin) {
      try {
        const { data: images, error } = await refacSupabaseAdmin
          .from('line_curated_images')
          .select('id, name, category, file_url, description')
          .in('id', Array.from(imageIds));

        if (!error && images) {
          for (const image of images) {
            const reasonData = imageReasons.get(image.id);
            suggestedImages.push({
              imageId: image.id,
              imageUrl: image.file_url,
              title: image.name,
              description: image.description || `${image.category}: ${image.name}`,
              reason: `Similar to: "${reasonData?.customerQuestion || 'previous question'}"`,
              similarityScore: reasonData?.score
            });
          }
        }
      } catch (error) {
        console.warn('Failed to fetch curated image details:', error);
        // Non-critical error, continue without images
      }
    }

    // For promotion-related intents, also include ALL curated promotion images
    // This ensures promotion images are always suggested when customers ask about deals/promos
    if (intent === 'promotion_inquiry' && refacSupabaseAdmin) {
      try {
        const existingIds = new Set(suggestedImages.map(img => img.imageId));
        const { data: promoImages, error } = await refacSupabaseAdmin
          .from('line_curated_images')
          .select('id, name, category, file_url, description')
          .ilike('category', '%promotion%')
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .limit(10);

        if (!error && promoImages) {
          for (const image of promoImages) {
            // Skip if already included from RAG-matched results
            if (existingIds.has(image.id)) continue;
            suggestedImages.push({
              imageId: image.id,
              imageUrl: image.file_url,
              title: image.name,
              description: image.description || `${image.category}: ${image.name}`,
              reason: 'Promotion image (customer asked about promotions/deals)',
              similarityScore: undefined
            });
          }
        }
      } catch (error) {
        console.warn('Failed to fetch promotion curated images:', error);
      }
    }

    // For facility/equipment/pricing/coaching intents, match curated images by keyword in name
    // e.g. "What is the AI bay?" → match images named "AI Bay", "AI Bay 2"
    const keywordImageIntents = ['facility_inquiry', 'equipment_inquiry', 'pricing_inquiry', 'coaching_inquiry', 'location_inquiry'];
    if (keywordImageIntents.includes(intent) && refacSupabaseAdmin) {
      try {
        const existingIds = new Set(suggestedImages.map(img => img.imageId));
        // Extract meaningful keywords from the customer message (2+ chars, skip stopwords)
        const stopwords = new Set(['what', 'is', 'the', 'a', 'an', 'do', 'you', 'have', 'how', 'much', 'does', 'can', 'i', 'me', 'my', 'about', 'for', 'at', 'to', 'in', 'of', 'and', 'or', 'your', 'this', 'that', 'are', 'was', 'it', 'be']);
        const keywords = params.customerMessage
          .toLowerCase()
          .replace(/[^\w\s\u0E00-\u0E7F]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 2 && !stopwords.has(w))
          // Sanitize keywords: strip any characters that could be interpreted as PostgREST operators
          .map(kw => kw.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, ''))
          .filter(kw => kw.length >= 2);

        if (keywords.length > 0) {
          // Build OR filter: name ILIKE '%keyword%' for each keyword
          const nameFilters = keywords.map(kw => `name.ilike.%${kw}%`).join(',');
          const { data: keywordImages, error } = await refacSupabaseAdmin
            .from('line_curated_images')
            .select('id, name, category, file_url, description')
            .or(nameFilters)
            .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
            .limit(5);

          if (!error && keywordImages) {
            for (const image of keywordImages) {
              if (existingIds.has(image.id)) continue;
              suggestedImages.push({
                imageId: image.id,
                imageUrl: image.file_url,
                title: image.name,
                description: image.description || `${image.category}: ${image.name}`,
                reason: `Keyword match for "${params.customerMessage.substring(0, 50)}"`,
                similarityScore: undefined
              });
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch keyword-matched curated images:', error);
      }
    }

    // 8. Create suggestion object
    const suggestion: Omit<AISuggestion, 'id'> & { debugInfo?: any } = {
      suggestedResponse,
      confidenceScore,
      responseTimeMs: responseTime,
      similarMessagesUsed: similarMessages,
      templateUsed: matchingTemplate ? {
        id: matchingTemplate.id,
        title: matchingTemplate.title,
        content: matchingTemplate.content
      } : undefined,
      contextSummary: `Used ${similarMessages.length} similar messages, ${matchingTemplate ? 'template matched' : 'no template'}, ${params.customerContext ? 'customer context available' : 'no customer context'}${functionCallHistory.length > 0 ? `, functions: ${functionCallHistory.join(' → ')}` : ''}`,
      // Function calling metadata
      functionCalled,
      functionResult,
      requiresApproval,
      approvalMessage,
      managementNote,
      // Image suggestions (multi-modal responses)
      suggestedImages: suggestedImages.length > 0 ? suggestedImages : undefined,
      // Debug context (for staff transparency)
      debugContext,
      // Debug info (only in dry run mode)
      ...(params.dryRun && { debugInfo })
    };

    // 8. Store suggestion in database (skip during evaluation/dry run)
    let suggestionId: string;
    if (params.dryRun) {
      // During evaluation, don't store in database to avoid foreign key constraints
      suggestionId = `eval-${crypto.randomUUID()}`;
    } else if (!params.messageId) {
      // If no message ID provided, we can't satisfy the database constraint
      // Use temporary ID and log warning
      console.warn('No message ID provided for AI suggestion - cannot store in database');
      suggestionId = `temp-${crypto.randomUUID()}`;
    } else {
      suggestionId = await storeSuggestion(suggestion, params, messageEmbedding);
    }

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
    // Skip database update for temporary/eval IDs
    if (suggestionId.startsWith('temp-') || suggestionId.startsWith('eval-')) {
      console.log('Skipping feedback storage for temporary suggestion ID:', suggestionId);
      return;
    }

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