# AI Suggestion System — Optimization Report

**Date:** 2026-03-01
**Based on:** 405 LLM-as-Judge scored samples across 5 sample files (Feb 25–28, 2026)
**Judge model:** GPT-4o-mini, temperature 0, 4-dimension rubric

---

## Executive Summary

The AI suggestion system scores **3.87/5.0 overall** across 405 evaluated samples. It excels at brevity (4.53) and tone matching (4.07) but underperforms on helpfulness (3.41) and appropriateness (3.74). **53 samples (13.1%) score <= 3.0**, indicating a meaningful failure tail that impacts staff trust and adoption.

The root causes cluster into 8 distinct failure patterns. Six are addressable through prompt/pipeline changes without model upgrades. The top 3 patterns (sticker handling, hallucinated info, false confirmations) account for **56% of all failures**.

### Dimension Scores

| Dimension | Mean | Median | Min | Max | StdDev | Weight |
|-----------|------|--------|-----|-----|--------|--------|
| Appropriateness | 3.74 | 4 | 1 | 5 | 1.03 | 0.30 |
| Helpfulness | 3.41 | 4 | 1 | 5 | 1.08 | 0.30 |
| Tone Match | 4.07 | 4 | 1 | 5 | 0.90 | 0.20 |
| Brevity | 4.53 | 5 | 1 | 5 | 0.66 | 0.20 |
| **Overall** | **3.87** | **4.0** | **1.0** | **5.0** | **0.80** | — |

### Score Distribution

```
5.0       ████████  30  (7.4%)
4.5–4.9   ██████████████  54  (13.3%)
4.0–4.4   ██████████████████████████████████  123  (30.4%)
3.6–3.9   ██████████████████████  80  (19.8%)
3.0–3.5   █████████████████  65  (16.0%)
2.0–2.9   ████████████  49  (12.1%)
1.0–1.9   █  4  (1.0%)
```

---

## Intent-Level Performance

| Intent | Count | Mean | Fail% (<=3.0) | Top Failure Pattern |
|--------|-------|------|---------------|---------------------|
| modification_request | 34 | 3.60 | 20.6% | Booking lookup failures |
| booking_request | 98 | 3.71 | 20.4% | False confirmations, date confusion |
| general_inquiry | 86 | 3.72 | 27.9% | Sticker/photo mishandling |
| cancellation | 12 | 3.75 | 25.0% | Wrong language, missed context |
| greeting | 11 | 3.95 | 9.1% | Over-responding to simple hellos |
| availability_check | 39 | 4.02 | 5.1% | Hallucinated slot info |
| pricing_inquiry | 23 | 4.02 | 13.0% | Wrong pricing data |
| coaching_inquiry | 55 | 4.10 | 3.6% | Minimal issues |
| arrival_notification | 11 | 4.16 | 9.1% | — |
| promotion_inquiry | 11 | 4.23 | 0.0% | None |
| payment_inquiry | 11 | 4.33 | 18.2% | Edge cases |
| equipment_inquiry | 7 | 4.09 | 14.3% | Wrong delivery policy |

**Key takeaway:** The three highest-volume intents (booking_request, general_inquiry, modification_request) all have the highest failure rates. These are the intents that matter most for business operations.

---

## Failure Pattern Analysis

### Pattern 1: Sticker Messages Treated as Empty Greetings
**Impact:** 16 failures (24% of all failures) | All score <= 2.8
**Severity:** High — undermines trust for LINE-heavy users

**What happens:** Customer sends a LINE sticker (appears as "sent a sticker"). The AI responds with generic English "Hello!" or "Hi [name]!" regardless of conversation context. Staff reads the conversation thread and continues the actual topic (confirms booking, provides info, etc.).

**Root cause:** Stickers are filtered from conversation history in `suggest-response-helpers.ts`. The AI receives no context about what the sticker is responding to.

**Worst example (Score 1.0):**
```
Customer: "sent a sticker" (after 56-message booking conversation)
AI:       "Hello!"
Staff:    "Booking - Sat, Feb 7 20:30-22:00 (ID: BK260207FO75)"
```

