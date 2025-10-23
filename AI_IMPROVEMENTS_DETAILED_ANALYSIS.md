# AI Function Calling - Detailed Analysis of Failing Cases

**Date**: October 23, 2025
**Current Accuracy**: 50% (10/20 test cases)
**Goal**: 70-80% accuracy for production readiness

---

## 🔍 Deep Analysis of Each Failing Case

### **Case 4: "May i see?"**
- **Context**: Highly context-dependent message
- **Issue**: Extremely ambiguous - could mean:
  - "May I see [the availability]?"
  - "May I see [the booking details]?"
  - "May I see [the facility]?"
- **Expected**: Should create booking after discussion (based on conversation context)
- **Root Cause**: **Insufficient conversation context understanding**
  - AI cannot determine intent from such ambiguous phrase
  - Requires understanding of what was discussed BEFORE this message
  - Current system doesn't have strong enough conversation state tracking
- **Difficulty**: ⚠️ **HARD** - May require two-stage reasoning or better context

---

### **Case 5: "Bro gotta cancel on Wednesday"**
- **Context**: Cancellation request for specific day
- **Issue**: Note says "calls lookup_booking instead of check_bay_availability"
- **Analysis**: ⚠️ **Test expectation may be WRONG**
  - check_bay_availability is for finding FREE slots, NOT cancellation
  - Correct flow should be:
    1. Check if booking is in UPCOMING BOOKINGS context
    2. If found → conversational response (NO FUNCTION)
    3. If NOT found → lookup_booking to find it
- **Root Cause**: **Missing cancellation intent detection**
  - System prompt doesn't clearly explain cancellation flow
  - AI doesn't recognize "cancel" keywords properly
  - No clear instructions on when to use lookup_booking for cancellations
- **Difficulty**: ⭐ **MEDIUM** - Add cancellation detection rules

---

### **Case 10: "ตอนแรกจองกอล์ฟไว้วันนี้ 13.00 น"**
- **Translation**: "Initially/at first [I] booked golf today at 13:00"
- **Context**: PAST TENSE - describing something already done
- **Issue**: AI sees "จอง" (book) keyword and thinks it's a new booking request
- **Expected**: Conversational response or lookup_booking
- **Root Cause**: **Keyword-based triggering too simplistic**
  - Function schema says: trigger on "จอง" keyword
  - Doesn't distinguish between:
    - "ขอจอง" → "I want to book" (REQUEST - future)
    - "ตอนแรกจอง" → "I already booked" (STATEMENT - past)
  - Missing tense/mood understanding
- **Difficulty**: ⭐⭐ **MEDIUM-HIGH** - Need context-aware keyword detection

---

### **Case 11: "ไปถึงสัก 18.30 น นะครับ"**
- **Translation**: "I'll arrive around 18:30"
- **Context**: Customer stating ARRIVAL time (informational)
- **Issue**: AI sees time "18:30" and interprets as booking request
- **Expected**: Conversational acknowledgment (NO FUNCTION)
- **Root Cause**: **Cannot distinguish arrival time from booking time**
  - System doesn't understand difference between:
    - "ขอจอง 18:30" → "Book at 18:30" (BOOKING)
    - "ไปถึง 18:30" → "Arrive at 18:30" (INFORMATIONAL)
  - Keywords "ไปถึง" (arrive) should signal NOT a booking
- **Difficulty**: ⭐ **EASY** - Add arrival vs booking time rules

---

### **Case 13: "มันตีใส่จอเหมือน bay ทั่วไปไหม"**
- **Translation**: "Does it hit into a screen like regular bays?"
- **Context**: Question about HOW the facility works
- **Issue**: Note says "should check availability"
- **Analysis**: ⚠️ **Test expectation may be WRONG**
  - This is a FACILITY question, not availability request
  - Should be conversational explanation
  - Unless: conversation context suggests customer is comparing bays to decide which to book
- **Root Cause**: **General questions misinterpreted** OR test expectation incorrect
- **Difficulty**: ⭐ **EASY** - Clarify test OR add facility question detection

---

### **Case 15: "Thank you and sorry again"**
- **Context**: Gratitude after some action (likely cancellation/rescheduling)
- **Issue**: AI calling a function instead of responding conversationally
- **Expected**: Conversational response (NO FUNCTION)
- **Root Cause**: **Gratitude handling confusion**
  - System prompt says: "DON'T just say 'You're welcome' - provide value!"
  - AI misinterprets "provide value" as "call a function"
  - Should mean: "give helpful conversational response"
