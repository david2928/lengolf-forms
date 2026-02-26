// Coaching skill: coaching availability, rates, booking
// Data source: products.products (is_active=true, category=Coaching) — verified Feb 2026

import { Skill } from './types';

export const coachingSkill: Skill = {
  name: 'coaching',
  intents: ['coaching_inquiry'],
  requiredContext: ['coaching_rates', 'customer_info', 'recent_bookings'],
  systemPrompt: `COACHING INFORMATION:
- Coaching sessions are paid instruction with golf pros
- Coaching is a SEPARATE revenue stream from bay bookings
- Bay fee is INCLUDED in coaching session price

COACHING RATES (current active prices):
- 1 Lesson (1 PAX): ฿1,800
- 1 Lesson (2 PAX): ฿2,400
- On Course Lesson: ฿5,000
- 5 Lessons (1 PAX): ฿8,500
- 5 Lessons (2 PAX): ฿11,000
- 10 Lessons (1 PAX): ฿16,000
- 10 Lessons (2 PAX): ฿20,500
- 20 Lessons (1 PAX): ฿31,000 | (2 PAX): ฿39,000
- 30 Lessons (1 PAX): ฿45,000 | (2 PAX): ฿57,000
- 50 Lessons (1 PAX): ฿72,000 | (2 PAX): ฿92,500
- Outside Coaching Fee: ฿200

STARTER PACKAGES (Coaching + Sim combo):
- Starter Package: ฿11,000
- Starter Package (2 Person): ฿13,500

COACHING vs REGULAR BOOKING SIGNALS:
- Recent bookings show "COACHING" → Default to coaching for new requests
- Customer mentions coach name (Min, Tan, Kru Min) → Use get_coaching_availability
- No coaching history + no coach mention → Use check_bay_availability for regular bays

COACHING FLOW:
1. Customer asks about coaching → Use get_coaching_availability
2. Customer picks a coach/time → Use create_booking with coaching type
3. For regular customers with coaching history → proactively suggest their usual coach

IMPORTANT:
- If customer asks "available?" and has coaching booking pattern → likely wants coaching
- Use coach names from recent bookings if customer says "same as last time"`,
  examples: [
    {
      customerMessage: 'โปรมินว่างมั้ยคะ',
      staffResponse: '[Call get_coaching_availability with coach_name="Min"]',
      language: 'th'
    },
    {
      customerMessage: 'I want to book a lesson',
      staffResponse: '[Call get_coaching_availability to show available coaches]',
      language: 'en'
    },
    {
      customerMessage: 'เรียนกอล์ฟเท่าไหร่',
      staffResponse: 'คลาสเดี่ยว 1,800 บาท/ครั้ง (รวมค่า bay แล้ว) ค่ะ ถ้ามา 2 คน 2,400 บาทค่ะ',
      language: 'th'
    }
  ]
};
