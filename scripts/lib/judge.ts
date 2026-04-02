/**
 * LLM-as-Judge scoring module for AI suggestion evaluation.
 *
 * Uses GPT-4o-mini to score AI responses across 4 dimensions:
 * appropriateness, helpfulness, tone match, and brevity.
 *
 * Follows the established pattern from evaluate-against-staff-actions.ts:
 * direct fetch to OpenAI API, response_format: { type: 'json_object' }, temperature: 0.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DimensionScore {
  score: number; // 1-5
  reasoning: string;
}

export interface JudgeScores {
  appropriateness: DimensionScore;
  helpfulness: DimensionScore;
  toneMatch: DimensionScore;
  brevity: DimensionScore;
  functionAlignment: DimensionScore;
  overallScore: number;
  judgeModel: string;
  judgeTimestamp: string;
  judgeLatencyMs: number;
}

/** Matches the SampleResult type from sample-e2e-suggestions.ts */
export interface JudgeableSample {
  conversationId: string;
  customerName: string | null;
  channelType: string;
  testPoint: {
    customerMsgNum: number;
    customerMessage: string;
    history: Array<{ content: string; senderType: string; createdAt: string }>;
    actualStaffResponse: string | null;
  };
  aiResponse: string;
  aiResponseThai: string | null;
  intent: string;
  confidenceScore: number;
  functionCalled: string | null;
  judgeScores?: JudgeScores | null;
}

// ─── Dimension weights ───────────────────────────────────────────────────────

export const DIMENSION_WEIGHTS = {
  appropriateness: 0.25,
  helpfulness: 0.25,
  toneMatch: 0.15,
  brevity: 0.15,
  functionAlignment: 0.2,
} as const;

// ─── Judge prompt ────────────────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for a Thai golf simulator business (LENGOLF) AI assistant.

The AI generates staff-facing response suggestions that staff can send to customers via LINE, Instagram, or website chat. Your job is to score the AI's suggested response on 4 dimensions.

SCORING RUBRIC (1-5 scale):

**Appropriateness** (weight: 0.25)
- 5: Perfectly addresses the customer's need, correct language, no hallucinated info
- 4: Addresses the need with minor imperfections (e.g., slightly awkward phrasing)
- 3: Mostly appropriate but has a notable issue (e.g., wrong assumption, unnecessary info)
- 2: Partially misses the mark (e.g., wrong topic, includes fabricated details)
- 1: Completely inappropriate or fabricates information

**Helpfulness** (weight: 0.25)
- 5: Directly resolves the customer's question/request, actionable and complete
- 4: Very helpful with minor gaps (e.g., could have added one more detail)
- 3: Somewhat helpful but missing key information or asks unnecessary questions
- 2: Marginally helpful, mostly filler or off-topic content
- 1: Not helpful at all, does not address what the customer asked

**Tone Match** (weight: 0.15)
- 5: Perfect Thai premium service tone - warm, professional, uses polite particles (ค่ะ/ครับ)
- 4: Good tone with minor issues (e.g., slightly too formal or too casual)
- 3: Acceptable tone but doesn't match the warm Thai hospitality standard
- 2: Tone is off (e.g., robotic, overly corporate, rude)
- 1: Completely wrong tone for customer service

**Brevity** (weight: 0.15)
- 5: Ideal length - concise and complete (1-2 sentences, matching real staff style)
- 4: Slightly too long or too short but still effective
- 3: Noticeably too verbose or too terse, could be trimmed/expanded
- 2: Much too long (paragraph when sentence would do) or too short (missing needed info)
- 1: Extremely verbose or so brief it's unhelpful

**Function Alignment** (weight: 0.2)
- 5: Called the right tool with correct parameters (e.g., check_bay_availability for booking, get_coaching_availability for coaching), OR correctly decided no tool was needed
- 4: Called an appropriate tool but with suboptimal parameters, or called an extra unnecessary tool
- 3: Called a related but wrong tool (e.g., check_bay_availability instead of get_coaching_availability for coaching inquiry)
- 2: Called an unrelated tool, or failed to call any tool when one was clearly needed (e.g., customer provides booking details but AI just asks questions)
- 1: Called a harmful/wrong tool (e.g., cancel_booking when customer wanted to modify), or completely ignored an actionable request

IMPORTANT CONTEXT:
- LENGOLF is a premium golf simulator venue in Bangkok
- Responses should be in Thai unless the customer writes in English
- Real staff responses are typically 1-2 short sentences
- Staff use polite Thai particles (ค่ะ for female staff, ครับ for male)
- The AI response is a SUGGESTION shown to staff, not sent directly to customers

