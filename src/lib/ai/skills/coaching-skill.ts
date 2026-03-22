// Coaching skill: coaching availability, rates, booking
// Pricing data lives in pricing-skill.ts — this skill handles coaching-specific flow

import { Skill } from './types';

export const coachingSkill: Skill = {
  name: 'coaching',
  intents: ['coaching_inquiry'],
  requiredContext: ['coaching_rates', 'customer_info', 'recent_bookings'],
  systemPrompt: `COACHING:
- Coaching is SEPARATE from bay bookings. Bay fee is INCLUDED in coaching price.
- Coaches: Min, Tan, Kru Min, Noon
- For pricing details, use search_knowledge tool if not covered above.
- IMPORTANT: Coaching sessions BLOCK bays. A bay showing "available" may still be blocked by a coaching session. Coach schedule inquiries need get_coaching_availability, not check_bay_availability.
- "ตารางโปร" / "coach schedule" / "โปร[name]ว่างไหม" = coaching availability question → use get_coaching_availability

COACHING vs REGULAR BOOKING:
- Recent bookings show "COACHING" → default to coaching for new requests
- Customer mentions coach name or asks about coach schedule → use get_coaching_availability
- Customer asks about "โปร" (coach/pro) → ALWAYS use get_coaching_availability (โปร = coach, not promotion in this context)
- No coaching history + no coach mention → use check_bay_availability

FLOW: Customer asks → get_coaching_availability → customer picks coach/time → create_booking with coaching type
- For regulars with coaching history, suggest their usual coach.
- "same as last time" → use coach from recent bookings.`
};