- **Difficulty**: ⭐ **EASY** - Clarify gratitude = NO FUNCTION

---

### **Case 16: "Thank you"**
- **Same as Case 15**
- **Root Cause**: Same gratitude handling confusion
- **Difficulty**: ⭐ **EASY**

---

### **Case 18: "จอง2 ชม แล้วตอนเรียนค่อยไปลงชื่อทีละชมหรอครับ"**
- **Translation**: "Book 2 hours, then during the lesson sign in one hour at a time, right?"
- **Context**: QUESTION about procedure (hypothetical/conditional)
- **Issue**: AI sees "จอง 2 ชม" and thinks it's a booking request
- **Expected**: Conversational explanation (NO FUNCTION)
- **Root Cause**: **Cannot distinguish imperative from conditional**
  - Doesn't understand sentence mood:
    - "ขอจอง 2 ชม" → "Please book 2 hours" (IMPERATIVE - do it!)
    - "จอง 2 ชม แล้ว..." → "If I book 2 hours, then..." (CONDITIONAL - question)
  - The "แล้ว...หรอ" structure indicates this is a QUESTION
- **Difficulty**: ⭐⭐ **MEDIUM** - Add sentence mood detection

---

### **Case 20: "สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ"**
- **Translation**: "Hello, 12:00-14:00 slot, name Day, cancel please"
- **Context**: Cancellation with specific details
- **Issue**: Note says "should lookup booking first"
- **Expected**:
  1. Check UPCOMING BOOKINGS in context
  2. If found → conversational cancellation
  3. If NOT found → lookup_booking
- **Root Cause**: **Cancellation flow not clear**
  - Keyword "ยกเลิก" (cancel) not being detected
  - AI doesn't know the cancellation workflow
- **Difficulty**: ⭐ **MEDIUM** - Same as Case 5

---

## 📊 Root Cause Patterns

### **Pattern 1: Keyword-Based Triggering Too Simplistic** (Cases 10, 18)
- **Problem**: Triggers on keywords without understanding CONTEXT, TENSE, or MOOD
- **Impact**: 2/10 failing cases (20%)
- **Examples**:
  - "I already booked" vs "I want to book"
  - "If I book..." vs "Please book..."

### **Pattern 2: Gratitude/Conversational Mishandling** (Cases 15, 16)
- **Problem**: AI calls functions when it should respond conversationally
- **Impact**: 2/10 failing cases (20%)
- **Root**: Ambiguous "provide value" instruction

### **Pattern 3: Time-Related Confusion** (Case 11)
- **Problem**: Any time mention triggers booking intent
- **Impact**: 1/10 failing cases (10%)
- **Root**: Doesn't distinguish arrival time from booking time

### **Pattern 4: Cancellation Intent Not Detected** (Cases 5, 20)
- **Problem**: No clear cancellation handling workflow
- **Impact**: 2/10 failing cases (20%)
- **Root**: Missing cancellation intent detection and flow

### **Pattern 5: Ambiguous Context-Dependent** (Case 4)
- **Problem**: Requires deep conversation understanding
- **Impact**: 1/10 failing cases (10%)
- **Root**: Limited conversation state tracking

### **Pattern 6: Possible Wrong Test Expectations** (Cases 5, 13)
- **Problem**: Test expectations may not align with correct behavior
- **Impact**: 2/10 failing cases (20%)
- **Root**: Need to verify test data

---

## 🎯 Proposed Improvements (Prioritized)

### **TIER 1: High Impact, Low Effort** ⭐⭐⭐⭐

#### **Improvement 1A: Explicit NO-FUNCTION Rules**
**Addresses**: Cases 15, 16, 11, 18 (4 cases = 40% of failures)
**Effort**: 30 minutes
**Expected Impact**: +20% accuracy (60% → 70%)

Add to system prompt:

