// Pricing skill: pricing questions, packages, promotions
// Data source: products.products (is_active=true, show_in_staff_ui=true) — verified Feb 2026

import { Skill } from './types';

export const pricingSkill: Skill = {
  name: 'pricing',
  intents: ['pricing_inquiry', 'promotion_inquiry', 'payment_inquiry'],
  requiredContext: ['packages', 'bay_pricing'],
  systemPrompt: `PRICING (from active product catalog):

BAY RATES (per hour):
- Weekday Morning (before 1PM): ฿500
- Weekday Afternoon: ฿700
- Weekday Evening: ฿700
- Weekend Morning (before 1PM): ฿700
- Weekend Afternoon: ฿900
- Weekend Evening: ฿900
- Both Social Bay and AI Bay use the same rate card
- Standard golf club rental: FREE with any bay booking

PREMIUM CLUB RENTAL:
- Premium Indoor: ฿150/hr
- Premium+ Indoor: ฿250/hr
- Club Delivery (Bangkok): ฿500

SIMULATOR PACKAGES (Monthly):
- Bronze (5H): ฿3,000 (1 month validity)
- Early Bird (10H, Morning only): ฿4,800 (6 months validity)
- Early Bird+ (Unlimited Morning): ฿5,000 (1 month validity)
- Silver (15H): ฿8,000 (3 months validity)
- Diamond Unlimited (1 month): ฿8,000
- Gold (30H): ฿14,000 (6 months validity)
- Diamond+ Unlimited (3 months): ฿18,000

STARTER PACKAGES (Mixed - coaching + sim):
- Starter Package: ฿11,000
- Starter Package (2 Person): ฿13,500

COACHING (per session, bay fee included):
- 1 Lesson (1 PAX): ฿1,800
- 1 Lesson (2 PAX): ฿2,400
- On Course Lesson: ฿5,000
- 5 Lessons (1 PAX): ฿8,500
- 5 Lessons (2 PAX): ฿11,000
- 10 Lessons (1 PAX): ฿16,000
- 10 Lessons (2 PAX): ฿20,500
- 20 Lessons (1 PAX): ฿31,000
- 20 Lessons (2 PAX): ฿39,000
- 30 Lessons (1 PAX): ฿45,000
- 30 Lessons (2 PAX): ฿57,000
- 50 Lessons (1 PAX): ฿72,000
- 50 Lessons (2 PAX): ฿92,500

FOOD & PLAY SETS:
- Set A: ฿1,200
- Set B: ฿2,100
- Set C: ฿2,975

DRINKS & GOLF:
- Free Flow Beer: ฿499
- 2 Hours + Singha Bucket Beer (4 bottles): ฿2,000

GOLF GLOVES (for purchase):
- LENGOLF branded: ฿600

EVENTS:
- Small Package (S): ฿9,999
- Medium Package (M): ฿21,999

PROMOTIONS:
- Actual promotions are injected from the database in ACTIVE PROMOTIONS section above
- Only mention promotions that appear in that section — do NOT invent promotions
- Packages and food bundles are NOT promotions — they are regular products

PAYMENT METHODS:
- Cash, credit/debit cards, bank transfer, QR payment
- Package purchases can be done on-site

RESPONSE APPROACH:
- Be direct with pricing — customers want numbers, not sales pitches
- Example: "Weekday morning is 500 THB/hour, afternoon/evening 700 THB"
- Don't oversell — let the value speak for itself`,
  examples: [
    {
      customerMessage: 'ราคาเท่าไหร่คะ',
      staffResponse: 'Weekday ก่อนบ่าย ชม.ละ 500 บาทค่ะ บ่าย/เย็น 700 บาท Weekend เช้า 700 บ่าย/เย็น 900 บาทค่ะ ไม้กอล์ฟยืมฟรีค่ะ',
      language: 'th'
    },
    {
      customerMessage: 'How much per hour?',
      staffResponse: 'Weekday morning 500 THB/hr, afternoon/evening 700 THB. Weekend morning 700, afternoon/evening 900 THB. Club rental is free!',
      language: 'en'
    },
    {
      customerMessage: 'มีโปรอะไรบ้าง',
      staffResponse: 'มีแพ็คเกจค่ะ เช่น Bronze 5 ชม. 3,000 บาท, Early Bird 10 ชม. 4,800 บาท (ก่อนบ่ายโมง) ประหยัดกว่าจ่ายรายชั่วโมงค่ะ',
      language: 'th'
    },
    {
      customerMessage: 'How much for coaching?',
      staffResponse: 'A single lesson is 1,800 THB (includes bay fee). For 2 people it\'s 2,400 THB. We also have 5-lesson packages from 8,500 THB.',
      language: 'en'
    }
  ]
};
