'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, MessageSquare, Webhook } from 'lucide-react';

// Safe Image component with error handling
const SafeImage = ({ src, alt, width, height, className, onError }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  onError?: () => void;
}) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className={`${className} bg-gray-300 flex items-center justify-center`}>
        <Users className="h-5 w-5 text-gray-600" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => {
        setImageError(true);
        onError?.();
      }}
    />
  );
};

interface LineUser {
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  first_seen_at: string;
  last_seen_at: string;
}

interface LineMessage {
  message_text: string;
  message_type: string;
  timestamp: number;
  created_at: string;
  line_users: { display_name: string };
}

interface WebhookLog {
  event_type: string;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

interface TestData {
  users: LineUser[];
  messages: LineMessage[];
  webhooks: WebhookLog[];
}

export default function LineMessagesPage() {
  const [data, setData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<LineUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/line/test');
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const sendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;

    try {
      setSendingMessage(true);
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.line_user_id,
          message: messageText
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Reset form and close modal
      setMessageText('');
      setSelectedUser(null);

      // Refresh data to show any new activity
      await fetchData();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading LINE data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
              <Button onClick={fetchData} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LINE Messages & Users</h1>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.users.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              LINE users who have interacted with bot
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.messages.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent messages (last 20)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhook Events</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.webhooks.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent webhook logs (last 10)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LINE Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            LINE Users (Last 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No LINE users found. Users will appear here when they interact with your LINE bot.
            </p>
          ) : (
            <div className="space-y-3">
              {data?.users.map((user) => (
                <div
                  key={user.line_user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <SafeImage
                      src={user.picture_url || ''}
                      alt={user.display_name || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{user.display_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">ID: {user.line_user_id.substring(0, 20)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">First seen: {formatDateTime(user.first_seen_at)}</p>
                    <p className="text-sm text-muted-foreground">Last seen: {formatDateTime(user.last_seen_at)}</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setSelectedUser(user)}
                    >
                      Send Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LINE Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Recent Messages (Last 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No messages found. Messages will appear here when users send messages to your LINE bot.
            </p>
          ) : (
            <div className="space-y-3">
              {data?.messages.map((message, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{message.line_users?.display_name || 'Unknown User'}</p>
                      <Badge variant="outline">{message.message_type}</Badge>
                    </div>
                    {message.message_text && (
                      <p className="text-sm mb-2">{message.message_text}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Webhook className="h-5 w-5 mr-2" />
            Webhook Logs (Last 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.webhooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No webhook logs found. Logs will appear here when LINE sends webhook events.
            </p>
          ) : (
            <div className="space-y-3">
              {data?.webhooks.map((webhook, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={webhook.processed ? 'default' : 'destructive'}>
                        {webhook.processed ? 'Processed' : 'Failed'}
                      </Badge>
                      <span className="font-medium">{webhook.event_type}</span>
                    </div>
                    {webhook.error_message && (
                      <p className="text-sm text-red-600 mt-1">{webhook.error_message}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(webhook.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Configure LINE Webhook URL</h3>
            <p className="text-sm text-muted-foreground mb-2">
              In your LINE Developers Console, set the webhook URL to:
            </p>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://your-domain.com/api/line/webhook
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Environment Variables</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Ensure these environment variables are configured:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• LINE_CHANNEL_ACCESS_TOKEN</li>
              <li>• LINE_CHANNEL_SECRET</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Test Webhook</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to your LINE bot. The user profile and message should appear above.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send Message Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Send Message to {selectedUser.display_name}
            </h3>

            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sendingMessage}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setMessageText('');
                }}
                disabled={sendingMessage}
              >
                Cancel
              </Button>
              <Button
                onClick={sendMessage}
                disabled={sendingMessage || !messageText.trim()}
              >
                {sendingMessage ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}