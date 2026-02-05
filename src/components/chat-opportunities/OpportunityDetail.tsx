'use client';

// OpportunityDetail component - Full detail view for a single opportunity
// Shows AI analysis, suggested message, and outcome tracking form

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Clock,
  Phone,
  Mail,
  User,
  Sparkles,
  Copy,
  Check,
  X,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import { Globe } from 'lucide-react';
import type { ChatOpportunityWithConversation, OpportunityStatus } from '@/types/chat-opportunities';
import {
  getOpportunityTypeLabel,
  getStatusLabel,
} from '@/types/chat-opportunities';

interface OpportunityDetailProps {
  opportunity: ChatOpportunityWithConversation;
  onClose: () => void;
  onOpenChat: (opportunity: ChatOpportunityWithConversation) => void;
  onUpdateStatus: (
    opportunity: ChatOpportunityWithConversation,
    status: OpportunityStatus,
    outcome?: string,
    notes?: string
  ) => Promise<void>;
  onCopySuggestedMessage?: (message: string) => void;
  loading?: boolean;
}

// Channel icon component
const ChannelIcon = ({ channelType, size = 'sm' }: { channelType: string; size?: 'sm' | 'lg' }) => {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  switch (channelType) {
    case 'facebook':
      return <FaFacebook className={sizeClass} style={{ color: '#1877F2' }} />;
    case 'instagram':
      return <FaInstagram className={sizeClass} style={{ color: '#E4405F' }} />;
    case 'whatsapp':
      return <FaWhatsapp className={sizeClass} style={{ color: '#25D366' }} />;
    case 'line':
      return <FaLine className={sizeClass} style={{ color: '#00B900' }} />;
    case 'website':
      return <Globe className={sizeClass} style={{ color: '#3B82F6' }} />;
    default:
      return <MessageSquare className={sizeClass} style={{ color: '#6B7280' }} />;
  }
};

export function OpportunityDetail({
  opportunity,
  onClose,
  onOpenChat,
  onUpdateStatus,
  onCopySuggestedMessage,
  loading = false,
}: OpportunityDetailProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [outcomeNotes, setOutcomeNotes] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = opportunity.customer_name ||
    opportunity.conv_channel_metadata?.display_name ||
    opportunity.conv_channel_metadata?.name ||
    'Unknown Customer';

  const handleCopyMessage = () => {
    if (opportunity.suggested_message) {
      navigator.clipboard.writeText(opportunity.suggested_message);
      setCopiedMessage(true);
      onCopySuggestedMessage?.(opportunity.suggested_message);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const handleStatusUpdate = async (status: OpportunityStatus) => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(opportunity, status, selectedOutcome, outcomeNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - compact on mobile */}
      <div className="flex items-center justify-between px-3 py-2.5 sm:p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0 md:hidden"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <ChannelIcon channelType={opportunity.channel_type} size="lg" />
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {getOpportunityTypeLabel(opportunity.opportunity_type)}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => onOpenChat(opportunity)}
          className="bg-green-600 hover:bg-green-700 flex-shrink-0 h-8 px-2.5 sm:px-3"
        >
          <MessageSquare className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Open Chat</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Status & Info Card */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={`${
                      opportunity.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                      opportunity.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      opportunity.status === 'converted' ? 'bg-green-100 text-green-800' :
                      opportunity.status === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {getStatusLabel(opportunity.status)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Priority</Label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      opportunity.priority === 'high' ? 'bg-red-100 text-red-800' :
                      opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {opportunity.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Days Cold</Label>
                <p className="mt-1 flex items-center gap-1 text-sm">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {opportunity.days_cold} days
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Created</Label>
                <p className="mt-1 text-sm text-gray-700">
                  {formatDate(opportunity.created_at)}
                </p>
              </div>
            </div>

            {/* Contact info */}
            {(opportunity.customer_phone || opportunity.customer_email) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <Label className="text-xs text-gray-500">Contact Info</Label>
                {opportunity.customer_phone && (
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {opportunity.customer_phone}
                  </p>
                )}
                {opportunity.customer_email && (
                  <p className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {opportunity.customer_email}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Card */}
        {(opportunity.analysis_summary || opportunity.suggested_action) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {opportunity.analysis_summary && (
                <div className="mb-3">
                  <Label className="text-xs text-gray-500">Summary</Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {opportunity.analysis_summary}
                  </p>
                </div>
              )}
              {opportunity.suggested_action && (
                <div>
                  <Label className="text-xs text-gray-500">Suggested Action</Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {opportunity.suggested_action}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Suggested Message Card */}
        {opportunity.suggested_message && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" />
                  Suggested Follow-up Message
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={handleCopyMessage}
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {opportunity.suggested_message}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Message Preview */}
        {opportunity.conv_last_message_text && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Last Message
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 italic">
                &ldquo;{opportunity.conv_last_message_text}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {opportunity.conv_last_message_by === 'admin' ? 'Staff' : 'Customer'} · {formatDate(opportunity.conv_last_message_at)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Outcome Tracking Card (for pending/contacted opportunities) */}
        {(opportunity.status === 'pending' || opportunity.status === 'contacted') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Update Outcome</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <Label className="text-xs">Result</Label>
                <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="booked">Booked / Purchased</SelectItem>
                    <SelectItem value="interested">Still Interested - Follow Up Later</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                    <SelectItem value="wrong_contact">Wrong Contact Info</SelectItem>
                    <SelectItem value="not_opportunity">Not a Real Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Add notes about the outcome..."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusUpdate('contacted')}
                  disabled={isSubmitting || loading || opportunity.status === 'contacted'}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Mark Contacted
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate('converted')}
                  disabled={isSubmitting || loading || !selectedOutcome}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Converted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleStatusUpdate('lost')}
                  disabled={isSubmitting || loading}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Lost
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous outcome (for completed opportunities) */}
        {(opportunity.status === 'converted' || opportunity.status === 'lost' || opportunity.status === 'dismissed') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Outcome</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {opportunity.outcome && (
                <div className="mb-2">
                  <Label className="text-xs text-gray-500">Result</Label>
                  <p className="mt-1 text-sm text-gray-700 capitalize">
                    {opportunity.outcome.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {opportunity.outcome_notes && (
                <div className="mb-2">
                  <Label className="text-xs text-gray-500">Notes</Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {opportunity.outcome_notes}
                  </p>
                </div>
              )}
              {opportunity.contacted_by && (
                <div>
                  <Label className="text-xs text-gray-500">Handled By</Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {opportunity.contacted_by}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default OpportunityDetail;
