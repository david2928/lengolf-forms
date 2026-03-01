'use client';

import { useState, useCallback } from 'react';
import { EvalSample, JudgeReasoning } from '@/types/ai-eval';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SampleExplorerTableProps {
  samples: EvalSample[];
  isLoading: boolean;
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function SampleRow({ sample }: { sample: EvalSample }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const reasoning = sample.judge_reasoning as JudgeReasoning | null;

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
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/30">
          <td colSpan={9} className="p-4">
            <div className="grid gap-3 text-sm">
              <div>
                <span className="font-medium">Customer Message:</span>
                <p className="mt-1 whitespace-pre-wrap bg-background rounded p-2">{sample.customer_message}</p>
              </div>
              <div>
                <span className="font-medium">AI Response:</span>
                <p className="mt-1 whitespace-pre-wrap bg-blue-50 dark:bg-blue-950 rounded p-2">{sample.ai_response || '--'}</p>
              </div>
              {sample.actual_staff_response && (
                <div>
                  <span className="font-medium">Staff Response (ground truth):</span>
                  <p className="mt-1 whitespace-pre-wrap bg-green-50 dark:bg-green-950 rounded p-2">{sample.actual_staff_response}</p>
                </div>
              )}
              {reasoning && (
                <div>
                  <span className="font-medium">Judge Reasoning:</span>
                  <div className="mt-1 grid gap-1 text-xs">
                    <div><strong>Appropriateness ({sample.judge_appropriateness}):</strong> {reasoning.appropriateness}</div>
                    <div><strong>Helpfulness ({sample.judge_helpfulness}):</strong> {reasoning.helpfulness}</div>
                    <div><strong>Tone Match ({sample.judge_tone_match}):</strong> {reasoning.toneMatch}</div>
                    <div><strong>Brevity ({sample.judge_brevity}):</strong> {reasoning.brevity}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {sample.function_called && <span>Function: {sample.function_called}</span>}
                {sample.confidence_score != null && <span>Confidence: {(sample.confidence_score * 100).toFixed(0)}%</span>}
                {sample.suggestion_latency_ms != null && <span>Latency: {sample.suggestion_latency_ms}ms</span>}
                {sample.needs_management && <span className="text-orange-600">Needs Management</span>}
              </div>
            </div>
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
