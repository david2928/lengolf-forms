'use client';

// OpportunityCard component - Compact list item for opportunities
// Shows: customer name, type, priority, days cold, quick actions

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import { Globe } from 'lucide-react';
import type { ChatOpportunityWithConversation } from '@/types/chat-opportunities';
import {
  getOpportunityTypeLabel,
  getStatusLabel,
} from '@/types/chat-opportunities';

interface OpportunityCardProps {
  opportunity: ChatOpportunityWithConversation;
  isSelected?: boolean;
  onSelect: (opportunity: ChatOpportunityWithConversation) => void;
  onOpenChat: (opportunity: ChatOpportunityWithConversation) => void;
  onMarkContacted?: (opportunity: ChatOpportunityWithConversation) => void;
  onDismiss?: (opportunity: ChatOpportunityWithConversation) => void;
}

// Channel icon component
const ChannelIcon = ({ channelType }: { channelType: string }) => {
  switch (channelType) {
    case 'facebook':
      return <FaFacebook className="w-4 h-4" style={{ color: '#1877F2' }} />;
    case 'instagram':
      return <FaInstagram className="w-4 h-4" style={{ color: '#E4405F' }} />;
    case 'whatsapp':
      return <FaWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} />;
    case 'line':
      return <FaLine className="w-4 h-4" style={{ color: '#00B900' }} />;
    case 'website':
      return <Globe className="w-4 h-4" style={{ color: '#3B82F6' }} />;
    default:
      return <MessageSquare className="w-4 h-4" style={{ color: '#6B7280' }} />;
  }
};

export function OpportunityCard({
  opportunity,
  isSelected = false,
  onSelect,
  onOpenChat,
  onMarkContacted,
  onDismiss,
}: OpportunityCardProps) {
  const displayName = opportunity.customer_name ||
    opportunity.conv_channel_metadata?.display_name ||
    opportunity.conv_channel_metadata?.name ||
    'Unknown Customer';

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(opportunity);
  };

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenChat(opportunity);
  };

  const handleMarkContacted = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkContacted?.(opportunity);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(opportunity);
  };

  // Priority color
  const priorityColor = opportunity.priority === 'high'
    ? 'text-red-600'
    : opportunity.priority === 'medium'
    ? 'text-yellow-600'
    : 'text-gray-500';

  return (
    <div
      className={`px-3 py-2.5 border-b cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
      }`}
      onClick={handleCardClick}
    >
      {/* Row 1: Name + Priority */}
      <div className="flex items-center gap-2 mb-1">
        <ChannelIcon channelType={opportunity.channel_type} />
        <span className="font-medium text-gray-900 truncate flex-1">
          {displayName}
        </span>
        <Badge
          variant="outline"
          className={`text-xs px-1.5 py-0 h-5 ${
            opportunity.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
            opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
            'bg-gray-100 text-gray-600 border-gray-200'
          }`}
        >
          {opportunity.priority === 'high' ? 'High' : opportunity.priority === 'medium' ? 'Med' : 'Low'}
        </Badge>
      </div>

      {/* Row 2: Type + Days cold + Status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="text-gray-700">
          {getOpportunityTypeLabel(opportunity.opportunity_type)}
        </span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {opportunity.days_cold}d
        </span>
        {opportunity.status !== 'pending' && (
          <>
            <span>·</span>
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 h-4 ${
                opportunity.status === 'converted' ? 'bg-green-100 text-green-700' :
                opportunity.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                opportunity.status === 'lost' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}
            >
              {getStatusLabel(opportunity.status)}
            </Badge>
          </>
        )}
      </div>

      {/* Row 3: Quick actions (only for pending) */}
      {opportunity.status === 'pending' && (
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleOpenChat}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            Chat
          </Button>
          {onMarkContacted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={handleMarkContacted}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Contacted
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              onClick={handleDismiss}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default OpportunityCard;
