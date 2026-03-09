'use client';

import { IntentBreakdown } from '@/types/ai-eval';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface IntentPerformanceChartProps {
  intents: IntentBreakdown[];
}

function getBarColor(score: number): string {
  if (score >= 4) return '#16a34a';
  if (score >= 3) return '#eab308';
  return '#ef4444';
}

export function IntentPerformanceChart({ intents }: IntentPerformanceChartProps) {
  if (!intents || intents.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No intent data
      </div>
    );
  }

  const chartData = [...intents]
    .sort((a, b) => b.overallMean - a.overallMean)
    .map((item) => ({
      intent: item.intent.length > 18 ? item.intent.substring(0, 16) + '...' : item.intent,
      fullIntent: item.intent,
      score: item.overallMean,
      count: item.count,
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" />
        <YAxis type="category" dataKey="intent" width={120} className="text-xs" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
