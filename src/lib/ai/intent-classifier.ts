// Two-tier intent classification for AI chat suggestions
// Tier 1: Regex fast-path for obvious intents (0ms, $0)
// Tier 2: LLM classifier with conversation context (~200ms, ~$0.63/month)
// Fallback: regex-only if LLM fails

import { openai } from './openai-client';

export interface IntentClassification {
  intent: string;
  language: 'th' | 'en';
  source: 'regex' | 'llm' | 'llm_fallback_regex';
  classificationTimeMs: number;
}

// All possible intents — used as enum constraint in structured output
const INTENT_ENUM = [
  'booking_request',
  'availability_check',
  'cancellation',
  'modification_request',
  'coaching_inquiry',
  'pricing_inquiry',
  'promotion_inquiry',
  'payment_inquiry',
  'equipment_inquiry',
  'facility_inquiry',
  'location_inquiry',
  'arrival_notification',
  'greeting',
  'general_inquiry',
] as const;

// Configurable classifier model — default to gpt-4o-mini (proven, cheap)
// Can switch to gpt-4.1-nano when available in your region
const CLASSIFIER_MODEL = process.env.INTENT_CLASSIFIER_MODEL || 'gpt-4o-mini';
const CLASSIFIER_TIMEOUT_MS = 3000;

// Compact system prompt (~250 tokens) — kept minimal for speed
const CLASSIFIER_SYSTEM_PROMPT = `Classify the latest customer message for Lengolf, a golf simulator business in Bangkok.

Intents:
- availability_check: Asking if bays/times are available, or ANY follow-up about availability
- booking_request: Wants to make a booking, or confirms after seeing availability ("OK book it", "จองเลย")
- cancellation: Wants to cancel a booking
- modification_request: Wants to reschedule or change a booking
- coaching_inquiry: About coaching, lessons, instructors, or "โปร" meaning coach (not promotion)
- pricing_inquiry: About prices, rates, costs, how much, or asking about price of something discussed earlier
- promotion_inquiry: About promotions, discounts, deals
- payment_inquiry: About payment methods, transfer, QR, cards
- equipment_inquiry: About equipment, clubs, gloves, rentals
- facility_inquiry: About the facility, bay types, simulators, opening hours, photos, venue (only when NOT asking about price or availability)
- location_inquiry: About location, directions, parking, address
- arrival_notification: Customer says they arrived or are coming
- greeting: ONLY for standalone greetings with no other context (Hello, hi, สวัสดี). NOT for follow-up messages.
- general_inquiry: Thanks, OK, acknowledgement, or anything else

CRITICAL RULES:
- Follow-up messages MUST be classified based on the conversation topic, not in isolation.
- "แล้วพรุ่งนี้ล่ะ" / "What about tomorrow?" / "How about Saturday?" after availability discussion = availability_check
- "And the AI bay?" / "แล้ว AI bay ล่ะ" after pricing discussion = pricing_inquiry
- Short Thai messages like "แล้ว...ล่ะ" are follow-ups, NEVER greetings.
- When in doubt between facility_inquiry and pricing_inquiry, check if the previous messages discussed prices.
- "book the rental club" / "rent clubs" / questions about borrowing or renting equipment = equipment_inquiry, NOT booking_request. The word "book" here refers to reserving equipment, not a bay booking.

Respond with JSON only.`;

/**
 * Tier 1: Regex fast-path for high-confidence, unambiguous intents.
 * Only matches explicit keywords that are never ambiguous.
 * Returns null if no confident match — falls through to LLM.
 */
function regexFastPath(message: string): { intent: string; language: 'th' | 'en' } | null {
  const text = message.toLowerCase();
  const isThai = /[\u0E00-\u0E7F]/.test(message);
  const lang: 'th' | 'en' = isThai ? 'th' : 'en';

  // Cancellation is always unambiguous
  if (text.match(/\b(cancel)\b|ยกเลิก|ขอยกเลิก|แคนเซิล/)) {
    return { intent: 'cancellation', language: lang };
  }

  // Explicit booking words (not "book" as in a book to read)
  if (text.match(/\b(book a|book for|make a reservation|reserve a)\b|ขอจอง|จองเลย|จอง.*bay|จอง.*เบย์/)) {
    return { intent: 'booking_request', language: lang };
  }

  // Explicit availability words — but NOT when "lesson/coach" is present (that's coaching)
  if (text.match(/\b(available|availability)\b|ว่างมั้ย|มี.*ว่าง|เบย์.*ว่าง/)) {
    if (!text.match(/\b(lesson|coach|coaching|โค้ช|เรียน|สอน)\b/)) {
      return { intent: 'availability_check', language: lang };
    }
  }

  // Explicit greetings — must be standalone (no substantial content after the greeting)
  if (text.match(/^(hello|hi there|hey|good morning|good afternoon|good evening)[\s!.?]*$/i) || text.match(/^(สวัสดี|หวัดดี)[ค่ะครับคะ\s!.?]*$/)) {
    return { intent: 'greeting', language: lang };
  }

  // No confident match — let LLM handle it
  return null;
}

/**
 * Tier 2: LLM-based classification with conversation context.
 * Uses a cheap model with structured outputs for reliable JSON.
 */
