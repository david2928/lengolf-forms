// AI suggestion service for generating contextual chat responses
// Integrates RAG (Retrieval Augmented Generation) with Lengolf business context

import { AI_CONFIG, openaiProvider } from './openai-client';
import { generateText, streamText, stepCountIs } from 'ai';
import type { ModelMessage } from '@ai-sdk/provider-utils';
import { generateEmbedding, findSimilarMessages, SimilarMessage, findRelevantFAQs, trackFAQUsage, FAQMatch } from './embedding-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { createAITools, getActiveToolsForIntent, createToolExecutionState, stopOnApproval, ContextProviders, ToolExecutionState } from './function-schemas';
import { FunctionResult } from './function-executor';
import { getSkillsForIntent, composeSkillPromptForLanguage } from './skills';
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
    contentType?: string; // 'text', 'image', 'sticker', etc.
    imageUrl?: string; // Public URL for image messages
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
  imageUrl?: string; // Customer image URL for vision support
  dryRun?: boolean; // Skip database storage during evaluation
  overrideModel?: string; // Override the default model for testing
  includeDebugContext?: boolean; // Include full context for transparency
  // Phase 2: on-demand context loading via tools
  customerIdForTools?: string; // Customer ID for on-demand context tool
  getCustomerContextFn?: (customerId: string) => Promise<CustomerContext | undefined>;
}

