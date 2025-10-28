'use client';

// AI suggestion card component for displaying contextual response suggestions
// Integrates with the unified chat system to provide staff with AI-generated responses

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Edit3,
  X,
  Sparkles,
  Clock,
  Brain,
  TrendingUp,
  MessageSquare,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimilarMessage } from '@/lib/ai/embedding-service';
import { ImageSuggestionPreview } from './ImageSuggestionPreview';

export interface AISuggestion {
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
  // Image suggestion metadata for multi-modal responses
  suggestedImages?: Array<{
    imageId: string;
    imageUrl: string;
    title: string;
    description: string;
    reason: string;
    similarityScore?: number;
  }>;
  // Debug context for transparency
  debugContext?: {
    customerMessage: string;
    conversationHistory: Array<{
      content: string;
      senderType: string;
      createdAt: string;
    }>;
    customerData?: any;
    similarMessagesUsed: SimilarMessage[];
    systemPromptExcerpt: string;
    functionSchemas?: any[];
    toolChoice?: string;
    model: string;
  };
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (suggestion: AISuggestion) => void;
  onEdit: (suggestion: AISuggestion) => void;
  onDecline: (suggestion: AISuggestion, feedback?: string) => void;
  onApprove?: (suggestion: AISuggestion) => void; // For approval-required functions
  isVisible: boolean;
  className?: string;
  // Image suggestion handlers
  onSendImage?: (imageId: string) => void;
  onSendWithText?: (imageId: string, text: string) => void;
}

// Confidence level styling
const getConfidenceStyle = (score: number) => {
  if (score >= 0.8) {
    return {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-800'
    };
  } else if (score >= 0.6) {
    return {
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800'
    };
  } else {
    return {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800'
    };
  }
};

// Format confidence score as percentage
const formatConfidence = (score: number) => `${Math.round(score * 100)}%`;

