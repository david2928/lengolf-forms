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
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (suggestion: AISuggestion) => void;
  onEdit: (suggestion: AISuggestion) => void;
  onDecline: (suggestion: AISuggestion) => void;
  isVisible: boolean;
  className?: string;
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
  isVisible,
  className
}) => {
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const confidenceStyle = getConfidenceStyle(suggestion.confidenceScore);

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

  // Handle decline action
  const handleDecline = () => {
    setIsDismissed(true);
    onDecline(suggestion);
  };

  // Auto-dismiss after 30 seconds if no action taken
  useEffect(() => {
    if (isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        onDecline(suggestion);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed, onDecline, suggestion]);

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
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
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

        {/* Modern action buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex space-x-2">
            <Button
              onClick={handleAccept}
              size="sm"
              className="h-7 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              onClick={handleEdit}
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              onClick={handleDecline}
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-3 text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </div>

          {/* Subtle keyboard hints - Hidden on mobile */}
          {!isMobile && (
            <div className="text-xs text-gray-400">
              ⏎ Accept • E Edit • Esc Decline
            </div>
          )}
        </div>
      </div>
    </div>
  );
};