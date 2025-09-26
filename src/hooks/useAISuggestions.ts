// Hook for managing AI-powered chat suggestions
// Handles suggestion generation, caching, and user feedback

import { useState, useCallback, useRef } from 'react';
import { AISuggestion } from '@/components/ai/AISuggestionCard';

interface UseAISuggestionsProps {
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  onSuggestionAccepted?: (suggestion: AISuggestion, response: string) => void;
  onSuggestionEdited?: (suggestion: AISuggestion, originalResponse: string, editedResponse: string) => void;
  onSuggestionDeclined?: (suggestion: AISuggestion) => void;
}

interface GenerateSuggestionResponse {
  success: boolean;
  suggestion?: {
    id: string;
    suggestedResponse: string;
    suggestedResponseThai?: string;
    confidenceScore: number;
    responseTime: number;
    contextSummary: string;
    templateUsed?: {
      id: string;
      title: string;
      content: string;
    };
    similarMessagesCount: number;
  };
  error?: string;
}

interface SuggestionState {
  isLoading: boolean;
  suggestion: AISuggestion | null;
  error: string | null;
  lastMessageProcessed: string | null;
}

export const useAISuggestions = ({
  conversationId,
  channelType,
  customerId,
  onSuggestionAccepted,
  onSuggestionEdited,
  onSuggestionDeclined
}: UseAISuggestionsProps) => {
  const [state, setState] = useState<SuggestionState>({
    isLoading: false,
    suggestion: null,
    error: null,
    lastMessageProcessed: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate AI suggestion for a customer message
  const generateSuggestion = useCallback(async (customerMessage: string) => {
    // Prevent duplicate processing of the same message
    if (state.lastMessageProcessed === customerMessage) {
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      suggestion: null,
      lastMessageProcessed: customerMessage
    }));

    try {
      const response = await fetch('/api/ai/suggest-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerMessage,
          conversationId,
          channelType,
          customerId,
          includeCustomerContext: !!customerId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GenerateSuggestionResponse = await response.json();

      if (!data.success || !data.suggestion) {
        throw new Error(data.error || 'No suggestion generated');
      }

      // Only show suggestions with reasonable confidence
      if (data.suggestion.confidenceScore < 0.5) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          suggestion: null,
          error: 'Low confidence suggestion not shown'
        }));
        return;
      }

      const aiSuggestion: AISuggestion = {
        id: data.suggestion.id,
        suggestedResponse: data.suggestion.suggestedResponse,
        suggestedResponseThai: data.suggestion.suggestedResponseThai,
        confidenceScore: data.suggestion.confidenceScore,
        responseTime: data.suggestion.responseTime,
        contextSummary: data.suggestion.contextSummary,
        templateUsed: data.suggestion.templateUsed,
        similarMessagesCount: data.suggestion.similarMessagesCount
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        suggestion: aiSuggestion,
        error: null
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't update state
        return;
      }

      console.error('Error generating AI suggestion:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        suggestion: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [conversationId, channelType, customerId, state.lastMessageProcessed]);

  // Send feedback to the API
  const sendFeedback = useCallback(async (
    suggestionId: string,
    action: 'accept' | 'edit' | 'decline',
    finalResponse?: string,
    feedbackText?: string
  ) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          action,
          finalResponse,
          feedbackText
        })
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Don't throw here as feedback is not critical to user experience
    }
  }, []);

  // Handle suggestion acceptance
  const acceptSuggestion = useCallback((suggestion: AISuggestion) => {
    sendFeedback(suggestion.id, 'accept', suggestion.suggestedResponse);

    if (onSuggestionAccepted) {
      onSuggestionAccepted(suggestion, suggestion.suggestedResponse);
    }

    setState(prev => ({
      ...prev,
      suggestion: null
    }));
  }, [sendFeedback, onSuggestionAccepted]);

  // Handle suggestion editing
  const editSuggestion = useCallback((suggestion: AISuggestion) => {
    // The edit action will be completed when the user actually sends the message
    // For now, we just dismiss the suggestion and let the parent handle the editing
    if (onSuggestionEdited) {
      onSuggestionEdited(suggestion, suggestion.suggestedResponse, suggestion.suggestedResponse);
    }

    setState(prev => ({
      ...prev,
      suggestion: null
    }));
  }, [onSuggestionEdited]);

  // Handle suggestion decline
  const declineSuggestion = useCallback((suggestion: AISuggestion) => {
    sendFeedback(suggestion.id, 'decline');

    if (onSuggestionDeclined) {
      onSuggestionDeclined(suggestion);
    }

    setState(prev => ({
      ...prev,
      suggestion: null
    }));
  }, [sendFeedback, onSuggestionDeclined]);

  // Complete edit feedback (called when user sends edited message)
  const completeEditFeedback = useCallback((
    suggestionId: string,
    originalResponse: string,
    editedResponse: string
  ) => {
    sendFeedback(suggestionId, 'edit', editedResponse);
  }, [sendFeedback]);

  // Clear current suggestion
  const clearSuggestion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      suggestion: null,
      isLoading: false,
      error: null
    }));
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    suggestion: state.suggestion,
    error: state.error,
    hasSuggestion: !!state.suggestion,

    // Actions
    generateSuggestion,
    acceptSuggestion,
    editSuggestion,
    declineSuggestion,
    completeEditFeedback,
    clearSuggestion,
    cleanup
  };
};