async function llmClassify(
  customerMessage: string,
  recentMessages?: Array<{ content: string; senderType?: string }>,
  signal?: AbortSignal
): Promise<{ intent: string; language: 'th' | 'en' }> {
  // Build conversation context (last 4 messages + current)
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
  ];

  if (recentMessages && recentMessages.length > 0) {
    // Include last 4 messages for context (both user and assistant)
    const recent = recentMessages.slice(-4);
    for (const msg of recent) {
      const role = msg.senderType === 'user' ? 'user' as const : 'assistant' as const;
      messages.push({ role, content: msg.content });
    }
  }

  // Add current message as the final user message
  messages.push({ role: 'user', content: customerMessage });

  const response = await openai.chat.completions.create({
    model: CLASSIFIER_MODEL,
    messages,
    response_format: {
      type: 'json_schema' as const,
      json_schema: {
        name: 'intent_classification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            intent: { type: 'string', enum: [...INTENT_ENUM] },
            language: { type: 'string', enum: ['th', 'en'] },
          },
          required: ['intent', 'language'],
          additionalProperties: false,
        },
      },
    },
    max_tokens: 50,
    temperature: 0,
  // as any: json_schema response_format not fully typed in SDK
  } as any, { signal });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty classifier response');

  return JSON.parse(content);
}

/**
 * Regex-only fallback (used when LLM classifier fails).
 * This is the full regex classifier — more patterns than the fast-path.
 */
function regexFullClassify(message: string): { intent: string; language: 'th' | 'en' } {
  const text = message.toLowerCase();
  const isThai = /[\u0E00-\u0E7F]/.test(message);
  const lang: 'th' | 'en' = isThai ? 'th' : 'en';

  if (text.match(/cancel|ยกเลิก|ขอยกเลิก/)) return { intent: 'cancellation', language: lang };
  if (text.match(/จอง|book|reservation|reserve/)) return { intent: 'booking_request', language: lang };
  if (text.match(/available|ว่าง|มี.*ว่าง|slot/)) return { intent: 'availability_check', language: lang };
  if (text.match(/change|เปลี่ยน|เลื่อน|reschedule/)) return { intent: 'modification_request', language: lang };
  if (text.match(/coach|โค้ช|โปร(?!โม)|เรียน|lesson|สอน|คลาส|class/)) return { intent: 'coaching_inquiry', language: lang };
  if (text.match(/ราคา|price|cost|เท่าไ|how\s*much|rate|ค่า/)) return { intent: 'pricing_inquiry', language: lang };
  if (text.match(/โปรโม|promotion|discount|ส่วนลด|deal|special|แพ็ค|package/)) return { intent: 'promotion_inquiry', language: lang };
  if (text.match(/จ่าย|pay|payment|โอน|transfer|QR|บัตร|card/)) return { intent: 'payment_inquiry', language: lang };
  if (text.match(/อุปกรณ์|equipment|club|ไม้กอล์ฟ|rental|ยืม|glove|ถุงมือ/)) return { intent: 'equipment_inquiry', language: lang };
  if (text.match(/เปิด|ปิด|open|close|hour|เวลา|time|bay|เบย์|simulator|ห้อง/)) return { intent: 'facility_inquiry', language: lang };
  if (text.match(/photo|picture|รูป|ภาพ|venue|สถานที่/)) return { intent: 'facility_inquiry', language: lang };
  if (text.match(/ที่ไหน|where|location|แผนที่|map|parking|จอดรถ/)) return { intent: 'location_inquiry', language: lang };
  if (text.match(/arrived|ถึงแล้ว|มาถึง|ไปถึง/)) return { intent: 'arrival_notification', language: lang };
  if (text.match(/hello|hi|สวัสดี|หวัดดี/)) return { intent: 'greeting', language: lang };

  return { intent: 'general_inquiry', language: lang };
}

/**
 * Main entry point: classify intent using the two-tier approach.
 *
 * Tier 1: Regex fast-path (0ms) — handles unambiguous keywords
 * Tier 2: LLM classifier (~200ms) — handles everything else with context
 * Fallback: Regex-only if LLM fails (timeout, error, etc.)
 */
export async function classifyIntent(
  customerMessage: string,
  recentMessages?: Array<{ content: string; senderType?: string }>
): Promise<IntentClassification> {
  const startTime = Date.now();

  // Tier 1: Regex fast-path for obvious, unambiguous intents
  const fastResult = regexFastPath(customerMessage);
  if (fastResult) {
    return {
      ...fastResult,
      source: 'regex',
      classificationTimeMs: Date.now() - startTime,
    };
  }

  // Tier 2: LLM classifier with conversation context + timeout
  // Use AbortController to actually cancel the HTTP request on timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);

  try {
    const result = await llmClassify(customerMessage, recentMessages, controller.signal);
    clearTimeout(timeout);

    return {
      ...result,
      source: 'llm',
      classificationTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn(`Intent classifier failed (${Date.now() - startTime}ms):`, error instanceof Error ? error.message : error);

    // Fallback: full regex classification
    const fallback = regexFullClassify(customerMessage);
    return {
      ...fallback,
      source: 'llm_fallback_regex',
      classificationTimeMs: Date.now() - startTime,
    };
  }
}