**Note:** 14 of 16 sticker failures come from a single customer (Tee Mah) who uses stickers as conversational acknowledgments — a standard LINE communication pattern.

**Fix (files to change):**
- `src/lib/ai/suggest-response-helpers.ts` — Stop filtering stickers from history; instead replace with contextual placeholder like "[Customer sent an acknowledgment sticker]"
- `src/lib/ai/skills/core-skill.ts` — Add rule: "When message is a sticker or empty acknowledgment, analyze the last 3 messages to determine what the customer is responding to. Continue the conversation thread in the same language."
- `src/lib/ai/intent-classifier.ts` — When message is "sent a sticker", skip regex fast-path and use conversation history to infer intent from context

**Estimated impact:** Fixes 16 failures → overall score improvement of ~0.05 points

---

### Pattern 2: Hallucinated/Fabricated Information
**Impact:** 15 failures (22% of all failures) | Scores 2.0–3.0
**Severity:** Critical — gives customers confidently wrong information

**What happens:** The AI states factual claims about availability, pricing, policies, or package status that are incorrect. It doesn't distinguish between information from tool calls versus its own assumptions.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "just for next time, are the rates the same for AI and Social?" | "AI bays are priced higher" | "Rates are the same" | 3.0 |
| "Do you deliver?" | "We don't offer delivery" | "Yes, 500 baht fee" | 3.0 |
| Pro Min available today 13:00? | "Pro Min is available!" | "Pro Min is not available today" | 2.6 |
| Check remaining package hours | "2 hours left, expiring April 16" | Different numbers entirely | 2.4 |
| Social bay 12:30–14:00 available? | "Yes, available!" | "Not available" | 3.0 |

**Root cause:** The AI generates plausible-sounding answers from training data when tools don't return results, or misinterprets partial tool results as confirmations. The system prompt says "ALWAYS suggest alternative if something unavailable" but doesn't enforce "ONLY state facts from tool results."

**Fix (files to change):**
- `src/lib/ai/skills/core-skill.ts` — Add explicit rule: "NEVER state availability, pricing, package status, or policy details unless the information comes from a tool call result. If no tool was called or the tool returned no data, say 'ขอเช็คให้สักครู่ค่ะ' / 'Let me check for you' and flag needsManagement."
- `src/lib/ai/skills/booking-skill.ts` — Add rule: "After calling check_bay_availability, only confirm slots that appear in the result. If the result is empty or error, do NOT guess availability."
- `src/lib/ai/suggestion-service.ts` — In post-processing, if the response contains availability/pricing claims but no function was called, lower confidence score and add management flag

**Estimated impact:** Fixes 10–12 failures → prevents the most damaging failure mode (customer receives wrong info)

---

### Pattern 3: False Booking Confirmations
**Impact:** 7 failures (10% of all failures) | Scores 2.0–3.0
**Severity:** Critical — customer believes booking is made when it isn't

**What happens:** The AI calls `create_booking` and responds "Your booking is confirmed!" even when: (a) bays were fully booked, (b) the customer hasn't provided required registration data, or (c) the function call actually failed.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| Requests AI + Social bay bookings | "Your booking is confirmed!" | "11:00-12:00 all bays fully booked" | 2.2 |
| Requests a booking (no phone given) | "Booking confirmed!" | "May I have your phone number?" | 2.8 |
| Complex multi-slot request | "All confirmed!" | Only partial slots available | 3.0 |

**Root cause:** The AI generates the confirmation response before the tool call completes, or doesn't check the tool call result status. The approval gate (`requiresApproval`) stops subsequent tools but doesn't prevent premature confirmation text.

**Fix (files to change):**
- `src/lib/ai/skills/booking-skill.ts` — Strengthen rule: "After calling create_booking, you MUST check the result. If the result contains 'error', 'failed', 'unavailable', or 'fully booked', do NOT confirm. Instead, inform the customer and suggest alternatives."
- `src/lib/ai/suggestion-service.ts` — In post-processing, if `functionCalled === 'create_booking'` and the function result contains error indicators, override the response to remove false confirmation language
- Consider: Add a post-processing regex check for confirmation language ("confirmed", "ยืนยัน") when function result was not successful

