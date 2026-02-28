// Pricing skill: pricing questions, packages, promotions
// Data source: products.products (is_active=true, show_in_staff_ui=true) — verified Feb 2026

import { Skill } from './types';

export const pricingSkill: Skill = {
  name: 'pricing',
  intents: ['pricing_inquiry', 'promotion_inquiry', 'payment_inquiry'],
  requiredContext: ['packages', 'bay_pricing'],
  systemPrompt: `PRICING (active catalog):

BAY RATES (per hour, same for Social and AI Bay):
- Weekday before 1PM: ฿500 | Afternoon/Evening: ฿700
- Weekend before 1PM: ฿700 | Afternoon/Evening: ฿900
- Standard club rental: FREE

PREMIUM CLUBS: Indoor ฿150/hr, Premium+ ฿250/hr, Course ฿1,200/฿1,800, Delivery ฿500

SIMULATOR PACKAGES:
- Bronze 5H: ฿3,000 (1mo) | Early Bird 10H morning: ฿4,800 (6mo) | Early Bird+ unlimited morning: ฿5,000 (1mo)
- Silver 15H: ฿8,000 (3mo) | Diamond unlimited: ฿8,000 (1mo)
- Gold 30H: ฿14,000 (6mo) | Diamond+ unlimited: ฿18,000 (3mo)

COACHING (bay fee included):
- 1 Lesson: ฿1,800 (1PAX) / ฿2,400 (2PAX) | On Course: ฿5,000
- 5 Lessons: ฿8,500 / ฿11,000 | 10: ฿16,000 / ฿20,500
- 20: ฿31,000 / ฿39,000 | 30: ฿45,000 / ฿57,000 | 50: ฿72,000 / ฿92,500
- Starter Package: ฿11,000 (1PAX) / ฿13,500 (2PAX)
- Outside Coaching Fee: ฿200

FOOD & PLAY: Set A ฿1,200, B ฿2,100, C ฿2,975
DRINKS: Free Flow Beer ฿499, 2H + Singha Bucket ฿2,000
GOLF GLOVES: ฿600
EVENTS: Small ฿9,999, Medium ฿21,999

PAYMENT: Cash, cards, bank transfer, QR payment.

Active promotions are in the ACTIVE PROMOTIONS section if present — only mention those. Packages and food bundles are NOT promotions.`
};
