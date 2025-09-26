'use client';

// AI Suggestion System Demo Page
// Demonstrates the AI-powered chat suggestions functionality

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Brain,
  MessageSquare,
  Database,
  Settings,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export default function AIDemoPage() {
  // TEMPORARILY DISABLED: AI features are disabled for now
  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900">AI Demo Temporarily Disabled</h1>
        <p className="text-gray-600 max-w-md">
          The AI suggestion system is currently disabled while we work on improvements.
          Please check back later.
        </p>
      </div>
    </div>
  );

  const [testMessage, setTestMessage] = useState('any bay available today 7pm-9pm ka?');
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Test AI suggestion generation
  const testSuggestion = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const response = await fetch('/api/ai/suggest-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerMessage: testMessage,
          conversationId: '00000000-0000-0000-0000-000000000001', // Demo UUID
          channelType: 'line',
          includeCustomerContext: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        setSuggestion(data.suggestion);
      } else {
        throw new Error(data.error || 'No suggestion generated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get batch processing status
  const getBatchStatus = async () => {
    try {
      const response = await fetch('/api/ai/batch-embed');
      const data = await response.json();
      setBatchStatus(data);
    } catch (err) {
      console.error('Error getting batch status:', err);
    }
  };

  // Run batch processing (dry run)
  const runBatchDryRun = async () => {
    setIsBatchProcessing(true);
    try {
      const response = await fetch('/api/ai/batch-embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daysBack: 7,
          batchSize: 5,
          dryRun: true
        })
      });

      const data = await response.json();
      console.log('Batch dry run result:', data);
      alert(`Dry run completed: ${data.message}`);
    } catch (err) {
      console.error('Error in batch dry run:', err);
      alert('Error in batch processing');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  React.useEffect(() => {
    getBatchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Chat Suggestions Demo</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Test and explore the AI-powered chat suggestion system for Lengolf customer service.
            This system uses GPT-4o-mini with RAG to provide contextual response suggestions.
          </p>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">AI Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {batchStatus?.aiEnabled ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700">Enabled</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">Disabled</span>
                  </>
                )}
              </div>
              {batchStatus?.configuration && (
                <div className="mt-2 text-xs text-gray-600">
                  <div>Model: {batchStatus.configuration.model}</div>
                  <div>Threshold: {(batchStatus.configuration.confidenceThreshold * 100)}%</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">Connected</span>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Vector embeddings ready
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">RAG Context</Badge>
                <Badge variant="secondary" className="text-xs">Thai/English</Badge>
                <Badge variant="secondary" className="text-xs">Templates</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Suggestion Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Test AI Suggestions</span>
              </CardTitle>
              <CardDescription>
                Enter a customer message to see how the AI would respond
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Message</label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a customer message..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={testSuggestion}
                disabled={isLoading || !testMessage.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate AI Suggestion
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-700">Error</div>
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {suggestion && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">AI Suggestion</span>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {Math.round(suggestion.confidenceScore * 100)}% confidence
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-900 bg-white p-3 rounded border">
                    {suggestion.suggestedResponse}
                  </div>

                  {suggestion.suggestedResponseThai && (
                    <div className="text-sm text-gray-900 bg-white p-3 rounded border border-dashed">
                      <div className="text-xs text-gray-500 mb-1">Thai version:</div>
                      {suggestion.suggestedResponseThai}
                    </div>
                  )}

                  <div className="text-xs text-gray-600">
                    <div>Response time: {suggestion.responseTime}ms</div>
                    <div>Similar messages used: {suggestion.similarMessagesCount}</div>
                    {suggestion.templateUsed && (
                      <div>Template: {suggestion.templateUsed.title}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Batch Embedding Processing</span>
              </CardTitle>
              <CardDescription>
                Process historical messages to create embeddings for better AI suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {batchStatus?.recommendations && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">First-time Setup</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {batchStatus.recommendations.firstTimeSetup.map((item: string, index: number) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-gray-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <div className="font-medium">Cost Estimate</div>
                    <div>{batchStatus?.recommendations?.costEstimate}</div>
                  </div>
                </div>
              </div>

              <Button
                onClick={runBatchDryRun}
                disabled={isBatchProcessing}
                variant="outline"
                className="w-full"
              >
                {isBatchProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Run Dry Run (7 days)
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                Dry run shows what would be processed without making actual API calls
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use AI Suggestions</CardTitle>
            <CardDescription>
              Integration instructions for the unified chat system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">For Staff</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• AI suggestions appear automatically when customers message</li>
                  <li>• Click &quot;Accept&quot; to use the suggestion as-is</li>
                  <li>• Click &quot;Edit&quot; to modify before sending</li>
                  <li>• Click &quot;Decline&quot; to ignore and type manually</li>
                  <li>• Keyboard shortcuts: Enter (accept), E (edit), Esc (decline)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Learns from past successful conversations</li>
                  <li>• Uses customer context (booking history, preferences)</li>
                  <li>• Supports both Thai and English</li>
                  <li>• Integrates with existing message templates</li>
                  <li>• Provides confidence scores for suggestions</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Integration with Unified Chat</h4>
              <p className="text-sm text-gray-600">
                To enable AI suggestions in the unified chat interface, use the <code className="bg-gray-200 px-1 rounded">EnhancedChatArea</code> component
                instead of the regular <code className="bg-gray-200 px-1 rounded">ChatArea</code>. The system will automatically generate suggestions
                when customers send messages, using RAG to find similar past conversations and generate contextually appropriate responses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}