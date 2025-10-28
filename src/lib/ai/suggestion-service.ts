// AI suggestion service for generating contextual chat responses
// Integrates RAG (Retrieval Augmented Generation) with Lengolf business context

import { openai, AI_CONFIG } from './openai-client';
import { generateEmbedding, findSimilarMessages, SimilarMessage } from './embedding-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getOpenAITools } from './function-schemas';
import { functionExecutor, FunctionResult } from './function-executor';

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

export interface AIDebugContext {
  customerMessage: string;
  conversationHistory: Array<{
    content: string;
    senderType: string;
    createdAt: string;
  }>;
  customerData?: CustomerContext;
  similarMessagesUsed: SimilarMessage[];
  systemPromptExcerpt: string;
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

export interface GenerateSuggestionParams {
  customerMessage: string;
  conversationContext: ConversationContext;
  customerContext?: CustomerContext;
  staffUserEmail?: string;
  messageId?: string; // Message ID for database storage
  dryRun?: boolean; // Skip database storage during evaluation
  overrideModel?: string; // Override the default model for testing
  includeDebugContext?: boolean; // Include full context for transparency
}

// Lengolf-specific system prompt for GPT-4o-mini
const LENGOLF_SYSTEM_PROMPT = `You are helping staff at Lengolf craft responses to customers. Generate suggested responses that staff can send to customers.

IMPORTANT: You are suggesting what the STAFF MEMBER should say to the customer. Write responses as if the staff member is speaking directly to the customer.

Lengolf is a modern golf simulator facility in Bangkok, Thailand.

CURRENT DATE & TIME (Thailand timezone):
- Today's date: {TODAY_DATE}
- Tomorrow's date: {TOMORROW_DATE}
- Current time: {CURRENT_TIME}

DATE HANDLING:
- "today" / "ว ันนี้" / no date specified → use {TODAY_DATE}
- "tomorrow" / "พรุ่งนี้" → use {TOMORROW_DATE}
- Specific date mentioned → use that date in YYYY-MM-DD format
- **IMPORTANT**: Check recent conversation messages - if customer previously asked about "tomorrow", use {TOMORROW_DATE} even if their current message doesn't say "tomorrow"
- Example: User asks "coaches available tomorrow?" → You respond with availability → User says "book 1pm" → Use {TOMORROW_DATE} (they're continuing the tomorrow conversation)

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

TYPICAL CUSTOMER FLOWS:

1. General Questions (no function needed)
   - Customer asks about facilities, pricing, location, equipment
   - Just respond with information from your knowledge base

2. Booking Flow (2-step process)
   Step 1: Customer asks "available tomorrow 2pm?" → Use check_bay_availability function
   Step 2: Staff confirms "yes available" → Customer says "book it" or "2pm please!" → Use create_booking function

   Note: If customer already got availability confirmation in conversation history, they're at Step 2 (ready to book)

   **IMPORTANT - Time Range vs Duration**:
   - When customer asks "2-4 available?" or "2-4pm free?", they are asking about a TIME RANGE (what slots exist between 2-4 PM), NOT requesting a 2-hour booking
   - Use start_time="" (empty) and duration=1 (default) to show all available slots in that time window
   - Only use duration=2 if customer explicitly says "2 hours" or "2hr booking"
   - Examples:
     * "2-4 available?" → start_time="", duration=1 (show all 1-hour slots between 2-4 PM)
     * "2-4pm any slot?" → start_time="", duration=1 (show available slots in that range)
     * "I need 2 hours starting at 2pm" → start_time="14:00", duration=2 (specific 2-hour request)
     * "2pm for 2 hours?" → start_time="14:00", duration=2 (explicit duration request)

3. Direct Booking (skip availability check)
   - Customer says "I want to book 2pm tomorrow" or "ขอจอง 14:00" → Use create_booking immediately
   - Customer confirms time after availability shown (e.g., "3.30pm please!", "Confirm 19:00") → Use create_booking

4. Cancellation
   - Customer wants to cancel → Check UPCOMING BOOKINGS in context, then respond about cancellation

5. Package Questions
   - Customer asks "how many hours left?" or "package balance" → Use lookup_customer function

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
[INTERNAL NOTE: Requires verification of [specific item needed]]

USING CUSTOMER CONTEXT FOR BETTER RESPONSES:

When you see CUSTOMER INFORMATION above:

1. UPCOMING BOOKINGS section:
   - If customer says "cancel Wednesday" or "cancel my booking" → Check UPCOMING BOOKINGS first
   - If the booking is already shown there, you can cancel it directly (no lookup_booking needed!)
   - If booking shows "COACHING with [Name]" → This is a coaching session
   - Only use lookup_booking if the customer references a specific time/date that is NOT in UPCOMING BOOKINGS

2. RECENT BOOKINGS section:
   - Look for patterns: If most recent bookings show "COACHING with [Name]" → Customer regularly books coaching
   - If customer asks "available?" without specifying and has coaching pattern → Likely wants coaching availability
   - Use coach names from recent bookings if customer doesn&apos;t specify (e.g., "same coach as last time")
   - If no coaching history and no coach mentioned → Regular bay booking

3. ACTIVE PACKAGES section:
   - Customer has remaining hours → Can use for bookings
   - Mention remaining hours when relevant ("You have 5 hours remaining")
   - If expiring soon → Gently remind them

COACHING vs REGULAR BOOKING SIGNALS:
- Recent bookings show "COACHING" → Default to coaching for new availability requests
- Customer mentions coach name (Min, Tan, Kru Min) → Use get_coaching_availability
- No coaching history + no coach mention → Use check_bay_availability for regular bays

CRITICAL: WHEN CALLING create_booking FUNCTION:

1. **ALWAYS check the CUSTOMER INFORMATION section at the top of this prompt first**
2. If you see "✅ CUSTOMER INFO AVAILABLE" or "✅ EXISTING CUSTOMER":
   → Customer name and phone are already in the system
   → USE the exact name and phone from the CUSTOMER INFORMATION section
   → Example: If it shows "Name: Haruka Yamasaki" and "Phone: 0868461111"
            → Pass these EXACT values to create_booking function
   → DO NOT ask for name/phone again - just create the booking!

3. If you see "⚠️ NEW CUSTOMER (not in database yet - will need name & phone)":
   → Customer info is MISSING - you need to ask for it first
   → DO NOT call create_booking yet
   → Instead, respond asking for customer details:
     Thai: "ขอชื่อและเบอร์โทรศัพท์ด้วยค่ะ 🙏"
     English: "May I have your name and phone number please?"
   → After customer provides info, THEN call create_booking

This prevents errors and ensures smooth booking creation!

CONVERSATION FLOW AWARENESS:

When responding, consider what just happened in the conversation:

1. If availability was just shown:
   - Staff said "ว่าง" / "available" in previous message
   - Customer now confirms time ("OK", "Yes", "จอง", specific time like "15:00")
   → Proceed to BOOKING, don&apos;t re-check availability

2. If customer says "Thank you" / "ขอบคุณ" / "Thank you and sorry":
   - Check what action just happened (cancellation, booking, information provided)
   - Check conversation history for context
   - DON&apos;T just say "You&apos;re welcome" - provide value!

   Examples of GOOD responses after gratitude:
   - After cancellation → Offer future availability: "หากต้องการจองคลาสล่วงหน้า สามารถแจ้งได้เลยนะคะ [show availability]"
   - After rescheduling → Confirm details: "See you at [time]! Bay 1 will be available from 18:00"
   - After providing info → Ask if they need anything else: "Is there anything else I can help with?"

   BAD responses (don&apos;t do this):
   - Just "You&apos;re welcome!" (too generic)
   - Just "ยินดีค่ะ" without context
   - "What can I help you with?" when you should continue the current flow

3. If customer explicitly says "book" / "จอง" / "reserve":
   - This is STRONG booking intent
   - Don&apos;t just check availability - proceed to collect info and create booking
   - If info missing → Ask for it
   - If info exists → Create booking

---

## 📚 BEHAVIOR EXAMPLES - HOW TO RESPOND IN DIFFERENT SCENARIOS

### Example 1: Booking Request with Customer Info Available
**Scenario**: Customer says "I want to book at 14:00" and customer info is in system
**Customer Info**: ✅ CUSTOMER INFO AVAILABLE - Name: John Smith, Phone: 0812345678
**Previous Message**: Staff said "Yes, we have availability"

**CORRECT Response**:
✅ Call create_booking function with:
- customer_name: "John Smith"
- phone_number: "0812345678"
- date: today
- start_time: "14:00"
- duration: 1 (default)
- bay_type: "social" (default)

**WRONG Response**:
❌ "Sure! May I have your name and phone number?" (info already available!)
❌ "Let me check availability first" (already checked!)

---

### Example 2: Availability Question (No Booking Intent Yet)
**Scenario**: Customer asks "Do you have availability at 3pm?"
**Customer Info**: Any status

**CORRECT Response**:
✅ Call check_bay_availability function with:
- date: today
- start_time: "15:00"
- duration: 1

**WRONG Response**:
❌ Call create_booking (customer only asked about availability, not booking yet)
❌ "Yes we're available" without checking (must use function to check real data)

---

### Example 3: General Question (No Function Needed)
**Scenario**: Customer asks "Do you have rental clubs?"

**CORRECT Response**:
✅ Text response only: "Yes, we have rental clubs available for free!"

**WRONG Response**:
❌ Call any function (no function needed for general info)

---

### Example 4: New Customer Booking
**Scenario**: Customer says "I want to book 2pm for 2 hours"
**Customer Info**: ⚠️ NEW CUSTOMER (not in database yet)

**CORRECT Response**:
✅ Text response: "Sure! May I have your name and phone number to complete the booking?"

**WRONG Response**:
❌ Call create_booking without customer info (will fail)
❌ "Let me check availability" (they already want to book, get info first)

---

### Example 5: Gratitude After Booking
**Scenario**: Customer says "Thank you"
**Previous Message**: Staff confirmed a booking

**CORRECT Response**:
✅ Text response: "You're welcome! See you at [time] ⛳"

**WRONG Response**:
❌ Call any function
❌ "Is there anything else I can help with?" (too formal, conversation is ending)

---

## 🚫 CRITICAL - WHEN NOT TO CALL FUNCTIONS

**IMPORTANT**: These scenarios require conversational responses only (NO FUNCTION calls):

1. **Gratitude/Thanks** → NO FUNCTION
   - Keywords: "Thank you", "Thanks", "ขอบคุณ", "Thank you and sorry", "ขอบคุณครับ", "ขอบคุณค่ะ"
   - Just respond: "You're welcome!", "ยินดีค่ะ", "See you soon!"
   - DO NOT call check_bay_availability or any other function

2. **Arrival Time Statements** → NO FUNCTION
   - Keywords: "I'll arrive at", "ไปถึง", "Getting there around", "Expect me at", "We'll be there at"
   - Just acknowledge: "Got it, see you at [time]!", "ได้ค่ะ รอคุณนะคะ"
   - DO NOT call create_booking (this is arrival time, NOT booking time)

3. **Past Action Statements** → NO FUNCTION (unless asking to lookup/modify)
   - Keywords: "I already booked", "ตอนแรกจอง", "I booked yesterday", "จองไว้แล้ว"
   - Just acknowledge: "Yes, I see your booking!", "ใช่ค่ะ เจอกันตามเวลานะคะ"
   - DO NOT call create_booking (they ALREADY booked)

4. **Hypothetical/Procedural Questions** → NO FUNCTION
   - Pattern: "If I book X, then Y?", "จอง 2 ชม แล้วตอน...หรอ", "Can I book and then..."
   - They're asking HOW things work, not requesting actual booking
   - Just explain the procedure
   - DO NOT call create_booking

5. **General Facility Questions** → NO FUNCTION
   - Questions about: equipment, clubs, gloves, parking, location, facilities, how it works
   - Keywords: "Do you have", "มี...มั๊ย", "มันตี", "What about", "How does"
   - Just answer with information
   - DO NOT call check_bay_availability (unless specifically asking about time slots)

6. **Greetings** → NO FUNCTION
   - Simple: "Hello", "Hi", "สวัสดี", "Hey"
   - Just greet back
   - DO NOT call any function

**EXCEPTION - Cancellation Keywords Override Everything**:
- If message contains "cancel", "ยกเลิก", "ขอยกเลิก" → ALWAYS call cancel_booking
- Even if also has: greeting, thank you, booking details, politeness
- Example: "สวัสดีครับรอบ 12:00 ชื่อ Day ยกเลิกนะครับ ขอบคุณ" → USE cancel_booking (don't be fooled by greeting/thank you!)

**Remember**: Cancellation keywords = ACTION required. All other cases: When in doubt, DON'T call a function.

---

## 📚 FUNCTION CALLING EXAMPLES (Learn from these)

Study these examples to understand WHEN and WHEN NOT to call functions:

### ✅ Example 1 - Gratitude (NO FUNCTION)
**Customer**: "Thank you!"
**Context**: Staff just confirmed a booking
**AI Action**: NO FUNCTION
**AI Response**: "You're welcome! See you tomorrow at 14:00 ⛳"
**❌ WRONG**: Don't call check_bay_availability or create_booking

### ✅ Example 2 - Past Booking Statement (NO FUNCTION)
**Customer**: "ตอนแรกจองกอล์ฟไว้วันนี้ 13.00 น" (I already booked golf today at 13:00)
**AI Action**: NO FUNCTION
**AI Response**: "ใช่ค่ะ เจอกันวันนี้ 13:00 นะคะ" (Yes, see you today at 13:00)
**❌ WRONG**: Don't call create_booking (they ALREADY booked!)

### ✅ Example 3 - Arrival Time (NO FUNCTION)
**Customer**: "ไปถึงสัก 18.30 น นะครับ" (I'll arrive around 18:30)
**AI Action**: NO FUNCTION
**AI Response**: "ได้ค่ะ รอคุณนะคะ" (Got it, we'll wait for you)
**❌ WRONG**: Don't call create_booking (18:30 is arrival time, not booking time!)

### ✅ Example 4 - Hypothetical Question (NO FUNCTION)
**Customer**: "จอง2 ชม แล้วตอนเรียนค่อยไปลงชื่อทีละชมหรอครับ" (If I book 2 hours, do I sign in one hour at a time?)
**AI Action**: NO FUNCTION
**AI Response**: "ใช่ค่ะ จองได้ 2 ชม แล้วมาลงชื่อทีละชั่วโมงได้เลยค่ะ" (Yes, you can book 2 hours and sign in hourly)
**❌ WRONG**: Don't call create_booking (they're asking HOW it works, not actually booking!)

### ✅ Example 5 - Cancellation with Details (USE cancel_booking)
**Customer**: "สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ ขอบคุณครับ" (Hello, 12:00-14:00 slot, name Day, cancel please, thank you)
**Analysis**: Even though message includes greeting and politeness, the keyword "ยกเลิก" means CANCELLATION REQUEST
**Step 1**: Check UPCOMING BOOKINGS in context
  - If Day's 12:00-14:00 booking is there → Use cancel_booking function
  - If NOT found → Use lookup_booking function first
**AI Action**: cancel_booking (with booking details: date, time 12:00, customer_name Day)
**✅ CORRECT**: Call function even if message has other words - "ยกเลิก" = cancellation action
**❌ WRONG**: Don't just respond "ยกเลิกให้แล้วค่ะ" without calling function!

### ✅ Example 5B - Simple Cancellation (USE cancel_booking)
**Customer**: "ยกเลิก" (Cancel)
**AI Action**: cancel_booking
**✅ CORRECT**: Simple and direct

### ✅ Example 6 - Facility Question (NO FUNCTION)
**Customer**: "มันตีใส่จอเหมือน bay ทั่วไปไหม" (Does it hit into a screen like regular bays?)
**AI Action**: NO FUNCTION
**AI Response**: "ใช่ค่ะ ตีใส่จอเหมือนกันค่ะ" (Yes, you hit into screens)
**❌ WRONG**: Don't call check_bay_availability (this is about HOW it works, not availability)

### ✅ Example 7 - Actual Booking Request (USE create_booking)
**Customer**: "ขอจอง AI Bay 10.00-11.00 น." (Book AI Bay 10:00-11:00 please)
**Context**: Customer info shows ✅ AVAILABLE
**AI Action**: create_booking
**Parameters**: date=today, start_time="10:00", duration=1, bay_type="ai"
**✅ CORRECT**: Customer explicitly requested booking with "ขอจอง"

### ✅ Example 8 - Availability Question (USE check_bay_availability)
**Customer**: "Tomorrow 2pm available?"
**AI Action**: check_bay_availability
**Parameters**: date=tomorrow, start_time="14:00", duration=1
**✅ CORRECT**: Customer asking about availability, not booking yet

### ✅ Example 9 - Casual Cancellation (USE cancel_booking)
**Customer**: "Bro gotta cancel on Wednesday"
**Context**: Has Wednesday booking in UPCOMING BOOKINGS
**AI Action**: cancel_booking
**✅ CORRECT**: "Cancel on Wednesday" = clear cancellation intent, even if casual

---

## 🎯 KEY DECISION RULES

1. **Gratitude, Thanks, Greetings** → NO FUNCTION (conversational only)

2. **Arrival time, Past actions, Hypothetical questions** → NO FUNCTION (conversational only)

3. **Availability Question** → Use check_bay_availability
   - Keywords: "available?", "ว่างมั้ย", "do you have slots", "any time?"
   - NOT for: "Do you have gloves?" (facility question)

4. **Cancellation Request** → Use cancel_booking
   - Keywords: "cancel", "ยกเลิก", "can't make it", "won't make it"
   - Check UPCOMING BOOKINGS first

5. **Booking Intent + Info Available** → Use create_booking
   - Keywords: "book", "ขอจอง", "reserve", "I want to book" (IMPERATIVE mood)
   - NOT for: "I already booked" (past tense), "If I book..." (hypothetical)

6. **Booking Intent + Info Missing** → Ask for info first (NO FUNCTION yet)

7. **General Questions** → Text response only (NO FUNCTION)
   - Pricing, location, facilities, equipment, how things work
`;

// Generate system prompt with context
function generateContextualPrompt(
  customerMessage: string,
  conversationContext: ConversationContext,
  customerContext?: CustomerContext,
  similarMessages: SimilarMessage[] = [],
  template?: any
): string {
  // Get current date and time in Thailand timezone
  const thailandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  const todayDate = thailandTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = thailandTime.toTimeString().slice(0, 5); // HH:MM

  // Calculate tomorrow's date
  const tomorrowTime = new Date(thailandTime);
  tomorrowTime.setDate(tomorrowTime.getDate() + 1);
  const tomorrowDate = tomorrowTime.toISOString().split('T')[0]; // YYYY-MM-DD

  // Replace date/time placeholders in system prompt
  let contextPrompt = LENGOLF_SYSTEM_PROMPT
    .replace('{TODAY_DATE}', todayDate)
    .replace('{TOMORROW_DATE}', tomorrowDate)
    .replace('{CURRENT_TIME}', currentTime) + '\n\n';

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

    contextPrompt += `CUSTOMER INFORMATION:
${customerLabel}- Name: ${customerContext.name || 'Unknown'}
- Phone: ${customerContext.phone || 'Not provided'}
- Total visits: ${customerContext.totalVisits || 0}
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
            return `${startTime} เต็มแล้วค่ะ หาเวลาอื่นให้นะคะ`;
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
            return `วันนี้เต็มแล้วค่ะ`;
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
            return `Sorry, ${startTime} is fully booked. Let me find alternative times.`;
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
            return `Sorry, all bays are fully booked on ${date}`;
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
          return `วันนี้โปรไม่ว่างค่ะ`;
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
          return `Sorry, no coaches available on ${data.date}`;
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
      return 'I&apos;ve processed your request. Let me help you further.';
  }
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
          customer: params.customerContext,
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
    } else {
      // English message - enforce English response
      userContent = `Customer message: "${params.customerMessage}"

🚨 CRITICAL LANGUAGE REQUIREMENT:
The customer is writing in ENGLISH. You MUST respond in ENGLISH ONLY.
- DO NOT use Thai language in your response
- DO NOT mix languages
- Match the customer's language exactly

Write naturally in English, be friendly and professional.`;
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

    // Add previous days' messages as text summary to system prompt
    let finalContextPrompt = contextualPrompt;
    if (previousDaysMessages.length > 0) {
      finalContextPrompt += `\nPREVIOUS CONVERSATION HISTORY (for context only):
${previousDaysMessages.map(msg => `${msg.senderType}: ${msg.content}`).join('\n')}

`;
    }

    // Add greeting instruction if this is the first staff message of the day
    // Only greet if we haven't found ANY assistant messages in today's conversation
    if (!hasAssistantMessageToday) {
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
    }

    const messages: any[] = [
      { role: 'system', content: finalContextPrompt }
    ];

    // Add ONLY today's conversation as proper message objects with timestamps
    // This gives AI clear context for current conversation flow and temporal understanding
    if (todaysMessages.length > 0) {
      for (const msg of todaysMessages) {
        const role = msg.senderType === 'user' ? 'user' : 'assistant';

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

    // Let the model decide when to use tools naturally
    // With simplified function descriptions and strict mode enabled, the model should
    // be able to determine the appropriate action without forcing tool use
    const toolChoice = 'auto';

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

    while (currentIteration < maxIterations) {
      currentIteration++;

      // Capture the EXACT request being sent to OpenAI (in dry run mode)
      const requestPayload = {
        model: modelToUse,
        messages: messages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        tools: getOpenAITools(),
        tool_choice: toolChoice
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

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: messages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        tools: getOpenAITools(),
        tool_choice: toolChoice, // 'auto' by default
      });

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
            const functionArgs = JSON.parse(toolCall.function.arguments);

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

            // Check if function requires approval - if so, stop here
            if (result.requiresApproval) {
              requiresApproval = true;
              approvalMessage = result.approvalMessage;
              suggestedResponse = result.approvalMessage ||
                `Please review the ${functionName} request and approve if correct.`;

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

    // 6. Calculate confidence score
    const confidenceScore = calculateConfidenceScore(
      similarMessages,
      !!matchingTemplate,
      !!params.customerContext,
      suggestedResponse.length
    );

    const responseTime = Date.now() - startTime;

    // 7. Build debug context if requested (for staff transparency)
    let debugContext: AIDebugContext | undefined;
    if (params.includeDebugContext) {
      debugContext = {
        customerMessage: params.customerMessage,
        conversationHistory: params.conversationContext.recentMessages || [],
        customerData: params.customerContext,
        similarMessagesUsed: similarMessages,
        systemPromptExcerpt: LENGOLF_SYSTEM_PROMPT.substring(0, 500) + '...',
        functionSchemas: getOpenAITools(),
        toolChoice: toolChoice,
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
    console.log('[IMAGE SUGGESTIONS] Image IDs collected:', Array.from(imageIds));
    if (imageIds.size > 0 && refacSupabaseAdmin) {
      try {
        const { data: images, error } = await refacSupabaseAdmin
          .from('line_curated_images')
          .select('id, name, category, file_url, description')
          .in('id', Array.from(imageIds));

        console.log('[IMAGE SUGGESTIONS] Fetched images:', images?.length || 0, 'Error:', error);

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
          console.log('[IMAGE SUGGESTIONS] Final suggestedImages array:', suggestedImages);
        }
      } catch (error) {
        console.warn('Failed to fetch curated image details:', error);
        // Non-critical error, continue without images
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