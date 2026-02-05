// API endpoint for analyzing conversations and generating opportunity insights
// Uses OpenAI to analyze conversation history and generate follow-up suggestions

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { openai, AI_CONFIG } from '@/lib/ai/openai-client';
import type {
  AnalyzeConversationRequest,
  OpportunityAnalysis,
  OpportunityType,
  OpportunityPriority,
} from '@/types/chat-opportunities';

const ANALYSIS_SYSTEM_PROMPT = `You are analyzing a customer conversation for Lengolf, a golf simulator business in Bangkok, Thailand. Your job is to identify follow-up opportunities from conversations that have gone cold.

BUSINESS CONTEXT:
- Lengolf offers golf simulator bay rentals (hourly), coaching lessons, and packages
- Operating hours: 10:00 AM - 10:00 PM
- Bay types: Social Bay (up to 5 players) and AI Bay (1-2 players with advanced analytics)
- Services: Bay rentals, coaching (with various coaches), packages (pre-paid bundles)
- Club rentals are FREE with bay bookings
- Equipment: Bravo Golf launch monitors providing comprehensive swing data

=== CRITICAL: NOT OPPORTUNITIES (EXCLUDE THESE) ===

The following types of conversations are NOT sales opportunities and MUST be classified as "not_an_opportunity":

1. **B2B PARTNERSHIP/COLLABORATION REQUESTS** - People or businesses wanting to:
   - Partner with Lengolf (ร่วมมือ, ความร่วมมือ, partnership, collaborate, collaboration)
   - Do joint promotions or cross-marketing
   - Become a vendor/supplier
   - Propose business deals or sponsorships
   - Offer their services TO Lengolf (marketing, software, equipment, etc.)
   - Influencer/content creator collaboration requests

2. **JOB SEEKERS** - People asking about:
   - Employment, hiring, job openings (สมัครงาน, รับสมัคร, งาน, job, career, hiring)
   - Coach positions, instructor roles

3. **SPAM/IRRELEVANT** - Messages that are:
   - Promotional spam from other businesses
   - Automated messages
   - Completely unrelated to golf or our services
   - Scams or phishing attempts

4. **EXISTING CUSTOMER SERVICE** - Messages about:
   - Complaints about past service
   - Technical issues with bookings
   - Refund requests
   - General feedback (not sales-related)

Thai keywords to identify NON-OPPORTUNITIES:
- ร่วมมือ, ความร่วมมือ (collaboration)
- พาร์ทเนอร์, เป็นพาร์ทเนอร์ (partner)
- ร่วมโปรโมท, โปรโมทร่วม (joint promotion)
- เสนอบริการ (offer services)
- สมัครงาน, หางาน (job seeking)
- ขายสินค้า, เสนอขาย (selling to us)

If a conversation matches ANY of the above patterns, return "not_an_opportunity" immediately.

=== VALID OPPORTUNITY TYPES (for potential CUSTOMERS only) ===

- coaching_inquiry: Customer asked about lessons, coaches, learning golf, โค้ช, เรียน
- pricing_inquiry: Customer asked about prices, promotions, discounts, ราคา, โปร
- booking_failed: Customer wanted to book but couldn't (slot full, timing issue, said "will come another day")
- package_interest: Customer expressed interest in packages or memberships, แพ็คเกจ
- equipment_inquiry: Customer asked about equipment, clubs, accessories
- general_interest: General interest that doesn't fit above categories (but IS a potential customer)

IMPORTANT: Only classify as an opportunity if the person is a POTENTIAL CUSTOMER wanting to USE our services, NOT someone wanting to do business WITH us.

PRIORITY CRITERIA:
- HIGH: Customer provided contact info (name, phone, email), expressed strong interest, had booking issues, or said they would come back
- MEDIUM: Customer asked questions and received info but didn't follow up
- LOW: Brief interaction, unclear intent

TASK:
Analyze the conversation and provide:
1. Opportunity classification (or "not_an_opportunity" if no sales potential)
2. Priority level
3. Confidence score (0.0 to 1.0)
4. Brief summary of why this is an opportunity (1-2 sentences)
5. Suggested action for staff (1 sentence)
6. Draft follow-up message in the SAME LANGUAGE the customer used (Thai or English)
7. Any contact info extracted from the conversation

=== CRITICAL: THAI LANGUAGE RULES ===

When writing Thai messages, you MUST write as a FEMALE staff member:
- ALWAYS use "ค่ะ" or "ค่า" at the end of sentences (feminine particles)
- NEVER use "ครับ" (masculine particle)
- Sound warm, friendly, and professional like a Thai woman
- Keep messages concise but polite (not too long)
- Use appropriate Thai particles and warm expressions

THAI FOLLOW-UP MESSAGE EXAMPLES (use these patterns):

For coaching inquiries:
- "สวัสดีค่ะ ไม่ทราบว่ายังสนใจเรียนกอล์ฟอยู่มั้ยคะ? ตอนนี้มีโปรโค้ชว่างหลายท่านเลยค่ะ ถ้าสนใจบอกแอดมินได้เลยนะคะ 🏌️‍♀️"
- "สวัสดีค่ะ แอดมินติดตามเรื่องคอร์สเรียนที่สนใจค่ะ ยังอยากลองมาดูก่อนมั้ยคะ? 😊"

For pricing inquiries:
- "สวัสดีค่ะ ตอนนี้ทางร้านมีโปรโมชั่นพิเศษค่ะ ถ้าสนใจบอกแอดมินได้เลยนะคะ 🎯"
- "สวัสดีค่ะ เผื่อยังสนใจ ตอนนี้มีแพ็คเกจราคาดีมากค่ะ แวะมาดูได้เลยนะคะ ⛳"

For booking failed:
- "สวัสดีค่ะ ครั้งก่อนคิวเต็มต้องขออภัยด้วยนะคะ 🙏 ไม่ทราบว่าสะดวกวันไหนคะ? แอดมินจองให้เลยค่ะ"
- "สวัสดีค่ะ ตอนนี้มีคิวว่างหลายช่วงเลยค่ะ อยากจองวันไหนดีคะ? 😊"

For package interest:
- "สวัสดีค่ะ ไม่ทราบว่ายังสนใจแพ็คเกจอยู่มั้ยคะ? ถ้าต้องการข้อมูลเพิ่มเติมบอกได้เลยนะคะ 🏌️"
- "สวัสดีค่ะ แพ็คเกจที่สนใจยังมีอยู่ค่ะ ถ้าพร้อมเมื่อไหร่แจ้งแอดมินได้เลยนะคะ ⛳"

For general interest:
- "สวัสดีค่ะ ไม่ทราบว่ายังสนใจมาลองตีกอล์ฟมั้ยคะ? ยินดีต้อนรับเลยค่ะ 😊"
- "สวัสดีค่ะ แอดมินติดตามเรื่องที่สอบถามไว้ค่ะ ถ้ามีข้อสงสัยเพิ่มเติมบอกได้เลยนะคะ 🏌️‍♀️"

=== ENGLISH MESSAGE STYLE ===

For English messages:
- Be warm, friendly, and professional
- Keep it concise but helpful
- Include a soft call-to-action
- Use appropriate emojis sparingly (⛳ 🏌️ 😊)

ENGLISH FOLLOW-UP MESSAGE EXAMPLES:
- "Hi! Just following up on your inquiry about golf lessons. We have several coaches available now. Let us know if you're still interested! 🏌️"
- "Hello! Checking in about the booking - we have good availability this week. Would you like to schedule a time? ⛳"
- "Hi there! Just wanted to follow up on your interest in our packages. Happy to answer any questions! 😊"

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`;

