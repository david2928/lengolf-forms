#!/usr/bin/env npx tsx
// E2E AI Suggestion Evaluation Suite
// Tests the full suggest-response pipeline with real conversations and customer context
// Run: npx tsx scripts/eval-e2e-suggestions.ts
//
// Prerequisites:
// - Dev server running on localhost:3000 with SKIP_AUTH=true
// - .env loaded with OPENAI_API_KEY

interface ConversationMessage {
  content: string;
  senderType: string;
  createdAt: string;
}

interface E2ETestCase {
  name: string;
  description: string;
  /** The customer message to generate a suggestion for */
  customerMessage: string;
  /** Previous messages in the conversation (before the customer message) */
  history: ConversationMessage[];
  /** Real conversation ID (for reference) */
  conversationId: string;
  /** Real customer ID — API will fetch their actual packages, bookings, etc. */
  customerId: string | null;
  /** Channel type */
  channelType: 'line' | 'website';
  /** What the staff actually replied (ground truth) */
  actualStaffResponse: string;
  /** Expected intent classification */
  expectedIntent: string;
  /** Acceptable intents (if ambiguous) */
  acceptableIntents?: string[];
  /** Key topics that should appear in AI response */
  expectedTopics: string[];
  /** Topics that should NOT appear (hallucination check) */
  forbiddenTopics?: string[];
  /** Golden eval: expected function call (deterministic assertion) */
  expectedFunction?: string | null;
  /** Golden eval: functions that must NOT be called */
  mustNotCall?: string[];
  /** Golden eval: max word count for response */
  maxWords?: number;
  /** Golden eval: response must contain these substrings */
  mustContain?: string[];
  /** Golden eval: response must NOT contain these substrings */
  mustNotContain?: string[];
  /** Mark as golden eval case (stricter pass/fail) */
  isGolden?: boolean;
}

