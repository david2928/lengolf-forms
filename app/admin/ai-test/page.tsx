'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Loader2,
  Clock,
  Gauge,
  Brain,
  MessageSquare,
  Image as ImageIcon,
  Wrench,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Bug,
  Trash2,
  ListRestart,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

interface SuggestedImage {
  imageId: string;
  imageUrl: string;
  title: string;
  description: string;
  reason: string;
  similarityScore?: number;
}

interface DebugContext {
  systemPromptExcerpt?: string;
  skillsUsed?: string[];
  intentDetected?: string;
  intentSource?: string;
  intentClassificationMs?: number;
  businessContextIncluded?: boolean;
  faqMatches?: Array<{ question: string; answer: string; score: number }>;
  model?: string;
}

interface AITestResult {
  success: boolean;
  error?: string;
  details?: string;
  suggestion?: {
    id: string;
    suggestedResponse: string;
    suggestedResponseThai?: string;
    confidenceScore: number;
    responseTime: number;
    contextSummary: string;
    templateUsed?: { id: string; name: string; title?: string };
    similarMessagesCount: number;
    suggestedImages?: SuggestedImage[];
    functionCalled?: string;
    functionResult?: Record<string, unknown>;
    functionParameters?: Record<string, unknown>;
    requiresApproval?: boolean;
    approvalMessage?: string;
    debugContext?: DebugContext;
  };
}

interface ConversationMessage {
  role: 'customer' | 'staff';
  content: string;
  timestamp: Date;
  aiResult?: AITestResult;
}

// ── Constants ─────────────────────────────────────────────────────

