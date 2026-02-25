# AI Chat Suggestion Improvement Ideas

Based on review of 56 random E2E samples from real conversations (3 batches of 10 conversations).

## Implementation Status (2026-02-25)

| # | Issue | Status | Fix |
|---|-------|--------|-----|
| 1 | Hallucinated availability | NOT A BUG | Stale data in test — real-time system is correct |
| 2 | Over-verbose responses | FIXED | Added BREVITY rules + English length constraints |
| 3 | Thai language mismatch | NOT A BUG | Thai responses go into suggestedResponse correctly |
| 4 | Internal text leak | FIXED | Customer-facing messages for approval functions |
| 5 | Promotion assumptions | FIXED | Added "never auto-apply promos" rule |
| 6 | Greeting hallucination | FIXED | Strict greeting rules + cleared embedding context for greetings |
| 7 | Multi-booking handling | PARTIALLY FIXED | Prompt rule added, but function call takes over |
| 8 | Warmth/personalization | FIXED | Added warmth rules + customer notes encouragement |
| 9 | Mid-conversation greeting | FIXED | Enhanced hasAssistantMessageToday check + [NEEDS MANAGEMENT] tag stripping |

## Priority 1: HIGH Impact

### 1. Hallucinated Availability (False "Fully Booked")
**The most critical issue.** The AI confidently tells customers "Sorry, fully booked" when the slot IS available. This directly loses revenue.

**Examples:**
- Customer: "Hi, do you have anything open for 19:00?"
  - AI: "Sorry, all bays are fully booked at 19:00 today"
  - Staff: "Hello, yes we do have a bay open at 19:00" (opposite answer)
- Customer: "Can I book 2 hours social bay at 7?"
  - AI: "Sorry, the social bays are fully booked at 19:00"
  - Staff: "Hello, of course we can send that up for you"
- Customer: Provides details for booking at 21:00
  - AI: "21:00 is full. Would you like 22:00?"
  - Staff: "1 hour or 2 hours?" (proceeding normally)

**Root cause:** The `check_bay_availability`/`create_booking` functions use `dryRun: true` in testing, but even in production they may return stale data, and the AI presents uncertain data as definitive.

**Fix:** When availability is unclear or function returns unavailable, the AI should say "Let me check that for you" rather than asserting "fully booked." Add an INTERNAL NOTE: [Requires verification of availability] tag. Never reject a booking proactively.

---

### 2. Over-Verbose / Information Dumping
**Staff would reject and rewrite from scratch.** The AI provides 3-5x more text than staff would.

**Examples:**
- Customer: "I'd like to book one hour"
  - AI: "Hello! I can book a one hour slot for you. Which date and start time would you like, how many players, and would you prefer a Social Bay or an AI Bay? I have your name AR and phone 966682335 on file." (5 questions at once)
  - Staff: "Hi. Sure, let us create the booking for you."
- Customer: "Is all equipment like sticks provided?"
  - AI: "Yes, all equipment is provided. Standard club rental is free, left-handed clubs available, Premium clubs 150 THB/hr, Premium+ 250 THB/hr, you don't need to bring anything." (pricing catalog)
  - Staff: "Yes we provide clubs and gloves, it's beginner friendly."
- Customer: "We are in big traffic jam, will be late"
  - AI: "No problem, drive safely. Your booking still runs 19:00 to 21:00, so if you arrive late the session will end at 21:00 and your playtime will be reduced accordingly." (adds unwelcome warning)
  - Staff: "That's no worries, we will see you soon."

**Fix:**
- Add "BREVITY" rule to prompt: "Match typical staff response length (1-2 sentences). Only provide additional detail if explicitly asked."
- Add few-shot examples showing ideal vs over-verbose responses
- Avg staff response: ~10 words. Avg AI: ~40 words. Target: <20 words.

---

### 3. Language Mismatch (Thai Customer Gets English Response)
**Unusable in Thai conversations.** Several cases where customer writes in Thai but AI responds in English.

**Examples:**
- Champ Supachai: Entire conversation in Thai, AI responds in English about LINE linking
- aiResponseThai field is consistently `null` for these cases

**Fix:** Investigate why `aiResponseThai` is null when customer writes in Thai. The language detection should drive response language — if customer writes Thai, response MUST be Thai.

---