// =====================================================
// TEST CASES — Real conversations at different states
// =====================================================
const TEST_CASES: E2ETestCase[] = [

  // --- CONVERSATION 1: New customer booking (Thai) ---
  // Sunai: Booking golf sim, first-time, asks about buy-1-get-1 promo
  {
    name: 'C1-MSG1: New customer wants to book simulator (TH)',
    description: 'First message from new customer. No history. Should greet and ask for details.',
    customerMessage: 'สวัสดีค่ะ สนใจจอง golf simulator วันนี้ 1 ชั่วโมงค่ะ',
    history: [],
    conversationId: '186c3a9a-6d74-451b-a0e4-0323469abf03',
    customerId: 'd75aa97d-7d12-4d69-8a40-76ce044e36e0', // Sunai
    channelType: 'line',
    actualStaffResponse: 'สวัสดีค่ะ 🙏 ได้เลยค่ะ',
    expectedIntent: 'booking_request',
    expectedTopics: ['booking', 'time', 'bay'],
  },
  {
    name: 'C1-MSG5: First-timer asks about buy-1-get-1 promo (TH)',
    description: 'Customer asks if first-time promo applies. Should confirm promo exists.',
    customerMessage: 'ครั้งแรกเป็น 1ชั่วโมงฟรี1ชั่วโมงใช่ไหมคะ ถ้าใช้เลยครั้งนี้ได้ไหมคะ',
    history: [
      { content: 'สวัสดีค่ะ สนใจจอง golf simulator วันนี้ 1 ชั่วโมงค่ะ', senderType: 'user', createdAt: '2026-01-31T08:35:58Z' },
      { content: 'สวัสดีค่ะ 🙏 ได้เลยค่ะ', senderType: 'admin', createdAt: '2026-01-31T08:41:27Z' },
      { content: 'สำหรับการเข้าใช้บริการครั้งแรก\nแอดมินขอข้อมูลเพิ่มเติมดังนี้ค่า 🙏\n\n🏌 ลงทะเบียนลูกค้าใหม่\n• ชื่อ\n• เบอร์โทร\n• อีเมล์\n\n⛳ รายละเอียดการจอง\n• วันเวลาและจำนวนชั่วโมง\n• จำนวนผู้เล่น\n• Social Bay / AI Bay', senderType: 'admin', createdAt: '2026-01-31T08:41:39Z' },
      { content: 'Sunai Sinsawat (Asia)\n0909933501\n1 ชั่วโมง วันนี้เวลา 20.00\n3 คน\nสนใจจองแบบ social bay ค่ะ', senderType: 'user', createdAt: '2026-01-31T08:47:19Z' },
    ],
    conversationId: '186c3a9a-6d74-451b-a0e4-0323469abf03',
    customerId: 'd75aa97d-7d12-4d69-8a40-76ce044e36e0',
    channelType: 'line',
    actualStaffResponse: 'ใช้ได้เลยค่ะ ☺️ เดี๋ยวจัด booking ให้สักครู่นะคะ 🙏',
    expectedIntent: 'promotion_inquiry',
    acceptableIntents: ['promotion_inquiry', 'booking_request'],
    expectedTopics: ['promo', 'free', 'hour'],
  },

  // --- CONVERSATION 2: Club rental inquiry (EN, website) ---
  // Unknown customer asking about renting clubs for outdoor golf
  {
    name: 'C2-MSG3: How to book rental clubs (EN)',
    description: 'Customer already stated they want 3 sets. Asks about booking process.',
    customerMessage: 'how can I book the rental club ??',
    history: [
      { content: 'hi, we booked and play on 6th march 2026 at Bangkok golf club 10am tee time', senderType: 'customer', createdAt: '2026-02-24T05:57:44Z' },
      { content: 'wish to use 3 sets of rental clubs for the above play', senderType: 'customer', createdAt: '2026-02-24T05:58:09Z' },
    ],
    conversationId: '22f2050e-a415-4a91-a5e5-4e4c8987459c',
    customerId: null, // No linked customer
    channelType: 'website',
    actualStaffResponse: "Hello, unfortunately we have 1 men's club and 1 women's club for rent, the clubs rental will be 1,200baht for 24hr + 500 fee for transport. You can book with us here.",
    expectedIntent: 'equipment_inquiry',
    expectedTopics: ['club', 'rental'],
  },
  {
    name: 'C2-MSG5: "need 3 sets" after told only 2 available (EN)',
    description: 'Customer insists on 3 sets after being told only 2 available. Contextual follow-up.',
    customerMessage: 'need 3 sets',
    history: [
      { content: 'hi, we booked and play on 6th march 2026 at Bangkok golf club 10am tee time', senderType: 'customer', createdAt: '2026-02-24T05:57:44Z' },
      { content: 'wish to use 3 sets of rental clubs for the above play', senderType: 'customer', createdAt: '2026-02-24T05:58:09Z' },
      { content: 'how can I book the rental club ??', senderType: 'customer', createdAt: '2026-02-24T05:58:42Z' },
      { content: "Hello, unfortunately we have 1 men's club and 1 women's club for rent, the clubs rental will be 1,200baht for 24hr + 500 fee for transport.", senderType: 'staff', createdAt: '2026-02-24T06:16:58Z' },
    ],
    conversationId: '22f2050e-a415-4a91-a5e5-4e4c8987459c',
    customerId: null,
    channelType: 'website',
    actualStaffResponse: "The current 3 sets we have (1 Women's, 2 Men's) for your 10 am tee time, we offer Premium sets at 1,200 THB or our brand new Premium+ sets.",
    expectedIntent: 'equipment_inquiry',
    expectedTopics: ['club', 'set'],
  },

  // --- CONVERSATION 3: Coaching booking (EN, returning customer Calvin) ---
  // Long-term customer with coaching package
  {
    name: 'C3-MSG1: Regular asks to book coaching (EN)',
    description: 'Returning customer Calvin wants to book coaching. Has coaching package.',
    customerMessage: 'hi can i book pro at 21 sunday 6pm?',
    history: [],
    conversationId: 'a6a1d5f9-1f36-48f5-a03b-77a0e022cbdd',
    customerId: '978f31df-03a0-4f5b-87b3-7ee806f92a35', // Calvin
    channelType: 'line',
    actualStaffResponse: 'Hi Calvin, let us create the booking for you.',
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'booking_request'],
    expectedTopics: ['booking', 'coach'],
  },
  {
    name: 'C3-MSG36: "Is there coach tomorrow?" after self-practice booking',
    description: 'Calvin asks about coaching after booking a self-practice bay.',
    customerMessage: 'Is there coach tomorrow?',
    history: [
      { content: 'Can I book 3 to 4pm on 27th Dec?', senderType: 'user', createdAt: '2025-12-26T08:35:09Z' },
      { content: 'Hi Calvin, let us create the booking for you.', senderType: 'admin', createdAt: '2025-12-26T08:36:05Z' },
      { content: '📋 Booking - Sat, Dec 27 15:00-16:00 (ID: BK2512268ICF)', senderType: 'admin', createdAt: '2025-12-26T08:36:52Z' },
    ],
    conversationId: 'a6a1d5f9-1f36-48f5-a03b-77a0e022cbdd',
    customerId: '978f31df-03a0-4f5b-87b3-7ee806f92a35',
    channelType: 'line',
    actualStaffResponse: 'Tomorrow, there will be no coach available.',
    expectedIntent: 'coaching_inquiry',
    expectedTopics: ['coach', 'available'],
  },
  {
    name: 'C3-MSG40: Package extension request (EN)',
    description: 'Calvin asks to extend his coaching package by a month. Complex request.',
    customerMessage: 'Hi. Is there any possibility that I can extend my package by one more month? I have still two more coaching sessions.',
    history: [
      { content: 'Is there coach tomorrow?', senderType: 'user', createdAt: '2025-12-27T08:05:17Z' },
      { content: 'Tomorrow, there will be no coach available.', senderType: 'admin', createdAt: '2025-12-27T08:25:50Z' },
      { content: "Pro Min's Coaching Availability:\nDecember\n• Tue 30: 13.00–15.00\n• Wed 31: 12.00–16.00\nJanuary\n• Thu 1: 12.00–16.00\n• Fri 2: 12.00–16.00", senderType: 'admin', createdAt: '2025-12-27T08:27:08Z' },
    ],
    conversationId: 'a6a1d5f9-1f36-48f5-a03b-77a0e022cbdd',
    customerId: '978f31df-03a0-4f5b-87b3-7ee806f92a35',
    channelType: 'line',
    actualStaffResponse: 'Sure, we will extend your package expiration date by 1 month.',
    expectedIntent: 'modification_request',
    acceptableIntents: ['modification_request', 'general_inquiry'],
    expectedTopics: ['package', 'extend'],
  },

  // --- CONVERSATION 4: Parking + location inquiry (TH) ---
  // Nuk asking about parking, directions
  {
    name: 'C4-MSG1: Parking inquiry (TH)',
    description: 'Customer asks about parking at the building.',
    customerMessage: 'ที่ตึกมีที่จอดรถไหมคะ',
    history: [
      { content: 'สวัสดีค่า', senderType: 'user', createdAt: '2026-02-24T06:00:00Z' },
    ],
    conversationId: '9e10b58a-ea7a-455a-837f-f179ae0267de',
    customerId: '2d211568-ef7d-4be9-9e2d-6951a2637b3e', // Nuk
    channelType: 'line',
    actualStaffResponse: 'สวัสดีค่ะ 🙏 มีที่จอดรถในตึกค่ะ เสียค่าจอดรถค่ะ แต่เดี๋ยวเอาใบเสร็จให้ไม่ต้องเสียค่ะ',
    expectedIntent: 'location_inquiry',
    expectedTopics: ['parking', 'จอดรถ'],
    forbiddenTopics: ['WhatsApp', 'Instagram', 'Facebook'],
  },

  // --- CONVERSATION 5: Bay availability + booking (TH) ---
  // JJ asking about availability then booking
  {
    name: 'C5-MSG1: Bay availability check (TH)',
    description: 'Customer asks if bays are available.',
    customerMessage: 'มีเบย์ว่างไหมคะ',
    history: [
      { content: 'สวัสดีค่ะ', senderType: 'user', createdAt: '2026-02-24T06:00:00Z' },
    ],
    conversationId: '82f58fa5-1d3b-43df-bcf3-1f2aebf31e22',
    customerId: '434330dd-90f3-4153-99d9-e34890bb98c9', // JJ
    channelType: 'line',
    actualStaffResponse: 'สวัสดีค่ะ สนใจจองวันไหน เวลาอะไรคะ',
    expectedIntent: 'availability_check',
    expectedTopics: ['available', 'ว่าง', 'day', 'time', 'วัน'],
  },

  // --- CONVERSATION 6: Chinese customer - availability (ZH) ---
  // Tia asking in Chinese about availability
  {
    name: 'C6: Chinese booking request',
    description: 'Chinese customer asking to book specific time slot tomorrow.',
    customerMessage: '明天上午可以约10:00-12:00吗？谢谢',
    history: [
      { content: '早安，请问您今天是不是会稍微晚一点呢？', senderType: 'admin', createdAt: '2026-02-25T01:00:00Z' },
    ],
    conversationId: 'b95cd778-4df4-4000-afee-63c60be919b9',
    customerId: 'c14e806c-f9b1-4e5d-b9d0-70d51e265d18', // Tia (Xu Xue)
    channelType: 'line',
    actualStaffResponse: '不好意思，明天上午10:00–12:00已经订满了。场地从12:00开始有空',
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'availability_check'],
    expectedTopics: ['10:00', '12:00', 'tomorrow'],
  },

  // --- CONVERSATION 7: Pricing follow-up (TH) ---
  // Juls asking about pricing and packages
  {
    name: 'C7: Party package inquiry (TH)',
    description: 'Customer asks about group package without food.',
    customerMessage: 'แล้วมีแบบที่ไม่มีอาหารด้วยมั้ยครับ',
    history: [
      { content: 'สวัสดีค่ะ สำหรับลูกค้ามากกว่า 10 ท่าน ทางเราแนะนำเป็นแพ็กเกจปาร์ตี้นะคะ ☺️ ซึ่งรวมอาหารและเครื่องดื่มด้วยค่ะ', senderType: 'admin', createdAt: '2026-02-25T03:00:00Z' },
    ],
    conversationId: '67960a7a-51dc-463a-944b-f3f7ede80e96',
    customerId: 'bb7b8995-9eb5-4256-88af-424e228acb5b', // Juls
    channelType: 'line',
    actualStaffResponse: 'มีค่ะ สามารถจองเฉพาะเบย์อย่างเดียวได้ค่ะ',
    expectedIntent: 'pricing_inquiry',
    acceptableIntents: ['pricing_inquiry', 'facility_inquiry'],
    expectedTopics: ['package', 'bay'],
  },

  // --- CONVERSATION 8: Coaching + pricing (EN) ---
  // Karan asking about coaching availability and pricing
  {
    name: 'C8-MSG1: Coaching lesson with left-handed clubs (EN)',
    description: 'First message: interested in coaching + asks about equipment.',
    customerMessage: 'Hi I am interested in doing a one hour lesson for golf, do you guys have left handed clubs?',
    history: [],
    conversationId: 'f6a4162e-0718-4c43-88f0-4b6d0fa5e962',
    customerId: 'f7360230-9ca0-4828-b0b8-0ed297deaa97', // Karan
    channelType: 'line',
    actualStaffResponse: 'Hello, yes we have left-handed clubs available. For coaching, sessions are 1,800 baht per hour.',
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'equipment_inquiry'],
    expectedTopics: ['lesson', 'coach', 'club', 'left'],
  },

  // --- CONVERSATION 9: Booking confirmation flow (EN) ---
  // Win Lwin confirming coaching details
  {
    name: 'C9: Coaching pricing confirmation (EN)',
    description: 'Customer asks to confirm the coaching price.',
    customerMessage: 'Its is 1800 baht for the lesson right',
    history: [
      { content: 'Hi I am interested in golf lessons', senderType: 'user', createdAt: '2026-02-24T04:00:00Z' },
      { content: 'Yes, 1800 baht for 1 hour. Let us know when you would be available.', senderType: 'admin', createdAt: '2026-02-24T04:01:00Z' },
    ],
    conversationId: '254f67fd-6626-457f-9a32-5d94ffabd84d',
    customerId: '71f57770-93a2-46ee-b1ae-c256141775f5', // Win Lwin
    channelType: 'line',
    actualStaffResponse: 'Yes, 1800 baht for 1 hour.',
    expectedIntent: 'pricing_inquiry',
    acceptableIntents: ['pricing_inquiry', 'coaching_inquiry'],
    expectedTopics: ['1800', 'baht', 'hour', 'lesson'],
  },

  // =====================================================
  // GOLDEN EVAL CASES — Deterministic function alignment
  // These have stricter pass/fail based on tool usage
  // =====================================================

  // GOLDEN 1: Booking with full details → should check availability, NOT ask questions
  {
    name: 'GOLDEN-1: Booking with full details (TH)',
    description: 'Customer provides name, phone, date, hours — AI should act, not ask.',
    customerMessage: 'จองวันเสาร์ 2 ชม. ครับ ชื่อ สมชาย 0891234567',
    history: [],
    conversationId: '186c3a9a-6d74-451b-a0e4-0323469abf03',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'ได้เลยค่ะ เช็คเบย์ว่างให้สักครู่นะคะ',
    expectedIntent: 'booking_request',
    expectedTopics: ['เสาร์'],
    expectedFunction: 'check_bay_availability',
    mustNotContain: ['ชื่ออะไร', 'เบอร์โทร', 'กี่ชั่วโมง'],
    isGolden: true,
  },

  // GOLDEN 2: Coaching inquiry → must use get_coaching_availability, NOT check_bay_availability
  {
    name: 'GOLDEN-2: Coaching inquiry uses correct tool (TH)',
    description: 'Customer asks about coaching — must call get_coaching_availability.',
    customerMessage: 'อยากเรียนกอล์ฟค่ะ มีโค้ชว่างวันไหนบ้าง',
    history: [],
    conversationId: 'a6a1d5f9-1f36-48f5-a03b-77a0e022cbdd',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'สวัสดีค่ะ มีโค้ชว่างหลายวันเลยค่ะ ส่งตารางให้นะคะ',
    expectedIntent: 'coaching_inquiry',
    expectedTopics: ['โค้ช'],
    expectedFunction: 'get_coaching_availability',
    mustNotCall: ['check_bay_availability', 'check_club_availability'],
    isGolden: true,
  },

  // GOLDEN 3: Free trial question → explain process, no tool needed
  {
    name: 'GOLDEN-3: Free trial explanation (EN)',
    description: 'Customer asks about free trial — should explain, NOT check availability.',
    customerMessage: 'How does the free trial lesson work?',
    history: [],
    conversationId: 'f6a4162e-0718-4c43-88f0-4b6d0fa5e962',
    customerId: null,
    channelType: 'website',
    actualStaffResponse: 'The free trial is a complimentary 30-minute session with one of our coaches. No commitment required.',
    expectedIntent: 'coaching_inquiry',
    acceptableIntents: ['coaching_inquiry', 'general_inquiry'],
    expectedTopics: ['trial', 'free'],
    expectedFunction: null,
    mustNotCall: ['check_bay_availability', 'create_booking'],
    isGolden: true,
  },

  // GOLDEN 4: Thai greeting → ultra-brief, must contain ค่ะ, max 8 words
  {
    name: 'GOLDEN-4: Thai greeting brevity (TH)',
    description: 'Simple Thai greeting — response must be ultra-brief Thai.',
    customerMessage: 'สวัสดีค่ะ',
    history: [],
    conversationId: '9e10b58a-ea7a-455a-837f-f179ae0267de',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'สวัสดีค่ะ ยินดีให้บริการค่ะ',
    expectedIntent: 'greeting',
    expectedTopics: [],
    expectedFunction: null,
    mustContain: ['ค่ะ'],
    maxWords: 8,
    isGolden: true,
  },

  // GOLDEN 5: Package pricing → quote exact price, no hedging
  {
    name: 'GOLDEN-5: Package pricing exactness (TH)',
    description: 'Customer asks package price — must quote exact number.',
    customerMessage: 'แพ็กเกจ 10 ชั่วโมง ราคาเท่าไหร่คะ',
    history: [],
    conversationId: '67960a7a-51dc-463a-944b-f3f7ede80e96',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'แพ็กเกจ 10 ชั่วโมง ราคา 6,500 บาทค่ะ',
    expectedIntent: 'pricing_inquiry',
    expectedTopics: ['แพ็กเกจ'],
    mustNotContain: ['น่าจะ', 'ประมาณ', 'ไม่แน่ใจ'],
    isGolden: true,
  },

  // GOLDEN 6: Sticker mid-conversation → use context, don't greet
  {
    name: 'GOLDEN-6: Sticker uses conversation context (TH)',
    description: 'Customer sends sticker during booking flow — should continue, not greet.',
    customerMessage: 'sent a sticker',
    history: [
      { content: 'อยากจองวันพรุ่งนี้ค่ะ', senderType: 'user', createdAt: '2026-03-30T06:00:00Z' },
      { content: 'ได้ค่ะ กี่ชั่วโมงดีคะ', senderType: 'admin', createdAt: '2026-03-30T06:01:00Z' },
    ],
    conversationId: '82f58fa5-1d3b-43df-bcf3-1f2aebf31e22',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'รอข้อมูลเพิ่มเติมนะคะ ☺️',
    expectedIntent: 'greeting',
    acceptableIntents: ['greeting', 'booking_request'],
    expectedTopics: [],
    mustNotContain: ['สวัสดี', 'Hello', 'Hi!'],
    isGolden: true,
  },

  // GOLDEN 7: Phone number mid-booking → continue flow, don't pivot
  {
    name: 'GOLDEN-7: Phone number continues booking flow (TH)',
    description: 'Customer provides phone after staff asked — should continue booking.',
    customerMessage: '0891234567',
    history: [
      { content: 'จองวันเสาร์ 2 ชม.ค่ะ ชื่อ นุ๊ก', senderType: 'user', createdAt: '2026-03-30T07:00:00Z' },
      { content: 'ได้ค่ะ ขอเบอร์โทรด้วยนะคะ', senderType: 'admin', createdAt: '2026-03-30T07:01:00Z' },
    ],
    conversationId: '82f58fa5-1d3b-43df-bcf3-1f2aebf31e22',
    customerId: null,
    channelType: 'line',
    actualStaffResponse: 'ขอบคุณค่ะ เช็คเบย์ว่างให้สักครู่นะคะ',
    expectedIntent: 'booking_request',
    acceptableIntents: ['booking_request', 'general_inquiry'],
    expectedTopics: [],
    expectedFunction: 'check_bay_availability',
    mustNotContain: ['สวัสดี', 'ต้องการอะไร'],
    isGolden: true,
  },
];

