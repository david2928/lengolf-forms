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
- Bay types: Standard and VIP bays
- Services: Bay rentals, coaching (with various coaches), packages (pre-paid bundles)
- Club rentals are FREE with bay bookings

OPPORTUNITY TYPES:
- coaching_inquiry: Customer asked about lessons, coaches, learning golf
- pricing_inquiry: Customer asked about prices, promotions, discounts
- booking_failed: Customer wanted to book but couldn't (slot full, timing issue)
- package_interest: Customer expressed interest in packages or memberships
- equipment_inquiry: Customer asked about equipment, clubs, accessories
- general_interest: General interest that doesn't fit above categories

PRIORITY CRITERIA:
- HIGH: Customer provided contact info, expressed strong interest, or had booking issues
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
}`;

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
