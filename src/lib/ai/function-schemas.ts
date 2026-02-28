// AI function schemas for Lengolf AI assistant
// Provides both legacy JSON Schema definitions (for function-executor validation)
// and Vercel AI SDK tool() definitions (for generateText)

import { z } from 'zod';
import { tool } from 'ai';
import { functionExecutor, FunctionResult } from './function-executor';
import type { CustomerContext } from './suggestion-service';
import type { SimilarMessage, FAQMatch } from './embedding-service';

// ---------------------------------------------------------------------------
// Legacy JSON Schema definitions — used by function-executor.ts validation
// ---------------------------------------------------------------------------

export interface FunctionSchema {
  name: string;
  description: string;
  strict?: boolean;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties?: boolean;
  };
}

export const AI_FUNCTION_SCHEMAS: FunctionSchema[] = [
  {
    name: 'check_bay_availability',
    description: 'Check real-time bay availability',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        start_time: { type: 'string' },
        duration: { type: 'number', enum: [1, 1.5, 2, 2.5, 3] },
        bay_type: { type: 'string', enum: ['social', 'ai', 'all'] }
      },
      required: ['date', 'start_time', 'duration', 'bay_type'],
      additionalProperties: false
    }
  },
  {
    name: 'get_coaching_availability',
    description: 'Get coach availability for golf lessons',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        coach_name: { type: 'string', enum: ['Boss', 'Ratchavin', 'Noon', 'Min', 'any'] },
        preferred_time: { type: 'string' }
      },
      required: ['date', 'coach_name', 'preferred_time'],
      additionalProperties: false
    }
  },
  {
    name: 'create_booking',
    description: 'Create a bay or coaching booking',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        phone_number: { type: 'string' },
        email: { type: 'string' },
        date: { type: 'string' },
        start_time: { type: 'string' },
        duration: { type: 'number', enum: [1, 1.5, 2, 2.5, 3] },
        number_of_people: { type: 'number' },
        bay_type: { type: 'string', enum: ['social', 'ai'] },
        booking_type: { type: 'string' },
        coach_name: { type: 'string' }
      },
      required: ['customer_name', 'phone_number', 'email', 'date', 'start_time', 'duration', 'number_of_people', 'bay_type', 'booking_type', 'coach_name'],
      additionalProperties: false
    }
  },
  {
    name: 'lookup_booking',
    description: 'Find existing booking details',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: { type: 'string' },
        customer_name: { type: 'string' },
        phone_number: { type: 'string' },
        date: { type: 'string' },
        status: { type: 'string', enum: ['upcoming', 'past', 'cancelled', 'all'] }
      },
      required: ['booking_id', 'customer_name', 'phone_number', 'date', 'status'],
      additionalProperties: false
    }
  },
  {
    name: 'lookup_customer',
    description: 'Get detailed customer information',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        phone_number: { type: 'string' }
      },
      required: ['phone_number'],
      additionalProperties: false
    }
  },
  {
    name: 'cancel_booking',
    description: 'Cancel an existing booking',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: { type: 'string' },
        date: { type: 'string' },
        customer_name: { type: 'string' },
        phone_number: { type: 'string' },
        cancellation_reason: { type: 'string' },
        staff_name: { type: 'string' }
      },
      required: ['booking_id', 'date', 'customer_name', 'phone_number', 'cancellation_reason', 'staff_name'],
      additionalProperties: false
    }
  },
  {
    name: 'modify_booking',
    description: 'Modify an existing booking',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: { type: 'string' },
        date: { type: 'string' },
        start_time: { type: 'string' },
        duration: { type: 'number', enum: [0, 1, 1.5, 2, 2.5, 3] },
        bay_type: { type: 'string', enum: ['', 'social', 'ai'] },
        modification_reason: { type: 'string' }
      },
      required: ['booking_id', 'date', 'start_time', 'duration', 'bay_type', 'modification_reason'],
      additionalProperties: false
    }
  }
];

/**
 * Validate function call parameters (used by function-executor.ts)
 */
