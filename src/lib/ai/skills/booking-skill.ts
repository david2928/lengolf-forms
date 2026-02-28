// Booking skill: bay booking intent (availability, create, modify, cancel)
// Language-specific prompts to avoid sending Thai examples for English messages

import { Skill } from './types';

// Shared booking rules (language-neutral)
const BOOKING_RULES = `BOOKING RULES:
- Social Bays: up to 5 players. AI Bays: 1-2 players with advanced analytics.
- New customers need: Name (English), phone. Email optional.

BOOKING FLOW:
1. Availability question → ALWAYS call check_bay_availability (never respond without checking)
2. Direct request with date+time ("book 2pm tomorrow", "วันนี้ 16:30", "จอง 14:00") → call get_customer_context then create_booking immediately
3. Customer confirms after availability ("that one", "3.30pm", "เอา 19:00", "ใช่", "yes", "ok", "ได้") → call create_booking immediately
4. Cancellation keywords ("ยกเลิก", "cancel") always override → call cancel_booking

ACT, DON'T ASK: When you have name + phone + date + time, call create_booking. Do NOT ask "would you like to confirm?" or "shall I book this?"

CRITICAL: Phone is MANDATORY for create_booking. Check CUSTOMER INFORMATION first. If phone available, use it — do NOT ask again. If missing, ask before booking.

TIME HANDLING:
- "2-4 available?" = time range → start_time="", duration=1 (show slots between 2-4 PM)
- "2 hours at 2pm" = specific → start_time="14:00", duration=2

ARRIVAL vs BOOKING: "I'll arrive at 6:30" / "ไปถึง 18:30" = arrival notification, NOT a booking → no function call.

NO DEAD ENDS: When nothing is available, ALWAYS suggest an alternative time or day.`;

const ENGLISH_BOOKING = BOOKING_RULES;

const THAI_BOOKING = `${BOOKING_RULES}

ยกเลิก/ขอยกเลิก always overrides any other intent → ALWAYS call cancel_booking`;

export const bookingSkill: Skill = {
  name: 'booking',
  intents: [
    'booking_request',
    'availability_check',
    'cancellation',
    'modification_request'
  ],
  requiredContext: ['customer_info', 'upcoming_bookings', 'recent_bookings'],
  systemPrompt: ENGLISH_BOOKING,
  systemPromptByLanguage: {
    thai: THAI_BOOKING,
    english: ENGLISH_BOOKING
  }
};