// All pre-processing artifacts needed by both generateText and streamText
export interface SuggestionContext {
  startTime: number;
  params: GenerateSuggestionParams;
  messageEmbedding: number[];
  messageLanguage: 'th' | 'en';
  isThaiMessage: boolean;
  intent: string;
  classification: IntentClassification;
  matchingTemplate: { id: string; title: string; content: string } | null;
  contextualPrompt: string;
  finalContextPrompt: string;
  conversationMessages: ModelMessage[];
  toolState: ToolExecutionState;
  allTools: ReturnType<typeof createAITools>;
  validActiveTools: string[];
  hasTools: boolean;
  modelToUse: string;
  isReasoningModel: boolean;
  debugInfo: { openAIRequests: unknown[]; openAIResponses: unknown[] };
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

// Find matching template based on classified intent (not raw keywords)
async function findMatchingTemplate(customerMessage: string, intent: string, customerContext?: CustomerContext): Promise<any> {
  try {
    if (!refacSupabaseAdmin) return null;

    // Only match templates for specific intents — don't override the classifier with keyword matching
    if (intent !== 'greeting' && intent !== 'booking_request') return null;

    const { data: templates, error } = await refacSupabaseAdmin
      .from('line_message_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error || !templates) return null;

    const isNewCustomer = !customerContext?.id || (customerContext.totalVisits || 0) === 0;
    const isThai = /[\u0E00-\u0E7F]/.test(customerMessage);

    if (intent === 'greeting') {
      const greetingTemplates = templates.filter((t: any) => t.category === 'greeting');
      // "First Registration" only for genuinely new customers
      if (isNewCustomer) {
        return greetingTemplates.find((t: any) =>
          isThai ? t.title.includes('TH') && t.title.includes('Registration') :
                   t.title.includes('EN') && t.title.includes('Registration')
        ) || greetingTemplates[0] || null;
      }
      // Existing customers get a normal greeting
      return greetingTemplates.find((t: any) =>
        isThai ? t.title.includes('TH') && !t.title.includes('Registration') :
                 t.title.includes('EN') && !t.title.includes('Registration')
      ) || greetingTemplates[0] || null;
    }

    if (intent === 'booking_request') {
      // Only show registration template for new customers
      if (isNewCustomer) {
        return templates.find((t: any) => t.title.includes('Registration') || t.title.includes('ลงทะเบียน'));
      }
      // Existing customers making a booking — use booking confirmation template if available
      return templates.find((t: any) => t.category === 'booking' && !t.title.includes('Registration')) || null;
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
  // Base confidence: 0.5 reflects that skill prompts already contain business knowledge.
  // Context tools (similar messages, customer data) provide additional boosts when called.
  let confidence = 0.5;

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
    // The constraint requires exactly ONE of line_message_id, web_message_id, or meta_message_id to be non-null
    const { data, error} = await refacSupabaseAdmin
      .from('ai_suggestions')
      .insert({
        conversation_id: params.conversationContext.id,
        // Assign message ID to appropriate field based on channel type
        line_message_id: isLineChannel ? params.messageId : null,
        web_message_id: isWebChannel ? params.messageId : null,
        meta_message_id: isMetaChannel ? params.messageId : null,
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

// Pre-processing: everything before the LLM call.
// Produces a SuggestionContext that can be consumed by either generateText or streamText.
export async function prepareSuggestionContext(params: GenerateSuggestionParams): Promise<SuggestionContext> {
  const startTime = Date.now();

  // 0. Image-aware preprocessing: when the customer sent an image, the raw message
  // is just "sent a photo" which is useless for embedding/intent/language detection.
  // Use the most recent customer TEXT message from conversation history instead.
  const isImageMessage = !!params.imageUrl && (
    !params.customerMessage.trim() ||
    /^sent a photo$/i.test(params.customerMessage.trim())
  );

  let effectiveMessage = params.customerMessage;
  if (isImageMessage) {
    const recentCustomerText = (params.conversationContext?.recentMessages || [])
      .filter(m =>
        (m.senderType === 'user' || m.senderType === 'customer') &&
        m.contentType !== 'image' &&
        m.content &&
        !/^sent a (photo|sticker)$/i.test(m.content.trim())
      )
      .slice(-1)[0]?.content;

    if (recentCustomerText) {
      effectiveMessage = recentCustomerText;
    }
  }

  // Sticker-aware preprocessing: "sent a sticker" has no semantic content.
  // Use conversation context to determine what the sticker acknowledges.
  // Only match when the current message itself is a sticker placeholder text.
  const isStickerMessage = !isImageMessage &&
    /^sent a sticker$/i.test(params.customerMessage.trim());

  if (isStickerMessage) {
    const recentStaffMsg = (params.conversationContext?.recentMessages || [])
      .filter(m =>
        (m.senderType === 'staff' || m.senderType === 'assistant') &&
        m.content && m.content.length > 2
      )
      .slice(-1)[0]?.content;

    if (recentStaffMsg) {
      effectiveMessage = `[Customer sent an acknowledgment sticker after staff said: "${recentStaffMsg.substring(0, 100)}"]`;
    } else {
      effectiveMessage = '[Customer sent a sticker as a greeting or acknowledgment]';
    }
  }

  // 1. Generate embedding for the customer message (use effective message for images)
  const messageEmbedding = await generateEmbedding(effectiveMessage || 'customer sent an image');

  // 2. Language detection (used for similar messages filtering in search_knowledge tool)
  const messageLanguage: 'th' | 'en' = /[\u0E00-\u0E7F]/.test(effectiveMessage) ? 'th' : 'en';

  // 3. Classify intent using two-tier approach (regex fast-path + LLM classifier)
  const classification = await classifyIntent(effectiveMessage, params.conversationContext?.recentMessages);
  const intent = classification.intent;
  const matchingTemplate = await findMatchingTemplate(effectiveMessage || params.customerMessage, intent, params.customerContext);

  // NOTE: Similar messages and FAQ matches are now loaded on-demand via context tools.
  // The search_knowledge tool uses messageEmbedding (via closure) when the LLM calls it.
  // Simple queries (greetings, thanks) skip the context entirely — saving ~700-1200 tokens.

  // 4. Generate contextual prompt (uses skills-based architecture)
  // Customer context and knowledge (FAQ + similar messages) are NO LONGER pre-loaded.
  // They are injected on-demand via get_customer_context and search_knowledge tools.
  const contextualPrompt = generateContextualPrompt(
    effectiveMessage || params.customerMessage,
    params.conversationContext,
    undefined,  // Customer context loaded on-demand by tools
    [],         // Similar messages loaded on-demand by tools
    matchingTemplate,
    params.businessContext,
    intent,
    []          // FAQ matches loaded on-demand by tools
  );

  // 5. Detect language from CURRENT message only (not customer profile)
  // This ensures we respond in the language the customer is using RIGHT NOW
  // For image/sticker messages, use recent customer text for language detection
  // since "sent a photo"/"sent a sticker" contain no Thai characters.
  // For structured data messages (name/phone/email only, no Thai or English prose),
  // also fall back to conversation history to maintain language continuity.
  let userContent = params.customerMessage;
  let langDetectionSource = params.customerMessage;

  // Detect if message is purely structured data (name, phone, email) with no real prose
  // Matches: "Name Phone" on one line, or "Name\nPhone\nEmail" on separate lines
  const trimmedMsg = params.customerMessage.trim();
  const isStructuredDataOnly = !isImageMessage && !isStickerMessage &&
    !/[\u0E00-\u0E7F]/.test(trimmedMsg) && // no Thai in the data itself
    (
      // Multi-line: Name\nPhone[\nEmail]
      /^[A-Za-z\s().]+\n[0-9\s+\-]+(\n[\w.@]+)?$/m.test(trimmedMsg) ||
      // Single-line: "Name Phone" (name = 2+ alpha words, phone = 7+ digits)
      /^[A-Za-z]{2,}(\s+[A-Za-z]{2,})+\s+0[0-9\s\-]{7,}$/.test(trimmedMsg)
    );

  // Also treat "sent a photo" text without imageUrl as needing language fallback
  const isPhotoPlaceholder = !isImageMessage && /^sent a photo$/i.test(trimmedMsg);

  if (isImageMessage || isStickerMessage || isStructuredDataOnly || isPhotoPlaceholder) {
    // Try customer messages first for language detection
    const recentCustomerText = (params.conversationContext?.recentMessages || [])
      .filter(m =>
        (m.senderType === 'user' || m.senderType === 'customer') &&
        m.contentType !== 'image' && m.contentType !== 'sticker' &&
        m.content && !/^sent a (photo|sticker)$/i.test(m.content.trim())
      )
      .slice(-1)[0]?.content;
    if (recentCustomerText) {
      langDetectionSource = recentCustomerText;
    } else {
      // Fallback: check any recent message (including staff) for Thai text
      const anyThaiMessage = (params.conversationContext?.recentMessages || [])
        .find(m => m.content && /[\u0E00-\u0E7F]/.test(m.content));
      if (anyThaiMessage) langDetectionSource = anyThaiMessage.content!;
    }
  }
  const currentMessageLanguage = /[\u0E00-\u0E7F]/.test(langDetectionSource) ? 'thai' : 'english';
  const isThaiMessage = currentMessageLanguage === 'thai';
  const hasNoConversationHistory = !params.conversationContext.recentMessages || params.conversationContext.recentMessages.length <= 1;

  // Priority: ALWAYS greet on first message of new conversations
  if (isThaiMessage && hasNoConversationHistory) {
    userContent = `Customer message: "${params.customerMessage}"

THAI FIRST MESSAGE: Start with "สวัสดีค่า". If they asked a question, answer briefly (6-10 words max). If greeting only, respond with ONLY "สวัสดีค่า" and stop. Never fabricate context or assume intent.`;
  } else if (isThaiMessage) {
    userContent = `Customer message: "${params.customerMessage}"

THAI: 5-8 words max. Brief but polite. No greetings, no names, no "ถ้ามีคำถามเพิ่มเติม".`;
  } else {
    userContent = `Customer message: "${params.customerMessage}"

ENGLISH ONLY. Do not use Thai. 1 to 2 sentences. If greeting only, respond with just a greeting — don't assume intent.`;
  }

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

  // Check if staff has already responded in this conversation session.
  const hasAssistantMessageToday = todaysMessages.some(msg =>
    msg.senderType === 'staff' || msg.senderType === 'assistant'
  );
  const hasAssistantInPreviousDays = previousDaysMessages.some(msg =>
    msg.senderType === 'staff' || msg.senderType === 'assistant'
  );

  // Also check if staff has already greeted (to prevent "Hello! ... Hello! ..." repetition)
  const isGreetingContent = (content: string) => {
    const c = content.toLowerCase();
    return c.startsWith('hello') || c.startsWith('hi') ||
           c.includes('สวัสดี') || c.startsWith('good morning') ||
           c.startsWith('good afternoon') || c.startsWith('good evening');
  };
  const hasGreetedToday = todaysMessages.some(msg => {
    if (msg.senderType !== 'staff' && msg.senderType !== 'assistant') return false;
    return isGreetingContent(msg.content || '');
  });

  // If todaysMessages is empty but previous days have staff messages,
  // the conversation is ongoing — don't treat this as "first message of the day"
  const isOngoingConversation = todaysMessages.length === 0 && hasAssistantInPreviousDays;

  // Add previous days' messages as text summary to system prompt (with dates for context)
  let finalContextPrompt = contextualPrompt;
  if (previousDaysMessages.length > 0) {
    finalContextPrompt += `\nPREVIOUS CONVERSATION HISTORY (for context only):
${previousDaysMessages.map(msg => {
let content = msg.content;
const prevSender = (msg.senderType === 'staff' || msg.senderType === 'assistant') ? 'Staff' : 'Customer';
if (msg.contentType === 'image' || /^sent a photo$/i.test((msg.content || '').trim())) {
  content = `[${prevSender} sent an image]`;
} else if (msg.contentType === 'sticker' || /^sent a sticker$/i.test((msg.content || '').trim())) {
  content = `[${prevSender} sent a sticker]`;
}
// Include date so the AI understands the timeline
const dateStr = msg.createdAt ? new Date(msg.createdAt).toISOString().split('T')[0] : '';
return `[${dateStr}] ${msg.senderType}: ${content}`;
}).join('\n')}

`;
  }

  // Add context tool usage hints when tools are available
  if (params.getCustomerContextFn) {
    finalContextPrompt += `\nCONTEXT TOOLS AVAILABLE:
- get_customer_context: Get customer profile, packages, and bookings for the current customer.
- search_knowledge: Search FAQ and past conversations for answers to business questions.
Do NOT call these for simple greetings or thank-you messages — just respond directly.
For booking/cancellation/modification: call get_customer_context first, then proceed to the action (create_booking, cancel_booking) without asking the customer to confirm.

`;
  }

  // Greeting logic: decide whether to greet based on conversation state
  const shouldGreet = !hasAssistantMessageToday && !hasGreetedToday && !isOngoingConversation;

  if (shouldGreet) {
    finalContextPrompt += `\n👋 FIRST MESSAGE: Start with a brief greeting${isThaiMessage ? ' ("สวัสดีค่า")' : ' (use customer name from get_customer_context if available)'}. Then answer their question. Do NOT greet again in this session.

`;
  } else if (hasGreetedToday || hasAssistantMessageToday || isOngoingConversation) {
    finalContextPrompt += `\n⚠️ DO NOT GREET: This is mid-conversation. No "สวัสดี", no "Hi [name]", no greeting of any kind. Answer directly.

`;
  }

  const conversationMessages: ModelMessage[] = [];

  // Add ONLY today's conversation as proper message objects with timestamps
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

      // Handle image messages: include actual image for vision if URL available
      const isImage = msg.contentType === 'image' || /^sent a photo$/i.test((msg.content || '').trim());
      const isSticker = msg.contentType === 'sticker' || /^sent a sticker$/i.test((msg.content || '').trim());
      const senderLabel = role === 'user' ? 'Customer' : 'Staff';

      if (isImage && msg.imageUrl) {
        // Pass image as multi-modal content so the AI can actually see it
        // Note: only 'user' role supports multi-modal content in the API
        let parsedUrl: URL | null = null;
        try { parsedUrl = new URL(msg.imageUrl); } catch { /* invalid URL */ }

        if (parsedUrl) {
          if (role === 'assistant') {
            // Staff images: inject as a user message since assistant role doesn't support vision
            conversationMessages.push({
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: `${timePrefix}[Staff sent this image to the customer — refer to it if relevant]` },
                { type: 'image' as const, image: parsedUrl }
              ]
            });
          } else {
            conversationMessages.push({
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: `${timePrefix}[Customer sent an image]` },
                { type: 'image' as const, image: parsedUrl }
              ]
            });
          }
        } else {
          conversationMessages.push({
            role: role as 'user' | 'assistant',
            content: `${timePrefix}[${senderLabel} sent an image]`
          });
        }
      } else if (isImage) {
        conversationMessages.push({
          role: role as 'user' | 'assistant',
          content: `${timePrefix}[${senderLabel} sent an image]`
        });
      } else if (isSticker) {
        conversationMessages.push({
          role: role as 'user' | 'assistant',
          content: `${timePrefix}[${senderLabel} sent a sticker]`
        });
      } else {
        conversationMessages.push({
          role: role as 'user' | 'assistant',
          content: timePrefix + (msg.content || '')
        });
      }
    }
  }

  // Add image-specific instruction to userContent when customer sent an image
  if (isImageMessage) {
    const imageInstruction = isThaiMessage
      ? `\n\nลูกค้าส่งรูปภาพมา ดูรูปและตอบอย่างเหมาะสมตามบริบทของบทสนทนา
ตอบเป็นภาษาไทยเท่านั้น ห้ามตอบเป็นภาษาอังกฤษ
หากเป็นรูปโปรโมชั่น/ใบปลิว ยืนยันว่าเป็นโปรโมชั่นอะไร
หากเป็นสกรีนช็อตการจอง อ้างอิงรายละเอียดที่เห็น
หากไม่เข้าใจรูป สอบถามลูกค้าเพิ่มเติม`
      : `\n\nThe customer sent an image. Look at the image and respond appropriately in context with the conversation.
If the image is a promotion/flyer, confirm which promotion it shows.
If it's a screenshot of a booking, reference the details you see.
If you can't understand the image, ask the customer to clarify.`;
    userContent = (userContent || '') + imageInstruction;
  }

  // Add current user message (with vision content if image is present)
  if (params.imageUrl) {
    let parsedImageUrl: URL | null = null;
    try {
      parsedImageUrl = new URL(params.imageUrl);
    } catch {
      console.warn('Invalid image URL, falling back to text-only:', params.imageUrl);
    }

    if (parsedImageUrl) {
      conversationMessages.push({
        role: 'user',
        content: [
          { type: 'text' as const, text: userContent || '[Customer sent an image]' },
          { type: 'image' as const, image: parsedImageUrl }
        ]
      });
    } else {
      conversationMessages.push({ role: 'user', content: (userContent || '') + '\n[Customer sent an image but the URL could not be loaded]' });
    }
  } else {
    conversationMessages.push({ role: 'user', content: userContent });
  }

  // Build on-demand context providers (closures over embedding, language, intent)
  const customerIdForTools = params.customerIdForTools;
  let contextProviders: ContextProviders | undefined;
  if (params.getCustomerContextFn) {
    contextProviders = {
      getCustomerContext: params.getCustomerContextFn,
      searchKnowledge: async (query: string) => {
        const similar = await findSimilarMessages(
          messageEmbedding,
          AI_CONFIG.maxSimilarMessages,
          0.7,
          undefined,
          messageLanguage,
        );
        if (intent === 'greeting') similar.length = 0;
        const faqs = await findRelevantFAQs(messageEmbedding, query, intent, 3, 0.5);
        if (faqs.length > 0) {
          trackFAQUsage(faqs.map(f => f.id)).catch(() => {});
        }
        return { faqMatches: faqs, similarMessages: similar };
      },
    };
  }

  // Tool setup: only send tools relevant to the detected intent
  const activeToolNames = getActiveToolsForIntent(intent);
  const toolState = createToolExecutionState();
  const allTools = createAITools(toolState, customerIdForTools, contextProviders);

  // Filter activeToolNames to only include tools that actually exist in allTools
  const validActiveTools = activeToolNames.filter(name => name in allTools);
  const hasTools = validActiveTools.length > 0;

  // Model configuration
  const modelToUse = params.overrideModel || AI_CONFIG.model;
  const isReasoningModel = /^(gpt-5|o1|o3)/i.test(modelToUse);

  // Debug info (for dry run mode)
  const debugInfo: { openAIRequests: unknown[]; openAIResponses: unknown[] } = {
    openAIRequests: [],
    openAIResponses: []
  };

  return {
    startTime,
    params,
    messageEmbedding,
    messageLanguage,
    isThaiMessage,
    intent,
    classification,
    matchingTemplate,
    contextualPrompt,
    finalContextPrompt,
    conversationMessages,
    toolState,
    allTools,
    validActiveTools,
    hasTools,
    modelToUse,
    isReasoningModel,
    debugInfo,
  };
}

// Post-processing: runs after LLM generation completes.
// Takes the generated text + tool state + context, returns a complete AISuggestion.
export async function postProcessSuggestion(
  generatedText: string,
  ctx: SuggestionContext
): Promise<AISuggestion> {
  const { toolState, params, isThaiMessage, intent, classification } = ctx;
  const { matchingTemplate, contextualPrompt, messageEmbedding } = ctx;

  const functionCalled = toolState.lastFunctionCalled;
  const functionResult: FunctionResult | undefined = toolState.lastFunctionResult;
  const requiresApproval = toolState.requiresApproval;
  const approvalMessage = toolState.approvalMessage;
  const functionCallHistory = toolState.functionCallHistory;

  // Resolve on-demand context from tool state (populated if tools were called)
  const similarMessages = toolState.similarMessages || [];
  const faqMatches = toolState.faqMatches || [];
  const resolvedCustomerContext = toolState.customerContext || params.customerContext;

  let suggestedResponse = '';

  if (requiresApproval && functionCalled) {
    // Generate a natural customer-facing message for approval-gated functions.
    // Check that the function actually succeeded before generating a confirmation.
    if (!functionResult || functionResult.success === false) {
      // Function failed or result missing — use the LLM-generated text which should describe
      // the error, or fall back to a safe message
      suggestedResponse = generatedText || functionResult?.error ||
        (isThaiMessage ? 'ขอตรวจสอบให้ก่อนนะคะ' : 'Let me check on that for you.');
    } else {
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
      suggestedResponse = customerFacingMessages[functionCalled] ||
        (isThaiMessage ? 'เรียบร้อยค่ะ' : 'Done!');
    }
  } else {
    suggestedResponse = generatedText;
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
  const managementMatch = suggestedResponse.match(/\[NEEDS MANAGEMENT:[^\]]*\]/g);
  let managementNote = managementMatch ? managementMatch.join(' ') : null;
  suggestedResponse = suggestedResponse
    .replace(/\s*\[INTERNAL NOTE:[^\]]*\]\s*/g, '')
    .replace(/\s*\[NEEDS MANAGEMENT:[^\]]*\]\s*/g, '')
    .trim();

  // Deterministic management escalation for high-risk topics
  if (!managementNote) {
    const recentCustomerMsgs = (params.conversationContext?.recentMessages || [])
      .filter(m => m.senderType === 'user' || m.senderType === 'customer')
      .slice(-5)
      .map(m => m.content)
      .join(' ');
    const msg = (params.customerMessage + ' ' + recentCustomerMsgs).toLowerCase();
    const hasMoneyKeywords = /refund|คืนเงิน|เงินคืน|จ่ายเพิ่ม|pay extra|pay more|compensation|ชดเชย|รับเพิ่ม/.test(msg);
    const hasPackageChange = /เปลี่ยนแพ[คก]|change package|switch package|upgrade|downgrade|ซื้อแพ[คก]|buy.*package/.test(msg);
    const hasRefund = /refund|คืนเงิน|เงินคืน|ขอเงิน/.test(msg);
    const hasPartnership = /partnership|พันธมิตร|sponsor|สปอนเซอร์|collaborate|ร่วมงาน|marketing agency|digital marketing|our services|our company|company profile|บริการของเรา|เสนอ.*บริการ|นำเสนอ/.test(msg);
    const hasComplaint = /complaint|ร้องเรียน|ไม่พอใจ|disappointed|unacceptable/.test(msg);
    const hasLargeGroup = /\b(1[5-9]|[2-9][0-9])\s*(คน|people|person|guests|pax)\b/.test(msg);
    const hasPayment = /จ่ายเพิ่ม|pay extra|pay more|โอนเพิ่ม|transfer.*more|จ่าย.*\d{4,}|pay.*\d{4,}/.test(msg);
    const hasUnverifiable = /ได้รับอีเมล|ได้รับ.*mail|receive.*email|email.*received|spam.*อีเมล|อีเมล.*spam|didn't receive|not received|ไม่ได้รับ/.test(msg);

    if (hasRefund) {
      managementNote = '[NEEDS MANAGEMENT: Refund request]';
    } else if (hasPackageChange) {
      managementNote = hasMoneyKeywords || hasPayment
        ? '[NEEDS MANAGEMENT: Package change with payment adjustment]'
        : '[NEEDS MANAGEMENT: Package change request]';
    } else if (hasPayment) {
      managementNote = '[NEEDS MANAGEMENT: Payment adjustment request]';
    } else if (hasPartnership) {
      managementNote = '[NEEDS MANAGEMENT: Business opportunity/partnership inquiry]';
    } else if (hasComplaint) {
      managementNote = '[NEEDS MANAGEMENT: Customer complaint]';
    } else if (hasLargeGroup) {
      managementNote = '[NEEDS MANAGEMENT: Large group inquiry - may need custom pricing]';
    } else if (hasUnverifiable) {
      managementNote = '[NEEDS MANAGEMENT: Cannot verify - requires staff to check]';
    }
  }

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(
    similarMessages,
    !!matchingTemplate,
    !!resolvedCustomerContext,
    suggestedResponse.length,
    intent,
    functionCalled,
    functionResult ? functionResult.success !== false : undefined
  );

  const responseTime = Date.now() - ctx.startTime;

  // Build debug context if requested (for staff transparency)
  let debugContext: AIDebugContext | undefined;
  if (params.includeDebugContext) {
    const skillNames = getSkillsForIntent(intent).map(s => s.name);
    debugContext = {
      customerMessage: params.customerMessage,
      conversationHistory: params.conversationContext.recentMessages || [],
      customerData: resolvedCustomerContext ? {
        name: resolvedCustomerContext.name,
        totalVisits: resolvedCustomerContext.totalVisits,
        lifetimeValue: resolvedCustomerContext.lifetimeValue,
        activePackages: resolvedCustomerContext.activePackages ? {
          count: resolvedCustomerContext.activePackages.count,
          hasUnlimited: resolvedCustomerContext.activePackages.hasUnlimited,
        } : undefined,
        upcomingBookings: resolvedCustomerContext.upcomingBookings ? {
          count: resolvedCustomerContext.upcomingBookings.count,
        } : undefined,
      } : undefined,
      similarMessagesUsed: similarMessages,
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
      functionSchemas: ctx.hasTools ? ctx.validActiveTools : undefined,
      toolChoice: ctx.hasTools ? 'auto' : 'none',
      model: ctx.modelToUse
    };
  }

  // Extract image suggestions from similar messages
  const suggestedImages: Array<{
    imageId: string;
    imageUrl: string;
    title: string;
    description: string;
    reason: string;
    similarityScore?: number;
  }> = [];

  const imageIds = new Set<string>();
  const imageReasons = new Map<string, { score: number; customerQuestion: string }>();

  for (const msg of similarMessages) {
    if (msg.curatedImageId) {
      imageIds.add(msg.curatedImageId);
      if (!imageReasons.has(msg.curatedImageId) ||
          msg.similarityScore > (imageReasons.get(msg.curatedImageId)?.score || 0)) {
        imageReasons.set(msg.curatedImageId, {
          score: msg.similarityScore,
          customerQuestion: msg.content
        });
      }
    }
  }

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
    }
  }

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

  const keywordImageIntents = ['facility_inquiry', 'equipment_inquiry', 'pricing_inquiry', 'coaching_inquiry', 'location_inquiry'];
  if (keywordImageIntents.includes(intent) && refacSupabaseAdmin) {
    try {
      const existingIds = new Set(suggestedImages.map(img => img.imageId));
      const stopwords = new Set(['what', 'is', 'the', 'a', 'an', 'do', 'you', 'have', 'how', 'much', 'does', 'can', 'i', 'me', 'my', 'about', 'for', 'at', 'to', 'in', 'of', 'and', 'or', 'your', 'this', 'that', 'are', 'was', 'it', 'be']);
      const keywords = params.customerMessage
        .toLowerCase()
        .replace(/[^\w\s\u0E00-\u0E7F]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 2 && !stopwords.has(w))
        .map(kw => kw.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, ''))
        .filter(kw => kw.length >= 2);

      if (keywords.length > 0) {
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

  // Create suggestion object
  const suggestion: Omit<AISuggestion, 'id'> & { debugInfo?: unknown } = {
    suggestedResponse,
    confidenceScore,
    responseTimeMs: responseTime,
    similarMessagesUsed: similarMessages,
    templateUsed: matchingTemplate ? {
      id: matchingTemplate.id,
      title: matchingTemplate.title,
      content: matchingTemplate.content
    } : undefined,
    contextSummary: `Used ${similarMessages.length} similar messages, ${matchingTemplate ? 'template matched' : 'no template'}, ${resolvedCustomerContext ? 'customer context available' : 'no customer context'}${functionCallHistory.length > 0 ? `, functions: ${functionCallHistory.join(' → ')}` : ''}`,
    functionCalled,
    functionResult,
    requiresApproval,
    approvalMessage,
    managementNote,
    suggestedImages: suggestedImages.length > 0 ? suggestedImages : undefined,
    debugContext,
    ...(params.dryRun && { debugInfo: ctx.debugInfo })
  };

  // Store suggestion in database (skip during evaluation/dry run)
  const paramsForStorage = resolvedCustomerContext && !params.customerContext
    ? { ...params, customerContext: resolvedCustomerContext }
    : params;

  let suggestionId: string;
  if (params.dryRun) {
    suggestionId = `eval-${crypto.randomUUID()}`;
  } else if (!params.messageId) {
    console.warn('No message ID provided for AI suggestion - cannot store in database');
    suggestionId = `temp-${crypto.randomUUID()}`;
  } else {
    suggestionId = await storeSuggestion(suggestion, paramsForStorage, messageEmbedding);
  }

  return {
    id: suggestionId,
    ...suggestion
  };
}

// Build the options object for generateText/streamText from a SuggestionContext
function buildLLMOptions(ctx: SuggestionContext) {
  return {
    model: openaiProvider(ctx.modelToUse),
    system: ctx.finalContextPrompt,
    messages: ctx.conversationMessages,
    ...(ctx.hasTools ? {
      tools: ctx.allTools,
      activeTools: ctx.validActiveTools as Array<keyof typeof ctx.allTools>,
      toolChoice: 'auto' as const,
    } : {}),
    maxOutputTokens: ctx.isReasoningModel ? 1500 : AI_CONFIG.maxTokens,
    temperature: ctx.isReasoningModel ? undefined : AI_CONFIG.temperature,
    providerOptions: ctx.isReasoningModel ? { openai: { reasoningEffort: 'low' } } : undefined,
    stopWhen: [stepCountIs(5), stopOnApproval(ctx.toolState)],
    onStepFinish: ctx.params.dryRun ? (step: any) => {
      const stepNum = step.stepNumber + 1;
      ctx.debugInfo.openAIRequests.push({
        iteration: stepNum,
        payload: { model: ctx.modelToUse, system: '(see finalContextPrompt)', messages: '(see conversationMessages)', tools: ctx.hasTools ? ctx.validActiveTools : undefined }
      });
      ctx.debugInfo.openAIResponses.push({
        iteration: stepNum,
        response: {
          text: step.text,
          toolCalls: step.toolCalls,
          toolResults: step.toolResults,
          finishReason: step.finishReason,
          usage: step.usage,
        }
      });
      console.log(`\n========== AI SDK STEP ${stepNum} ==========`);
      console.log(`Model: ${ctx.modelToUse}${ctx.params.overrideModel ? ' (OVERRIDE)' : ''}`);
      console.log(`Finish reason: ${step.finishReason}`);
      if (step.toolCalls.length > 0) {
        console.log(`Tool calls: ${step.toolCalls.map((tc: { toolName: string }) => tc.toolName).join(', ')}`);
      }
      if (step.text) {
        console.log(`Text: ${step.text.substring(0, 200)}${step.text.length > 200 ? '...' : ''}`);
      }
      console.log(`========== END STEP ${stepNum} ==========\n`);
    } : undefined,
  };
}

// Main function to generate AI suggestion (non-streaming)
export async function generateAISuggestion(params: GenerateSuggestionParams): Promise<AISuggestion> {
  const startTime = Date.now();

  try {
    const ctx = await prepareSuggestionContext(params);
    const generateResult = await generateText(buildLLMOptions(ctx));
    return await postProcessSuggestion(generateResult.text, ctx);

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

// Streaming variant: runs pre-processing, returns context + stream options.
// The caller is responsible for calling streamText() and postProcessSuggestion().
export async function prepareStreamingSuggestion(params: GenerateSuggestionParams): Promise<{
  ctx: SuggestionContext;
  streamTextOptions: Parameters<typeof streamText>[0];
}> {
  const ctx = await prepareSuggestionContext(params);
  return {
    ctx,
    streamTextOptions: buildLLMOptions(ctx) as Parameters<typeof streamText>[0],
  };
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