// Format response time
const formatResponseTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onAccept,
  onEdit,
  onDecline,
  onApprove,
  isVisible,
  className,
  onSendImage,
  onSendWithText
}) => {
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAIContext, setShowAIContext] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isApproving, setIsApproving] = useState(false); // Loading state for approval

  const confidenceStyle = getConfidenceStyle(suggestion.confidenceScore);
  const requiresApproval = suggestion.requiresApproval || false;

  // Extract internal notes from the suggestion
  const internalNoteRegex = /\[INTERNAL NOTE: ([^\]]+)\]/;
  const internalNoteMatch = suggestion.suggestedResponse.match(internalNoteRegex);
  const internalNote = internalNoteMatch ? internalNoteMatch[1] : null;
  const cleanedResponse = suggestion.suggestedResponse.replace(internalNoteRegex, '').trim();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handle animation on mount
  useEffect(() => {
    if (isVisible && !isDismissed) {
      const timer = setTimeout(() => setIsAnimatingIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed]);

  // Handle accept action
  const handleAccept = () => {
    setIsDismissed(true);
    // Pass a modified suggestion with the cleaned response
    const cleanedSuggestion = {
      ...suggestion,
      suggestedResponse: cleanedResponse
    };
    onAccept(cleanedSuggestion);
  };

  // Handle edit action
  const handleEdit = () => {
    setIsDismissed(true);
    // Pass a modified suggestion with the cleaned response
    const cleanedSuggestion = {
      ...suggestion,
      suggestedResponse: cleanedResponse
    };
    onEdit(cleanedSuggestion);
  };

  // Handle decline action - show feedback input first
  const handleDecline = () => {
    setShowFeedbackInput(true);
  };

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    setIsDismissed(true);
    onDecline(suggestion, feedbackText.trim() || undefined);
  };

  // Handle skip feedback
  const handleSkipFeedback = () => {
    setIsDismissed(true);
    onDecline(suggestion);
  };

  // Handle approve action (for approval-required functions)
  const handleApprove = async () => {
    if (onApprove) {
      setIsApproving(true); // Show loading state
      try {
        await onApprove(suggestion);
        setIsDismissed(true);
      } catch (error) {
        console.error('Error approving suggestion:', error);
        setIsApproving(false); // Reset loading state on error
      }
    }
  };

  // Auto-dismiss removed - let staff decide when to dismiss suggestions

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        isAnimatingIn
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0',
        className
      )}
    >
      {/* Modern single-container design inspired by ChatGPT/Claude */}
      <div className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-sm',
        // Mobile: Add flex column (height controlled by parent container)
        isMobile ? 'flex flex-col' : 'space-y-3'
      )}>
        {/* Scrollable content area */}
        <div className={cn(
          // Mobile: Make content scrollable, not the whole card
          isMobile ? 'overflow-y-auto flex-1 p-3 space-y-3' : 'p-4 space-y-3'
        )}>
          {/* Header with AI branding and metadata */}
          <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">AI Assistant</div>
              <div className="text-xs text-gray-500">
                {formatConfidence(suggestion.confidenceScore)} confidence • {formatResponseTime(suggestion.responseTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Main AI response content - clean typography */}
        <div className="space-y-2">
          <div className="text-gray-800 text-sm leading-relaxed">
            {cleanedResponse}
          </div>

          {/* Internal staff note - integrated styling */}
          {internalNote && (
            <div className="border-l-4 border-amber-400 bg-amber-50 pl-3 py-2 rounded-r text-xs">
              <div className="flex items-start space-x-1">
                <span className="text-amber-600 font-medium">⚠️ Staff Note:</span>
                <span className="text-amber-800">{internalNote}</span>
              </div>
            </div>
          )}
        </div>

        {/* Function calling badge - if function was called */}
        {suggestion.functionCalled && (
          <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1 text-xs">
            <div className="flex items-center space-x-1">
              <Brain className="h-3 w-3 text-purple-600" />
              <span className="text-purple-700 font-medium">
                Function: {suggestion.functionCalled.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        )}

        {/* Approval required notice */}
        {requiresApproval && (
          <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <div className="flex-1">
                <div className="font-medium text-amber-900 text-xs">Requires Approval</div>
                <div className="text-xs text-amber-700 mt-0.5">
                  This action will create a booking. Please review the details before approving.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Context metadata - subtle */}
        <div className="text-xs text-gray-500 border-t pt-2">
          {suggestion.contextSummary}
          {suggestion.similarMessagesCount > 0 && (
            <span className="ml-2">• {suggestion.similarMessagesCount} similar</span>
          )}
          {suggestion.templateUsed && (
            <span className="ml-2">• {suggestion.templateUsed.title}</span>
          )}
        </div>

        {/* Image Suggestions - Multi-modal support */}
        {suggestion.suggestedImages && suggestion.suggestedImages.length > 0 && (
          <ImageSuggestionPreview
            images={suggestion.suggestedImages}
            onSendImage={(imageId) => {
              if (onSendImage) {
                onSendImage(imageId);
              }
            }}
            onSendWithText={(imageId, text) => {
              if (onSendWithText) {
                onSendWithText(imageId, cleanedResponse);
              }
            }}
            suggestedText={cleanedResponse}
          />
        )}

        {/* AI Context Viewer - Collapsible */}
        {suggestion.debugContext && (
          <div className="border-t pt-2">
            <button
              onClick={() => setShowAIContext(!showAIContext)}
              className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Brain className="h-3 w-3" />
              <span className="font-medium">{showAIContext ? 'Hide' : 'View'} AI Context</span>
              <span className="text-gray-400">({showAIContext ? '▼' : '▶'})</span>
            </button>

            {showAIContext && (
              <div className={cn(
                'mt-2 space-y-3 text-xs',
                // Mobile: Make scrollable with max height
                isMobile ? 'max-h-[30vh] overflow-y-auto' : 'max-h-[40vh] overflow-y-auto'
              )}>
                {/* Customer Message */}
                <div className={cn(
                  'bg-blue-50 border border-blue-200 rounded',
                  isMobile ? 'p-1.5' : 'p-2'
                )}>
                  <div className="font-semibold text-blue-900 mb-1 flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>Customer Message</span>
                  </div>
                  <div className="text-blue-800 italic">&ldquo;{suggestion.debugContext.customerMessage}&rdquo;</div>
                </div>

                {/* Conversation History */}
                {suggestion.debugContext.conversationHistory && suggestion.debugContext.conversationHistory.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>Recent Conversation ({suggestion.debugContext.conversationHistory.length} messages)</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {suggestion.debugContext.conversationHistory.slice(-10).map((msg, idx) => (
                        <div key={idx} className={`text-xs ${msg.senderType === 'user' ? 'text-blue-700' : 'text-green-700'}`}>
                          <span className="font-medium">{msg.senderType === 'user' ? 'Customer' : 'Staff'}:</span> {msg.content ? (msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')) : '[No content]'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Profile */}
                {suggestion.debugContext.customerData && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <div className="font-semibold text-purple-900 mb-1 flex items-center justify-between">
                      <span>Customer Profile</span>
                      {suggestion.debugContext.customerData.totalVisits !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          suggestion.debugContext.customerData.totalVisits === 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {suggestion.debugContext.customerData.totalVisits === 0 ? '🆕 NEW CUSTOMER' : '✅ EXISTING CUSTOMER'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-purple-800">
                      {suggestion.debugContext.customerData.name && <div>Name: {suggestion.debugContext.customerData.name}</div>}
                      {suggestion.debugContext.customerData.phone && <div>Phone: {suggestion.debugContext.customerData.phone}</div>}
                      {suggestion.debugContext.customerData.totalVisits !== undefined && <div>Total Visits: {suggestion.debugContext.customerData.totalVisits}</div>}
                      {suggestion.debugContext.customerData.lifetimeValue !== undefined && <div>Lifetime Value: ฿{suggestion.debugContext.customerData.lifetimeValue.toLocaleString()}</div>}
                      {suggestion.debugContext.customerData.activePackages && (
                        <div>
                          <div className="font-medium">Active Packages ({suggestion.debugContext.customerData.activePackages.count}):</div>
                          {suggestion.debugContext.customerData.activePackages.packages && suggestion.debugContext.customerData.activePackages.packages.length > 0 ? (
                            <div className="ml-2 space-y-0.5">
                              {suggestion.debugContext.customerData.activePackages.packages.map((pkg: any, idx: number) => (
                                <div key={idx}>
                                  • {pkg.name}: {pkg.type === 'Unlimited' ? 'Unlimited' : `${pkg.remainingHours}h remaining`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="ml-2">{suggestion.debugContext.customerData.activePackages.totalHoursRemaining}h total</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Similar Messages Used - Only show if valid messages exist */}
                {suggestion.debugContext.similarMessagesUsed && suggestion.debugContext.similarMessagesUsed.length > 0 &&
                 suggestion.debugContext.similarMessagesUsed.some(s => s.content && s.responseUsed) && (
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="font-semibold text-green-900 mb-1 flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Similar Past Messages ({suggestion.debugContext.similarMessagesUsed?.filter(s => s.content && s.responseUsed).length || 0})</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {(suggestion.debugContext.similarMessagesUsed || [])
                        .filter(s => s.content && s.responseUsed)
                        .map((similar, idx) => (
                          <div key={idx} className="text-green-800 border-b border-green-200 pb-2 last:border-0">
                            <div className="font-medium flex items-center space-x-1">
                              <span>Q: {similar.content}</span>
                              {similar.curatedImageId && (
                                <ImageIcon className="h-3 w-3 text-blue-600" aria-label="Includes image" />
                              )}
                            </div>
                            <div className="text-green-700 mt-1">A: {similar.responseUsed}</div>
                            <div className="text-green-600 text-xs mt-1">
                              Similarity: {(similar.similarityScore * 100).toFixed(1)}%
                              {similar.curatedImageId && similar.imageDescription && (
                                <div className="mt-1 text-blue-600">📷 {similar.imageDescription}</div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Function Call Details */}
                {suggestion.functionCalled && suggestion.functionResult && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <div className="font-semibold text-purple-900 mb-1 flex items-center space-x-1">
                      <Brain className="h-3 w-3" />
                      <span>Function Call: {suggestion.functionCalled.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-purple-800 space-y-1">
                      <div className="font-medium text-xs text-purple-600">Result:</div>
                      <pre className="text-xs bg-purple-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(suggestion.functionResult.data, null, 2)}
                      </pre>
                      {suggestion.functionResult.requiresApproval && (
                        <div className="text-amber-700 font-medium text-xs mt-1">
                          ⚠️ {suggestion.functionResult.approvalMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Model Info */}
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="font-semibold text-gray-900 mb-1 flex items-center space-x-1">
                    <Brain className="h-3 w-3" />
                    <span>AI Model</span>
                  </div>
                  <div className="text-gray-700">
                    <div>Model: {suggestion.debugContext.model}</div>
                    <div>Tool Choice: {suggestion.debugContext.toolChoice || 'auto'}</div>
                  </div>
                </div>

                {/* System Prompt Excerpt */}
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="font-semibold text-amber-900 mb-1 flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>System Instructions (excerpt)</span>
                  </div>
                  <div className="text-amber-800 text-xs max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
                    {suggestion.debugContext.systemPromptExcerpt}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback input (shown when declining) */}
        {showFeedbackInput && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Why are you declining this suggestion? (optional)
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., The tone is too formal, Missing important details, Incorrect information..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleSubmitFeedback}
                size="sm"
                className="h-7 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Submit Feedback
              </Button>
              <Button
                onClick={handleSkipFeedback}
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                Skip
              </Button>
            </div>
          </div>
        )}
        </div>

        {/* Sticky action buttons at bottom - Outside scrollable area */}
        {!showFeedbackInput && (
          <div className={cn(
            'flex items-center justify-between border-t bg-white',
            // Mobile: Sticky at bottom with padding
            isMobile ? 'flex-shrink-0 p-3 pt-3' : 'p-4 pt-1'
          )}>
          <div className={cn(
            'flex space-x-2',
            // Mobile: Stack buttons vertically for better touch targets
            isMobile ? 'flex-col space-y-2 space-x-0 w-full' : 'flex-row'
          )}>
            {requiresApproval ? (
              <>
                {/* Approval workflow buttons */}
                <Button
                  onClick={handleApprove}
                  size="sm"
                  disabled={isApproving}
                  className={cn(
                    'bg-green-600 hover:bg-green-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
                    isMobile ? 'h-10 text-sm px-4 w-full' : 'h-7 text-xs px-3'
                  )}
                >
                  {isApproving ? (
                    <>
                      <span className="inline-block animate-spin mr-1">⏳</span>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                      Approve & Send
                    </>
                  )}
                </Button>
                <div className={cn(isMobile ? 'flex space-x-2' : 'contents')}>
                  <Button
                    onClick={handleEdit}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
                      isMobile ? 'h-10 text-sm px-4 flex-1' : 'h-7 text-xs px-3'
                    )}
                  >
                    <Edit3 className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDecline}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'text-gray-500 hover:text-red-600 hover:bg-red-50',
                      isMobile ? 'h-10 text-sm px-4 flex-1' : 'h-7 text-xs px-3'
                    )}
                  >
                    <X className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Standard buttons */}
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className={cn(
                    'bg-purple-600 hover:bg-purple-700 text-white shadow-sm',
                    isMobile ? 'h-10 text-sm px-4 w-full' : 'h-7 text-xs px-3'
                  )}
                >
                  <CheckCircle className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                  Accept
                </Button>
                <div className={cn(isMobile ? 'flex space-x-2' : 'contents')}>
                  <Button
                    onClick={handleEdit}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
                      isMobile ? 'h-10 text-sm px-4 flex-1' : 'h-7 text-xs px-3'
                    )}
                  >
                    <Edit3 className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDecline}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'text-gray-500 hover:text-red-600 hover:bg-red-50',
                      isMobile ? 'h-10 text-sm px-4 flex-1' : 'h-7 text-xs px-3'
                    )}
                  >
                    <X className={cn(isMobile ? 'h-4 w-4 mr-2' : 'h-3 w-3 mr-1')} />
                    Decline
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Subtle keyboard hints - Hidden on mobile */}
          {!isMobile && !requiresApproval && (
            <div className="text-xs text-gray-400">
              ⏎ Accept • E Edit • Esc Decline
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};