**Estimated impact:** Fixes 5–7 failures → prevents the single most dangerous failure mode

---

### Pattern 4: Date/Time Inference Too Conservative
**Impact:** 6 failures (9% of all failures) | Scores 2.3–3.0
**Severity:** Medium — creates unnecessary friction

**What happens:** Customer says "Saturday the 17th" or "Sun 11" and the AI asks "Which month do you mean?" Staff simply infers the nearest upcoming date and proceeds.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "book a bay for Saturday the 17th at 11:30" | "Which month do you mean for Saturday the 17th?" | Books for this month | 2.3 |
| "Sun 11: 14.00–19.00" | "Do you mean March 11 or a different month?" | Creates the booking | 2.6 |
| "วันที่8 13.00 2คน โปรนุ่นครับ" | Asks for month clarification | Books for the 8th | 3.3 |

**Root cause:** The system prompt tells the AI to use `{TODAY_DATE}` and `{TOMORROW_DATE}` placeholders but doesn't instruct it on partial-date resolution. The AI defaults to asking for clarification rather than inferring.

**Fix (files to change):**
- `src/lib/ai/skills/booking-skill.ts` — Add rule: "When a customer provides a day number (e.g., 'the 17th') or day-of-week + date (e.g., 'Saturday 17th'), resolve to the nearest FUTURE occurrence. Only ask for month clarification if the date is more than 30 days away or the day-of-week doesn't match."
- `src/lib/ai/skills/core-skill.ts` — Add date resolution guidance: "Thai customers typically mean 'this month' or 'next week' when giving partial dates. Default to the nearest future date."

**Estimated impact:** Fixes 4–6 failures → reduces unnecessary back-and-forth

---

### Pattern 5: Chinese Language Not Supported
**Impact:** 8 samples, mean score 3.05 | All from one customer (Eva)
**Severity:** Medium — affects a small but real customer segment