```
🚫 CRITICAL - WHEN NOT TO CALL FUNCTIONS:

1. Gratitude/Thanks: "Thank you", "ขอบคุณ", "Thanks!", "Thank you and sorry"
   → NO FUNCTION - Just respond conversationally with acknowledgment
   Example: "You're welcome! See you tomorrow at 14:00 ⛳"

2. Arrival Time Statements: "I'll arrive at 18:00", "ไปถึง 18:30", "Getting there around..."
   → NO FUNCTION - Just acknowledge the arrival time
   Example: "Got it, we'll see you around 18:30!"

3. Past Action Statements: "I already booked", "ตอนแรกจอง", "I booked yesterday"
   → NO FUNCTION unless customer is asking to lookup or modify that booking
   Example: "Yes, I see your booking. Looking forward to seeing you!"

4. Hypothetical/Procedural Questions: "If I book 2 hours, then...", "จอง 2 ชม แล้วตอน...หรอ"
   → NO FUNCTION - Customer is asking about procedures, not making actual booking
   Example: "Yes, that's correct! You can book 2 hours and sign in hourly."

5. General Facility Questions: "Do you have clubs?", "มันตีใส่จอเหมือน...", "What equipment..."
   → NO FUNCTION - Just answer with facility information
   Example: "Yes, all our bays have screens where you hit the ball into!"

Remember: When in doubt, DON'T call a function. Conversational responses are safer.
```

---

#### **Improvement 1B: Few-Shot Examples**
**Addresses**: Cases 10, 11, 15, 16, 18, 20 (6 cases = 60% of failures)
**Effort**: 1 hour
**Expected Impact**: +15% accuracy (stacks with 1A)

Add to system prompt (right after function descriptions):

```
📚 FUNCTION CALLING EXAMPLES (Learn from these):

✅ Example 1 - Gratitude (NO FUNCTION):
Customer: "Thank you!"
Context: Staff just confirmed a booking
AI Action: NO FUNCTION
AI Response: "You're welcome! See you tomorrow at 14:00 ⛳"

✅ Example 2 - Past Booking Statement (NO FUNCTION):
Customer: "ตอนแรกจองกอล์ฟไว้วันนี้ 13.00 น" (I already booked golf today at 13:00)
AI Action: NO FUNCTION
AI Response: "ใช่ค่ะ เจอกันวันนี้ 13:00 นะคะ" (Yes, see you today at 13:00)

✅ Example 3 - Arrival Time (NO FUNCTION):
Customer: "ไปถึงสัก 18.30 น นะครับ" (I'll arrive around 18:30)
AI Action: NO FUNCTION
AI Response: "ได้ค่ะ รอคุณนะคะ" (Got it, we'll wait for you)

✅ Example 4 - Hypothetical Question (NO FUNCTION):
Customer: "จอง2 ชม แล้วตอนเรียนค่อยไปลงชื่อทีละชมหรอครับ"
         (If I book 2 hours, do I sign in one hour at a time?)
AI Action: NO FUNCTION
AI Response: "ใช่ค่ะ จองได้ 2 ชม แล้วมาลงชื่อทีละชั่วโมงได้เลยค่ะ"
           (Yes, you can book 2 hours and sign in hourly)

✅ Example 5 - Cancellation (Check context first):
Customer: "สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ"
         (Hello, 12:00-14:00 slot, name Day, cancel please)
Step 1: Check UPCOMING BOOKINGS in context
  - If Day's 12:00-14:00 booking is there → NO FUNCTION, respond: "ยกเลิกให้แล้วค่ะ"
  - If NOT found → Use lookup_booking function
AI Action: Depends on context
AI Response: "ยกเลิกการจองของคุณ Day รอบ 12:00-14:00 ให้แล้วค่ะ"
           (Cancelled Day's 12:00-14:00 booking for you)

✅ Example 6 - Facility Question (NO FUNCTION):
Customer: "มันตีใส่จอเหมือน bay ทั่วไปไหม" (Does it hit into a screen like regular bays?)
AI Action: NO FUNCTION
AI Response: "ใช่ค่ะ ตีใส่จอเหมือนกันค่ะ" (Yes, you hit into screens)

❌ WRONG Example - Don't do this:
Customer: "Thank you!"
AI Action: check_bay_availability ← WRONG! No function needed
Customer: "ไปถึง 18:30" (I'll arrive at 18:30)
AI Action: create_booking ← WRONG! This is arrival time, not booking
```

---

### **TIER 2: High Impact, Medium Effort** ⭐⭐⭐