const CHANNEL_OPTIONS = [
  { value: 'line', label: 'LINE' },
  { value: 'website', label: 'Website' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const;

const PRESET_QUESTIONS = [
  { label: 'Pricing', question: 'ราคาเท่าไหร่คะ', lang: 'th' },
  { label: 'Buy 1 Get 1', question: 'มีโปร Buy 1 Get 1 ไหมคะ', lang: 'th' },
  { label: 'Coaching', question: 'อยากเรียนกอล์ฟค่ะ ราคาเท่าไหร่', lang: 'th' },
  { label: 'Hours', question: 'เปิดกี่โมงคะ', lang: 'th' },
  { label: 'Club rental', question: 'มีไม้กอล์ฟให้ยืมไหม', lang: 'th' },
  { label: 'Booking (EN)', question: 'I want to book a bay for tomorrow at 6pm', lang: 'en' },
  { label: 'Packages (EN)', question: 'What packages do you offer?', lang: 'en' },
  { label: 'Location (EN)', question: 'Where are you located? How do I get there by BTS?', lang: 'en' },
];

// ── Main Page ─────────────────────────────────────────────────────

export default function AITestPage() {
  const [question, setQuestion] = useState('');
  const [channelType, setChannelType] = useState<string>('line');
  const [isLoading, setIsLoading] = useState(false);

  // Session mode: conversation messages build up context
  const [sessionMode, setSessionMode] = useState(true);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [selectedResult, setSelectedResult] = useState<AITestResult | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    response: true,
    thai: true,
    debug: false,
    function: false,
    images: true,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Build conversation context for session mode
  const buildConversationContext = useCallback(() => {
    if (!sessionMode || conversation.length === 0) return [];
    return conversation.map(msg => ({
      content: msg.content,
      senderType: msg.role === 'customer' ? 'user' : 'staff',
      createdAt: msg.timestamp.toISOString(),
    }));
  }, [sessionMode, conversation]);

  const runTest = useCallback(async () => {
    if (!question.trim()) return;

    const customerMessage = question.trim();
    setIsLoading(true);
    setQuestion('');

    // Add customer message to conversation
    const customerMsg: ConversationMessage = {
      role: 'customer',
      content: customerMessage,
      timestamp: new Date(),
    };

    const updatedConversation = sessionMode
      ? [...conversation, customerMsg]
      : [customerMsg];

    setConversation(updatedConversation);

    try {
      const res = await fetch('/api/ai/suggest-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerMessage,
          conversationId: '00000000-0000-0000-0000-000000000000',
          channelType,
          dryRun: true,
          includeDebugContext: true,
          // Pass conversation history so the AI sees prior context
          conversationContext: sessionMode ? buildConversationContext() : undefined,
        }),
      });

      const data: AITestResult = await res.json();

      // Add AI response to conversation
      if (data.success && data.suggestion) {
        const staffMsg: ConversationMessage = {
          role: 'staff',
          content: data.suggestion.suggestedResponseThai || data.suggestion.suggestedResponse,
          timestamp: new Date(),
          aiResult: data,
        };
        setConversation([...updatedConversation, staffMsg]);
        setSelectedResult(data);
      } else {
        // Show error in selected result
        setSelectedResult(data);
      }
    } catch (err) {
      const errorResult: AITestResult = {
        success: false,
        error: 'Network error',
        details: err instanceof Error ? err.message : 'Failed to connect to API',
      };
      setSelectedResult(errorResult);
    } finally {
      setIsLoading(false);
      // Scroll to bottom
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [question, channelType, sessionMode, conversation, buildConversationContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runTest();
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setSelectedResult(null);
    setQuestion('');
  };

  const confidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    if (score >= 0.6) return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    return 'bg-red-500/15 text-red-700 border-red-500/30';
  };

  const confidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const result = selectedResult;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Suggestion Tester</h1>
              <p className="text-sm text-gray-500">Test how the AI responds to customer messages</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Session mode toggle */}
              <button
                onClick={() => {
                  setSessionMode(!sessionMode);
                  clearConversation();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  sessionMode
                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <ListRestart className="h-3.5 w-3.5" />
                {sessionMode ? 'Session Mode' : 'Single Mode'}
              </button>
              <Badge variant="outline" className="text-xs font-mono">
                dry-run
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Chat + Input */}
          <div className="lg:col-span-1 space-y-4">
            {/* Conversation Thread */}
            <Card className="flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {sessionMode ? 'Conversation' : 'Message'}
                  </CardTitle>
                  {conversation.length > 0 && (
                    <button
                      onClick={clearConversation}
                      className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 min-h-[120px]">
                {conversation.length === 0 && (
                  <div className="flex items-center justify-center h-[100px]">
                    <p className="text-xs text-gray-300">Send a message to start</p>
                  </div>
                )}
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <button
                      onClick={() => msg.aiResult && setSelectedResult(msg.aiResult)}
                      className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                        msg.role === 'customer'
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : `bg-white border text-gray-700 rounded-bl-sm ${
                              msg.aiResult && selectedResult?.suggestion?.id === msg.aiResult?.suggestion?.id
                                ? 'border-violet-300 ring-1 ring-violet-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`
                      }`}
                    >
                      {msg.content}
                      {msg.aiResult?.suggestion && (
                        <span className={`ml-1.5 text-[10px] font-mono px-1 py-0.5 rounded ${
                          msg.role === 'customer' ? 'bg-white/20' : confidenceColor(msg.aiResult.suggestion.confidenceScore)
                        }`}>
                          {Math.round(msg.aiResult.suggestion.confidenceScore * 100)}%
                        </span>
                      )}
                    </button>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg rounded-bl-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3 flex-shrink-0 space-y-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a customer message..."
                  className="min-h-[60px] max-h-[100px] resize-none text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Select value={channelType} onValueChange={setChannelType}>
                    <SelectTrigger className="w-[110px] text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={runTest}
                    disabled={isLoading || !question.trim()}
                    className="flex-1 h-8 text-xs"
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isLoading ? 'Thinking...' : 'Send'}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-300 text-center">Ctrl+Enter to send</p>
              </div>
            </Card>

            {/* Preset Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_QUESTIONS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setQuestion(preset.question)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-600"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${preset.lang === 'th' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {!result && !isLoading && (
              <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-gray-200 rounded-xl">
                <div className="text-center">
                  <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Send a message to see AI suggestions</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {sessionMode ? 'Session mode: messages build conversation context' : 'Single mode: each message is independent'}
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Error State */}
                {!result.success && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded bg-red-100 text-red-600">
                          <Bug className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-800">{result.error}</p>
                          {result.details && (
                            <p className="text-xs text-red-600 mt-1 font-mono">{result.details}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Success State */}
                {result.success && result.suggestion && (
                  <>
                    {/* KPI Strip */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg border px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Gauge className="h-3.5 w-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">Confidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-semibold tabular-nums">
                            {Math.round(result.suggestion.confidenceScore * 100)}%
                          </span>
                          <Badge className={`text-[10px] ${confidenceColor(result.suggestion.confidenceScore)}`}>
                            {confidenceLabel(result.suggestion.confidenceScore)}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">Time</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-semibold tabular-nums">
                            {result.suggestion.responseTime >= 1000
                              ? (result.suggestion.responseTime / 1000).toFixed(1)
                              : result.suggestion.responseTime}
                          </span>
                          <span className="text-xs text-gray-400">
                            {result.suggestion.responseTime >= 1000 ? 's' : 'ms'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Brain className="h-3.5 w-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">Similar</span>
                        </div>
                        <span className="text-xl font-semibold tabular-nums">
                          {result.suggestion.similarMessagesCount}
                        </span>
                      </div>

                      <div className="bg-white rounded-lg border px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">Intent</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate block">
                          {result.suggestion.debugContext?.intentDetected || 'N/A'}
                        </span>
                        {result.suggestion.debugContext?.intentSource && (
                          <span className="text-[10px] text-gray-400">
                            via {result.suggestion.debugContext.intentSource}
                            {result.suggestion.debugContext.intentClassificationMs != null && (
                              <> ({result.suggestion.debugContext.intentClassificationMs}ms)</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Suggested Response */}
                    <CollapsibleSection
                      title="Suggested Response (English)"
                      icon={<MessageSquare className="h-4 w-4" />}
                      expanded={expandedSections.response}
                      onToggle={() => toggleSection('response')}
                    >
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {result.suggestion.suggestedResponse}
                        </p>
                      </div>
                    </CollapsibleSection>

                    {/* Thai Response */}
                    {result.suggestion.suggestedResponseThai && (
                      <CollapsibleSection
                        title="Suggested Response (Thai)"
                        icon={<MessageSquare className="h-4 w-4" />}
                        expanded={expandedSections.thai}
                        onToggle={() => toggleSection('thai')}
                        badge="TH"
                      >
                        <div className="p-4 bg-blue-50/50 rounded-md">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {result.suggestion.suggestedResponseThai}
                          </p>
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Function Call */}
                    {result.suggestion.functionCalled && (
                      <CollapsibleSection
                        title={`Function: ${result.suggestion.functionCalled}`}
                        icon={<Wrench className="h-4 w-4" />}
                        expanded={expandedSections.function}
                        onToggle={() => toggleSection('function')}
                        badge={result.suggestion.requiresApproval ? 'Needs Approval' : undefined}
                        badgeColor="bg-amber-500/15 text-amber-700 border-amber-500/30"
                      >
                        <div className="space-y-3">
                          {result.suggestion.approvalMessage && (
                            <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                              <p className="text-xs text-amber-800">{result.suggestion.approvalMessage}</p>
                            </div>
                          )}
                          {result.suggestion.functionParameters && (
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">Parameters</p>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto font-mono">
                                {JSON.stringify(result.suggestion.functionParameters, null, 2)}
                              </pre>
                            </div>
                          )}
                          {result.suggestion.functionResult && (
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">Result</p>
                              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto font-mono">
                                {JSON.stringify(result.suggestion.functionResult, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Suggested Images */}
                    {result.suggestion.suggestedImages && result.suggestion.suggestedImages.length > 0 && (
                      <CollapsibleSection
                        title={`Suggested Images (${result.suggestion.suggestedImages.length})`}
                        icon={<ImageIcon className="h-4 w-4" />}
                        expanded={expandedSections.images}
                        onToggle={() => toggleSection('images')}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {result.suggestion.suggestedImages.map((img, i) => (
                            <div key={i} className="border rounded-md overflow-hidden bg-white">
                              <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.imageUrl}
                                  alt={img.title}
                                  className="w-full h-36 object-cover bg-gray-100"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                />
                              </a>
                              <div className="p-2 space-y-0.5">
                                <p className="text-xs font-medium text-gray-700">{img.title}</p>
                                <p className="text-[11px] text-gray-400">{img.reason}</p>
                                {img.similarityScore !== undefined && (
                                  <p className="text-[10px] font-mono text-gray-300">
                                    similarity: {(img.similarityScore * 100).toFixed(0)}%
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Debug Context */}
                    <CollapsibleSection
                      title="Debug Context"
                      icon={<Bug className="h-4 w-4" />}
                      expanded={expandedSections.debug}
                      onToggle={() => toggleSection('debug')}
                    >
                      {result.suggestion.debugContext ? (
                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList className="w-full">
                            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
                            <TabsTrigger value="prompt" className="flex-1 text-xs">Prompt Excerpt</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview">
                            <div className="space-y-3 pt-2">
                              <MetadataRow label="Context Summary" value={result.suggestion.contextSummary} />
                              {result.suggestion.debugContext.intentDetected && (
                                <MetadataRow label="Intent Detected" value={result.suggestion.debugContext.intentDetected} />
                              )}
                              {result.suggestion.debugContext.skillsUsed && result.suggestion.debugContext.skillsUsed.length > 0 && (
                                <MetadataRow label="Skills Used" value={result.suggestion.debugContext.skillsUsed.join(', ')} />
                              )}
                              <MetadataRow
                                label="Business Context"
                                value={result.suggestion.debugContext.businessContextIncluded ? 'Included' : 'Not included'}
                              />
                              {result.suggestion.debugContext.model && (
                                <MetadataRow label="Model" value={result.suggestion.debugContext.model} />
                              )}
                              {result.suggestion.templateUsed && (
                                <MetadataRow label="Template Matched" value={result.suggestion.templateUsed.title || result.suggestion.templateUsed.name} />
                              )}
                              {result.suggestion.debugContext.faqMatches && result.suggestion.debugContext.faqMatches.length > 0 && (
                                <div>
                                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">FAQ Matches</p>
                                  <div className="space-y-2">
                                    {result.suggestion.debugContext.faqMatches.map((faq, i) => (
                                      <div key={i} className="text-xs p-2.5 bg-gray-50 rounded border">
                                        <p className="font-medium text-gray-700">{faq.question}</p>
                                        <p className="text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                                        <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                                          score: {faq.score?.toFixed(2) ?? 'N/A'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="prompt">
                            <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-[500px] font-mono leading-relaxed mt-2 whitespace-pre-wrap">
                              {result.suggestion.debugContext.systemPromptExcerpt || 'Not available'}
                            </pre>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          Debug context not available.
                        </p>
                      )}
                    </CollapsibleSection>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {badge && (
          <Badge className={`text-[10px] ml-auto ${badgeColor || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {badge}
          </Badge>
        )}
      </button>
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 min-w-[130px] pt-0.5">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}
