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

COACHING vs REGULAR BOOKING:
- Recent bookings show "COACHING" → default to coaching for new requests
- Customer mentions coach name → use get_coaching_availability
- No coaching history + no coach mention → use check_bay_availability

FLOW: Customer asks → get_coaching_availability → customer picks coach/time → create_booking with coaching type
- For regulars with coaching history, suggest their usual coach.
- "same as last time" → use coach from recent bookings.`
};
