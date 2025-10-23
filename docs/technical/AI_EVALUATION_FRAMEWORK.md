# AI Function Calling Evaluation Framework

**Based on 2025 Industry Research & Best Practices**

## Research Summary

Based on comprehensive research of 2025 evaluation methodologies, modern AI chatbot evaluation has evolved beyond traditional metrics (BLEU, ROUGE) to multi-dimensional frameworks that better capture:

- **Semantic similarity** over word-matching
- **Function/tool calling accuracy** with parameter extraction
- **Conversational context** and role adherence
- **Bilingual quality** for Thai/English responses
- **Task completion** in booking workflows

---

## Our Evaluation Framework

### 1. Function Calling Metrics (Berkeley BFCL-inspired)

**Based on:** Berkeley Function Calling Leaderboard V4, HammerBench

#### 1.1 Function Selection Accuracy
**Definition:** % of test cases where the correct function was called

```
Function Selection Accuracy = (Correct Functions / Total Tests) × 100%
```

**Scoring:**
- ✅ **Match** (1.0): Correct function selected
- ❌ **Miss** (0.0): Wrong function or no function called

**Example:**
- Customer: "Do you have bay available at 2pm?"
- Expected: `check_bay_availability`
- AI Called: `check_bay_availability` → **Score: 1.0**

#### 1.2 Parameter Extraction Accuracy
**Definition:** % accuracy of extracted parameters matching expected values

**Based on:** Multi-level parameter matching (HammerBench approach)

```
Parameter Accuracy = (Correct Parameters / Total Parameters) × 100%
```

**Scoring Levels:**
- **Strict** (1.0): All parameters match exactly
- **Moderate** (0.5): Core parameters match (date, time), optional parameters may differ
- **Loose** (0.3): Function-critical parameters present, values may be close

**Example:**
```json
Expected: {
  "date": "2025-10-20",
  "start_time": "14:00",
  "bay_type": "all",
  "duration": 1
}

AI Extracted: {
  "date": "2025-10-20",     // ✅ Exact match
  "start_time": "14:00",    // ✅ Exact match
  "bay_type": "social",     // ❌ Different (customer said "any")
  "duration": 1             // ✅ Exact match
}

Score: 0.75 (3/4 parameters correct)
```

#### 1.3 Parameter Hallucination Rate
**Definition:** % of parameters that were incorrectly added or fabricated

```
Hallucination Rate = (Hallucinated Parameters / Total Extracted) × 100%
```

**Target:** < 5% hallucination rate

---

### 2. Response Quality Metrics

**Based on:** BERTScore, SemScore, Semantic Similarity research

#### 2.1 Semantic Similarity Score
**Method:** Cosine similarity between AI response and actual staff response embeddings

```python
# Using OpenAI embeddings
ai_embedding = generate_embedding(ai_response)
staff_embedding = generate_embedding(staff_response)
similarity = cosine_similarity(ai_embedding, staff_embedding)
```

**Scoring:**
- 0.90-1.00: **Excellent** - Semantically equivalent
- 0.75-0.89: **Good** - Similar meaning, minor differences
- 0.60-0.74: **Fair** - Related but different approach
- < 0.60: **Poor** - Semantically different

**Why Not BERTScore:** While BERTScore is popular, cosine similarity with high-quality embeddings (OpenAI text-embedding-3-small) is:
- Lower computational cost
- More interpretable
- Sufficient for our Thai/English bilingual use case

#### 2.2 Response Appropriateness (LLM-as-Judge)
**Method:** GPT-4o-mini evaluates response quality on multiple dimensions

**Evaluation Prompt:**
```
Evaluate this AI assistant response for a golf booking system:

Customer Message: "{customer_message}"
Actual Staff Response: "{staff_response}"
AI Suggested Response: "{ai_response}"

Rate 1-5 on:
1. Accuracy: Does it answer correctly?
2. Tone: Is it appropriately casual/professional?
3. Completeness: Covers all necessary info?
4. Language: Proper Thai/English usage?

Return JSON: {
  "accuracy": 1-5,
  "tone": 1-5,
  "completeness": 1-5,
  "language": 1-5,
  "overall": 1-5,
  "reasoning": "..."
}
```

**Target:** Overall score ≥ 3.5/5

---

### 3. Bilingual Quality Metrics

**Based on:** Multilingual chatbot evaluation research

#### 3.1 Language Detection Accuracy
**Definition:** Did AI correctly detect customer's language?

```
Language Detection = (Correct Language / Total Tests) × 100%
```

**Scoring:**
- Thai message → Thai response: ✅
- English message → English response: ✅
- Mixed → Appropriate response: ✅

#### 3.2 Response Length Appropriateness
**Definition:** Thai responses should be concise (per our guidelines)

**Thai Response Rules:**
- **Target:** 5-8 words maximum
- **Evaluation:** Length compliance % by language

```
Thai Length Compliance = (Thai responses ≤ 10 words / Total Thai) × 100%
```

**Target:** ≥ 85% compliance

---

### 4. Business Rule Compliance

**Based on:** Domain-specific requirements

