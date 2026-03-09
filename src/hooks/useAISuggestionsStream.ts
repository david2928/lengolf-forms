// Hook for streaming AI-powered chat suggestions via SSE
// Same public API as useAISuggestions plus streaming state (isStreaming, streamingText)

import { useState, useCallback, useRef } from 'react';
import { AISuggestion } from '@/components/ai/AISuggestionCard';

interface UseAISuggestionsStreamProps {
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  onSuggestionAccepted?: (suggestion: AISuggestion, response: string) => void;
  onSuggestionEdited?: (suggestion: AISuggestion, originalResponse: string, editedResponse: string) => void;
  onSuggestionDeclined?: (suggestion: AISuggestion) => void;
  onSuggestionApproved?: (suggestion: AISuggestion, bookingResult: Record<string, unknown>) => void;
}

interface StreamingState {
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  suggestion: AISuggestion | null;
  error: string | null;
  lastMessageProcessed: string | null;
}

// SSE event types from the streaming endpoint
interface SSETextDelta {
  delta: string;
}

interface SSEMetadata {
  id: string;
  suggestedResponse: string;
  suggestedResponseThai?: string;
  confidenceScore: number;
  responseTime: number;
  contextSummary: string;
  templateUsed?: { id: string; title: string; content: string };
  similarMessagesCount: number;
  suggestedImages?: Array<{
    imageId: string;
    imageUrl: string;
    title: string;
    description: string;
    reason: string;
    similarityScore?: number;
  }>;
  functionCalled?: string;
  functionResult?: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    requiresApproval?: boolean;
    approvalMessage?: string;
    functionName?: string;
  };
  functionParameters?: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalMessage?: string;
  managementNote?: string | null;
  approvalOverrideText?: string;
  debugContext?: Record<string, unknown>;
}

/** Parse a single SSE frame into { event, data } */
function parseSSELine(line: string): { event: string; data: string } | null {
  // SSE format: "event: <type>\ndata: <json>\n\n"
  // We receive the full frame as a block, so split on newlines
  let event = '';
  let data = '';
  for (const part of line.split('\n')) {
    if (part.startsWith('event: ')) {
      event = part.slice(7);
    } else if (part.startsWith('data: ')) {
      data = part.slice(6);
    }
  }
  if (!event && !data) return null;
  return { event, data };
}