### 4. Internal Action Text Leaked as Customer Message
**Completely unusable.** The AI outputs internal function result as the customer-facing response.

**Example:**
- Customer: "I want to cancel tomorrow's lesson with Pro Boss"
  - AI: "Cancel booking for 2026-02-26 - Sorawat Wongkaweepairot - Reason: Schedule conflict"
  - Staff: "We'll cancel that for you."

**Fix:** Add post-processing filter that detects function-result-style output (raw dates, "Reason:", internal IDs) and replaces with natural language acknowledgment.

---

## Priority 2: MEDIUM Impact

### 5. Promotion/Pricing Assumptions
The AI unilaterally applies promotions or quotes prices without being asked.

**Examples:**
- Customer provides booking info, AI auto-applies buy-1-get-1 promo with calculated price
- Customer asks "is it buy 1 get 1?", AI definitively says "that's for new customers" (may be wrong)
- Staff approach: just collect booking info, discuss promos only when asked

**Fix:** Add rule: "Never auto-apply promotions. Only discuss promotions when customer explicitly asks. When unsure about promo eligibility, do not commit — let staff verify."

---

### 6. Greeting Hallucination (Invented Intent from "Hello")
When customer sends just a greeting, AI sometimes invents a response implying booking confirmation or job application context that doesn't exist.

**Examples:**
- Customer: "Hello" -> AI: "Thanks for your interest in working with us. Which role are you interested in?" (no job-seeking indication)
- Customer: Thai greeting -> AI: "Hello, booking confirmed! See you soon." (no booking exists)

**Fix:** For greeting-only messages, AI should ONLY respond with a brief greeting + "How can I help?" Never assume or fabricate intent.

---

### 7. Incomplete Multi-Booking Handling
Complex requests with multiple slots across days are only partially processed.

**Example:**
- Customer: "Book with Min: Tue 3 March Lesson 12-1 + Self Practice 1-2; Wed 4 March Lesson 1-2 + Self Practice 2-3"
- AI: Only processed first slot (Tue 12:00-13:00 coaching)
- Staff: Acknowledged all dates and said they'd check availability

**Fix:** AI should acknowledge the full scope of the request even if it can only process one slot at a time. "Got it — 4 sessions across Tue and Wed with Min. Let me book them one by one."

---

### 8. Missing Personalized Context
Staff references personal details (injuries, preferences) that AI ignores even when customer data is available.

**Examples:**
- Staff: "I hope your left finger injury is better now" (personal touch)
- AI: Generic "Glad to help! See you then."
- Staff: "Khun nok correct? We reserved you two a bag already." (recognized customer)
- AI: "Got it, see you soon. Please come to reception..."

**Fix:** Encourage (not force) the AI to reference customer notes when they contain relevant personal context. This requires customer notes to be populated and surfaced in the prompt.

---

## Priority 3: LOW Impact

### 9. Redundant Greeting in Mid-Conversation
AI says "Hello [Name]!" even on message #7 of a conversation.

**Examples:**
- Message 7: AI opens with "Hello Yoshiro..." (staff just said "Noted, see you soon!")
- Message 5: AI opens with "Hello! Sorry the website..." (staff just said "If it still doesn't work...")

**Fix:** After first exchange in conversation, drop the "Hello [Name]!" prefix. Check conversation history for existing greeting.

---

## Summary Stats from 56 Samples

| Metric | Value |
|--------|-------|
| Avg confidence | 70% |
| Avg response time | 8.9s |
| Customer context available | 64% |
| Function calls triggered | 12.5% |
| Management escalation detected | 1.8% |
| Intent distribution | booking_request 27%, greeting 20%, general_inquiry 11% |

## Implementation Priority Order

1. **Availability hallucination** — Fix function call response handling (highest revenue impact)
2. **Verbosity** — Add brevity rules + few-shot examples to prompt (highest acceptance rate impact)
3. **Internal text leak** — Add post-processing filter (easy fix, high embarrassment)
4. **Language mismatch** — Debug Thai response generation path
5. **Promotion assumptions** — Add "never auto-apply promos" rule
6. **Greeting hallucination** — Restrict greeting responses to generic greeting only
7. **Multi-booking** — Acknowledge full scope before partial processing
8. **Personalized context** — Surface customer notes more prominently
9. **Mid-conversation greetings** — Drop greeting after first exchange
