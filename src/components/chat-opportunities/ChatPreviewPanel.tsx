'use client';

// ChatPreviewPanel - Embedded chat view for the Opportunities modal
// Shows conversation messages inline without navigating away

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft, ExternalLink } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import { Globe, MessageSquare } from 'lucide-react';
import type { ChatOpportunityWithConversation } from '@/types/chat-opportunities';

interface Message {
  id: string;
  text?: string;
  type: string;
  senderType: 'user' | 'admin';
  senderName?: string;
  createdAt: string;
}

interface ChatPreviewPanelProps {
  opportunity: ChatOpportunityWithConversation;
  onClose: () => void;
  onOpenFullChat: (opportunity: ChatOpportunityWithConversation) => void;
}

// Channel icon component
const ChannelIcon = ({ channelType }: { channelType: string }) => {
  switch (channelType) {
    case 'facebook':
      return <FaFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />;
    case 'instagram':
      return <FaInstagram className="w-5 h-5" style={{ color: '#E4405F' }} />;
    case 'whatsapp':
      return <FaWhatsapp className="w-5 h-5" style={{ color: '#25D366' }} />;
    case 'line':
      return <FaLine className="w-5 h-5" style={{ color: '#00B900' }} />;
    case 'website':
      return <Globe className="w-5 h-5" style={{ color: '#3B82F6' }} />;
    default:
      return <MessageSquare className="w-5 h-5" style={{ color: '#6B7280' }} />;
  }
};

export function ChatPreviewPanel({
  opportunity,
  onClose,
  onOpenFullChat,
}: ChatPreviewPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayName = opportunity.customer_name ||
    opportunity.conv_channel_metadata?.display_name ||
    opportunity.conv_channel_metadata?.name ||
    'Unknown Customer';

  // Fetch messages for the conversation
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/conversations/unified/${opportunity.conversation_id}/messages`);
        const data = await response.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [opportunity.conversation_id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/conversations/unified/${opportunity.conversation_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText.trim(),
          channelType: opportunity.channel_type,
        }),
      });

      const data = await response.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setMessageText('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <ChannelIcon channelType={opportunity.channel_type} />
          <div>
            <h3 className="font-medium text-sm">{displayName}</h3>
            <p className="text-xs text-gray-500 capitalize">{opportunity.channel_type}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenFullChat(opportunity)}
          className="text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          Full View
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.senderType === 'admin'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  {message.type === 'text' && message.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  )}
                  {message.type === 'image' && (
                    <p className="text-sm italic opacity-75">[Image]</p>
                  )}
                  {message.type === 'sticker' && (
                    <p className="text-sm italic opacity-75">[Sticker]</p>
                  )}
                  {message.type !== 'text' && message.type !== 'image' && message.type !== 'sticker' && (
                    <p className="text-sm italic opacity-75">[{message.type}]</p>
                  )}
                  <p className={`text-xs mt-1 ${
                    message.senderType === 'admin' ? 'text-green-100' : 'text-gray-400'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatPreviewPanel;
