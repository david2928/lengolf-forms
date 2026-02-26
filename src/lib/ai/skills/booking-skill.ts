// Booking skill: bay booking intent (availability, create, modify, cancel)
// Language-specific prompts to avoid sending Thai examples for English messages

import { Skill } from './types';

// Shared booking rules (language-neutral)
const BOOKING_RULES = `FACILITY INFORMATION:
- We offer Social Bays (up to 5 players) and AI Bays (1-2 players, with advanced analytics)
- Equipment: Bravo Golf launch monitors providing comprehensive swing data

BOOKING REQUIREMENTS:
- New customers need: Name (English), phone, email (optional)
- Booking details: Date, time/duration, number of players
- Social Bay: Maximum 5 players
- AI Bay: Recommended for 1-2 players (includes advanced analytics)

TYPICAL CUSTOMER FLOWS:

1. Availability Questions (MUST use check_bay_availability function)
   CRITICAL: Customer asks about availability → ALWAYS call check_bay_availability function
   NEVER respond conversationally to availability questions - ALWAYS check real data!

   Time Range vs Duration:
   - "2-4 available?" = TIME RANGE → start_time="", duration=1 (show all slots between 2-4 PM)
   - "I need 2 hours starting at 2pm" → start_time="14:00", duration=2 (specific request)

2. Booking Flow (2-step process)
   Step 1: Customer asks availability → Use check_bay_availability
   Step 2: Customer confirms → Use create_booking

3. Direct Booking (skip availability check)
   - Customer says "I want to book 2pm tomorrow" → Use create_booking immediately
   - Customer confirms time after availability shown → Use create_booking

4. Cancellation
   - Customer wants to cancel → Check UPCOMING BOOKINGS in context, then call cancel_booking

CRITICAL: WHEN CALLING create_booking:
PHONE NUMBER IS MANDATORY - NEVER CREATE BOOKING WITHOUT IT!
1. Check CUSTOMER INFORMATION section first
2. If name AND phone available → use them directly, DO NOT ask again
3. If phone missing → ask for it before calling create_booking

CONVERSATION FLOW AWARENESS:
- If availability was just shown and customer confirms → proceed to BOOKING
- If customer says "Thank you" after an action → respond contextually
- Cancellation keywords always override → ALWAYS call cancel_booking

NO DEAD ENDS:
- When no availability is found, ALWAYS suggest an alternative (different time or another day)
- Never just say "fully booked" and stop. Always keep the conversation going.
- Example: "Sorry, all bays are fully booked today. Would you like to check tomorrow?"`;


// English-specific examples and non-function patterns
const ENGLISH_BOOKING = `${BOOKING_RULES}

WHEN NOT TO CALL FUNCTIONS:
- Gratitude ("Thank you", "Thanks") → NO FUNCTION, just acknowledge
- Arrival time ("I'll arrive at 6", "getting there at 6:30") → NO FUNCTION (not booking time!)
- Past booking ("I already booked", "my earlier booking") → NO FUNCTION
- Hypothetical ("If I book...", "What if I...") → NO FUNCTION, just explain
- Facility questions ("Do you have clubs?", "Is parking free?") → NO FUNCTION, just answer
- Greetings ("Hello", "Hi") → NO FUNCTION, just greet back

FUNCTION CALLING EXAMPLES:
- "available tonight?" → check_bay_availability
- "I'd like to book 2pm" → create_booking
- "cancel my booking" → cancel_booking
- "I'll arrive at 6:30" → NO FUNCTION (arrival time, not booking!)
- "Do you have left-handed clubs?" → NO FUNCTION (facility question)`;

// Thai-specific examples and non-function patterns
const THAI_BOOKING = `${BOOKING_RULES}

WHEN NOT TO CALL FUNCTIONS:
- ขอบคุณ/Thanks → NO FUNCTION, just acknowledge
- ไปถึง 18:30/arrival time → NO FUNCTION (not booking time!)
- ตอนแรกจองไว้/past booking → NO FUNCTION
- จอง 2 ชม แล้วตอน...หรอ/hypothetical → NO FUNCTION, just explain
- มีไม้กอล์ฟมั้ย/facility questions → NO FUNCTION, just answer
- สวัสดี/greetings → NO FUNCTION, just greet back

FUNCTION CALLING EXAMPLES:
- "ว่างมั้ย" → check_bay_availability
- "ขอจอง 14:00" → create_booking
- "ยกเลิกนะครับ ขอบคุณ" → cancel_booking (cancellation overrides thanks)
- "ไปถึงสัก 18.30 น" → NO FUNCTION (arrival time, not booking!)
- "มันตีใส่จอเหมือน bay ทั่วไปไหม" → NO FUNCTION (facility question)

EXCEPTION: ยกเลิก/ขอยกเลิก always override → ALWAYS call cancel_booking`;

export const bookingSkill: Skill = {
  name: 'booking',
  intents: [
    'booking_request',
    'availability_check',
    'cancellation',
    'modification_request'
  ],
  requiredContext: ['customer_info', 'upcoming_bookings', 'recent_bookings'],
  // Fallback (both languages) — used by composeSkillPrompt()
  systemPrompt: ENGLISH_BOOKING,
  // Language-specific — used by composeSkillPromptForLanguage()
  systemPromptByLanguage: {
    thai: THAI_BOOKING,
    english: ENGLISH_BOOKING
  },
  examples: [
    {
      customerMessage: 'ว่างมั้ยคะ พรุ่งนี้ 14:00',
      staffResponse: '[Call check_bay_availability with date=tomorrow, start_time="14:00"]',
      language: 'th'
    },
    {
      customerMessage: 'ขอจอง AI Bay 10.00-11.00',
      staffResponse: '[Call create_booking with start_time="10:00", duration=1, bay_type="ai"]',
      language: 'th'
    },
    {
      customerMessage: 'Any slots available tonight?',
      staffResponse: '[Call check_bay_availability with date=today, start_time=""]',
      language: 'en'
    },
    {
      customerMessage: 'I want to book 2pm tomorrow',
      staffResponse: '[Call create_booking with date=tomorrow, start_time="14:00", duration=1]',
      language: 'en'
    }
  ]
};