export const useAISuggestionsStream = ({
  conversationId,
  channelType,
  customerId,
  onSuggestionAccepted,
  onSuggestionEdited,
  onSuggestionDeclined,
  onSuggestionApproved,
}: UseAISuggestionsStreamProps) => {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    isStreaming: false,
    streamingText: '',
    suggestion: null,
    error: null,
    lastMessageProcessed: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProcessedRef = useRef<string | null>(null);

  // Reset dedup state
  const resetDedup = useCallback(() => {
    lastProcessedRef.current = null;
  }, []);

  // Generate AI suggestion via streaming SSE
  const generateSuggestion = useCallback(async (
    customerMessage: string,
    messageId?: string,
    force?: boolean,
    imageUrl?: string,
  ) => {
    const dedupeKey = messageId || customerMessage;
    if (!force && lastProcessedRef.current === dedupeKey) {
      return;
    }
    lastProcessedRef.current = dedupeKey;

    // Abort existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({
      ...prev,
      isLoading: true,
      isStreaming: false,
      streamingText: '',
      error: null,
      suggestion: null,
      lastMessageProcessed: dedupeKey,
    }));

    try {
      const response = await fetch('/api/ai/suggest-response/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerMessage,
          conversationId,
          channelType,
          customerId,
          messageId,
          imageUrl,
          includeCustomerContext: !!customerId,
          includeDebugContext: true,
        }),
        signal: controller.signal,
      });

      // Non-SSE error responses (JSON)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body for streaming');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      setState(prev => ({ ...prev, isStreaming: true }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines (SSE frame delimiter)
        const frames = buffer.split('\n\n');
        // Keep the last incomplete frame in the buffer
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const trimmed = frame.trim();
          if (!trimmed) continue;

          const parsed = parseSSELine(trimmed);
          if (!parsed) continue;

          if (parsed.event === 'text-delta') {
            const delta: SSETextDelta = JSON.parse(parsed.data);
            setState(prev => ({
              ...prev,
              streamingText: prev.streamingText + delta.delta,
            }));
          } else if (parsed.event === 'metadata') {
            const metadata: SSEMetadata = JSON.parse(parsed.data);

            // Low-confidence filter (same threshold as non-streaming hook)
            if (metadata.confidenceScore < 0.25) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                isStreaming: false,
                streamingText: '',
                suggestion: null,
                error: 'Low confidence suggestion not shown',
              }));
              return;
            }

            const aiSuggestion: AISuggestion = {
              id: metadata.id,
              suggestedResponse: metadata.approvalOverrideText || metadata.suggestedResponse,
              suggestedResponseThai: metadata.suggestedResponseThai,
              confidenceScore: metadata.confidenceScore,
              responseTime: metadata.responseTime,
              contextSummary: metadata.contextSummary,
              templateUsed: metadata.templateUsed,
              similarMessagesCount: metadata.similarMessagesCount,
              suggestedImages: metadata.suggestedImages,
              functionCalled: metadata.functionCalled,
              functionResult: metadata.functionResult,
              requiresApproval: metadata.requiresApproval,
              approvalMessage: metadata.approvalMessage,
              managementNote: metadata.managementNote,
              debugContext: metadata.debugContext as AISuggestion['debugContext'],
            };

            setState(prev => ({
              ...prev,
              isStreaming: false,
              suggestion: aiSuggestion,
              // If approval gate changed the text, update streamingText to final
              streamingText: metadata.approvalOverrideText || prev.streamingText,
            }));
          } else if (parsed.event === 'done') {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isStreaming: false,
            }));
          } else if (parsed.event === 'error') {
            const errorData = JSON.parse(parsed.data);
            setState(prev => ({
              ...prev,
              isLoading: false,
              isStreaming: false,
              streamingText: '',
              error: errorData.error || 'Streaming failed',
            }));
          }
        }
      }

      // If we exited the read loop without a done event, finalize
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Error generating AI suggestion (stream):', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        streamingText: '',
        suggestion: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [conversationId, channelType, customerId]);

  // ─── Feedback (shared with non-streaming) ─────────────────────────────────

  const sendFeedback = useCallback(async (
    suggestionId: string,
    action: 'accept' | 'edit' | 'decline',
    finalResponse?: string,
    feedbackText?: string,
  ) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action, finalResponse, feedbackText }),
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  }, []);

  const acceptSuggestion = useCallback((suggestion: AISuggestion) => {
    sendFeedback(suggestion.id, 'accept', suggestion.suggestedResponse);
    if (onSuggestionAccepted) {
      onSuggestionAccepted(suggestion, suggestion.suggestedResponse);
    }
    setState(prev => ({ ...prev, suggestion: null, streamingText: '' }));
  }, [sendFeedback, onSuggestionAccepted]);

  const editSuggestion = useCallback((suggestion: AISuggestion) => {
    if (onSuggestionEdited) {
      onSuggestionEdited(suggestion, suggestion.suggestedResponse, suggestion.suggestedResponse);
    }
    setState(prev => ({ ...prev, suggestion: null, streamingText: '' }));
  }, [onSuggestionEdited]);

  const declineSuggestion = useCallback((suggestion: AISuggestion, feedback?: string) => {
    sendFeedback(suggestion.id, 'decline', undefined, feedback);
    if (onSuggestionDeclined) {
      onSuggestionDeclined(suggestion);
    }
    lastDeclinedSuggestionRef.current = { id: suggestion.id, suggestedResponse: suggestion.suggestedResponse };
    setState(prev => ({ ...prev, suggestion: null, streamingText: '' }));
  }, [sendFeedback, onSuggestionDeclined]);

  const approveSuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      const response = await fetch('/api/ai/approve-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          functionResult: suggestion.functionResult,
          customerId,
          conversationId,
          channelType,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to approve booking');
      }

      sendFeedback(suggestion.id, 'accept', suggestion.suggestedResponse, 'Approved and executed');
      if (onSuggestionApproved) {
        onSuggestionApproved(suggestion, result.booking);
      }
      setState(prev => ({ ...prev, suggestion: null, streamingText: '' }));
    } catch (error) {
      console.error('Error approving suggestion:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to approve booking',
      }));
    }
  }, [sendFeedback, onSuggestionApproved, customerId, conversationId, channelType]);

  const completeEditFeedback = useCallback((
    suggestionId: string,
    _originalResponse: string,
    editedResponse: string,
  ) => {
    sendFeedback(suggestionId, 'edit', editedResponse);
  }, [sendFeedback]);

  // ─── Learning loop tracking ────────────────────────────────────────────────

  const lastDeclinedSuggestionRef = useRef<{ id: string; suggestedResponse: string } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const captureStaffResponse = useCallback((staffMessage: string) => {
    const declined = lastDeclinedSuggestionRef.current;
    if (!declined || !staffMessage?.trim()) return;

    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId: declined.id,
        action: 'decline',
        finalResponse: staffMessage.trim(),
        feedbackText: 'Staff typed own response',
      }),
    }).catch(() => { /* non-critical */ });

    lastDeclinedSuggestionRef.current = null;
  }, []);

  const clearSuggestion = useCallback(() => {
    const { suggestion, isLoading } = stateRef.current;
    if (suggestion && !isLoading) {
      lastDeclinedSuggestionRef.current = {
        id: suggestion.id,
        suggestedResponse: suggestion.suggestedResponse,
      };
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      suggestion: null,
      isLoading: false,
      isStreaming: false,
      streamingText: '',
      error: null,
    }));
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    streamingText: state.streamingText,
    suggestion: state.suggestion,
    error: state.error,
    hasSuggestion: !!state.suggestion,

    // Actions (same API as useAISuggestions)
    generateSuggestion,
    resetDedup,
    acceptSuggestion,
    editSuggestion,
    declineSuggestion,
    approveSuggestion,
    completeEditFeedback,
    clearSuggestion,
    captureStaffResponse,
    cleanup,
  };
};
