# AI Function Calling Improvements Plan

**Based on Evaluation Results (2025-10-20)**

## Executive Summary

Evaluation of 60 real customer conversations revealed:
- ✅ **Perfect business rule compliance** (100%)
- ✅ **Excellent Thai language brevity** (100%)
- ✅ **Good general inquiry handling** (90%)
- ❌ **Critical failure in booking detection** (0%)
- ❌ **Critical failure in coaching detection** (0%)
- ⚠️ **Low parameter extraction** (11%)

**Overall Function Selection Accuracy: 30% (Target: 80%)**

---

## Priority 1: Enhanced Function Schemas ✅ IMPLEMENTED

### Problem
The AI couldn't detect booking requests or coaching inquiries because function descriptions lacked explicit trigger keywords.

### Solution Implemented
Updated `src/lib/ai/function-schemas.ts` with:

**check_bay_availability:**
- Added Thai keywords: "มีว่างมั้ย", "ว่างมั้ย", "เลนว่าง", "มีเวลาว่าง"
- Added English keywords: "available?", "bay available", "free slots"
- Added explicit "WHEN TO USE THIS FUNCTION" section

**get_coaching_availability:**
- Added coach names as triggers: "Boss", "Ratchavin", "Noon", "Min"
- Added Thai keywords: "โปร", "โค้ช", "เรียน", "สอน"
- Added coaching-specific phrases: "โปรว่างมั้ย", "coach available"

**create_booking:**
- Added explicit booking keywords: "จอง", "book", "reserve", "อยากจอง", "ขอจอง"
- Added "DO NOT USE" section to prevent false positives
- Clarified requirement for complete customer information

**Expected Impact:**
- Booking detection: 0% → 60-70%
- Coaching detection: 0% → 70-80%
- Availability detection: 45% → 75-80%

---

## Priority 2: Parameter Extraction Helpers ✅ IMPLEMENTED

### Problem
Only 11% parameter extraction accuracy due to:
1. Poor Thai date parsing ("พรุ่งนี้" not converted to actual date)
2. Time format inconsistencies (Thai time "2 ทุ่ม" not handled)
3. Duration inference from ranges not working ("14:00-16:00" not calculating 2 hours)

### Solution Implemented
Created `src/lib/ai/parameter-helpers.ts` with utilities:

**Date Parsing:**
```typescript
parseRelativeDate("พรุ่งนี้") // → "2025-10-21"
parseRelativeDate("tomorrow") // → "2025-10-21"
parseRelativeDate("วันนี้") // → "2025-10-20"
```

**Time Parsing:**
```typescript
parseTime("2 ทุ่ม") // → "20:00"
parseTime("14:00") // → "14:00"
parseTime("2pm") // → "14:00"
parseTime("14.00") // → "14:00"
```

**Duration Inference:**
```typescript
inferDurationFromRange("14:00-16:00") // → 2
inferDurationFromRange("14:00 ถึง 16:30") // → 2.5
inferDurationFromRange("2 ชั่วโมง") // → 2
```

**Bay Type Detection:**
```typescript
detectBayType("AI bay") // → "ai"
detectBayType("เบย์โซเชียล") // → "social"
detectBayType("any bay") // → "all"
```

**Expected Impact:**
- Parameter extraction: 11% → 50-60%
- Date accuracy: +40%
- Time accuracy: +35%
- Duration accuracy: +30%

---

## Priority 3: Integration Steps (TODO)

### Step 1: Add Helper Integration to Suggestion Service

**File:** `src/lib/ai/suggestion-service.ts`

Add before OpenAI function calling:

```typescript
import { extractBookingParameters } from './parameter-helpers';

// In generateAISuggestion function, before calling OpenAI:
const extractedParams = extractBookingParameters(params.customerMessage);

// Add to system prompt context:
const parameterHints = `
Detected from message:
${extractedParams.date ? `- Date: ${extractedParams.date}` : ''}
${extractedParams.time ? `- Time: ${extractedParams.time}` : ''}
${extractedParams.duration ? `- Duration: ${extractedParams.duration} hours` : ''}
${extractedParams.bayType !== 'all' ? `- Bay type: ${extractedParams.bayType}` : ''}
${extractedParams.numberOfPeople ? `- People: ${extractedParams.numberOfPeople}` : ''}