export function validateFunctionCall(name: string, parameters: Record<string, any>): {
  valid: boolean;
  error?: string;
} {
  const schema = AI_FUNCTION_SCHEMAS.find(s => s.name === name);

  if (!schema) {
    return { valid: false, error: `Unknown function: ${name}` };
  }

  // Check required parameters
  for (const required of schema.parameters.required) {
    if (!(required in parameters)) {
      return { valid: false, error: `Missing required parameter: ${required}` };
    }
  }

  // Validate specific rules
  if (name === 'check_bay_availability' || name === 'create_booking') {
    const validDurations = [1, 1.5, 2, 2.5, 3];
    if (parameters.duration && !validDurations.includes(parameters.duration)) {
      return { valid: false, error: `Invalid duration: ${parameters.duration}. Must be one of: ${validDurations.join(', ')}. Minimum booking is 1 hour.` };
    }
  }

  if (name === 'create_booking') {
    if (parameters.start_time) {
      const hour = parseInt(parameters.start_time.split(':')[0]);
      if (hour < 9 || hour >= 24) {
        return { valid: false, error: `Invalid start_time: ${parameters.start_time}. Must be between 09:00 and 23:00` };
      }
    }
    if (parameters.bay_type === 'ai' && parameters.number_of_people > 2) {
      return { valid: false, error: 'AI bay supports maximum 2 players' };
    }
    if (parameters.bay_type === 'social' && parameters.number_of_people > 5) {
      return { valid: false, error: 'Social bay supports maximum 5 players' };
    }
  }

  if (name === 'modify_booking') {
    if (!parameters.booking_id || parameters.booking_id === '') {
      return { valid: false, error: 'booking_id is required and cannot be empty' };
    }
    const hasDateChange = parameters.date && parameters.date !== '';
    const hasTimeChange = parameters.start_time && parameters.start_time !== '';
    const hasDurationChange = parameters.duration && parameters.duration > 0;
    const hasBayTypeChange = parameters.bay_type && parameters.bay_type !== '';
    if (!hasDateChange && !hasTimeChange && !hasDurationChange && !hasBayTypeChange) {
      return { valid: false, error: 'At least one field must be modified (date, start_time, duration, or bay_type)' };
    }
    if (hasTimeChange) {
      const hour = parseInt(parameters.start_time.split(':')[0]);
      if (hour < 9 || hour >= 24) {
        return { valid: false, error: `Invalid start_time: ${parameters.start_time}. Must be between 09:00 and 23:00` };
      }
    }
    if (hasDurationChange) {
      const validDurations = [1, 1.5, 2, 2.5, 3];
      if (!validDurations.includes(parameters.duration)) {
        return { valid: false, error: `Invalid duration: ${parameters.duration}. Must be one of: ${validDurations.join(', ')}. Minimum booking is 1 hour.` };
      }
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Intent → tool name mapping (unchanged)
// ---------------------------------------------------------------------------

const INTENT_TOOLS: Record<string, string[]> = {
  availability_check: ['check_bay_availability', 'get_customer_context', 'search_knowledge'],
  booking_request: ['check_bay_availability', 'create_booking', 'get_customer_context'],
  cancellation: ['cancel_booking', 'lookup_booking', 'get_customer_context'],
  modification_request: ['modify_booking', 'lookup_booking', 'get_customer_context'],
  coaching_inquiry: ['get_coaching_availability', 'get_customer_context', 'search_knowledge'],
  pricing_inquiry: ['search_knowledge'],
  promotion_inquiry: ['search_knowledge'],
  facility_inquiry: ['search_knowledge'],
  equipment_inquiry: ['search_knowledge'],
  payment_inquiry: ['search_knowledge'],
  location_inquiry: ['search_knowledge'],
  general_inquiry: ['search_knowledge', 'get_customer_context'],
  greeting: ['get_customer_context'], // Optional — AI can personalize greetings for known customers
  // arrival_notification: no tools
};

/**
 * Get tool name strings for a given intent (used as `activeTools` in generateText).
 * Returns empty array for intents with no tool support (pure text response).
 */
export function getActiveToolsForIntent(intent: string): string[] {
  return INTENT_TOOLS[intent] || [];
}

// ---------------------------------------------------------------------------
// Shared execution state — populated by tool execute() functions,
// inspected by stopWhen condition and post-loop result extraction
// ---------------------------------------------------------------------------

export interface ToolExecutionState {
  lastFunctionCalled?: string;
  lastFunctionResult?: FunctionResult;
  requiresApproval: boolean;
  approvalMessage?: string;
  functionCallHistory: string[];
  // Set by on-demand context tools (Phase 2)
  customerContext?: CustomerContext;
  similarMessages?: SimilarMessage[];
  faqMatches?: FAQMatch[];
}

/**
 * Callbacks for on-demand context loading.
 * Passed to createAITools so context tools can fetch data lazily.
 */
export interface ContextProviders {
  getCustomerContext: (customerId: string) => Promise<CustomerContext | undefined>;
  searchKnowledge: (query: string) => Promise<{ faqMatches: FAQMatch[]; similarMessages: SimilarMessage[] }>;
}

export function createToolExecutionState(): ToolExecutionState {
  return {
    requiresApproval: false,
    functionCallHistory: [],
  };
}

// ---------------------------------------------------------------------------
// Vercel AI SDK tool definitions with Zod schemas
// ---------------------------------------------------------------------------

/**
 * Helper: execute a function via the legacy executor, update shared state,
 * and return the model-visible result.
 */
async function executeAndTrack(
  state: ToolExecutionState,
  functionName: string,
  parameters: Record<string, any>,
  customerId?: string,
): Promise<string> {
  // If a prior tool in this step already requires approval, skip execution
  if (state.requiresApproval) {
    console.log(`  ⏭ Skipping: ${functionName} (approval already pending)`);
    return JSON.stringify({ skipped: true, reason: 'Approval pending for prior tool call' });
  }

  console.log(`  → Executing: ${functionName}`, parameters);
  state.functionCallHistory.push(functionName);

  const result = await functionExecutor.execute(
    { name: functionName, parameters },
    customerId,
  );

  state.lastFunctionCalled = functionName;
  state.lastFunctionResult = result;

  if (result.requiresApproval) {
    state.requiresApproval = true;
    state.approvalMessage = result.approvalMessage;
  }

  console.log(`  ✓ Completed: ${functionName}`, result.success ? 'success' : 'error');

  // Return stringified data for the model (matches legacy behavior)
  return JSON.stringify(result.data || result.error || {});
}

// ---------------------------------------------------------------------------
// Formatting helpers for context tools
// ---------------------------------------------------------------------------

function formatCustomerContextForTool(ctx: CustomerContext): string {
  const hasContactInfo = ctx.name && ctx.name !== 'Unknown' &&
                         ctx.phone && ctx.phone !== 'Not provided';
  const isNewCustomer = !ctx.id || (ctx.totalVisits || 0) === 0;

  let label = '';
  if (!hasContactInfo) {
    label = '⚠️  NEW CUSTOMER (not in database yet - will need name & phone)\n';
  } else if (isNewCustomer) {
    label = '✅ CUSTOMER INFO AVAILABLE (first-time customer)\n';
  } else {
    label = '✅ EXISTING CUSTOMER\n';
  }

  let result = `CUSTOMER INFORMATION:\n${label}`;
  result += `- Name: ${ctx.name || 'Unknown'}\n`;
  result += `- Phone: ${ctx.phone || 'Not provided'}\n`;
  result += `- Total visits: ${ctx.totalVisits || 0}\n`;
  result += `- Lifetime value: ฿${ctx.lifetimeValue || 0}\n`;
  result += `- Preferred language: ${ctx.language || 'auto'}\n\n`;

  if (ctx.activePackages && ctx.activePackages.count > 0) {
    result += `ACTIVE PACKAGES:\n`;
    if (ctx.activePackages.packages && ctx.activePackages.packages.length > 0) {
      for (const pkg of ctx.activePackages.packages) {
        const hours = pkg.type === 'Unlimited' ? 'Unlimited' : `${pkg.remainingHours}h`;
        const expiry = pkg.expirationDate ? ` (expires ${pkg.expirationDate})` : '';
        result += `- ${pkg.name}: ${hours} remaining${expiry}\n`;
      }
    } else {
      result += `- ${ctx.activePackages.count} package(s) active\n`;
      result += `- ${ctx.activePackages.totalHoursRemaining} hours remaining total\n`;
    }
    result += '\n';
  }

  if (ctx.upcomingBookings && ctx.upcomingBookings.count > 0) {
    result += `UPCOMING BOOKINGS (${ctx.upcomingBookings.count} total):\n`;
    const next = ctx.upcomingBookings.nextBooking;
    if (next) {
      result += `- NEXT: ${next.date} at ${next.time} (${next.bayType} bay)`;
      if (next.isCoaching && next.coachName) {
        result += ` - COACHING with ${next.coachName}`;
      }
      result += '\n';
    }
    result += '\n';
  }

  if (ctx.recentBookings && ctx.recentBookings.length > 0) {
    result += `RECENT BOOKINGS (last ${ctx.recentBookings.length}):\n`;
    ctx.recentBookings.forEach((booking, i) => {
      result += `${i + 1}. ${booking.date} at ${booking.time} (${booking.bayType})`;
      if (booking.isCoaching && booking.coachName) {
        result += ` - COACHING with ${booking.coachName}`;
      }
      if (booking.packageName) {
        result += ` [${booking.packageName}]`;
      }
      result += ` (${booking.status})\n`;
    });
    result += '\n';
  }

  return result;
}

function formatKnowledgeForTool(
  faqMatches: FAQMatch[],
  similarMessages: SimilarMessage[],
): string {
  let result = '';

  if (faqMatches.length > 0) {
    result += `FAQ KNOWLEDGE BASE (use these answers when relevant):\n`;
    faqMatches.forEach((faq, i) => {
      result += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n`;
    });
    result += '\n';
  }

  if (similarMessages.length > 0) {
    result += `SIMILAR PAST CONVERSATIONS (for reference):\n`;
    result += similarMessages
      .slice(0, 3)
      .map((msg, i) => `Example ${i + 1}:\nCustomer: ${msg.content}\nStaff Response: ${msg.responseUsed}\n(Similarity: ${(msg.similarityScore * 100).toFixed(1)}%)`)
      .join('\n\n');
    result += '\n\n';
  }

  if (!result) {
    result = 'No relevant FAQ entries or similar past conversations found.';
  }

  return result;
}

// ---------------------------------------------------------------------------
// Vercel AI SDK tool definitions with Zod schemas
// ---------------------------------------------------------------------------

/**
 * Create Vercel AI SDK tool definitions.
 * The returned tools record is passed to generateText({ tools }).
 *
 * @param state  Mutable execution state — populated during tool calls
 * @param customerId  Optional customer ID for package auto-selection
 * @param contextProviders  Optional callbacks for on-demand context tools
 */
export function createAITools(
  state: ToolExecutionState,
  customerId?: string,
  contextProviders?: ContextProviders,
) {
  // Context tools — only included when providers are available
  const contextTools: Record<string, any> = {};

  if (contextProviders && customerId) {
    contextTools.get_customer_context = tool({
      description: `Get the current customer's profile, active packages, upcoming bookings, and recent booking history.

Use this when:
- Customer asks about their packages, hours remaining, or expiration
- Customer wants to make/cancel/modify a booking (you need their name and phone)
- Customer asks about their upcoming or past bookings
- You need to identify the customer's preferences or history

Do NOT use for:
- Simple greetings or thank-you messages
- General questions about pricing, hours, or location`,
      inputSchema: z.object({}),
      execute: async () => {
        console.log(`  → Context tool: get_customer_context (id=${customerId})`);
        state.functionCallHistory.push('get_customer_context');
        try {
          const ctx = await contextProviders.getCustomerContext(customerId);
          if (!ctx) {
            return 'Customer not found or no data available.';
          }
          state.customerContext = ctx;
          return formatCustomerContextForTool(ctx);
        } catch (error) {
          console.error('Error in get_customer_context tool:', error);
          return 'Error retrieving customer data. Please proceed without customer context.';
        }
      },
    });
  }

  if (contextProviders) {
    contextTools.search_knowledge = tool({
      description: `Search the FAQ knowledge base and past staff conversations for answers to customer questions.

Use this when:
- Customer asks about pricing, packages, or promotions
- Customer asks about facilities, equipment, or services
- Customer asks about operating hours, location, or policies
- Customer asks about coaching or lessons
- You need reference answers for any business-related question

Do NOT use for:
- Simple greetings or thank-you messages
- Booking actions (use booking tools instead)
- Questions already answered in the conversation`,
      inputSchema: z.object({
        query: z.string().describe('The search query — use the customer\'s question or key topic.'),
      }),
      execute: async (args: { query: string }) => {
        console.log(`  → Context tool: search_knowledge`, args);
        state.functionCallHistory.push('search_knowledge');
        try {
          const { faqMatches, similarMessages } = await contextProviders.searchKnowledge(args.query);
          state.faqMatches = faqMatches;
          state.similarMessages = similarMessages;
          return formatKnowledgeForTool(faqMatches, similarMessages);
        } catch (error) {
          console.error('Error in search_knowledge tool:', error);
          return 'Error searching knowledge base. Please answer based on your existing knowledge.';
        }
      },
    });
  }

  return {
    // On-demand context tools
    ...contextTools,

    // Action tools
    check_bay_availability: tool({
      description: `Check real-time bay availability for Social bays (up to 5 players) or AI bay (1-2 players with analytics).

⚠️ CRITICAL: ALWAYS call this function when customer asks about availability, slots, or free times.

Use this when:
- Customer asks "available?", "ว่างมั้ย", "do you have any slots?", "free tonight?", "open tomorrow?"
- Customer asks "availability for tonight", "any time available", "when are you free"
- Customer wants to know free time slots without booking yet
- NEVER respond conversationally without calling this function for availability questions

Do NOT use when:
- Customer already confirmed booking (e.g., "book it", "3pm please!" after availability shown)
- Customer is asking general questions about facilities ("Do you have gloves?")`,
      inputSchema: z.object({
        date: z.string().describe('Date in YYYY-MM-DD format. Use today\'s date if not specified.'),
        start_time: z.string().describe('Preferred start time in HH:00 or HH:30 format (e.g., "14:00", "14:30"). Use empty string "" for general availability. CRITICAL: "2-4pm available?" is asking about TIME RANGE (what slots exist between 2-4pm), NOT a 2-hour booking - use start_time="" to check that range.'),
        duration: z.number().describe('Booking duration in hours. Must be 1, 1.5, 2, 2.5, or 3. Default: 1. Minimum booking is 1 hour. ONLY use duration=2 if customer explicitly says "2 hours" or "2hr". For "2-4pm available?", use duration=1 (they want to see available slots in that time range, not book 2 hours).'),
        bay_type: z.enum(['social', 'ai', 'all']).describe('Bay type: "social" (up to 5 players), "ai" (1-2 players), or "all". Default: "all"'),
      }),
      execute: async (args) => executeAndTrack(state, 'check_bay_availability', args, customerId),
    }),

    get_coaching_availability: tool({
      description: `Get coach availability for golf lessons. Returns available time slots for coaches (Boss/Ratchavin, Noon, Min).

Use this when:
- Customer asks about coaching: "โปรว่างมั้ย", "is coach available", "lesson available?"
- Customer mentions coach names: "Boss", "Min", "Noon", "โค้ช"
- Customer has coaching pattern in RECENT BOOKINGS and asks about availability

Do NOT use when:
- Customer wants regular bay (no coaching mentioned)
- Customer is asking about pricing only`,
      inputSchema: z.object({
        date: z.string().describe('Date in YYYY-MM-DD format for checking coach availability'),
        coach_name: z.enum(['Boss', 'Ratchavin', 'Noon', 'Min', 'any']).describe('Specific coach name or "any" to show all available coaches. Note: Boss and Ratchavin are the same person.'),
        preferred_time: z.string().describe('Preferred time in HH:00 format (e.g., "14:00"). Use empty string "" to show full day availability.'),
      }),
      execute: async (args) => executeAndTrack(state, 'get_coaching_availability', args, customerId),
    }),

    create_booking: tool({
      description: `Create a bay or coaching booking. Requires staff approval before execution.

🚨 CRITICAL: PHONE NUMBER IS MANDATORY - Check before calling this function! 🚨

Use this when:
- Customer confirms time after availability check: "3.30pm please!", "Confirm 19:00", "book it"
- Customer directly requests booking: "I want to book 2pm", "ขอจอง 14:00", "reserve tomorrow"
- Customer says booking words: "book", "จอง", "reserve", "reservation"

Do NOT use when:
- Customer only asks "available?" without confirming (use check_bay_availability first)
- Customer is asking general questions
- Phone number is missing or empty (ask for it first!)

Customer info handling - READ CAREFULLY:
1. Check CUSTOMER INFORMATION section for name AND phone
2. If BOTH name and phone are present (not "Unknown", not "Not provided", not empty):
   → Use exact name and phone from context
   → Call this function
3. If EITHER name OR phone is missing:
   → DO NOT call this function
   → Ask customer for the missing information first
   → Only call function after customer provides both name and phone

Validation before calling:
- customer_name must NOT be: "", "Unknown", or empty
- phone_number must NOT be: "", "Not provided", or empty
- If validation fails → Ask for missing info instead of calling function

Defaults if not specified: 1 hour duration, 1 player, social bay`,
      inputSchema: z.object({
        customer_name: z.string().describe('Customer full name. CRITICAL: Must be a real name (not "Unknown", not empty). If CUSTOMER INFORMATION shows a real name, USE IT. If name is missing, DO NOT call this function - ask customer for name first.'),
        phone_number: z.string().describe('Customer phone number (MANDATORY - never empty!). CRITICAL: Must be a real phone number (not "Not provided", not empty, not ""). If CUSTOMER INFORMATION shows a real phone, USE IT. If phone is missing or empty, DO NOT call this function - ask customer for phone number first.'),
        email: z.string().describe('Customer email address. Use "info@len.golf" if customer does not provide email.'),
        date: z.string().describe('Booking date in YYYY-MM-DD format'),
        start_time: z.string().describe('Start time in HH:00 format (must be between 09:00 and 23:00)'),
        duration: z.number().describe('Duration in hours. Must be 1, 1.5, 2, 2.5, or 3. Default: 1. Minimum booking is 1 hour.'),
        number_of_people: z.number().describe('Number of players: 1-5 for Social bay, 1-2 for AI bay. Default: 1'),
        bay_type: z.enum(['social', 'ai']).describe('"social" for Social bays (up to 5 players), "ai" for AI bay (1-2 players). Default: "social"'),
        booking_type: z.string().describe('Either "Bay Reservation" or "Coaching (CoachName)" (e.g., "Coaching (Min)"). Default: "Bay Reservation"'),
        coach_name: z.string().describe('Coach name if booking_type is coaching: Boss, Ratchavin, Noon, or Min. Use empty string "" if not coaching.'),
      }),
      execute: async (args) => executeAndTrack(state, 'create_booking', args, customerId),
    }),

    lookup_booking: tool({
      description: `Find existing booking details for a customer.

Use this when:
- Customer asks "what's my booking?", "ที่จองไว้", "my reservation?"
- Customer asks about booking on specific date not shown in UPCOMING BOOKINGS
- Customer asks about past or cancelled bookings

Do NOT use when:
- Booking is already shown in UPCOMING BOOKINGS section in context
- Customer is making a NEW booking (use create_booking instead)`,
      inputSchema: z.object({
        booking_id: z.string().describe('Specific booking ID if customer provides it. Use empty string "" if not provided.'),
        customer_name: z.string().describe('Customer name to search bookings. Use empty string "" if not provided.'),
        phone_number: z.string().describe('Phone number to search bookings. Use empty string "" if not provided.'),
        date: z.string().describe('Specific date to search in YYYY-MM-DD format. Use empty string "" if not provided.'),
        status: z.enum(['upcoming', 'past', 'cancelled', 'all']).describe('Filter by booking status. Default "upcoming".'),
      }),
      execute: async (args) => executeAndTrack(state, 'lookup_booking', args, customerId),
    }),

    lookup_customer: tool({
      description: `Get detailed customer information including package balances, expiration dates, and booking history.

Use this when:
- Customer asks "how many hours left?", "เหลือกี่ชั่วโมง", "package balance?"
- Customer asks "what packages do I have?", "มีแพ็คเกจอะไรบ้าง"
- Customer asks about package expiration

Do NOT use when:
- Basic customer info already in context is sufficient
- Customer is asking about booking (not packages)`,
      inputSchema: z.object({
        phone_number: z.string().describe('Customer phone number to lookup. Use empty string "" if customer is already identified in context.'),
      }),
      execute: async (args) => executeAndTrack(state, 'lookup_customer', args, customerId),
    }),

    cancel_booking: tool({
      description: `Cancel an existing booking. Requires staff approval before execution.

Use this when:
- Customer explicitly requests cancellation with keywords:
  * English: "cancel", "cancel my booking", "can't make it", "won't make it", "need to cancel", "have to cancel", "can't come"
  * Thai: "ยกเลิก", "ขอยกเลิก", "ยกเลิกการจอง", "ยกเลิกนะ", "ยกเลิกครับ", "ยกเลิกค่ะ"
- Customer says "cancel on [day/date]" - even if casual like "Bro gotta cancel on Wednesday"
- Message contains explicit cancellation intent regardless of politeness or extra words

Do NOT use when:
- Customer is asking IF they can cancel (just answer yes)
- Customer already said "thank you" after cancellation was confirmed
- Booking is already cancelled (check UPCOMING BOOKINGS context first)
- Customer mentions cancellation policy as a question (not requesting actual cancellation)

Workflow:
1. First check UPCOMING BOOKINGS in context above
2. If booking is listed there, you have enough info to cancel it
3. If booking NOT in UPCOMING BOOKINGS, use lookup_booking first to find it
4. Then call this function with the booking details

Required information:
- Booking must be identified either by:
  * booking_id (from UPCOMING BOOKINGS or lookup_booking result), OR
  * date + customer info (will search for booking automatically)
- Staff member name (for audit trail)
- Optional cancellation reason`,
      inputSchema: z.object({
        booking_id: z.string().describe('Booking ID to cancel. Use empty string "" if not available (will search by date + customer info instead).'),
        date: z.string().describe('Booking date in YYYY-MM-DD format. Required if booking_id not provided. Use empty string "" if booking_id is provided.'),
        customer_name: z.string().describe('Customer name from context. Use empty string "" if not available or if booking_id is provided.'),
        phone_number: z.string().describe('Customer phone number from context. Use empty string "" if not available or if booking_id is provided.'),
        cancellation_reason: z.string().describe('Reason for cancellation if customer provided it. Use empty string "" if not provided. Examples: "Schedule conflict", "Customer requested", "Emergency"'),
        staff_name: z.string().describe('Name of staff member processing cancellation. Use "AI Assistant" as default.'),
      }),
      execute: async (args) => executeAndTrack(state, 'cancel_booking', args, customerId),
    }),

    modify_booking: tool({
      description: `Modify an existing booking (reschedule time/date, change duration, or update details). Requires staff approval before execution.

Use this when:
- Customer wants to reschedule/change booking time:
  * English: "change my booking to 3pm", "can I move it to tomorrow?", "reschedule to Friday"
  * Thai: "ขอเปลี่ยนเวลา", "ย้ายไปวันศุกร์", "เลื่อนไปบ่าย 3"
- Customer wants to change booking duration: "can I extend to 2 hours?", "make it 1.5 hours instead"
- Customer wants to change bay type: "switch to AI bay", "change to social bay"
- Message contains modification intent with specific new details

Do NOT use when:
- Customer is just asking IF they can modify (answer yes, don't call function)
- Customer wants to cancel entirely (use cancel_booking instead)
- Booking doesn't exist in UPCOMING BOOKINGS (use lookup_booking first)
- Customer hasn't specified what to change to

Workflow:
1. First check UPCOMING BOOKINGS in context to find the booking
2. Identify what customer wants to change (date, time, duration, bay_type)
3. Call this function with booking_id and ONLY the fields that need to change
4. Function will check availability before requesting staff approval

Required information:
- booking_id from UPCOMING BOOKINGS context
- At least ONE field to modify (date, start_time, duration, or bay_type)
- modification_reason helps staff understand why`,
      inputSchema: z.object({
        booking_id: z.string().describe('Booking ID to modify (e.g., "BK123456"). Get this from UPCOMING BOOKINGS in context. Cannot be empty.'),
        date: z.string().describe('New booking date in YYYY-MM-DD format. Use empty string "" if not changing date.'),
        start_time: z.string().describe('New start time in HH:00 or HH:30 format (e.g., "14:00", "14:30"). Use empty string "" if not changing time.'),
        duration: z.number().describe('New duration in hours. Must be 0, 1, 1.5, 2, 2.5, or 3. Minimum booking is 1 hour. Use 0 if not changing duration.'),
        bay_type: z.enum(['', 'social', 'ai']).describe('Change to different bay type: "social" (up to 5 players) or "ai" (1-2 players). Use empty string "" if not changing bay type.'),
        modification_reason: z.string().describe('Brief reason for modification. Use empty string "" if not provided. Examples: "Time conflict", "Customer requested earlier time", "Duration change"'),
      }),
      execute: async (args) => executeAndTrack(state, 'modify_booking', args, customerId),
    }),
  };
}

/** Type of the tools record returned by createAITools */
export type AITools = ReturnType<typeof createAITools>;

/**
 * StopCondition for generateText: stop when a tool execution requires staff approval.
 */
export function stopOnApproval(state: ToolExecutionState) {
  return () => state.requiresApproval;
}