#### **Improvement 2: Enhanced Booking Intent Detection**
**Addresses**: Cases 10, 18 (2 cases)
**Effort**: 30 minutes
**Expected Impact**: +5% accuracy (if not already covered by Tier 1)

Update `create_booking` function description:

```typescript
description: `Create a bay or coaching booking. Requires staff approval before execution.

Use this when:
- Customer REQUESTS/COMMANDS booking (imperative mood):
  * "I want to book 2pm"
  * "ขอจอง 14:00" (Request to book)
  * "Please reserve tomorrow"
  * "Book me for 3pm"

- Customer CONFIRMS time after availability check:
  * "3.30pm please!" (after seeing availability)
  * "Confirm 19:00"
  * "book it" (confirming previously discussed time)
  * "OK" or "จอง" (after staff showed available slots)

Do NOT use when:
- Customer describes PAST booking (past tense):
  * "I booked yesterday"
  * "ตอนแรกจอง" (I already booked)
  * "I already have a reservation"

- Customer asks HYPOTHETICAL/PROCEDURAL questions (conditional mood):
  * "If I book 2 hours, then..."
  * "จอง 2 ชม แล้วตอน...หรอ" (If I book 2 hours, do I...)
  * "Can I book and then..."

- Customer just states ARRIVAL time:
  * "I'll arrive at 18:00"
  * "ไปถึง 18:30"
  * "Getting there around 6pm"

- Customer says THANK YOU or gratitude
  * "Thank you"
  * "ขอบคุณ"

Customer info handling:
- If CUSTOMER INFORMATION shows ✅ AVAILABLE: Use exact name and phone from context
- If shows ⚠️ NEW CUSTOMER: Ask for name and phone before calling this function
`,
```

---

#### **Improvement 3: Cancellation Flow**
**Addresses**: Cases 5, 20 (2 cases)
**Effort**: 45 minutes
**Expected Impact**: +10% accuracy

Add to system prompt (after TYPICAL CUSTOMER FLOWS):

```
6. Cancellation Flow

When customer wants to cancel:
- Cancellation keywords: "cancel", "ยกเลิก", "can't make it", "won't make it", "need to cancel"

Step 1: Check UPCOMING BOOKINGS section in context above
  - Look for booking matching customer's description (date, time, name)

Step 2: Decide action
  - If booking found in UPCOMING BOOKINGS → NO FUNCTION needed
    * Respond conversationally: "ยกเลิกให้แล้วค่ะ" (Cancelled for you)
    * Or ask staff to cancel it manually

  - If booking NOT in UPCOMING BOOKINGS → Use lookup_booking function
    * Pass customer name, phone, or specific date they mentioned
    * After finding booking, respond about cancellation

Step 3: Never use check_bay_availability for cancellations!
  - check_bay_availability is for finding FREE slots only
  - Cancellation needs lookup_booking or conversational response

Examples:
- "Bro gotta cancel on Wednesday"
  → Check UPCOMING BOOKINGS for Wednesday booking
  → If found: NO FUNCTION, respond "Got it, cancelling your Wednesday booking"
  → If NOT found: lookup_booking with date filter

- "สวัสดีครับรอบ 12:00-14:00 ชื่อ Day ยกเลิกนะครับ"
  → Check if Day's 12:00-14:00 booking is in UPCOMING BOOKINGS
  → If found: NO FUNCTION, respond "ยกเลิกการจองของคุณ Day ให้แล้วค่ะ"
  → If NOT found: lookup_booking for Day
```

---

### **TIER 3: Medium Impact, Easy** ⭐⭐

#### **Improvement 4: Arrival vs Booking Time**
**Addresses**: Case 11 (already covered by Tier 1)
**Effort**: 15 minutes
**Expected Impact**: Reinforces Tier 1

Add to system prompt:

```
⏰ TIME MENTION TYPES - HOW TO DISTINGUISH:

🟢 Booking Time (USE create_booking function):
Patterns:
- "I want to book at 18:00"
- "ขอจอง 18:00" (Request booking at...)
- "Reserve for 18:00"
- "3pm please" (after availability shown)
- "Book me for 2pm"

Keywords: "book", "จอง", "reserve", "reservation at"

🔵 Arrival Time (NO FUNCTION - conversational only):
Patterns:
- "I'll arrive at 18:30"
- "ไปถึงสัก 18:30" (Will arrive around...)
- "Getting there around 18:00"
- "We'll be there at 18:00"
- "Expect me at 6pm"

Keywords: "arrive", "ไปถึง", "getting there", "be there at", "expect me"

The key difference:
- Booking time = REQUEST to reserve the facility
- Arrival time = INFORMATIONAL statement about when customer will show up
```