Use these extracted parameters when calling functions.
`;
```

**Benefit:** Provides explicit parameter hints to OpenAI, improving extraction accuracy

---

### Step 2: Add Function Call Validation with Suggestions

**File:** `src/lib/ai/function-executor.ts`

Add parameter validation with helpful suggestions:

```typescript
async execute(functionCall: FunctionCall): Promise<FunctionResult> {
  // Extract parameters using helpers for validation
  const extracted = extractBookingParameters(this.originalMessage);

  // Suggest corrections if parameters seem wrong
  if (functionCall.name === 'check_bay_availability') {
    if (!functionCall.parameters.date && extracted.date) {
      functionCall.parameters.date = extracted.date;
      console.log(`Auto-corrected date to: ${extracted.date}`);
    }

    if (!functionCall.parameters.duration && extracted.duration) {
      functionCall.parameters.duration = extracted.duration;
      console.log(`Auto-corrected duration to: ${extracted.duration}`);
    }
  }

  // Continue with existing execution...
}
```

**Benefit:** Catches and fixes parameter extraction errors before API calls

---

### Step 3: Add Training Data Logging

**File:** Create `src/lib/ai/training-logger.ts`

Log successful function calls for future fine-tuning:

```typescript
export async function logSuccessfulFunctionCall(
  customerMessage: string,
  functionName: string,
  parameters: Record<string, any>,
  wasApproved: boolean
) {
  if (wasApproved) {
    await refacSupabaseAdmin
      .from('ai_training_examples')
      .insert({
        customer_message: customerMessage,
        function_called: functionName,
        parameters_extracted: parameters,
        approved_by_staff: true,
        created_at: new Date().toISOString()
      });
  }
}
```

**Benefit:** Build dataset for future GPT fine-tuning

---

## Priority 4: Re-run Evaluation (TODO)

After implementing improvements:

```bash
npm run ai:extract-samples  # Extract fresh samples
npm run ai:evaluate          # Run evaluation
```

**Expected Results:**
- Function Selection Accuracy: 60-70% (up from 30%)
- Parameter Extraction: 50-60% (up from 11%)
- Booking Detection: 60-70% (up from 0%)
- Coaching Detection: 70-80% (up from 0%)

---

## Priority 5: Additional Improvements (Future)

### 5.1 Add Semantic Similarity Evaluation

**Why it's currently 0%:** Test samples didn't include actual staff responses

**Solution:**
```typescript
// In extract-test-samples.ts
async function enrichSample(embedding: any, intent: string) {
  // CURRENT: Gets staff response but it's often null
  const { data: nextMessage } = await refacSupabaseAdmin
    .from('unified_messages')
    .select('content, sender_type')
    .eq('conversation_id', embedding.conversation_id)
    .gt('created_at', embedding.created_at)
    .eq('sender_type', 'staff')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  // IMPROVED: Look for ANY staff response in the conversation
  const { data: anyStaffResponse } = await refacSupabaseAdmin
    .from('unified_messages')
    .select('content')
    .eq('conversation_id', embedding.conversation_id)
    .eq('sender_type', 'staff')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    ...sample,
    actual_staff_response: nextMessage?.content || anyStaffResponse?.content
  };
}
```

**Expected Impact:** Enable 40 metric (semantic similarity and LLM-as-Judge)

---

### 5.2 Add Intent Detection Confidence Scoring

Currently, the AI either calls a function or doesn't. Add confidence scoring:

```typescript
// In suggestion-service.ts system prompt
"If you're unsure whether to call a function, include your confidence level in the response.
Use function calling only when confidence > 70%."
```

**Benefit:** Reduce false positives, allow staff override on low-confidence calls

---

### 5.3 Add Multi-Turn Conversation Context

Currently evaluates single messages. Improve by including conversation history:

