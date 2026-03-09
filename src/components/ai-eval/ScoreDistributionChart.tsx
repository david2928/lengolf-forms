'use client';

import { EvalRun } from '@/types/ai-eval';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScoreDistributionChartProps {
  run: EvalRun | null;
}

const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export function ScoreDistributionChart({ run }: ScoreDistributionChartProps) {
  if (!run?.score_distribution) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No distribution data
      </div>
    );
  }

  const chartData = [1, 2, 3, 4, 5].map((score) => ({
    score: String(score),
    count: run.score_distribution[String(score)] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="score" className="text-xs" />
        <YAxis className="text-xs" allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={SCORE_COLORS[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
