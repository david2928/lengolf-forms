'use client';

import { EvalTrendPoint } from '@/types/ai-eval';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScoreTrendsChartProps {
  trends: EvalTrendPoint[];
}

const DIMENSION_COLORS = {
  overall: '#2563eb',
  appropriateness: '#16a34a',
  helpfulness: '#9333ea',
  toneMatch: '#ea580c',
  brevity: '#0891b2',
  functionAlignment: '#dc2626',
};

export function ScoreTrendsChart({ trends }: ScoreTrendsChartProps) {
  if (trends.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No trend data available
      </div>
    );
  }

  const chartData = trends.map((t) => ({
    date: new Date(t.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    label: t.prompt_label || t.prompt_version?.substring(0, 16) || '',
    Overall: t.avg_overall,
    Appropriateness: t.avg_appropriateness,
    Helpfulness: t.avg_helpfulness,
    'Tone Match': t.avg_tone_match,
    Brevity: t.avg_brevity,
    'Func Alignment': t.avg_function_alignment,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Line type="monotone" dataKey="Overall" stroke={DIMENSION_COLORS.overall} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Appropriateness" stroke={DIMENSION_COLORS.appropriateness} strokeWidth={1.5} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="Helpfulness" stroke={DIMENSION_COLORS.helpfulness} strokeWidth={1.5} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="Tone Match" stroke={DIMENSION_COLORS.toneMatch} strokeWidth={1.5} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="Brevity" stroke={DIMENSION_COLORS.brevity} strokeWidth={1.5} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="Func Alignment" stroke={DIMENSION_COLORS.functionAlignment} strokeWidth={1.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