**What happens:** Customer Eva communicates entirely in Chinese (Mandarin). The AI consistently responds in English. Staff always responds in Chinese.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "今天的预约取消，谢谢" (Cancel today's booking) | "I'll help cancel your booking" | "好的，已经取消了" (OK, cancelled) | 2.6 |
| "明天见，谢谢" (See you tomorrow) | "See you tomorrow!" | "好的，明天见" (OK, see you tomorrow) | 3.3 |
| "请帮我把今天的预约取消" (Please cancel) | "I'll help with cancellation" | "好的" (OK) | 2.4 |

**Root cause:** Language detection in `intent-classifier.ts` and `embedding-service.ts` only checks for Thai (`[\u0E00-\u0E7F]`) and English (`[a-zA-Z]`). CJK characters are not detected, so Chinese defaults to English.

**Fix (files to change):**
- `src/lib/ai/intent-classifier.ts` — Add CJK detection: `[\u4E00-\u9FFF\u3400-\u4DBF]` → classify as 'zh'
- `src/lib/ai/embedding-service.ts` — Add Chinese to language detection
- `src/lib/ai/skills/core-skill.ts` — Add rule: "If the customer writes in Chinese (Mandarin/Cantonese), respond in Chinese. Use polite forms."
- `src/lib/ai/skills/index.ts` — Add 'zh' as a supported language variant

**Estimated impact:** Fixes 5–6 failures → supports a real customer segment

---

### Pattern 6: Registration Data Not Recognized
**Impact:** 4 failures | Scores 1.2–2.6
**Severity:** High — worst single-sample score (1.2)

**What happens:** Customer provides structured registration data (name, phone, email — often one per line) and the AI doesn't recognize the pattern. Instead it tries to make a booking that fails, responds in the wrong language, or asks unnecessary questions.

**Worst example (Score 1.2):**
```
Customer: "TAWANNA
          0986545856
          nowyumi@gmail.com"
AI:       "I'm sorry, there was an error with the booking. Please try again later." (English)
Staff:    Creates booking, confirms in Thai
```

**Root cause:** The customer extraction service (`customer-extraction-service.ts`) exists but runs separately from the main suggestion flow. The AI doesn't have explicit instructions for handling structured data submissions.

**Fix (files to change):**
- `src/lib/ai/skills/booking-skill.ts` — Add rule: "When a customer provides structured data with name, phone number, and/or email (often in a list format), acknowledge receipt of their information and proceed with registration/booking. Respond in the same language as their previous messages, not the language of the data."
- `src/lib/ai/intent-classifier.ts` — Add regex pattern: if message matches `[Name]\n[Phone]\n[Email]` structure, classify as `booking_request` with high confidence

**Estimated impact:** Fixes 3–4 failures → fixes the single worst-scoring sample

---

### Pattern 7: Modification Request Handling
**Impact:** 7 failures across 34 samples (20.6% fail rate) | Mean 3.60
**Severity:** Medium-High — second lowest performing intent

**What happens:** The AI says "I can't find a booking", "modifications can't be made retroactively", or asks for irrelevant details (bay type) when the customer just wants to change a time.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "Can we shorten tomorrow to 10:00-11:30?" | "I can't find a booking for that time" | "Sure, updated to 10:00-11:30" | 2.9 |
| "change time to 10:30 to 12:30?" | Asks for booking ID | "ได้ค่ะ" (Sure) | 3.4 |
| "เพิ่มเป็น2ชั่วโมงได้มั้ย" (extend to 2hrs?) | Asks which bay type | "ได้ค่ะ" (Sure) | 3.6 |

**Root cause:** The `lookup_booking` function requires exact matching (customer name + time), but modifications are often phrased relative to context ("tomorrow's booking"). Staff knows which booking the customer means from conversation history.

**Fix (files to change):**
- `src/lib/ai/function-executor.ts` — Improve `lookup_booking` to accept fuzzy matching: search by customer name + approximate date, not exact time
- `src/lib/ai/skills/booking-skill.ts` — Add rule: "For modification requests, use conversation history to identify the booking being referenced. Don't ask for booking ID unless multiple bookings match."
- `src/lib/ai/skills/booking-skill.ts` — Remove or soften "modifications can't be made retroactively" — staff accommodates nearly all modification requests

**Estimated impact:** Fixes 4–5 failures → improves the second-worst intent category

---

### Pattern 8: Long Conversation History Context Loss
**Impact:** 7 failures | Scores 2.9–3.4
**Severity:** Medium — affects repeat/VIP customers with long chat histories

**What happens:** With long histories (13–70 messages), the AI loses track of the current topic. It provides generic or disconnected responses while staff continues the active thread.

**Examples:**
- After a lost golf ball investigation (staff checking CCTV), customer says "ขอบคุณครับ" (thank you). AI says "ยินดีค่ะ" (you're welcome). Staff continues with CCTV findings. (Score 2.9)
- Customer says "Okay thank you" mid-negotiation. AI says "You're welcome!" Staff says "Actually, let us check with Pro Min if he is still available." (Score 2.9)

**Root cause:** Conversation context is loaded from `unified_messages` with a 100-message limit. The AI's context window may truncate or dilute the most recent and relevant messages. Staff intuitively knows the active thread.

**Fix (files to change):**
- `src/lib/ai/suggest-response-helpers.ts` — When history > 10 messages, include full last 5 messages + summarized older history (instead of truncated full history)
- `src/lib/ai/skills/core-skill.ts` — Add rule: "When the customer sends a short acknowledgment ('ขอบคุณ', 'okay', 'ครับ'), check the last 3 staff messages to determine if there's an ongoing investigation or negotiation. If so, continue the thread rather than closing with pleasantries."

**Estimated impact:** Fixes 4–5 failures → improves experience for VIP/repeat customers

---

## What Works Well (Score >= 4.5)

84 samples (20.7%) scored 4.5 or higher. Patterns that consistently succeed:

### 1. Simple Factual Q&A in Thai (35% of high scores)
The AI excels when customers ask clear yes/no or factual questions in Thai:
- "โปรนุ่นสอนได้ทั้งผู้ชายและผู้หญิงมั้ยครับ" → "สอนได้ทั้งผู้ชายและผู้หญิงค่ะ" (Score 5.0)
- "แล้วต้องมีไม้ไปเองมั้ยครับ" → "ไม่ต้องค่ะ เรามีไม้ให้ใช้ฟรี" (Score 5.0)
- "ครั้งละชั่วโมงหรอครับ" → "ใช่ค่ะ คอร์ส 1 ครั้ง = 1 ชั่วโมง" (Score 5.0)

### 2. Coaching Inquiries (22% of high scores, 4.10 mean)
Coaching questions are well-handled because they're mostly informational and the AI has strong knowledge base context about coaches, packages, and pricing.

### 3. Polite Closers (15% of high scores)
"ขอบคุณมากค่า" / "Thank you!" → Short, warm response matching staff tone exactly.

### 4. Availability Confirmations (12% of high scores)
When the AI calls `check_bay_availability` and gets a clear positive result, it confirms accurately and concisely.

### Common Traits of High-Scoring Responses
- **1 sentence** (matches real staff brevity)
- **No tools called** (pure knowledge-based answers)
- **Thai with polite particles** (ค่ะ/ครับ)
- **Direct answer** (no hedging, no "let me check")
- **Conversation history < 10 messages** (focused context)

---

## Priority-Ranked Optimization Roadmap

### Tier 1: Critical (High impact, prevents dangerous failures) — IMPLEMENTED

| # | Optimization | Failure Pattern | Est. Fixes | Effort | Files | Status |
|---|-------------|-----------------|------------|--------|-------|--------|
| 1 | **Prevent hallucinated facts** — enforce tool-result-only assertions | Pattern 2 | 10–12 | Low | `core-skill.ts`, `booking-skill.ts` | **Done** |
| 2 | **Validate booking confirmation** — check function result before confirming | Pattern 3 | 5–7 | Medium | `booking-skill.ts`, `suggestion-service.ts` | **Done** |
| 3 | **Fix sticker handling** — use conversation context instead of "Hello!" | Pattern 1 | 14–16 | Medium | `suggestion-service.ts`, `core-skill.ts`, `intent-classifier.ts` | **Done** |

**Combined Tier 1 impact:** Fixes ~33 failures (62% of all failures), estimated overall score increase: +0.15–0.20

### Tier 2: Important (Improves reliability for common scenarios) — IMPLEMENTED

| # | Optimization | Failure Pattern | Est. Fixes | Effort | Files | Status |
|---|-------------|-----------------|------------|--------|-------|--------|
| 4 | **Smart date inference** — resolve partial dates to nearest future occurrence | Pattern 4 | 4–6 | Low | `booking-skill.ts` | **Done** |
| 5 | **Improve modification lookups** — fuzzy booking matching, trust conversation context | Pattern 7 | 4–5 | Medium | `function-schemas.ts` | **Done** (prompt guidance) |
| 6 | **Recognize registration data** — handle structured name/phone/email submissions | Pattern 6 | 3–4 | Low | `booking-skill.ts`, `core-skill.ts` | **Done** |

**Combined Tier 2 impact:** Fixes ~12 failures, estimated overall score increase: +0.05–0.08

### Tier 3: Enhancement (Improves edge cases and special segments)

| # | Optimization | Failure Pattern | Est. Fixes | Effort | Files |
|---|-------------|-----------------|------------|--------|-------|
| 7 | **Add Chinese language support** — CJK detection + response matching | Pattern 5 | 5–6 | Medium | `intent-classifier.ts`, `embedding-service.ts`, `core-skill.ts` |
| 8 | **Better long-history handling** — recent-weighted context, thread tracking | Pattern 8 | 4–5 | High | `suggest-response-helpers.ts`, `core-skill.ts` |

**Combined Tier 3 impact:** Fixes ~10 failures, estimated overall score increase: +0.03–0.05

### Tier 4: Post-Implementation Refinements (Discovered after Tier 1+2)

Based on the post-implementation evaluation (145 fresh samples, score 3.99), six new improvement areas were identified. These are ordered by frequency and impact.

| # | Optimization | New Pattern | Occurrences | Effort | Files |
|---|-------------|-------------|-------------|--------|-------|
| 9 | **Reduce "let me check" deflections** — anti-hallucination rules too broad | Pattern 9 | 19 (13%) | Low | `core-skill.ts` |
| 10 | **Fix date resolution model compliance** — prompt is present but model ignores | Pattern 4 (residual) | 4 (2.8%) | Medium | `suggestion-service.ts` |
| 11 | **Registration data: force conversation language** — structured data triggers English | Pattern 6 (residual) | 3 (2.1%) | Medium | `suggestion-service.ts` |
| 12 | **Photo message language matching** — photos in Thai conversations get English | Pattern 10 | 3 (2.1%) | Low | `suggestion-service.ts`, `core-skill.ts` |
| 13 | **Availability tool returns stale data** — tool result contradicts staff knowledge | Pattern 11 | 2 (1.4%) | High | `function-executor.ts` |
| 14 | **Modification: use UPCOMING BOOKINGS context** — lookup_booking not matching | Pattern 7 (residual) | 3 (2.1%) | Medium | `function-executor.ts` |

---

#### Pattern 9: Anti-Hallucination Overcorrection ("Let me check" Deflection)

**Impact:** 19 occurrences (13% of samples), largest single contributor to helpfulness drop
**Severity:** Medium — correct behavior for dynamic data, harmful for static knowledge

**What happens:** The anti-hallucination rules added in Tier 1 tell the model to "NEVER state facts without tool results." This is correct for real-time data (availability, pricing) but causes the model to deflect on questions it SHOULD answer directly from static knowledge or the business context already in the prompt.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "ทดลองเรียนมีเสียค่าซิมเพิ่มเท่าไหร่มั้ยคะ" (Trial lesson sim fee?) | "เดี๋ยวเช็กค่าใช้จ่ายซิมให้ค่ะ" (Let me check) | "ไม่มีค่าใช้จ่ายเลยค่า" (No fee at all) | 3.3 |
| "ออกใบกำกับในนาม บริษัทได้ปกติมั้ยครับ" (Company tax invoice?) | "ขอเช็กเรื่องใบกำกับ..." | "ได้ค่ะ สามารถแจ้งหน้าร้านได้เลยค่ะ" | 4.4 |
| "ครั้งแรกเป็น 1ชั่วโมงฟรี1ชั่วโมงใช่ไหมคะ" (First-timer promo?) | "เดี๋ยวเช็คสิทธิ์โปร..." | "ใช้ได้เลยค่ะ ☺️" | 4.2 |

**Root cause:** The anti-hallucination rules don't distinguish between:
- **Dynamic data** (availability, pricing, booking status) → MUST check tools
- **Static knowledge** (free trial = no fee, club rental = free, tax invoices = yes) → can answer directly from BUSINESS CONTEXT

**Fix:**
- `src/lib/ai/skills/core-skill.ts` — Refine anti-hallucination rules to specify scope:
```
- NEVER state AVAILABILITY or BOOKING STATUS without calling check_bay_availability first.
- NEVER quote specific PRICES without search_knowledge results or BUSINESS CONTEXT data.
- For general facility questions (invoices, equipment policy, trial lesson info), you MAY
  answer directly from the BUSINESS CONTEXT provided in this prompt. Do NOT say "let me check"
  for information already available in your context.
```

**Estimated impact:** Fixes 8–12 of the 19 deflections → +0.06–0.08 helpfulness

---

#### Pattern 10: Photo Message Language Mismatch

**Impact:** 3 occurrences | Scores 2.3–3.0
**Severity:** Medium — same root cause as sticker language issue

**What happens:** Customer sends a photo in a Thai conversation. The AI responds in English ("Hi Neji — thanks, I got your photo") while staff responds in Thai.

**Examples:**
| Customer Message | AI Response | Staff Response | Score |
|-----------------|-------------|----------------|-------|
| "sent a photo" (Thai conversation) | "Hi Neji — thanks, I got your photo..." | "สวัสดีค่า ใช่ค่ะ" | 2.3 |
| "sent a photo" (Thai conversation) | "Hi JJ — is this the photo of your..." | "สวัสดีค่ะ 🙏 อยากจองวันนี้หรอคะ" | 3.0 |

**Root cause:** The sticker language detection fix was applied but photo messages have additional code paths for image description. The image description prompt may override the detected language.

**Fix:**
- `src/lib/ai/suggestion-service.ts` — Ensure image description responses respect the detected conversation language. Pass language preference to the image handling code path.
- `src/lib/ai/skills/core-skill.ts` — Add: "When customer sends a photo, respond in the same language as the conversation, not English by default."

**Estimated impact:** Fixes 2–3 failures

---

#### Pattern 11: Availability Tool Returns Stale/Wrong Data

**Impact:** 2 confirmed occurrences | Scores 2.9–3.2
**Severity:** High per-incident (customer gets wrong info), but low frequency

**What happens:** `check_bay_availability` returns slots as available, but staff says they're fully booked. The AI correctly reports what the tool says, but the tool data is wrong.

**Example:**
| Customer | AI (from tool) | Staff (ground truth) |
|----------|---------------|---------------------|
| "19:00-21:00 มีเบว่างมั้ย" | "มีเบย์ปกติและ AI ว่างค่ะ" | "ช่วง 18.30-22.00 วันนี้ถูกจองเต็มทั้งหมด" |

**Root cause:** The availability check queries the database for the booking date, but the test replays historical conversations where the dates have passed. When the AI checks availability for "today" (March 1, 2026) instead of the original date (December 2025), different results are returned. **This is a testing artifact, not a production issue.**

**Fix:** This is a known limitation of the eval methodology. Not a code fix — document the limitation. For more accurate availability testing, use the `--7d` flag to sample only recent conversations where date context is still relevant.

---

#### Residual Issues from Tier 1+2 (Partially Fixed)

**Date resolution (Pattern 4 residual):** 4 occurrences still ask "which month?" despite the prompt instruction. The model particularly struggles with Thai date formats like "วันพุธที่ 7". The prompt-only approach may have hit its ceiling — consider:
- Adding explicit date resolution in code (parse "วันที่ X" → resolve to nearest future date before passing to LLM)
- Injecting resolved dates into the system prompt context

**Registration data language (Pattern 6 residual):** 3 occurrences still respond in English when customer sends structured data (name/phone/email). The language detection correctly identifies the conversation as Thai, but the LLM switches to English when the input text is English-alphabet names. Consider:
- Adding explicit language instruction in the user message wrapper: `"[Language: respond in Thai]"`
- Pre-processing registration data messages to append a Thai context hint

**Modification lookup (Pattern 7 residual):** 3 occurrences still can't find the booking. The prompt guidance helps but `lookup_booking` doesn't support fuzzy matching. Consider:
- Code change: Make `lookup_booking` accept approximate date + customer name (not just exact booking_id)
- Code change: Auto-inject recent booking_id from UPCOMING BOOKINGS context into the modify_booking call

---

## Post-Implementation Results (2026-03-01)

### Before vs After (Tier 1+2)

| Dimension | Before (405 samples) | After (145 fresh samples) | Change |
|-----------|---------------------|--------------------------|--------|
| Appropriateness | 3.74 | **3.94** | **+0.20** |
| Helpfulness | 3.41 | **3.50** | **+0.09** |
| Tone Match | 4.07 | **4.25** | **+0.18** |
| Brevity | 4.53 | **4.52** | -0.01 |
| **Overall** | **3.87** | **3.99** | **+0.12** |

### Score Distribution Shift

| Range | Before | After | Change |
|-------|--------|-------|--------|
| <= 2.0 | 4 (1.0%) | 2 (1.4%) | ~ |
| 2.1–3.0 | 49 (12.1%) | 15 (10.3%) | -1.8% |
| 3.1–3.5 | 65 (16.0%) | 20 (13.8%) | -2.2% |
| 3.6–4.0 | 80 (19.8%) | — | — |
| 4.0+ | 207 (51.1%) | 112 (77.2%) | **+26.1%** |

### Key Observations

1. **Sticker handling: mostly fixed.** 2 of 3 sticker messages in the sample got contextual responses ("แล้วเจอกันบ่ายโมงครึ่งนะคะ", "แล้วเจอกันวันจันทร์ 10:00 น. ค่ะ") instead of "Hello!" One sticker from a null-name customer still failed.

2. **Anti-hallucination tradeoff.** Appropriateness improved (+0.20) but helpfulness only gained +0.09 because the model now deflects with "let me check" on 13% of messages. Refining the rules to distinguish dynamic vs static knowledge (Pattern 9) would recover the helpfulness gap.

3. **Date resolution: prompt-only partially effective.** 4 of 145 samples still ask "which month?" despite explicit date resolution rules. The model struggles with Thai date patterns — may need code-level date parsing.

4. **Registration data language: still switches to English.** 3 of 145 samples respond in English when customer sends structured registration data. The LLM seems to key off the English alphabet in names/emails, overriding the conversation language. Needs stronger language forcing.

5. **Tone match jumped +0.18.** Thai politeness particles and concise responses are more consistent. This is the biggest qualitative win.

### Remaining Gap to 4.2+ Target

The overall score gap from 3.99 to 4.2+ is primarily helpfulness-driven. The top priority for closing this gap is Pattern 9 (anti-hallucination overcorrection), which alone accounts for 19 deflections. Fixing this would likely push helpfulness from 3.50 to ~3.80 and overall from 3.99 to ~4.10.

---

## Monitoring & Regression Detection

The judge scoring system now supports ongoing monitoring:

```bash
# Score a fresh sample run
npx tsx scripts/sample-e2e-suggestions.ts --count 20 --judge

# Score an existing sample file
npx tsx scripts/judge-sample-results.ts

# Score all unjudged files
npx tsx scripts/judge-sample-results.ts --all

# Re-score after prompt changes
npx tsx scripts/judge-sample-results.ts --rejudge
```

### Recommended Cadence
- **After prompt changes:** Run `--rejudge` on a baseline file to compare before/after
- **Weekly:** Score 20–30 fresh samples with `--judge` flag
- **Monthly:** Full regression check across all recent sample files

### Target Scores
| Dimension | Baseline | After T1+2 | Next Target | Key Fix |
|-----------|----------|-----------|-------------|---------|
| Appropriateness | 3.74 | **3.94** | 4.2+ | Tier 3 (Chinese support) |
| Helpfulness | 3.41 | **3.50** | 3.9+ | Tier 4 #9 (reduce deflections) |
| Tone Match | 4.07 | **4.25** | 4.3+ | Tier 4 #10 (photo language) |
| Brevity | 4.53 | **4.52** | 4.5+ | Maintain |
| **Overall** | **3.87** | **3.99** | **4.2+** | Tier 4 #9 is the critical path |

---

## Appendix: Methodology

### Judge Scoring Rubric (4 Dimensions, 1–5 Scale)

| Dimension | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Failure) |
|-----------|--------|---------------|--------------|-------------|
| Appropriateness | 0.30 | Perfectly addresses need, correct facts, no fabrication | Mostly appropriate with notable issue | Completely inappropriate or fabricates info |
| Helpfulness | 0.30 | Directly resolves customer's question, actionable | Somewhat helpful but missing key info | Not helpful at all |
| Tone Match | 0.20 | Perfect Thai premium service tone with polite particles | Acceptable but doesn't match hospitality standard | Completely wrong tone |
| Brevity | 0.20 | Ideal 1–2 sentences matching real staff style | Noticeably too verbose or too terse | Extremely verbose or unhelpfully brief |

**Overall = weighted average** of 4 dimensions.

### Data Sources

**Baseline (pre-Tier 1+2):**
- `sample-random-2026-02-28T06-52-05.json` — 110 samples, 104 judged
- `sample-random-2026-02-28T04-26-37.json` — 131 samples, 130 judged
- `sample-random-2026-02-28T03-40-12.json` — 103 samples, 93 judged
- `sample-random-2026-02-27T18-34-25.json` — 64 samples, 60 judged
- `sample-today-2026-02-25T16-34-48.json` — 20 samples, 18 judged

**Post-Tier 1+2 (fresh responses with updated prompts):**
- `sample-random-2026-03-01T07-34-05.json` — 151 samples, 145 judged (score: 3.99)

### Cost
- Judge scoring: ~$0.04 for 405 samples (GPT-4o-mini, ~500 tokens/call)
- Negligible ongoing cost for weekly monitoring