Respond in JSON with this exact structure:
{
  "appropriateness": { "score": <1-5>, "reasoning": "<brief explanation>" },
  "helpfulness": { "score": <1-5>, "reasoning": "<brief explanation>" },
  "toneMatch": { "score": <1-5>, "reasoning": "<brief explanation>" },
  "brevity": { "score": <1-5>, "reasoning": "<brief explanation>" },
  "functionAlignment": { "score": <1-5>, "reasoning": "<brief explanation>" }
}`;

// ─── Build user message ──────────────────────────────────────────────────────

function buildJudgeUserMessage(sample: JudgeableSample): string {
  const parts: string[] = [];

  parts.push(`CHANNEL: ${sample.channelType}`);
  parts.push(`DETECTED INTENT: ${sample.intent}`);
  parts.push(`FUNCTION CALLED: ${sample.functionCalled || '(none)'}`);

  if (sample.testPoint.history.length > 0) {
    parts.push('\nCONVERSATION HISTORY:');
    // Show last 6 messages max for context
    const recentHistory = sample.testPoint.history.slice(-6);
    recentHistory.forEach((msg) => {
      const role = msg.senderType === 'user' || msg.senderType === 'customer' ? 'CUSTOMER' : 'STAFF';
      parts.push(`  ${role}: ${msg.content}`);
    });
  }

  parts.push(`\nCUSTOMER MESSAGE (being responded to):\n  "${sample.testPoint.customerMessage}"`);
  parts.push(`\nAI SUGGESTED RESPONSE:\n  "${sample.aiResponse}"`);

  if (sample.testPoint.actualStaffResponse) {
    parts.push(`\nACTUAL STAFF RESPONSE (reference):\n  "${sample.testPoint.actualStaffResponse}"`);
  } else {
    parts.push('\nACTUAL STAFF RESPONSE: (not available)');
  }

  return parts.join('\n');
}

// ─── Core judge function ─────────────────────────────────────────────────────

const JUDGE_MODEL = 'gpt-4o-mini';

export async function judgeOneSample(sample: JudgeableSample): Promise<JudgeScores | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    return null;
  }

  const userMessage = buildJudgeUserMessage(sample);
  const startTime = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: JUDGE_MODEL,
          messages: [
            { role: 'system', content: JUDGE_SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      const latencyMs = Date.now() - startTime;

      // Validate scores are in range
      const dims: Array<'appropriateness' | 'helpfulness' | 'toneMatch' | 'brevity' | 'functionAlignment'> = [
        'appropriateness', 'helpfulness', 'toneMatch', 'brevity', 'functionAlignment',
      ];
      dims.forEach((dim) => {
        if (!parsed[dim] || typeof parsed[dim].score !== 'number') {
          throw new Error(`Missing or invalid score for ${dim}`);
        }
        parsed[dim].score = Math.max(1, Math.min(5, Math.round(parsed[dim].score)));
        if (typeof parsed[dim].reasoning !== 'string') {
          parsed[dim].reasoning = '';
        }
      });

      const overallScore = Math.round((
        parsed.appropriateness.score * DIMENSION_WEIGHTS.appropriateness +
        parsed.helpfulness.score * DIMENSION_WEIGHTS.helpfulness +
        parsed.toneMatch.score * DIMENSION_WEIGHTS.toneMatch +
        parsed.brevity.score * DIMENSION_WEIGHTS.brevity +
        parsed.functionAlignment.score * DIMENSION_WEIGHTS.functionAlignment
      ) * 10) / 10;

      return {
        appropriateness: parsed.appropriateness,
        helpfulness: parsed.helpfulness,
        toneMatch: parsed.toneMatch,
        brevity: parsed.brevity,
        functionAlignment: parsed.functionAlignment,
        overallScore,
        judgeModel: JUDGE_MODEL,
        judgeTimestamp: new Date().toISOString(),
        judgeLatencyMs: latencyMs,
      };
    } catch (err) {
      if (attempt === 0) {
        console.warn(`    Retry after error: ${err instanceof Error ? err.message : err}`);
        await delay(1000);
      } else {
        console.error(`    Judge failed: ${err instanceof Error ? err.message : err}`);
        return null;
      }
    }
  }

  return null;
}

// ─── Batch judge ─────────────────────────────────────────────────────────────

export async function judgeAllSamples(
  samples: JudgeableSample[],
  options?: { skipJudged?: boolean }
): Promise<Map<number, JudgeScores | null>> {
  const results = new Map<number, JudgeScores | null>();
  const skipJudged = options?.skipJudged ?? true;

  // Pre-compute counts for accurate progress display
  let skippedNoStaff = 0;
  let skippedAlreadyJudged = 0;
  const toJudge = samples.filter((s) => {
    if (!s.testPoint.actualStaffResponse) { skippedNoStaff++; return false; }
    if (skipJudged && s.judgeScores) { skippedAlreadyJudged++; return false; }
    return true;
  }).length;
  // Reset for display at end
  skippedNoStaff = 0;
  skippedAlreadyJudged = 0;

  let judged = 0;

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];

    // Skip if no staff response to compare against
    if (!sample.testPoint.actualStaffResponse) {
      skippedNoStaff++;
      continue;
    }

    // Skip if already judged (unless rejudging)
    if (skipJudged && sample.judgeScores) {
      skippedAlreadyJudged++;
      continue;
    }

    judged++;
    const label = `[${judged}/${toJudge}]`;
    const msgPreview = sample.testPoint.customerMessage.substring(0, 50);
    console.log(`  ${label} Judging: "${msgPreview}${sample.testPoint.customerMessage.length > 50 ? '...' : ''}"`);

    const scores = await judgeOneSample(sample);
    results.set(i, scores);

    if (scores) {
      console.log(`    Score: ${scores.overallScore} (A:${scores.appropriateness.score} H:${scores.helpfulness.score} T:${scores.toneMatch.score} B:${scores.brevity.score} F:${scores.functionAlignment.score}) ${scores.judgeLatencyMs}ms`);
    }

    // Delay between calls to avoid rate limiting
    if (i < samples.length - 1) {
      await delay(200);
    }
  }

  console.log(`\n  Judged: ${judged} | Skipped (no staff): ${skippedNoStaff} | Skipped (already judged): ${skippedAlreadyJudged}`);

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
