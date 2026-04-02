'use client';

import { useState, useCallback } from 'react';
import { EvalSample, JudgeReasoning } from '@/types/ai-eval';
import { ChevronDown, ChevronRight, MessageSquare, Bot, User, Star } from 'lucide-react';

interface SampleExplorerTableProps {
  samples: EvalSample[];
  isLoading: boolean;
}

interface HistoryMessage {
  content: string;
  sender_type: string;
  created_at?: string;
  content_type?: string;
  file_url?: string;
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number | null): string {
  if (score == null) return 'bg-muted';
  if (score >= 4) return 'bg-green-100 dark:bg-green-950';
  if (score >= 3) return 'bg-yellow-100 dark:bg-yellow-950';
  return 'bg-red-100 dark:bg-red-950';
}

function isCustomerMsg(senderType: string): boolean {
  return senderType === 'user' || senderType === 'customer';
}

function ScorePill({ label, score, reasoning }: { label: string; score: number | null; reasoning?: string }) {
  return (
    <div className={`rounded-lg p-2.5 ${scoreBg(score)}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${scoreColor(score)}`}>{score ?? '--'}</span>
      </div>
      {reasoning && (
        <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
      )}
    </div>
  );
}

function SampleDetail({ sample }: { sample: EvalSample }) {
  const history = (sample.conversation_history || []) as HistoryMessage[];
  const reasoning = sample.judge_reasoning as JudgeReasoning | null;

  return (
    <div className="space-y-4">
      {/* Conversation History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conversation History ({history.length} messages)
            </span>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-lg border bg-background p-3">
            {history.map((msg, i) => {
              const isCust = isCustomerMsg(msg.sender_type);
              return (
                <div key={i} className={`flex gap-2 ${isCust ? '' : 'flex-row-reverse'}`}>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${
                    isCust ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  }`}>
                    {isCust ? 'C' : 'S'}
                  </div>
                  <div className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[80%] ${
                    isCust
                      ? 'bg-blue-50 dark:bg-blue-950 text-foreground'
                      : 'bg-purple-50 dark:bg-purple-950 text-foreground'
                  }`}>
                    {msg.file_url && (msg.content_type === 'image' || msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.file_url} alt="Shared image" className="max-w-[200px] max-h-[150px] rounded object-cover" />
                        {msg.content !== 'sent a photo' && msg.content !== 'You sent a photo' && (
                          <span className="block mt-1">{msg.content}</span>
                        )}
                      </a>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test Point: Customer Message → AI Response vs Staff Response */}
      <div className="rounded-lg border overflow-hidden">
        {/* Customer input */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 border-b">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Customer Message (test input)</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{sample.customer_message}</p>
        </div>

        {/* Side-by-side: AI vs Staff */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* AI Response */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-400">AI Suggestion</span>
              {sample.confidence_score != null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground ml-auto">
                  {(sample.confidence_score * 100).toFixed(0)}% conf
                </span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{sample.ai_response || '(no response)'}</p>
            {sample.function_called && (
              <div className="mt-2 text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground inline-block font-mono">
                fn: {sample.function_called}
              </div>
            )}
          </div>

          {/* Staff Response */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Actual Staff Response</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{sample.actual_staff_response || '(not available)'}</p>
          </div>
        </div>
      </div>

      {/* Judge Scores with Reasoning */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Star className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Judge Scores
          </span>
          <span className={`text-sm font-bold ml-auto ${scoreColor(sample.judge_overall)}`}>
            Overall: {sample.judge_overall?.toFixed(1) ?? '--'}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <ScorePill label="Appropriateness" score={sample.judge_appropriateness} reasoning={reasoning?.appropriateness} />
          <ScorePill label="Helpfulness" score={sample.judge_helpfulness} reasoning={reasoning?.helpfulness} />
          <ScorePill label="Tone Match" score={sample.judge_tone_match} reasoning={reasoning?.toneMatch} />
          <ScorePill label="Brevity" score={sample.judge_brevity} reasoning={reasoning?.brevity} />
          <ScorePill label="Func Alignment" score={sample.judge_function_alignment} reasoning={reasoning?.functionAlignment} />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1 border-t">
        <span>Intent: <strong>{sample.intent || '--'}</strong> ({sample.intent_source || '--'})</span>
        <span>Channel: <strong>{sample.channel_type || '--'}</strong></span>
        {sample.suggestion_latency_ms != null && <span>Latency: <strong>{sample.suggestion_latency_ms}ms</strong></span>}
        {sample.has_customer_context && <span>Has customer context</span>}
        {sample.needs_management && <span className="text-orange-600 font-medium">Needs Management</span>}
      </div>
    </div>
  );
}

function SampleRow({ sample }: { sample: EvalSample }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={toggle}
      >
        <td className="py-2 px-3">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="py-2 px-3 max-w-[200px] truncate" title={sample.customer_message}>
          {sample.customer_message}
        </td>
        <td className="py-2 px-3 text-xs">{sample.intent || '--'}</td>
        <td className="py-2 px-3 text-xs">{sample.channel_type || '--'}</td>
        <td className={`py-2 px-3 text-center font-semibold ${scoreColor(sample.judge_overall)}`}>
          {sample.judge_overall?.toFixed(1) ?? '--'}
        </td>
        <td className={`py-2 px-3 text-center ${scoreColor(sample.judge_appropriateness)}`}>
          {sample.judge_appropriateness ?? '--'}
        </td>
        <td className={`py-2 px-3 text-center ${scoreColor(sample.judge_helpfulness)}`}>
          {sample.judge_helpfulness ?? '--'}
        </td>
        <td className={`py-2 px-3 text-center ${scoreColor(sample.judge_tone_match)}`}>
          {sample.judge_tone_match ?? '--'}
        </td>
        <td className={`py-2 px-3 text-center ${scoreColor(sample.judge_brevity)}`}>
          {sample.judge_brevity ?? '--'}
        </td>
        <td className={`py-2 px-3 text-center ${scoreColor(sample.judge_function_alignment)}`}>
          {sample.judge_function_alignment ?? '--'}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b">
          <td colSpan={10} className="p-4 bg-muted/20">
            <SampleDetail sample={sample} />
          </td>
        </tr>
      )}
    </>
  );
}

export function SampleExplorerTable({ samples, isLoading }: SampleExplorerTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading samples...</div>;
  }

  if (samples.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No samples found. Select a run first.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-3 w-8"></th>
            <th className="text-left py-2 px-3 font-medium">Customer Message</th>
            <th className="text-left py-2 px-3 font-medium">Intent</th>
            <th className="text-left py-2 px-3 font-medium">Channel</th>
            <th className="text-center py-2 px-3 font-medium">Overall</th>
            <th className="text-center py-2 px-3 font-medium">A</th>
            <th className="text-center py-2 px-3 font-medium">H</th>
            <th className="text-center py-2 px-3 font-medium">T</th>
            <th className="text-center py-2 px-3 font-medium">B</th>
            <th className="text-center py-2 px-3 font-medium">F</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <SampleRow key={sample.id} sample={sample} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
