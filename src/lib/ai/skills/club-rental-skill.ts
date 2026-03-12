// Club rental skill: comprehensive knowledge for indoor and course club rentals
// Prices loaded dynamically from products.products + product_modifiers via pricing-service.ts
// Loaded for equipment_inquiry intent alongside facility skill

import { Skill } from './types';

export const clubRentalSkill: Skill = {
  name: 'club_rental',
  intents: ['equipment_inquiry'],
  requiredContext: [],
  systemPrompt: `CLUB RENTAL:

THREE TIERS:
1. Standard: FREE with any bay booking (right and left-handed). INDOOR USE ONLY, cannot be taken off-site.
2. Premium: Men's Callaway Warbird (Uniflex), Women's Majesty Shuttle 2023 (Ladies flex).
3. Premium+: Men's Callaway Paradym Forged Carbon with Ventus TR shafts (tour-level). Men's only.

{DYNAMIC_CLUB_PRICING}

COURSE RENTAL BOOKING:
1. Choose tier and duration
2. Use check_club_availability to verify stock for the date
3. Collect: name, phone, passport copy (always required), delivery or pickup preference, delivery/pickup times and location
4. Full prepayment required to confirm reservation
5. Payment details: [NEEDS MANAGEMENT] (staff arranges appropriate payment method)
6. Confirmation email sent after booking

RULES:
- If customer mentions a golf course, playing golf, or taking clubs somewhere: this is a COURSE rental, not indoor.
- Standard clubs are FREE but INDOOR ONLY. Never suggest standard clubs for course play.
- Delivery fee covers BOTH delivery AND pickup (2-way). Never say "let me check" about this.
- No half-day rates exist. If customer asks, say only full-day rates are available.
- If customer asks for a specific model we don't have (e.g. "Do you have Callaway XR?"): say what we DO have instead.
- We may also have more affordable options from our store inventory. If customer wants cheaper than Premium, say "we may have more affordable options available" and flag [NEEDS MANAGEMENT].
- Discount requests (e.g. multi-set discount): no standard discount policy, flag [NEEDS MANAGEMENT].
- For multi-day value: proactively mention "pay 2 get 1 free" when customer asks about 2+ days.
- Passport copy is always required for course rentals.

No function calls needed for general club questions (pricing, tiers, add-ons). Use check_club_availability only when customer asks about specific date availability.`,
  systemPromptByLanguage: {
    thai: `CLUB RENTAL:

THREE TIERS:
1. Standard: ฟรีกับการจองเบย์ (ซ้ายและขวา) ใช้ได้เฉพาะในร้านเท่านั้น ห้ามนำออกไปสนาม
2. Premium: Callaway Warbird (ผู้ชาย) / Majesty Shuttle 2023 (ผู้หญิง)
3. Premium+: Callaway Paradym Forged Carbon, Ventus TR shafts (ผู้ชายเท่านั้น)

{DYNAMIC_CLUB_PRICING}

ขั้นตอนจอง:
1. เลือกชุดและจำนวนวัน
2. ตรวจสอบสต็อก
3. ต้องการ: ชื่อ, เบอร์โทร, สำเนาพาสปอร์ต, สถานที่และเวลาจัดส่ง/รับคืน
4. ต้องชำระเต็มจำนวนล่วงหน้า
5. รายละเอียดการชำระเงิน: [NEEDS MANAGEMENT]

กฎ:
- ถ้าลูกค้าพูดถึงสนามกอล์ฟ = เช่าไปสนาม ไม่ใช่ในร้าน
- ไม้ Standard ฟรีแต่ใช้ในร้านเท่านั้น
- ค่าจัดส่ง = ไป-กลับ (ส่ง+รับ)
- ไม่มีอัตราครึ่งวัน
- ขอส่วนลด → [NEEDS MANAGEMENT]
- สำเนาพาสปอร์ตต้องใช้เสมอ`,
    english: `CLUB RENTAL:

THREE TIERS:
1. Standard: FREE with any bay booking (right and left-handed). Indoor use only, cannot be taken off-site.
2. Premium: Men's Callaway Warbird / Women's Majesty Shuttle 2023.
3. Premium+: Callaway Paradym Forged Carbon with Ventus TR shafts (men's only).

{DYNAMIC_CLUB_PRICING}

BOOKING FLOW:
1. Choose tier and duration
2. Check availability for the date
3. Need: name, phone, passport copy (always required), delivery/pickup time and location
4. Full prepayment required
5. Payment: [NEEDS MANAGEMENT] (staff arranges)

RULES:
- Golf course mentioned = course rental, not indoor
- Standard clubs = FREE but indoor only
- Delivery fee = 2-way (delivery AND pickup)
- No half-day rates
- Discount requests → [NEEDS MANAGEMENT]
- Passport copy always required`
  }
};
