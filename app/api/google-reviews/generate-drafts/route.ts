import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { openai } from '@/lib/ai/openai-client';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { GoogleReviewDB } from '@/types/google-reviews';

export const maxDuration = 60; // Vercel hobby plan limit

const BATCH_SIZE = 5; // Reviews per OpenAI call
const DELAY_BETWEEN_BATCHES_MS = 1000;

/**
 * Build the system prompt with style examples from existing replies
 */
function buildSystemPrompt(
  exampleRepliesEN: { reviewer_name: string; star_rating: string; comment: string | null; reply_text: string }[],
  exampleRepliesTH: { reviewer_name: string; star_rating: string; comment: string | null; reply_text: string }[]
): string {
  const enExamples = exampleRepliesEN
    .slice(0, 10)
    .map(r => `Review by ${r.reviewer_name} (${r.star_rating}): "${r.comment || '(no comment)'}"\nReply: "${r.reply_text}"`)
    .join('\n\n');

  const thExamples = exampleRepliesTH
    .slice(0, 10)
    .map(r => `Review by ${r.reviewer_name} (${r.star_rating}): "${r.comment || '(no comment)'}"\nReply: "${r.reply_text}"`)
    .join('\n\n');

  return `You are the social media manager for LENGOLF, a premium indoor golf simulator bar in Bangkok, Thailand. You write replies to Google Business reviews.

## Reply Style Rules
- Casual, warm, friendly tone. 1-3 sentences max.
- Address reviewer by first name. Use "K'" prefix for Thai names (e.g., "K'Thanapat").
- If staff members are mentioned by name, give them a shout-out (common staff: Dolly, Net/Nate, Min, May, Set, Ashley, Coach Ratchavin, Pro Min, Pro Boss).
- Use golf emojis sparingly (~30% of replies): ⛳️ 🏌️ 🏌️‍♀️
- Occasionally use the "swing by" golf pun.
- For 4-star reviews: thank them and politely ask what could be improved to earn the 5th star.
- For 3-star or lower: thank them, acknowledge the feedback constructively, and invite them back.
- For reviews with NO comment (rating only): keep it very short - just thank them and invite them back.
- NEVER be defensive or argumentative.
- Do NOT repeat the exact same reply for different reviews - each should feel unique.

## Language Rules
- For English reviews (EN) or reviews in other languages that appear to be English: Reply in English.
- For Thai reviews (TH): Reply in Thai. Match the casual, friendly Thai style shown in the examples below.
- For reviews in other languages (Japanese, Chinese, Korean, French, etc.): Reply in THAT language. Also provide an English translation.

## English Reply Examples
${enExamples}

## Thai Reply Examples
${thExamples}

## Output Format
For each review, respond with ONLY the reply text. Nothing else - no quotes, no prefixes, no explanations.
If the review is in a non-English, non-Thai language, format your response as:
[reply in original language]
---EN_TRANSLATION---
[English translation of the reply]`;
}

/**
 * Generate a draft reply for a single review using OpenAI
 */
async function generateDraftForReview(
  review: GoogleReviewDB,
  systemPrompt: string
): Promise<{ draft_reply: string; draft_reply_en_translation: string | null }> {
  const ratingMap: Record<string, string> = {
    ONE: '1-star', TWO: '2-star', THREE: '3-star', FOUR: '4-star', FIVE: '5-star',
  };

  const userPrompt = `Write a reply to this Google review:

Reviewer: ${review.reviewer_name}
Rating: ${ratingMap[review.star_rating] || review.star_rating}
Language: ${review.language}
Comment: ${review.comment || '(No comment - rating only)'}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content?.trim() || '';

  // Check if there's an English translation separator
  if (content.includes('---EN_TRANSLATION---')) {
    const parts = content.split('---EN_TRANSLATION---');
    return {
      draft_reply: parts[0].trim(),
      draft_reply_en_translation: parts[1]?.trim() || null,
    };
  }

  return {
    draft_reply: content,
    draft_reply_en_translation: null,
  };
}

/**
 * POST /api/google-reviews/generate-drafts
 *
 * Generates AI draft replies for all unreplied reviews that don't already have a draft.
 * Uses OpenAI with existing reply examples to match LENGOLF's tone.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch unreplied reviews without existing drafts
    const { data: unrepliedReviews, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .select('*')
      .eq('has_reply', false)
      .is('draft_reply', null)
      .order('review_created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching unreplied reviews:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    if (!unrepliedReviews || unrepliedReviews.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: 'No unreplied reviews without drafts found',
      });
    }

    // Fetch existing replied reviews as style examples
    const { data: enExamples } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .select('reviewer_name, star_rating, comment, reply_text')
      .eq('has_reply', true)
      .eq('language', 'EN')
      .not('reply_text', 'is', null)
      .order('review_created_at', { ascending: false })
      .limit(15);

    const { data: thExamples } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .select('reviewer_name, star_rating, comment, reply_text')
      .eq('has_reply', true)
      .eq('language', 'TH')
      .not('reply_text', 'is', null)
      .order('review_created_at', { ascending: false })
      .limit(15);

    const systemPrompt = buildSystemPrompt(
      (enExamples || []) as { reviewer_name: string; star_rating: string; comment: string | null; reply_text: string }[],
      (thExamples || []) as { reviewer_name: string; star_rating: string; comment: string | null; reply_text: string }[]
    );

    console.log(`Generating drafts for ${unrepliedReviews.length} reviews...`);

    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process reviews in batches
    for (let i = 0; i < unrepliedReviews.length; i += BATCH_SIZE) {
      const batch = unrepliedReviews.slice(i, i + BATCH_SIZE) as GoogleReviewDB[];

      // Process each review in the batch concurrently
      const results = await Promise.allSettled(
        batch.map(async (review) => {
          const { draft_reply, draft_reply_en_translation } = await generateDraftForReview(review, systemPrompt);

          if (!draft_reply) {
            throw new Error(`Empty draft for review ${review.id}`);
          }

          // Save draft to database
          const { error: updateError } = await refacSupabaseAdmin
            .schema('backoffice')
            .from('google_reviews')
            .update({
              draft_reply,
              draft_reply_en_translation,
              draft_status: 'pending',
              draft_generated_at: new Date().toISOString(),
            })
            .eq('id', review.id);

          if (updateError) {
            throw new Error(`DB update failed for ${review.id}: ${updateError.message}`);
          }

          return { id: review.id, reviewer_name: review.reviewer_name };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          generated++;
          console.log(`Draft generated for: ${result.value.reviewer_name}`);
        } else {
          failed++;
          const errMsg = result.reason?.message || 'Unknown error';
          errors.push(errMsg);
          console.error(`Draft generation failed:`, errMsg);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < unrepliedReviews.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log(`Draft generation complete: ${generated} generated, ${failed} failed`);

    return NextResponse.json({
      success: true,
      generated,
      failed,
      total: unrepliedReviews.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (error) {
    console.error('Error in POST /api/google-reviews/generate-drafts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
