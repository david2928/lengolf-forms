import { useState, useCallback } from 'react';
import type { ExtractedCustomerInfo } from '@/lib/ai/extraction-utils';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  match_method?: 'phone' | 'name' | 'email';
  similarity?: number;
}

interface ChatMessage {
  content: string;
  senderType: 'user' | 'staff' | 'admin' | 'assistant';
  createdAt?: string;
}

interface ExtractionResult {
  extraction: ExtractedCustomerInfo;
  duplicates: Customer[];
  hasDuplicates: boolean;
}

interface UseCustomerExtractionReturn {
  extractedInfo: ExtractedCustomerInfo | null;
  isExtracting: boolean;
  error: string | null;
  duplicates: Customer[];
  hasDuplicates: boolean;
  extract: (messages: ChatMessage[]) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for extracting customer information from chat messages
 */
export function useCustomerExtraction(): UseCustomerExtractionReturn {
  const [extractedInfo, setExtractedInfo] = useState<ExtractedCustomerInfo | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Customer[]>([]);
  const [hasDuplicates, setHasDuplicates] = useState(false);

  const extract = useCallback(async (messages: ChatMessage[]) => {
    if (messages.length === 0) {
      setError('No messages to extract from');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedInfo(null);
    setDuplicates([]);
    setHasDuplicates(false);

    try {
      const response = await fetch('/api/chat/extract-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const data: ExtractionResult = await response.json();

      setExtractedInfo(data.extraction);
      setDuplicates(data.duplicates);
      setHasDuplicates(data.hasDuplicates);

      // Log extraction results
      console.log('Customer extraction completed:', {
        name: data.extraction.name,
        phone: data.extraction.phone,
        confidence: data.extraction.confidence,
        duplicatesFound: data.duplicates.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error extracting customer info:', err);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const clear = useCallback(() => {
    setExtractedInfo(null);
    setError(null);
    setDuplicates([]);
    setHasDuplicates(false);
  }, []);

  return {
    extractedInfo,
    isExtracting,
    error,
    duplicates,
    hasDuplicates,
    extract,
    clear
  };
}