```typescript
// In evaluation script
const conversationHistory = await getConversationHistory(
  sample.conversation_id,
  sample.created_at
);

const suggestionResponse = await fetch('/api/ai/suggest-response', {
  // ...
  body: JSON.stringify({
    customerMessage: sample.customer_message,
    conversationHistory: conversationHistory, // NEW
    // ...
  })
});
```

**Expected Impact:** +15-20% accuracy for follow-up questions

---

## Timeline & Rollout

### Week 1 (Current) ✅
- [x] Run initial evaluation
- [x] Enhance function schemas
- [x] Create parameter helpers
- [x] Document improvements

### Week 2 (Next)
- [ ] Integrate parameter helpers into suggestion service
- [ ] Add function call validation
- [ ] Re-run evaluation to measure improvement
- [ ] Fix any remaining critical issues

### Week 3
- [ ] Improve semantic similarity data collection
- [ ] Add confidence scoring
- [ ] Deploy to production with monitoring

### Week 4
- [ ] Add multi-turn conversation context
- [ ] Build training data logger
- [ ] Plan fine-tuning strategy

---

## Success Metrics

**Baseline (Current):**
- Function Selection: 30%
- Parameter Extraction: 11%
- Booking Detection: 0%
- Coaching Detection: 0%

**Phase 1 Target (Function Schema + Parameter Helpers):**
- Function Selection: 65% (+35 points)
- Parameter Extraction: 55% (+44 points)
- Booking Detection: 65% (+65 points)
- Coaching Detection: 75% (+75 points)

**Phase 2 Target (Context + Confidence):**
- Function Selection: 80% (production-ready)
- Parameter Extraction: 70% (production-ready)
- Booking Detection: 80%
- Coaching Detection: 85%

**Phase 3 Target (Fine-tuning):**
- Function Selection: 90%
- Parameter Extraction: 85%
- All intents: 85%+

---

## Monitoring & Iteration

### Weekly Evaluation Runs
```bash
# Automated weekly evaluation
npm run ai:test  # Extracts samples + runs evaluation
```

**Track trends:**
- Function accuracy by intent
- Parameter extraction by field (date, time, duration)
- Response quality scores
- Business rule compliance

### Production Monitoring

Add to admin dashboard:
```typescript
// Daily metrics
- AI suggestions generated: count
- Staff acceptance rate: %
- Function calls by type: breakdown
- Average confidence score: 0-1
- Parameter extraction errors: count
```

### A/B Testing Framework

Test prompt variations:
```typescript
const PROMPT_VARIANTS = {
  A: LENGOLF_SYSTEM_PROMPT,  // Current
  B: LENGOLF_SYSTEM_PROMPT + "\nBe more aggressive in calling functions",
  C: LENGOLF_SYSTEM_PROMPT + "\nOnly call functions when 90% confident"
};

// Randomly assign 33% of traffic to each variant
// Measure acceptance rates after 1 week
```

---

## Cost Analysis

**Current evaluation cost:** $0.11 per 60 samples

**Monthly monitoring (4 weekly runs):** $0.44/month

**Production usage estimate:**
- 100 AI suggestions/day
- $0.002 per suggestion (GPT-4o-mini + embeddings)
- **$6/month** for AI assistance feature

**ROI Calculation:**
- Staff time saved: ~5 minutes per booking
- 30 bookings/day × 5 min = 150 min/day saved
- **2.5 hours/day** of staff time freed up
- **Cost: $6/month vs. Value: 75 hours/month**

---

## References

- **Evaluation Framework:** `docs/technical/AI_EVALUATION_FRAMEWORK.md`
- **Function Schemas:** `src/lib/ai/function-schemas.ts`
- **Parameter Helpers:** `src/lib/ai/parameter-helpers.ts`
- **Evaluation Report:** `tests/ai/evaluation-report-2025-10-20T03-32-03-271Z.json`
- **Test Samples:** `tests/ai/test-samples.json`

---

**Document Version:** 1.0
**Last Updated:** October 20, 2025
**Next Review:** After Phase 1 re-evaluation
