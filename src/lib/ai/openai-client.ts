// OpenAI client configuration for AI chat suggestions
// Uses GPT-4o-mini for cost-effective response generation

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Configuration constants
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  enabled: process.env.AI_SUGGESTION_ENABLED === 'true',
  confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.6'),
  maxTokens: 500, // Increased from 150 to allow function calls with parameters
  temperature: 0.7, // Balance creativity and consistency
  maxSimilarMessages: 5, // Number of similar messages to use for context
} as const;

// Validate OpenAI configuration
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!process.env.OPENAI_API_KEY) {
    return { valid: false, error: 'OPENAI_API_KEY is not configured' };
  }

  if (!AI_CONFIG.enabled) {
    return { valid: false, error: 'AI suggestions are disabled in configuration' };
  }

  return { valid: true };
}

// Test OpenAI connection
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error };
    }

    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });

    if (response.choices[0]?.message?.content) {
      return { success: true };
    } else {
      return { success: false, error: 'No response from OpenAI' };
    }
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}