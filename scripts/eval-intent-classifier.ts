#!/usr/bin/env npx tsx
// Intent Classifier Evaluation Suite
// Run: npx tsx scripts/eval-intent-classifier.ts
// Re-run after each change to verify accuracy

import { classifyIntent } from '../src/lib/ai/intent-classifier';

interface TestCase {
  name: string;
  message: string;
  history: Array<{ content: string; senderType: string }>;
  expectedIntent: string;
  /** If true, any of the acceptable intents will pass */
  acceptableIntents?: string[];
  category: 'regex_fast_path' | 'contextual_followup' | 'standalone' | 'thai' | 'real_world' | 'multilingual';
}

const TEST_CASES: TestCase[] = [
  // =====================================================
  // REGEX FAST-PATH — should be instant (0ms)
  // =====================================================
  {
    name: 'Cancel booking (EN)',
    message: 'I want to cancel my booking',
    history: [],
    expectedIntent: 'cancellation',
    category: 'regex_fast_path',
  },
  {
    name: 'Cancel booking (TH)',
    message: 'ขอยกเลิกการจองค่ะ',
    history: [],
    expectedIntent: 'cancellation',
    category: 'regex_fast_path',
  },
  {
    name: 'Greeting: Hello',
    message: 'Hello',
    history: [],
    expectedIntent: 'greeting',
    category: 'regex_fast_path',
  },
  {
    name: 'Greeting: สวัสดีค่ะ',
    message: 'สวัสดีค่ะ',
    history: [],
    expectedIntent: 'greeting',
    category: 'regex_fast_path',
  },
  {
    name: 'Explicit booking (EN)',
    message: 'Book a bay for tomorrow at 2pm',
    history: [],
    expectedIntent: 'booking_request',
    category: 'regex_fast_path',
  },
  {
    name: 'Explicit availability (EN)',
    message: 'Is there availability tonight?',
    history: [],
    expectedIntent: 'availability_check',
    category: 'regex_fast_path',
  },

  // =====================================================
  // CONTEXTUAL FOLLOW-UPS — LLM must understand context
  // =====================================================
  {
    name: '"What about tomorrow?" after availability',
    message: 'What about tomorrow?',
    history: [
      { content: 'Are there bays available today?', senderType: 'user' },
      { content: 'Sorry, all bays are fully booked today. Would you like to check another day?', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'contextual_followup',
  },
  {
    name: '"How about Saturday?" after availability',
    message: 'How about Saturday?',
    history: [
      { content: 'Any bays free tonight?', senderType: 'user' },
      { content: 'Sorry, we are fully booked tonight.', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'contextual_followup',
  },
  {
    name: '"OK book it" after availability shown',
    message: 'OK book the 3pm slot',
    history: [
      { content: 'What times are available tomorrow?', senderType: 'user' },
      { content: 'Social bays available at 10:00, 14:00 to 17:00. AI bay available 14:00 to 16:00.', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    category: 'contextual_followup',
  },
  {
    name: '"And the AI bay?" after pricing discussion',
    message: 'And the AI bay?',
    history: [
      { content: 'How much is the social bay?', senderType: 'user' },
      { content: 'Weekday morning 500 THB/hr, weekday evening 700 THB/hr.', senderType: 'admin' },
    ],
    expectedIntent: 'pricing_inquiry',
    acceptableIntents: ['pricing_inquiry', 'facility_inquiry'],
    category: 'contextual_followup',
  },
  {
    name: '"Is it the same price?" after facility question',
    message: 'Is it the same price?',
    history: [
      { content: 'What is the AI bay?', senderType: 'user' },
      { content: 'The AI bay uses advanced analytics with launch monitors.', senderType: 'admin' },
    ],
    expectedIntent: 'pricing_inquiry',
    category: 'contextual_followup',
  },
  {
    name: '"How about Coach Pom?" after coaching inquiry',
    message: 'How about Coach Pom?',
    history: [
      { content: 'Are any coaches available tomorrow?', senderType: 'user' },
      { content: 'Coach Bank is available at 10:00 and 14:00.', senderType: 'admin' },
    ],
    expectedIntent: 'coaching_inquiry',
    category: 'contextual_followup',
  },
  {
    name: '"จองเลยค่ะ" (Book it!) after seeing availability',
    message: 'จองเลยค่ะ',
    history: [
      { content: 'พรุ่งนี้ว่างมั้ยคะ', senderType: 'user' },
      { content: 'ว่างค่ะ Social bay ว่างตั้งแต่ 10:00 ถึง 21:00', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    category: 'contextual_followup',
  },

  // =====================================================
  // THAI CONTEXTUAL — hardest category for cheap models
  // =====================================================
  {
    name: '"แล้วพรุ่งนี้ล่ะคะ" (What about tomorrow?) after TH availability',
    message: 'แล้วพรุ่งนี้ล่ะคะ',
    history: [
      { content: 'วันนี้มีว่างมั้ยคะ', senderType: 'user' },
      { content: 'วันนี้เต็มแล้วค่ะ สนใจดูวันอื่นมั้ยคะ', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'thai',
  },
  {
    name: '"แล้วราคาเท่าไหร่คะ" (How much?) standalone TH',
    message: 'แล้วราคาเท่าไหร่คะ',
    history: [],
    expectedIntent: 'pricing_inquiry',
    category: 'thai',
  },
  {
    name: '"วันเสาร์ล่ะคะ" (What about Saturday?) after availability',
    message: 'วันเสาร์ล่ะคะ',
    history: [
      { content: 'พรุ่งนี้ว่างมั้ย', senderType: 'user' },
      { content: 'พรุ่งนี้เต็มค่ะ', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'thai',
  },

  // =====================================================
  // STANDALONE (no context) — LLM handles ambiguity
  // =====================================================
  {
    name: 'What is the AI bay?',
    message: 'What is the AI bay?',
    history: [],
    expectedIntent: 'facility_inquiry',
    category: 'standalone',
  },
  {
    name: 'Do you have wifi?',
    message: 'Do you have wifi?',
    history: [],
    expectedIntent: 'facility_inquiry',
    acceptableIntents: ['facility_inquiry', 'equipment_inquiry', 'general_inquiry'],
    category: 'standalone',
  },
  {
    name: 'What promotions do you have?',
    message: 'What promotions do you have?',
    history: [],
    expectedIntent: 'promotion_inquiry',
    category: 'standalone',
  },
  {
    name: 'How much per hour?',
    message: 'How much per hour?',
    history: [],
    expectedIntent: 'pricing_inquiry',
    category: 'standalone',
  },
  {
    name: 'Where are you located?',
    message: 'Where are you located?',
    history: [],
    expectedIntent: 'location_inquiry',
    category: 'standalone',
  },
  {
    name: 'Thanks!',
    message: 'Thanks!',
    history: [],
    expectedIntent: 'general_inquiry',
    acceptableIntents: ['general_inquiry', 'greeting'],
    category: 'standalone',
  },
  {
    name: 'Do you have left-handed clubs?',
    message: 'Do you have left-handed clubs?',
    history: [],
    expectedIntent: 'equipment_inquiry',
    category: 'standalone',
  },
  {
    name: 'Can I pay by QR code?',
    message: 'Can I pay by QR code?',
    history: [],
    expectedIntent: 'payment_inquiry',
    category: 'standalone',
  },

  // =====================================================
  // REAL-WORLD — actual customer messages from production
  // =====================================================

  // --- Contextual booking confirmations ---
  {
    name: 'REAL: "Yeah that works for me at 12:00" after admin suggests time',
    message: 'Yeah that works for me at 12:00',
    history: [
      { content: 'Unfortunately, For 10 o clock in the morning only 1 hours available, that next 2 hour slot would be at 12pm would that work for you?', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    category: 'real_world',
  },
  {
    name: 'REAL: "Yes!" confirming booking time',
    message: 'Yes!',
    history: [
      { content: 'You would like to have it from 17:00 - 18:00 pm, correct?', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'general_inquiry'],
    category: 'real_world',
  },
  {
    name: 'REAL: "Confirm ka" confirming lesson',
    message: 'Confirm ka',
    history: [
      { content: 'เพื่อConfirmนะคะ วันนี้คุณ Mind มีเรียนกับโปรมิน', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'general_inquiry'],
    category: 'real_world',
  },

  // --- Modification requests (not covered in original suite) ---
  {
    name: 'REAL: Reschedule due to delay (EN)',
    message: 'Seems i am delayed can i shift to tomorrow same time?',
    history: [
      { content: 'We\'ve adjusted for you already.', senderType: 'admin' },
    ],
    expectedIntent: 'modification_request',
    category: 'real_world',
  },
  {
    name: 'REAL: Shift lesson time (EN)',
    message: 'Is it possible to shift the lesson 1 hour later?',
    history: [
      { content: 'Hi, i just got the room changed already', senderType: 'user' },
    ],
    expectedIntent: 'modification_request',
    category: 'real_world',
  },
  {
    name: 'REAL: Postpone coaching (EN)',
    message: 'Can I postpone to next week?',
    history: [
      { content: 'Hi I booked a coaching session for today but I need to work late…', senderType: 'user' },
    ],
    expectedIntent: 'modification_request',
    category: 'real_world',
  },
  {
    name: 'REAL: ขอขยับเป็นทุ่มครึ่ง (shift to 7:30pm TH)',
    message: 'ขอขยับเป็นทุ่มครึ่งได้ไหมคะ',
    history: [
      { content: '6 โมงว่างค่ะ จองกี่ชั่วโมงคะ', senderType: 'admin' },
    ],
    expectedIntent: 'modification_request',
    category: 'real_world',
  },
  {
    name: 'REAL: ขอเลื่อนเวลา (reschedule TH)',
    message: 'ขอโทษทีครับ วันนี้ขอเลื่อนเป็น 18:00 - 20:30 นะครับ',
    history: [
      { content: 'เดี๋ยวทางเราจะช่วยคอยดูหูฟังของคุณให้อีกทีด้วยคะ', senderType: 'admin' },
    ],
    expectedIntent: 'modification_request',
    category: 'real_world',
  },

  // --- Cancellation (real, more natural) ---
  {
    name: 'REAL: Polite cancellation TH (long form)',
    message: 'ผมขอโทษ ผมขออนุญาตยกเลิกนะครับพอดีลูกศิษย์ขอยกเลิกครับ',
    history: [
      { content: 'แล้วพบกันนะคะ', senderType: 'admin' },
    ],
    expectedIntent: 'cancellation',
    category: 'real_world',
  },

  // --- Arrival notifications (not covered at all) ---
  {
    name: 'REAL: ค่ะถึงแล้วค่ะ (Arrived! TH)',
    message: 'ค่ะถึงแล้วค่ะ',
    history: [
      { content: 'exit 4', senderType: 'admin' },
    ],
    expectedIntent: 'arrival_notification',
    category: 'real_world',
  },
  {
    name: 'REAL: กำลังเดินทางไปนะคะ (On the way TH)',
    message: 'กำลังเดินทางไปนะคะ',
    history: [
      { content: 'อยู่BTSชิดลม(chidlom)ค่ะ mercuryvile ชั้น 4ค่ะ', senderType: 'admin' },
    ],
    expectedIntent: 'arrival_notification',
    category: 'real_world',
  },
  {
    name: 'REAL: "Late 10 min" Transliterated Thai',
    message: 'Late 10 min na kub',
    history: [
      { content: 'ใช่คับ', senderType: 'user' },
    ],
    expectedIntent: 'arrival_notification',
    category: 'real_world',
  },
  {
    name: 'REAL: "I will be about 10 minutes late" (EN)',
    message: "I'm sorry I will be about 10 minutes late",
    history: [
      { content: 'Thanks', senderType: 'user' },
    ],
    expectedIntent: 'arrival_notification',
    category: 'real_world',
  },

  // --- Pricing in context ---
  {
    name: 'REAL: "เท่าไหร่คะ" (How much?) after equipment discussion',
    message: 'เท่าไหร่คะ',
    history: [
      { content: 'ใช้ได้ค่ะต้องการเบอร์โทรศัพท์และชื่อค่ะ แล้วมีอุปกรณ์ให้ค่ะ', senderType: 'admin' },
    ],
    expectedIntent: 'pricing_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: "Same price as the AI bay?" after new customer offer',
    message: 'Same price as the AI bay?',
    history: [
      { content: 'Since you have not used our new customer offer, you can certainly use it for play.', senderType: 'admin' },
    ],
    expectedIntent: 'pricing_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: "ราคานี้เป็นต่อคนหรือต่อเบ" (per person or per bay?) TH',
    message: 'ราคานี้เป็นต่อคนหรือต่อเบครับ',
    history: [
      { content: 'ดีเลยครับ', senderType: 'user' },
    ],
    expectedIntent: 'pricing_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: "So the price will be 550 for 2 hours right?" (EN)',
    message: 'So the price will be 550 for 2 hour a right?',
    history: [
      { content: 'We can share it I think', senderType: 'user' },
    ],
    expectedIntent: 'pricing_inquiry',
    category: 'real_world',
  },

  // --- Equipment inquiries (real) ---
  {
    name: 'REAL: Check driver spec (EN)',
    message: 'May I check the driver spec for that R7 I used before. I wanna know the shaft flex',
    history: [
      { content: 'Our social bay can hold 5 players and Yes, 500 baht + one free hour.', senderType: 'admin' },
    ],
    expectedIntent: 'equipment_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: มีอุปกรณ์ให้มั้ยคะ (Do you have equipment? TH)',
    message: 'มีอุปกรณ์ให้มั้ยคะ',
    history: [
      { content: 'หนูเคยมาแล้ว แต่อยากได้ 1get1 ใช้ชื่อแฟนแทนได้ไหมคะ', senderType: 'user' },
    ],
    expectedIntent: 'equipment_inquiry',
    category: 'real_world',
  },

  // --- Location inquiries (real) ---
  {
    name: 'REAL: อยู่ bts ไหนนะคะ (Which BTS? TH)',
    message: 'อยู่ bts ไหนนะคะ',
    history: [
      { content: 'ได้ค่ะ', senderType: 'user' },
    ],
    expectedIntent: 'location_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: ต้องออกทางออกไหนคะ (Which exit? TH)',
    message: 'ต้องออกทางออกไหนคะ',
    history: [
      { content: 'ค่ะ แล้วพบกันนะคะ', senderType: 'admin' },
    ],
    expectedIntent: 'location_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: ที่ตึกมีที่จอดรถไหมคะ (Parking? TH)',
    message: 'ที่ตึกมีที่จอดรถไหมคะ',
    history: [
      { content: 'สวัสดีค่า', senderType: 'user' },
    ],
    expectedIntent: 'location_inquiry',
    category: 'real_world',
  },

  // --- Promotion inquiries (real) ---
  {
    name: 'REAL: โปร 1 ชม แถม 1 ชม (Buy 1 get 1 TH)',
    message: 'โปร 1 ชม แถม 1 ชมคือยังไงบ้างครับ',
    history: [],
    expectedIntent: 'promotion_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: 1get1 ใช้ชื่อแฟนแทนได้ไหม (Use partner name for promo TH)',
    message: 'หนูเคยมาแล้ว แต่อยากได้ 1get1 ใช้ชื่อแฟนแทนได้ไหมคะ',
    history: [
      { content: 'เป็นยังไงหรอคะ', senderType: 'user' },
    ],
    expectedIntent: 'promotion_inquiry',
    category: 'real_world',
  },

  // --- Payment inquiries (real) ---
  {
    name: 'REAL: ต้องมัดจำมั้ย (Need deposit? TH)',
    message: 'ปกติถ้าจองต้องมัดจำมั้ยครับ',
    history: [
      { content: '150 ต่อคนค่ะ 3ชม', senderType: 'admin' },
    ],
    expectedIntent: 'payment_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: Pay by card for lesson (EN)',
    message: 'Is it possible to pay by card for the lesson?',
    history: [
      { content: 'Sure, we can arrange this. Could we have your phone number to complete the booking?', senderType: 'admin' },
    ],
    expectedIntent: 'payment_inquiry',
    category: 'real_world',
  },

  // --- Coaching inquiries (real) ---
  {
    name: 'REAL: Coaching lesson interest standalone (EN)',
    message: 'Hi I am interested in doing a one hour lesson for golf, do you guys have left handed clubs?',
    history: [],
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'equipment_inquiry'],
    category: 'real_world',
  },
  {
    name: 'REAL: สนใจเรียนตีกอล์ฟ (Interested in golf lessons TH)',
    message: 'สนใจเรียนตีกอล์ฟครับ',
    history: [],
    expectedIntent: 'coaching_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: "Is there anyone available for a lesson at 20:00?" (EN)',
    message: 'Is there anyone available for a lesson at 20:00?',
    history: [
      { content: 'Hello', senderType: 'user' },
    ],
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'availability_check'],
    category: 'real_world',
  },

  // --- Standalone TH with more complexity ---
  {
    name: 'REAL: Group outing pricing (TH)',
    message: 'สวัสดีครับ ถ้าไปกันประมาณ 12 คน นี่คิดเรทยังไงนะครับ อารมณ์ outing บริษัทครับ',
    history: [],
    expectedIntent: 'pricing_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: Left-handed sim room (TH)',
    message: 'สวัสดีค่า มีห้องกอล์ฟซิมมือซ้ายมั้ยคะ',
    history: [],
    expectedIntent: 'equipment_inquiry',
    acceptableIntents: ['equipment_inquiry', 'facility_inquiry'],
    category: 'real_world',
  },
  {
    name: 'REAL: Booking with system error (TH+EN mix)',
    message: 'สวัสดีครับ พยายามจะ book 1 bay สำหรับพรุ่งนี้ตอน 6pm แต่ระบบ error ครับ',
    history: [],
    expectedIntent: 'booking_request',
    category: 'real_world',
  },

  // --- Facility inquiries (real) ---
  {
    name: 'REAL: Can I order food in the sim room? (TH)',
    message: 'ที่ห้อง sim สั่งอาหารมาทานได้ใช่ไหมครับ',
    history: [
      { content: 'ตอนนี้ confirmed สำหรับพรุ่งนี้แล้วใช่ไหมครับ?', senderType: 'user' },
    ],
    expectedIntent: 'facility_inquiry',
    category: 'real_world',
  },

  // --- Contextual availability (real) ---
  {
    name: 'REAL: "Do you have anything in the morning?" after booking discussion',
    message: 'Do you have anything in the morning?',
    history: [
      { content: 'Hello, we can set that up what time are you looking to book?', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'real_world',
  },
  {
    name: 'REAL: "ถ้า 10 ละคะ" (What about 10?) after 11am unavailable',
    message: 'ถ้า 10 ละคะ',
    history: [
      { content: 'ต้องขอภัยด้วยนะคะ พอดีพรุ่งนี้ 11 โมงไม่ว่างค่ะ เป็น 12 แทนได้ไหมคะ', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    acceptableIntents: ['availability_check', 'booking_request'],
    category: 'real_world',
  },
  {
    name: 'REAL: "เป็นพรุ่งนี้ หกโมงว่างยุ่ไหมคะ" (Is 6pm tomorrow free?) after full',
    message: 'เป็นพรุ่งนี้ หกโมงว่างยุ่ไหมคะ',
    history: [
      { content: 'เต็มเหมือนกันค่ะ', senderType: 'admin' },
    ],
    expectedIntent: 'availability_check',
    category: 'real_world',
  },
  {
    name: 'REAL: "วันนี้ทุ่มนึงได้ไหมครับ" (Is 7pm today ok?) after booking flow',
    message: 'วันนี้ทุ่มนึงได้ไหมครับ',
    history: [
      { content: 'สะดวกจองเล่นวันไหนแล้วเวลาหรอคะ 2ชม นะคะ', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'availability_check'],
    category: 'real_world',
  },

  // --- "Book" + equipment confusion ---
  {
    name: 'REAL: "How can I book the rental club?" (equipment, not booking)',
    message: 'how can I book the rental club ??',
    history: [
      { content: 'hi, we booked and play on 6th march 2026 at Bangkok golf club 10am tee time', senderType: 'user' },
      { content: 'wish to use 3 sets of rental clubs for the above play', senderType: 'user' },
    ],
    expectedIntent: 'equipment_inquiry',
    category: 'real_world',
  },

  // =====================================================
  // MULTILINGUAL — Chinese and mixed-language messages
  // =====================================================
  {
    name: 'MULTI: 不用了，谢谢 (No thanks, Chinese)',
    message: '不用了，谢谢',
    history: [
      { content: '请问您明天中午12点方便预订吗？', senderType: 'admin' },
    ],
    expectedIntent: 'general_inquiry',
    acceptableIntents: ['general_inquiry', 'cancellation'],
    category: 'multilingual',
  },
  {
    name: 'MULTI: 好的谢谢 (OK thanks, Chinese) after availability',
    message: '好的谢谢',
    history: [
      { content: '不好意思，明天上午10:00-12:00已经订满了。场地从12:00开始有空', senderType: 'admin' },
    ],
    expectedIntent: 'general_inquiry',
    category: 'multilingual',
  },
  {
    name: 'MULTI: Chinese booking request',
    message: '明天上午可以约10:00-12:00吗？谢谢',
    history: [
      { content: '早安，请问您今天是不是会稍微晚一点呢？', senderType: 'admin' },
    ],
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'availability_check'],
    category: 'multilingual',
  },

  // =====================================================
  // COACHING FOLLOW-UPS — must stay coaching_inquiry
  // =====================================================
  {
    name: 'REAL: Coaching time confirmation "1pm sounds good"',
    message: '1pm sounds good ',
    history: [
      { content: 'Hello ka, I wanted to book another one person golf lesson for next Wednesday 😊', senderType: 'user' },
      { content: 'Good morning! We have the following times available for next week.', senderType: 'assistant' },
      { content: "Pro Min's Coaching Availability:\nMarch\n• Wed 18: 13.00–16.00", senderType: 'assistant' },
    ],
    expectedIntent: 'coaching_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: Coaching time confirmation "4pm is alright too!"',
    message: '4pm is alright too!',
    history: [
      { content: 'Hello ka, I wanted to book another one person golf lesson for next Wednesday 😊', senderType: 'user' },
      { content: 'Good morning! We have the following times available for next week.', senderType: 'assistant' },
      { content: "Pro Min's Coaching Availability:\nMarch\n• Wed 18: 13.00–16.00", senderType: 'assistant' },
      { content: '1pm sounds good ', senderType: 'user' },
      { content: 'Apologies, we actually have a private event during this time next week, should we ask Min if he would be available at an earlier time (e.g. 11am, 11.30am) or rather 4pm?', senderType: 'assistant' },
    ],
    expectedIntent: 'coaching_inquiry',
    category: 'real_world',
  },
  {
    name: 'REAL: Coaching follow-up with coach name in TH context',
    message: 'ได้ค่ะ',
    history: [
      { content: 'อยากจองเรียนกอล์ฟกับโปรมินค่ะ', senderType: 'user' },
      { content: 'โปรมินว่างวันพุธ 13.00-16.00 ค่ะ', senderType: 'assistant' },
      { content: '14.00 ได้มั้ยคะ', senderType: 'user' },
      { content: '14.00 ว่างค่ะ จองเลยนะคะ?', senderType: 'assistant' },
    ],
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'booking_request'],
    category: 'real_world',
  },
];

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  got: string;
  source: string;
  timeMs: number;
}

async function runEval() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      Intent Classifier Evaluation Suite          ║');
  console.log('║      Model: ' + (process.env.INTENT_CLASSIFIER_MODEL || 'gpt-4o-mini').padEnd(37) + '║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];
  const categories = new Map<string, { passed: number; total: number }>();

  for (const tc of TEST_CASES) {
    try {
      const result = await classifyIntent(tc.message, tc.history);

      const acceptable = tc.acceptableIntents || [tc.expectedIntent];
      const passed = acceptable.includes(result.intent);
      const status = passed ? '✅' : '❌';

      console.log(`${status} [${tc.category}] ${tc.name}`);
      console.log(`   "${tc.message}" → ${result.intent} (via ${result.source}, ${result.classificationTimeMs}ms)`);
      if (!passed) {
        console.log(`   Expected: ${tc.expectedIntent}${tc.acceptableIntents ? ` (also OK: ${tc.acceptableIntents.join(', ')})` : ''}`);
      }

      results.push({
        name: tc.name,
        category: tc.category,
        passed,
        expected: tc.expectedIntent,
        got: result.intent,
        source: result.source,
        timeMs: result.classificationTimeMs,
      });

      // Track per-category
      const cat = categories.get(tc.category) || { passed: 0, total: 0 };
      cat.total++;
      if (passed) cat.passed++;
      categories.set(tc.category, cat);

    } catch (error) {
      console.log(`💥 [${tc.category}] ${tc.name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      results.push({
        name: tc.name,
        category: tc.category,
        passed: false,
        expected: tc.expectedIntent,
        got: 'ERROR',
        source: 'error',
        timeMs: 0,
      });
      const cat = categories.get(tc.category) || { passed: 0, total: 0 };
      cat.total++;
      categories.set(tc.category, cat);
    }
  }

  // Summary
  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.timeMs, 0) / results.length);
  const regexCount = results.filter(r => r.source === 'regex').length;
  const llmCount = results.filter(r => r.source === 'llm').length;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                   RESULTS                        ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Total: ${totalPassed}/${totalTests} passed (${Math.round(totalPassed/totalTests*100)}%)`.padEnd(51) + '║');
  console.log(`║  Avg classification time: ${avgTime}ms`.padEnd(51) + '║');
  console.log(`║  Regex fast-path: ${regexCount}/${totalTests} | LLM: ${llmCount}/${totalTests}`.padEnd(51) + '║');
  console.log('╠══════════════════════════════════════════════════╣');

  categories.forEach((stats, category) => {
    const pct = Math.round(stats.passed / stats.total * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    console.log(`║  ${category.padEnd(22)} ${bar} ${pct}% (${stats.passed}/${stats.total})`.padEnd(51) + '║');
  });

  console.log('╚══════════════════════════════════════════════════╝');

  // List failures
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => {
      console.log(`  ❌ ${f.name}: expected "${f.expected}" got "${f.got}" (${f.source})`);
    });
  }

  // Exit with non-zero if any failures
  process.exit(failures.length > 0 ? 1 : 0);
}

runEval().catch(err => {
  console.error('Eval suite crashed:', err);
  process.exit(2);
});
