// Customer information extraction service using OpenAI GPT-4o-mini
// Extracts name and phone number from chat conversation messages
// SERVER-SIDE ONLY - Do not import this file in client components

import { openai, AI_CONFIG } from './openai-client';
import type { ExtractedCustomerInfo } from './extraction-utils';

// Re-export type for convenience
export type { ExtractedCustomerInfo } from './extraction-utils';

interface ChatMessage {
  content: string;
  senderType: 'user' | 'staff' | 'admin' | 'assistant';
  createdAt?: string;
}

// System prompt for customer information extraction
const EXTRACTION_SYSTEM_PROMPT = `You are a customer information extractor for a Thai golf simulator facility.

Your task: Extract the customer's name, phone number, and email address from chat messages.

Guidelines:
1. ONLY extract information that the CUSTOMER explicitly provided
2. DO NOT extract information from staff/admin messages
3. Names:
   - Thai names: Look for first name + optional surname, nicknames may appear in parentheses
   - English names: Full name preferred (first + last)
   - Common patterns: "ชื่อ [name]", "My name is [name]", "I'm [name]"
4. Phone numbers:
   - Thai format: 08X-XXX-XXXX, 09X-XXX-XXXX
   - International: +66-XX-XXX-XXXX
   - May have spaces, dashes, or no separators
   - Common patterns: "เบอร์ [phone]", "phone number [phone]", "call me at [phone]"
5. Email addresses:
   - Standard format: user@domain.com
   - Common patterns: "อีเมล [email]", "email [email]", "contact me at [email]"
   - Look for @ symbol

Confidence scoring:
- 1.0: Explicitly stated with clear context (e.g., "My name is John", "เบอร์ 0891234567", "email: john@example.com")
- 0.8: Clear but less explicit (e.g., "This is John calling", "call 089-123-4567", "john@example.com")
- 0.6: Inferred from context (e.g., signature-like name at end of message)
- 0.3: Ambiguous or uncertain

Return ONLY valid JSON (no markdown, no code blocks):
{
  "name": "extracted name or null",
  "phone": "extracted phone or null",
  "email": "extracted email or null",
  "name_confidence": 0.0-1.0,
  "phone_confidence": 0.0-1.0,
  "email_confidence": 0.0-1.0,
  "name_source": "exact message quote containing name",
  "phone_source": "exact message quote containing phone",
  "email_source": "exact message quote containing email"
}

If no information found, return null values with 0.0 confidence.`;

/**
 * Extract customer name, phone number, and email from chat messages
 * @param messages Array of chat messages to analyze
 * @param maxMessages Maximum number of recent messages to analyze (default: 15)
 * @returns Extracted customer information with confidence scores
 */
export async function extractCustomerFromMessages(
  messages: ChatMessage[],
  maxMessages: number = 15
): Promise<ExtractedCustomerInfo> {
  try {
    // Filter to only customer messages (exclude staff/admin)
    const customerMessages = messages
      .filter(msg => msg.senderType === 'user')
      .slice(-maxMessages); // Get most recent messages

    if (customerMessages.length === 0) {
      return {
        name: null,
        phone: null,
        email: null,
        confidence: { name: 0, phone: 0, email: 0, overall: 0 }
      };
    }

    // Build user prompt with numbered messages
    const messagesText = customerMessages
      .map((msg, idx) => `${idx + 1}. ${msg.content}`)
      .join('\n');

    const userPrompt = `Extract customer name, phone number, and email address from these messages:

${messagesText}

Return JSON only.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model, // GPT-4o-mini
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.2, // Low temperature for consistent extraction
      response_format: { type: 'json_object' } // Ensure JSON response
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(responseText);

    // Calculate overall confidence as average of name, phone, and email confidence
    const nameConf = parsed.name_confidence || 0;
    const phoneConf = parsed.phone_confidence || 0;
    const emailConf = parsed.email_confidence || 0;

    // Calculate overall confidence from all fields that have data
    const fields = [
      parsed.name ? nameConf : null,
      parsed.phone ? phoneConf : null,
      parsed.email ? emailConf : null
    ].filter(conf => conf !== null);

    const overallConf = fields.length > 0
      ? fields.reduce((sum, conf) => sum + conf, 0) / fields.length
      : 0;

    const result: ExtractedCustomerInfo = {
      name: parsed.name || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      confidence: {
        name: nameConf,
        phone: phoneConf,
        email: emailConf,
        overall: overallConf
      },
      sources: {
        nameMessage: parsed.name_source || undefined,
        phoneMessage: parsed.phone_source || undefined,
        emailMessage: parsed.email_source || undefined
      }
    };

    console.log('✓ Customer extraction completed:', {
      foundName: !!result.name,
      foundPhone: !!result.phone,
      foundEmail: !!result.email,
      nameConfidence: result.confidence.name.toFixed(2),
      phoneConfidence: result.confidence.phone.toFixed(2),
      emailConfidence: result.confidence.email.toFixed(2)
    });

    return result;

  } catch (error) {
    console.error('Error extracting customer info:', error);

    // Return empty result on error
    return {
      name: null,
      phone: null,
      email: null,
      confidence: { name: 0, phone: 0, email: 0, overall: 0 }
    };
  }
}