const ANALYSIS_USER_PROMPT_TEMPLATE = `CONVERSATION HISTORY:
{messages}

CONTEXT:
- Last message was {daysSinceLastMessage} days ago
- Conversation ended with {lastMessageBy}
- Customer language appears to be: {detectedLanguage}

Analyze this conversation and respond with JSON in this exact format:
{
  "opportunityType": "coaching_inquiry|pricing_inquiry|booking_failed|package_interest|equipment_inquiry|general_interest|not_an_opportunity",
  "priority": "high|medium|low",
  "confidenceScore": 0.00,
  "analysisSummary": "Brief explanation of the opportunity",
  "suggestedAction": "What staff should do",
  "suggestedMessage": "Draft follow-up message in customer's language",
  "extractedContactInfo": {
    "name": "extracted name if found",
    "phone": "extracted phone if found",
    "email": "extracted email if found"
  }
}

REMINDER FOR THAI MESSAGES:
- Write as a FEMALE staff member (use ค่ะ/ค่า, NEVER ครับ)
- Start with "สวัสดีค่ะ"
- Be warm and friendly like a Thai woman
- Keep concise but polite
- Reference the example patterns from the system prompt`;

function formatMessagesForPrompt(messages: AnalyzeConversationRequest['messages']): string {
  return messages.map((msg, index) => {
    const sender = msg.sender_type === 'user' || msg.sender_type === 'customer'
      ? 'Customer'
      : 'Staff';
    const name = msg.sender_name ? ` (${msg.sender_name})` : '';
    return `[${index + 1}] ${sender}${name}: ${msg.content}`;
  }).join('\n');
}

