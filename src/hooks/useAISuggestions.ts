// Hook for managing AI-powered chat suggestions
// Handles suggestion generation, caching, and user feedback

import { useState, useCallback, useRef } from 'react';
import { AISuggestion } from '@/components/ai/AISuggestionCard';

interface UseAISuggestionsProps {
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  onSuggestionAccepted?: (suggestion: AISuggestion, response: string, options?: { includeFollowUp?: boolean }) => void;
  onSuggestionEdited?: (suggestion: AISuggestion, originalResponse: string, editedResponse: string) => void;
  onSuggestionDeclined?: (suggestion: AISuggestion) => void;
  onSuggestionApproved?: (suggestion: AISuggestion, bookingResult: any) => void;
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
    // Image suggestions for multi-modal responses
    suggestedImages?: Array<{
      imageId: string;
      imageUrl: string;
      title: string;
      description: string;
      reason: string;
      similarityScore?: number;
    }>;
    // Function calling metadata
    functionCalled?: string;
    functionResult?: {
      success: boolean;
      data?: any;
      error?: string;
      requiresApproval?: boolean;
      approvalMessage?: string;
      functionName?: string;
    };
    requiresApproval?: boolean;
    approvalMessage?: string;
    managementNote?: string | null; // Management escalation note
    followUpMessage?: string | null; // Follow-up message (e.g., coaching schedule)
    debugContext?: any; // Debug context for transparency
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
  onSuggestionDeclined,
  onSuggestionApproved
}: UseAISuggestionsProps) => {
  const [state, setState] = useState<SuggestionState>({
    isLoading: false,
    suggestion: null,
    error: null,
    lastMessageProcessed: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRef = useRef<string | null>(null);

  // Reset dedup state (used when AI is toggled on to allow re-generation)
  const resetDedup = useCallback(() => {
    lastProcessedRef.current = null;
  }, []);

  // Generate AI suggestion for a customer message
  const generateSuggestion = useCallback(async (customerMessage: string, messageId?: string, force?: boolean, imageUrl?: string) => {
    // Prevent duplicate processing: use messageId (stable) when available, fall back to text
    const dedupeKey = messageId || customerMessage;
    if (!force && lastProcessedRef.current === dedupeKey) {
      return;
    }
    lastProcessedRef.current = dedupeKey;

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
      lastMessageProcessed: dedupeKey // kept for backwards compat but ref is primary
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
          messageId, // Include message ID for database storage
          imageUrl, // Customer image URL for vision support
          includeCustomerContext: !!customerId,
          includeDebugContext: true // Always include for staff transparency
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

      // Only hide very low confidence suggestions (below 0.25)
      // Staff can see the confidence score on the card and judge quality themselves
      if (data.suggestion.confidenceScore < 0.25) {
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
        similarMessagesCount: data.suggestion.similarMessagesCount,
        // Image suggestions (multi-modal responses)
        suggestedImages: data.suggestion.suggestedImages,
        // Function calling metadata
        functionCalled: data.suggestion.functionCalled,
        functionResult: data.suggestion.functionResult,
        requiresApproval: data.suggestion.requiresApproval,
        approvalMessage: data.suggestion.approvalMessage,
        // Management escalation note
        managementNote: data.suggestion.managementNote,
        // Follow-up message (e.g., coaching schedule)
        followUpMessage: data.suggestion.followUpMessage || undefined,
        // Debug context (for transparency)
        debugContext: data.suggestion.debugContext
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, channelType, customerId]);

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
  const acceptSuggestion = useCallback((suggestion: AISuggestion, options?: { includeFollowUp?: boolean }) => {
    sendFeedback(suggestion.id, 'accept', suggestion.suggestedResponse);

    if (onSuggestionAccepted) {
      onSuggestionAccepted(suggestion, suggestion.suggestedResponse, options);
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
  const declineSuggestion = useCallback((suggestion: AISuggestion, feedback?: string) => {
    sendFeedback(suggestion.id, 'decline', undefined, feedback);

    if (onSuggestionDeclined) {
      onSuggestionDeclined(suggestion);
    }

    setState(prev => ({
      ...prev,
      suggestion: null
    }));
  }, [sendFeedback, onSuggestionDeclined]);

  // Handle suggestion approval (for booking creation)
  const approveSuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      // Call approval API to execute the booking
      const response = await fetch('/api/ai/approve-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          functionResult: suggestion.functionResult,
          customerId: customerId, // Pass customer ID for existing customers
          conversationId: conversationId, // Pass conversation ID for sending LINE confirmation
          channelType: channelType // Pass channel type for notification formatting
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to approve booking');
      }

      // Send feedback for approval
      sendFeedback(suggestion.id, 'accept', suggestion.suggestedResponse, 'Approved and executed');

      // Call callback with booking result
      if (onSuggestionApproved) {
        onSuggestionApproved(suggestion, result.booking);
      }

      setState(prev => ({
        ...prev,
        suggestion: null
      }));

    } catch (error) {
      console.error('Error approving suggestion:', error);
      // Don't clear suggestion on error - let user retry
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to approve booking'
      }));
    }
  }, [sendFeedback, onSuggestionApproved, customerId, conversationId, channelType]);

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

  // Track last declined/ignored suggestion for learning loop
  const lastDeclinedSuggestionRef = useRef<{ id: string; suggestedResponse: string } | null>(null);
  // Ref to current state for use in callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Override declineSuggestion to also store ref for learning loop
  const declineSuggestionWithTracking = useCallback((suggestion: AISuggestion, feedback?: string) => {
    lastDeclinedSuggestionRef.current = { id: suggestion.id, suggestedResponse: suggestion.suggestedResponse };
    declineSuggestion(suggestion, feedback);
  }, [declineSuggestion]);

  // Capture staff's actual response when they type their own message
  // Called by the parent when staff sends a message to a conversation that had an AI suggestion
  const captureStaffResponse = useCallback((staffMessage: string) => {
    const declined = lastDeclinedSuggestionRef.current;
    if (!declined || !staffMessage?.trim()) return;

    // Fire-and-forget: store the staff's actual response for the declined suggestion
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId: declined.id,
        action: 'decline',
        finalResponse: staffMessage.trim(),
        feedbackText: 'Staff typed own response'
      })
    }).catch(() => { /* non-critical */ });

    lastDeclinedSuggestionRef.current = null;
  }, []);

  // Also capture when suggestion is cleared (e.g., conversation change) — mark as ignored
  // Uses stateRef to avoid recreating on every state change
  const clearSuggestionWithTracking = useCallback(() => {
    const { suggestion, isLoading } = stateRef.current;
    if (suggestion && !isLoading) {
      lastDeclinedSuggestionRef.current = {
        id: suggestion.id,
        suggestedResponse: suggestion.suggestedResponse
      };
    }
    clearSuggestion();
  }, [clearSuggestion]);

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
    resetDedup,
    acceptSuggestion,
    editSuggestion,
    declineSuggestion: declineSuggestionWithTracking,
    approveSuggestion,
    completeEditFeedback,
    clearSuggestion: clearSuggestionWithTracking,
    captureStaffResponse,
    cleanup
  };
};