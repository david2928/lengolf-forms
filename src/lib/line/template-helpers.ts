/**
 * Template processing helpers for LINE message templates
 */

export interface TemplateVariables {
  customer_name?: string;
  // Add more variables as needed in the future
}

/**
 * Process template content by replacing variables
 */
export function processTemplateContent(content: string, variables: TemplateVariables = {}): string {
  let processed = content;

  // Replace {{customer_name}} with actual customer name
  if (variables.customer_name) {
    processed = processed.replace(/\{\{customer_name\}\}/g, variables.customer_name);
  }

  // Remove any unreplaced template variables to avoid showing {{}} to customers
  processed = processed.replace(/\{\{[^}]+\}\}/g, '');

  return processed;
}

/**
 * Validate template content for valid variable syntax
 */
export function validateTemplateContent(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for malformed template variables
  const malformedVariables = content.match(/\{[^}]*\}(?!\})|(?<!\{)\{[^}]*\}\}/g);
  if (malformedVariables) {
    errors.push(`Malformed template variables found: ${malformedVariables.join(', ')}`);
  }

  // Check for supported variables
  const variables = content.match(/\{\{([^}]+)\}\}/g);
  if (variables) {
    const supportedVariables = ['customer_name'];
    const unsupportedVariables = variables
      .map(v => v.replace(/\{\{|\}\}/g, ''))
      .filter(v => !supportedVariables.includes(v));

    if (unsupportedVariables.length > 0) {
      errors.push(`Unsupported variables found: ${unsupportedVariables.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract variables from template content
 */
export function extractVariables(content: string): string[] {
  const variables = content.match(/\{\{([^}]+)\}\}/g);
  if (!variables) return [];

  return variables.map(v => v.replace(/\{\{|\}\}/g, '')).filter((v, i, arr) => arr.indexOf(v) === i);
}

/**
 * Get available template variables with descriptions
 */
export function getAvailableVariables(): Array<{ name: string; description: string; example: string }> {
  return [
    {
      name: 'customer_name',
      description: 'Customer\'s display name from LINE profile',
      example: 'John Doe'
    }
    // Add more variables here as they become available
  ];
}

/**
 * Template categories for organization
 */
export const TEMPLATE_CATEGORIES = {
  greeting: 'Greeting',
  booking: 'Booking',
  support: 'Support',
  info: 'Information',
  general: 'General'
} as const;

export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;

/**
 * Message types supported
 */
export const MESSAGE_TYPES = {
  text: 'Text Message',
  flex: 'Rich Message (Flex)'
} as const;

export type MessageType = keyof typeof MESSAGE_TYPES;