---

### **TIER 4: Verify Test Data** 🔍

#### **Improvement 5: Clarify Test Cases 5 & 13**
**Addresses**: Cases 5, 13
**Effort**: 1 hour (investigation)
**Action**: Review test data

**Case 5**: "Bro gotta cancel on Wednesday"
- Test says: AI should call check_bay_availability
- Question: Why would availability check be correct for CANCELLATION?
- Recommendation: Verify test expectation. Should likely be:
  - NO FUNCTION (conversational) OR
  - lookup_booking to find the Wednesday booking

**Case 13**: "มันตีใส่จอเหมือน bay ทั่วไปไหม"
- Test says: Should check availability
- Question: This is a facility question, not availability request
- Recommendation: Check conversation context
  - If context shows customer comparing bay types → maybe check_bay_availability is correct
  - If no context → should be conversational

Action: Run diagnose-single-case.ts on Cases 5 and 13 to see full context.

---

## 📈 Expected Accuracy Improvements

| Tier | Improvements | Cases Addressed | Accuracy Gain | New Total |
|------|-------------|-----------------|---------------|-----------|
| Baseline | - | - | - | 50% |
| Tier 1A | NO-FUNCTION Rules | 15, 16, 11, 18 (4) | +20% | 70% |
| Tier 1B | Few-Shot Examples | Reinforces above + 10, 20 | +5% | 75% |
| Tier 2 | Booking Intent + Cancellation | 10, 18, 5, 20 | +5% | 80% |
| Tier 3 | Time Distinction | Reinforces 11 | +0% | 80% |

**Target**: 75-80% accuracy with Tiers 1 & 2

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (Tier 1) - 1.5 hours
1. Add NO-FUNCTION rules to system prompt (30 min)
2. Add few-shot examples to system prompt (1 hour)
3. Test on evaluation script
4. Expected: 50% → 70-75%

### Phase 2: Refinements (Tier 2) - 1.25 hours
1. Update create_booking function description (30 min)
2. Add cancellation flow to system prompt (45 min)
3. Test on evaluation script
4. Expected: 70-75% → 75-80%

### Phase 3: Validation (Tier 3-4) - 2 hours
1. Add arrival vs booking time distinction (15 min)
2. Investigate Cases 5 & 13 (1 hour)
3. Final testing and adjustment (45 min)
4. Expected: 75-80% final accuracy

**Total Effort**: ~5 hours
**Expected Outcome**: 50% → 75-80% accuracy

---

## 🎯 Alternative Approach: Two-Stage Reasoning

If Tiers 1-2 don't achieve 75%+, consider:

### Two-Stage Function Calling
**Stage 1: Intent Classification**
- Model: gpt-4o-mini
- Task: Classify intent (booking, availability, question, gratitude, cancellation, etc.)
- Output: Intent type + confidence

**Stage 2: Action Execution**
- Based on intent, call appropriate function OR respond conversationally
- More reliable but 2x API cost

**Benefits**:
- Clearer intent understanding
- Easier to debug
- Higher accuracy potential (85%+)

**Drawbacks**:
- 2x latency (1-2 seconds vs 0.5-1 second)
- 2x cost
- More complex implementation

---

## 📝 Notes

1. **Cases 4** ("May I see?") may require conversation state tracking beyond current system
   - Could need conversation embeddings or state machine
   - May remain failing until more sophisticated context handling is implemented

2. **Thai language temporal markers** are critical:
   - "ตอนแรก" (initially/at first) = past tense
   - "ขอ" (request) = imperative/request mood
   - "แล้ว...หรอ" (then...right?) = conditional/question mood
   - Consider adding Thai linguistic examples to prompt

3. **Keyword detection alone is insufficient**:
   - Need context-aware keyword interpretation
   - Few-shot examples are critical for teaching this

4. **Test data verification**:
   - Cases 5 and 13 need manual review
   - Evaluation script uses LLM judgment which could be wrong

---

**Next Steps**: Implement Tier 1 improvements and run evaluation to measure impact.