function detectLanguage(messages: AnalyzeConversationRequest['messages']): string {
  const allText = messages
    .filter(m => m.sender_type === 'user' || m.sender_type === 'customer')
    .map(m => m.content)
    .join(' ');

  // Check for Thai characters
  const thaiPattern = /[\u0E00-\u0E7F]/;
  if (thaiPattern.test(allText)) {
    return 'Thai';
  }
  return 'English';
}

function parseAnalysisResponse(content: string): OpportunityAnalysis | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim();

    // If wrapped in markdown code blocks, extract the JSON
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.opportunityType || !parsed.priority || parsed.confidenceScore === undefined) {
      console.error('Missing required fields in analysis response');
      return null;
    }

    // Normalize and validate the response
    const validTypes: (OpportunityType | 'not_an_opportunity')[] = [
      'coaching_inquiry', 'pricing_inquiry', 'booking_failed',
      'package_interest', 'equipment_inquiry', 'general_interest',
      'not_an_opportunity'
    ];

    const validPriorities: OpportunityPriority[] = ['high', 'medium', 'low'];

    if (!validTypes.includes(parsed.opportunityType)) {
      parsed.opportunityType = 'general_interest';
    }

    if (!validPriorities.includes(parsed.priority)) {
      parsed.priority = 'medium';
    }

    return {
      opportunityType: parsed.opportunityType,
      priority: parsed.priority,
      confidenceScore: Math.min(1, Math.max(0, parseFloat(parsed.confidenceScore) || 0)),
      analysisSummary: parsed.analysisSummary || '',
      suggestedAction: parsed.suggestedAction || '',
      suggestedMessage: parsed.suggestedMessage || '',
      extractedContactInfo: parsed.extractedContactInfo || {},
    };
  } catch (error) {
    console.error('Failed to parse analysis response:', error, content);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeConversationRequest = await request.json();

    // Validate required fields
    if (!body.conversationId || !body.messages || body.messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId and messages',
      }, { status: 400 });
    }

    // Check if AI is enabled
    if (!AI_CONFIG.enabled || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AI analysis is not enabled',
      }, { status: 503 });
    }

    // Format the prompt
    const formattedMessages = formatMessagesForPrompt(body.messages);
    const detectedLanguage = detectLanguage(body.messages);

    // Calculate days since last message
    const lastMessageDate = new Date(body.messages[body.messages.length - 1].created_at);
    const daysSinceLastMessage = Math.floor(
      (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const lastMessage = body.messages[body.messages.length - 1];
    const lastMessageBy = lastMessage.sender_type === 'user' || lastMessage.sender_type === 'customer'
      ? 'customer message'
      : 'staff message';

    const userPrompt = ANALYSIS_USER_PROMPT_TEMPLATE
      .replace('{messages}', formattedMessages)
      .replace('{daysSinceLastMessage}', String(daysSinceLastMessage))
      .replace('{lastMessageBy}', lastMessageBy)
      .replace('{detectedLanguage}', detectedLanguage);

    // Log the prompt for debugging
    console.log(`[Analyze] Conversation ${body.conversationId}: ${body.messages.length} messages, language: ${detectedLanguage}`);
    console.log(`[Analyze] First message content: "${body.messages[0]?.content?.substring(0, 100)}..."`);

    // Call OpenAI for analysis
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const content = response.choices[0]?.message?.content;
    console.log(`[Analyze] LLM response: ${content?.substring(0, 200)}...`);
    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'No response from AI',
      }, { status: 500 });
    }

    const analysis = parseAnalysisResponse(content);
    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI analysis response',
      }, { status: 500 });
    }

    // If this is not an opportunity, return early
    if (analysis.opportunityType === 'not_an_opportunity') {
      return NextResponse.json({
        success: true,
        isOpportunity: false,
        analysis,
      });
    }

    return NextResponse.json({
      success: true,
      isOpportunity: true,
      analysis,
    });
  } catch (error) {
    console.error('Error in POST /api/chat-opportunities/analyze:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
