'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageCircle, Users, Trash2, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

interface GroupMessage {
  id: string;
  webhook_event_id: string;
  source_type: string;
  group_id: string | null;
  room_id: string | null;
  user_id: string | null;
  message_text: string;
  message_type: string;
  timestamp: number;
  raw_event: any;
  created_at: string;
}

export default function LineGroupDebugPage() {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/line-groups');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setDebugEnabled(data.debugEnabled || false);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDebugMode = async () => {
    setToggleLoading(true);
    try {
      const response = await fetch('/api/debug/line-groups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !debugEnabled })
      });

      if (response.ok) {
        const data = await response.json();
        setDebugEnabled(data.enabled);
      } else {
        console.error('Failed to toggle debug mode');
      }
    } catch (error) {
      console.error('Error toggling debug mode:', error);
    } finally {
      setToggleLoading(false);
    }
  };

  const clearMessages = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/debug/line-groups', {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessages([]);
      } else {
        console.error('Failed to clear messages');
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">LINE Group Messages Debug</h1>
          <p className="text-muted-foreground mt-2">
            Temporary debug page to track messages in groups where LENGOLF was added
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={toggleDebugMode}
            variant={debugEnabled ? "destructive" : "default"}
            disabled={toggleLoading}
          >
            {debugEnabled ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {debugEnabled ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <Button
            onClick={fetchMessages}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={clearMessages}
            variant="outline"
            disabled={clearing || messages.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Debug Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={debugEnabled ? "default" : "secondary"}>
                {debugEnabled ? 'Recording Active' : 'Recording Stopped'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {debugEnabled ? 'Group messages are being captured' : 'Group messages are NOT being captured'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{messages.length}</div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {messages.filter(m => m.source_type === 'group').length}
              </div>
              <div className="text-sm text-muted-foreground">Group Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {messages.filter(m => m.source_type === 'room').length}
              </div>
              <div className="text-sm text-muted-foreground">Room Messages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading messages...</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Group Messages Yet</h3>
            <p className="text-muted-foreground">
              Send a message in a group where LENGOLF bot was added to see it appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={message.source_type === 'group' ? 'default' : 'secondary'}>
                      {message.source_type}
                    </Badge>
                    <Badge variant="outline">
                      {message.message_type}
                    </Badge>
                    {message.group_id && (
                      <Badge variant="outline" className="text-xs">
                        Group: {message.group_id.slice(-8)}
                      </Badge>
                    )}
                    {message.room_id && (
                      <Badge variant="outline" className="text-xs">
                        Room: {message.room_id.slice(-8)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(message.created_at), 'dd MMM yyyy HH:mm:ss')}
                  </div>
                </div>
                <CardDescription>
                  User ID: {message.user_id ? message.user_id.slice(-12) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-mono text-sm">{message.message_text}</p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    View Raw Event Data
                  </summary>
                  <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(message.raw_event, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}