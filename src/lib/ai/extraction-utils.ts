// Client-safe utilities for customer extraction
// These utilities can be used in browser/client components

export interface ExtractedCustomerInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  confidence: {
    name: number;  // 0-1 confidence score
    phone: number; // 0-1 confidence score
    email: number; // 0-1 confidence score
    overall: number; // combined confidence
  };
  sources?: {
    nameMessage?: string; // The message that contained the name
    phoneMessage?: string; // The message that contained the phone
    emailMessage?: string; // The message that contained the email
  };
}

/**
 * Check if extraction has sufficient confidence to show to staff
 * @param extraction Extracted customer info
 * @param minConfidence Minimum confidence threshold (default: 0.5)
 * @returns True if extraction should be shown
 */
export function shouldShowExtraction(
  extraction: ExtractedCustomerInfo,
  minConfidence: number = 0.5
): boolean {
  // Show if we found at least one field with sufficient confidence
  return (
    (extraction.name !== null && extraction.confidence.name >= minConfidence) ||
    (extraction.phone !== null && extraction.confidence.phone >= minConfidence) ||
    (extraction.email !== null && extraction.confidence.email >= minConfidence)
  );
}

/**
 * Get display status for extraction confidence
 * @param confidence Confidence score (0-1)
 * @returns Status label and color
 */
export function getConfidenceStatus(confidence: number): {
  label: string;
  color: 'green' | 'yellow' | 'gray';
} {
  if (confidence >= 0.8) {
    return { label: 'High confidence', color: 'green' };
  } else if (confidence >= 0.5) {
    return { label: 'Needs verification', color: 'yellow' };
  } else {
    return { label: 'Low confidence', color: 'gray' };
  }
}