// =====================================================
// E2E Test Runner
// =====================================================

interface E2EResult {
  name: string;
  passed: boolean;
  intentCorrect: boolean;
  detectedIntent: string;
  intentSource: string;
  responseTimeMs: number;
  confidenceScore: number;
  aiResponse: string;
  actualResponse: string;
  topicsCovered: string[];
  topicsMissed: string[];
  forbiddenFound: string[];
  functionCalled: string | null;
  customerContextIncluded: boolean;
  isGolden?: boolean;
  goldenAssertions?: {
    functionCorrect?: boolean;
    noForbiddenCalls?: boolean;
    withinWordLimit?: boolean;
    containsRequired?: boolean;
    noForbiddenContent?: boolean;
  };
  error?: string;
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function callSuggestAPI(testCase: E2ETestCase): Promise<{
  success: boolean;
  suggestion?: {
    suggestedResponse: string;
    suggestedResponseThai?: string;
    confidenceScore: number;
    responseTime: number;
    functionCalled?: string;
    functionResult?: unknown;
    suggestedImages?: unknown[];
    debugContext?: {
      intentDetected: string;
      intentSource: string;
      intentClassificationMs: number;
      customerData?: unknown;
      businessContextIncluded: boolean;
      [key: string]: unknown;
    };
  };
  error?: string;
}> {
  const body = {
    customerMessage: testCase.customerMessage,
    conversationId: testCase.conversationId,
    channelType: testCase.channelType,
    customerId: testCase.customerId,
    dryRun: true,
    includeDebugContext: true,
    conversationContext: testCase.history.map(h => ({
      content: h.content,
      senderType: h.senderType,
      createdAt: h.createdAt,
    })),
  };

  const resp = await fetch(`${API_BASE}/api/ai/suggest-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return resp.json();
}

function checkTopics(response: string, topics: string[]): { covered: string[]; missed: string[] } {
  const lower = response.toLowerCase();
  const covered: string[] = [];
  const missed: string[] = [];

  for (const topic of topics) {
    if (lower.includes(topic.toLowerCase())) {
      covered.push(topic);
    } else {
      missed.push(topic);
    }
  }

  return { covered, missed };
}

async function runE2E() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          E2E AI Suggestion Evaluation Suite                     ║');
  console.log('║          Tests full pipeline with real customer context         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Check if dev server is running
  try {
    const health = await fetch(`${API_BASE}/api/health`).catch(() => null);
    if (!health || !health.ok) {
      // Try a simple endpoint
      const check = await fetch(`${API_BASE}`).catch(() => null);
      if (!check) {
        console.error('❌ Dev server not running at ' + API_BASE);
        console.error('   Start it with: npm run dev');
        process.exit(2);
      }
    }
  } catch {
    // Continue anyway — the API call will fail with a clear error
  }

  const results: E2EResult[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`\n${'─'.repeat(66)}`);
    console.log(`[${i + 1}/${TEST_CASES.length}] ${tc.name}`);
    console.log(`  ${tc.description}`);
    console.log(`  Customer: "${tc.customerMessage.substring(0, 80)}${tc.customerMessage.length > 80 ? '...' : ''}"`);

    try {
      const startTime = Date.now();
      const response = await callSuggestAPI(tc);
      const totalTime = Date.now() - startTime;

      if (!response.success || !response.suggestion) {
        console.log(`  ❌ API Error: ${response.error || 'Unknown error'}`);
        results.push({
          name: tc.name,
          passed: false,
          intentCorrect: false,
          detectedIntent: 'ERROR',
          intentSource: 'error',
          responseTimeMs: totalTime,
          confidenceScore: 0,
          aiResponse: '',
          actualResponse: tc.actualStaffResponse,
          topicsCovered: [],
          topicsMissed: tc.expectedTopics,
          forbiddenFound: [],
          functionCalled: null,
          customerContextIncluded: false,
          error: response.error,
        });
        continue;
      }

      const s = response.suggestion;
      const debug = s.debugContext;
      const detectedIntent = debug?.intentDetected || 'unknown';
      const intentSource = debug?.intentSource || 'unknown';
      const aiResponse = s.suggestedResponse || s.suggestedResponseThai || '';

      // Check intent
      const acceptable = tc.acceptableIntents || [tc.expectedIntent];
      const intentCorrect = acceptable.includes(detectedIntent);

      // Check topic coverage — check both EN and TH responses
      const combinedResponse = [aiResponse, s.suggestedResponseThai || ''].join(' ');
      const { covered, missed } = checkTopics(combinedResponse, tc.expectedTopics);

      // Check forbidden topics
      const forbiddenFound: string[] = [];
      if (tc.forbiddenTopics) {
        for (const forbidden of tc.forbiddenTopics) {
          if (combinedResponse.toLowerCase().includes(forbidden.toLowerCase())) {
            forbiddenFound.push(forbidden);
          }
        }
      }

      // Customer context check
      const customerContextIncluded = !!debug?.customerData;

      // Golden eval deterministic assertions
      let goldenAssertions: E2EResult['goldenAssertions'] | undefined;
      let goldenPassed = true;

      if (tc.isGolden) {
        goldenAssertions = {};

        // Function alignment check
        if (tc.expectedFunction !== undefined) {
          goldenAssertions.functionCorrect = tc.expectedFunction === null
            ? !s.functionCalled
            : s.functionCalled === tc.expectedFunction;
          if (!goldenAssertions.functionCorrect) goldenPassed = false;
        }

        // Must-not-call check
        if (tc.mustNotCall && tc.mustNotCall.length > 0) {
          goldenAssertions.noForbiddenCalls = !tc.mustNotCall.includes(s.functionCalled || '');
          if (!goldenAssertions.noForbiddenCalls) goldenPassed = false;
        }

        // Word limit check
        if (tc.maxWords) {
          const wordCount = aiResponse.split(/\s+/).filter(Boolean).length;
          goldenAssertions.withinWordLimit = wordCount <= tc.maxWords;
          if (!goldenAssertions.withinWordLimit) goldenPassed = false;
        }

        // Must-contain check
        if (tc.mustContain && tc.mustContain.length > 0) {
          goldenAssertions.containsRequired = tc.mustContain.every(s => aiResponse.includes(s));
          if (!goldenAssertions.containsRequired) goldenPassed = false;
        }

        // Must-not-contain check
        if (tc.mustNotContain && tc.mustNotContain.length > 0) {
          goldenAssertions.noForbiddenContent = !tc.mustNotContain.some(s => aiResponse.includes(s));
          if (!goldenAssertions.noForbiddenContent) goldenPassed = false;
        }
      }

      // Overall pass: intent correct + no forbidden topics + golden assertions
      const passed = intentCorrect && forbiddenFound.length === 0 && goldenPassed;

      // Print results
      const overallStatus = passed ? '✅' : '❌';
      console.log(`  ${overallStatus} Intent: ${detectedIntent} (${intentSource}) ${intentCorrect ? '' : `Expected: ${tc.expectedIntent}`}`);
      console.log(`  ⏱️  Response: ${s.responseTime}ms | Confidence: ${(s.confidenceScore * 100).toFixed(0)}% | Customer ctx: ${customerContextIncluded ? 'Yes' : 'No'}`);
      if (s.functionCalled) {
        console.log(`  🔧 Function: ${s.functionCalled}`);
      }
      if (s.suggestedImages && (s.suggestedImages as unknown[]).length > 0) {
        console.log(`  🖼️  Images: ${(s.suggestedImages as unknown[]).length} suggested`);
      }

      // Golden assertion results
      if (tc.isGolden && goldenAssertions) {
        console.log('  🏆 Golden assertions:');
        if (goldenAssertions.functionCorrect !== undefined) {
          const icon = goldenAssertions.functionCorrect ? '✅' : '❌';
          console.log(`     ${icon} Function: got "${s.functionCalled || '(none)'}", expected "${tc.expectedFunction ?? '(none)'}"`);
        }
        if (goldenAssertions.noForbiddenCalls !== undefined) {
          const icon = goldenAssertions.noForbiddenCalls ? '✅' : '❌';
          console.log(`     ${icon} No forbidden calls${!goldenAssertions.noForbiddenCalls ? `: called "${s.functionCalled}" (forbidden)` : ''}`);
        }
        if (goldenAssertions.withinWordLimit !== undefined) {
          const wordCount = aiResponse.split(/\s+/).filter(Boolean).length;
          const icon = goldenAssertions.withinWordLimit ? '✅' : '❌';
          console.log(`     ${icon} Word limit: ${wordCount}/${tc.maxWords}`);
        }
        if (goldenAssertions.containsRequired !== undefined) {
          const icon = goldenAssertions.containsRequired ? '✅' : '❌';
          console.log(`     ${icon} Contains required: ${tc.mustContain?.join(', ')}`);
        }
        if (goldenAssertions.noForbiddenContent !== undefined) {
          const icon = goldenAssertions.noForbiddenContent ? '✅' : '❌';
          console.log(`     ${icon} No forbidden content${!goldenAssertions.noForbiddenContent ? `: found "${tc.mustNotContain?.filter(s => aiResponse.includes(s)).join(', ')}"` : ''}`);
        }
      }

      // Print AI vs Actual comparison
      console.log(`\n  📝 AI Response:`);
      const aiLines = aiResponse.split('\n').filter(Boolean);
      aiLines.forEach(line => console.log(`     ${line.substring(0, 100)}`));

      console.log(`  👤 Actual Staff:`);
      const actualLines = tc.actualStaffResponse.split('\n').filter(Boolean);
      actualLines.forEach(line => console.log(`     ${line.substring(0, 100)}`));

      if (missed.length > 0) {
        console.log(`  ⚠️  Topics missed: ${missed.join(', ')}`);
      }
      if (forbiddenFound.length > 0) {
        console.log(`  🚫 Forbidden found: ${forbiddenFound.join(', ')}`);
      }

      results.push({
        name: tc.name,
        passed,
        intentCorrect,
        detectedIntent,
        intentSource,
        responseTimeMs: s.responseTime,
        confidenceScore: s.confidenceScore,
        aiResponse,
        actualResponse: tc.actualStaffResponse,
        topicsCovered: covered,
        topicsMissed: missed,
        forbiddenFound,
        functionCalled: s.functionCalled || null,
        customerContextIncluded,
        isGolden: tc.isGolden,
        goldenAssertions,
      });

    } catch (error) {
      console.log(`  💥 Error: ${error instanceof Error ? error.message : error}`);
      results.push({
        name: tc.name,
        passed: false,
        intentCorrect: false,
        detectedIntent: 'CRASH',
        intentSource: 'error',
        responseTimeMs: 0,
        confidenceScore: 0,
        aiResponse: '',
        actualResponse: tc.actualStaffResponse,
        topicsCovered: [],
        topicsMissed: tc.expectedTopics,
        forbiddenFound: [],
        functionCalled: null,
        customerContextIncluded: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // =====================================================
  // Summary
  // =====================================================
  const totalPassed = results.filter(r => r.passed).length;
  const intentCorrect = results.filter(r => r.intentCorrect).length;
  const withCustomerCtx = results.filter(r => r.customerContextIncluded).length;
  const withFunctions = results.filter(r => r.functionCalled).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length);
  const avgConfidence = (results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length * 100).toFixed(0);

  // Golden eval stats
  const goldenResults = results.filter(r => r.isGolden);
  const goldenPassed = goldenResults.filter(r => r.passed).length;

  console.log(`\n\n${'═'.repeat(66)}`);
  console.log('                        RESULTS SUMMARY');
  console.log('═'.repeat(66));
  console.log(`  Overall:           ${totalPassed}/${results.length} passed (${Math.round(totalPassed / results.length * 100)}%)`);
  console.log(`  Intent accuracy:   ${intentCorrect}/${results.length} correct (${Math.round(intentCorrect / results.length * 100)}%)`);
  console.log(`  Avg response time: ${avgTime}ms`);
  console.log(`  Avg confidence:    ${avgConfidence}%`);
  console.log(`  Customer context:  ${withCustomerCtx}/${results.length} had real customer data`);
  console.log(`  Function calls:    ${withFunctions}/${results.length} triggered tool use`);

  if (goldenResults.length > 0) {
    console.log(`\n  🏆 Golden evals:   ${goldenPassed}/${goldenResults.length} passed (${Math.round(goldenPassed / goldenResults.length * 100)}%)`);
    goldenResults.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      const failReasons: string[] = [];
      if (r.goldenAssertions?.functionCorrect === false) failReasons.push('wrong function');
      if (r.goldenAssertions?.noForbiddenCalls === false) failReasons.push('forbidden call');
      if (r.goldenAssertions?.withinWordLimit === false) failReasons.push('too long');
      if (r.goldenAssertions?.containsRequired === false) failReasons.push('missing content');
      if (r.goldenAssertions?.noForbiddenContent === false) failReasons.push('forbidden content');
      if (!r.intentCorrect) failReasons.push('wrong intent');
      console.log(`     ${icon} ${r.name}${failReasons.length > 0 ? ` — ${failReasons.join(', ')}` : ''}`);
    });
  }

  // List failures
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n  Failed tests:');
    failures.forEach(f => {
      const reasons = [];
      if (!f.intentCorrect) reasons.push(`intent: got "${f.detectedIntent}"`);
      if (f.forbiddenFound.length > 0) reasons.push(`forbidden: ${f.forbiddenFound.join(', ')}`);
      if (f.error) reasons.push(`error: ${f.error}`);
      console.log(`    ❌ ${f.name}`);
      console.log(`       ${reasons.join(' | ')}`);
    });
  }

  // Quality observations
  console.log('\n  Quality observations:');
  results.forEach(r => {
    if (r.topicsMissed.length > 0) {
      console.log(`    ⚠️  ${r.name}: missing topics [${r.topicsMissed.join(', ')}]`);
    }
  });

  console.log('═'.repeat(66));

  // Save detailed results to JSON
  const outputPath = 'scripts/eval-e2e-results.json';
  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);

  process.exit(failures.length > 0 ? 1 : 0);
}

runE2E().catch(err => {
  console.error('E2E eval suite crashed:', err);
  process.exit(2);
});