#### 4.1 Bay Terminology Compliance
**Definition:** Never mention specific bay numbers to customers

**Test:**
```python
def check_bay_terminology(response: str) -> bool:
    # ALLOWED: "Social bay", "AI bay", "bay" (general)
    # FORBIDDEN: "Bay 1", "Bay 2", "Bay 3", "Bay 4"

    forbidden_patterns = [
        r'\bbay\s+[1-4]\b',
        r'\bbay\s+one\b',
        r'\bbay\s+two\b',
        r'\bbay\s+three\b',
        r'\bbay\s+four\b'
    ]

    return not any(re.search(pattern, response, re.IGNORECASE)
                   for pattern in forbidden_patterns)
```

**Target:** 100% compliance

#### 4.2 Approval Workflow Compliance
**Definition:** Booking creation must always require approval

**Test:**
- All `create_booking` function calls → `requiresApproval = true`

**Target:** 100% compliance

---

### 5. Aggregate Metrics

#### 5.1 Overall Evaluation Score
**Weighted composite score across all dimensions**

```
Overall Score = (
    Function Selection Accuracy × 0.30 +
    Parameter Extraction Accuracy × 0.25 +
    Semantic Similarity × 0.20 +
    Response Appropriateness × 0.15 +
    Language Quality × 0.05 +
    Business Rule Compliance × 0.05
) × 100
```

**Target:** ≥ 75% overall score

#### 5.2 Intent-Specific Scores
**Break down performance by intent type**

- **Availability Checks:** Target ≥ 80%
- **Booking Requests:** Target ≥ 70% (more complex)
- **Coaching Inquiries:** Target ≥ 75%

---

## Evaluation Process

### Step 1: Sample Selection
- Extract 50-60 diverse test samples
- Stratified by intent, language, channel
- Include actual staff responses for comparison

### Step 2: Dry Run Execution
- Enable dry run mode to prevent real bookings
- Call AI suggestion API for each test sample
- Capture: function called, parameters, suggested response

### Step 3: Automated Scoring
- **Function metrics:** Compare expected vs actual programmatically
- **Semantic similarity:** Calculate cosine similarity of embeddings
- **Bay terminology:** Regex-based compliance check

### Step 4: LLM-as-Judge Evaluation
- Use GPT-4o-mini to evaluate response quality
- Generate 1-5 ratings on multiple dimensions
- Capture reasoning for manual review

### Step 5: Generate Report
- Aggregate metrics by intent, language, channel
- Identify failure patterns
- Generate actionable recommendations

---

## Success Criteria

Based on 2025 research and our specific use case:

| Metric | Target | Rationale |
|--------|--------|-----------|
| Function Selection Accuracy | ≥ 80% | Industry standard (BFCL benchmarks) |
| Parameter Extraction Accuracy | ≥ 70% | Complex multilingual context |
| Semantic Similarity | ≥ 0.70 | Good semantic alignment |
| LLM-as-Judge Overall | ≥ 3.5/5 | Above-average quality |
| Bay Terminology Compliance | 100% | Critical business rule |
| Thai Length Compliance | ≥ 85% | Brand voice consistency |
| Overall Composite Score | ≥ 75% | Production-ready threshold |

---

## Iteration & Improvement

### Failure Analysis
**When evaluation scores are low:**

1. **Function Selection Errors (< 80%)**
   - Review function descriptions in schemas
   - Add more training examples
   - Improve intent detection prompts

2. **Parameter Extraction Errors (< 70%)**
   - Review parameter extraction logic
   - Add validation rules
   - Improve function parameter descriptions

3. **Semantic Similarity Issues (< 0.70)**
   - Review system prompts
   - Adjust response formatting
   - Fine-tune tone guidance

4. **Bay Terminology Violations**
   - Update system prompts with stronger warnings
   - Add post-processing filters
   - Review function result formatting

### Continuous Monitoring
- Re-run evaluation weekly with new samples
- Track metric trends over time
- A/B test prompt improvements

---

## Tools & Technologies

### Evaluation Stack
- **Function Calling:** Custom executor with dry run mode
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Semantic Similarity:** Cosine similarity (NumPy/SciPy)
- **LLM-as-Judge:** GPT-4o-mini with structured output
- **Storage:** JSON reports with timestamp
- **Visualization:** Dashboard with metrics breakdown

### Cost Estimation
**Per 50-sample evaluation run:**
- Embeddings: ~100 embeddings × $0.0001 = $0.01
- LLM-as-Judge: ~50 evaluations × $0.002 = $0.10
- **Total: ~$0.11 per evaluation run**

**Monthly cost (weekly runs):** ~$0.44/month

---

## References

- Berkeley Function Calling Leaderboard (BFCL) V4 - Function calling evaluation standard
- BERTScore & SemScore - Semantic similarity metrics
- HammerBench - Parameter extraction evaluation
- Multi-dimensional chatbot evaluation frameworks (2025)
- Bilingual chatbot quality assessment research

---

**Document Version:** 1.0
**Last Updated:** October 20, 2025
**Next Review:** Implementation completion
