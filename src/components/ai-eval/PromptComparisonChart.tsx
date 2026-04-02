'use client';

import { EvalRun } from '@/types/ai-eval';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PromptComparisonChartProps {
  runs: EvalRun[];
}

const DIMENSION_COLORS = {
  Appropriateness: '#16a34a',
  Helpfulness: '#9333ea',
  'Tone Match': '#ea580c',
  Brevity: '#0891b2',
  'Func Alignment': '#dc2626',
};

export function PromptComparisonChart({ runs }: PromptComparisonChartProps) {
  if (runs.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Need at least 2 runs for comparison
      </div>
    );
  }

  // Take last 5 runs max for readability
  const compareRuns = runs.slice(-5);

  const chartData = compareRuns.map((run) => ({
    name: run.prompt_label || run.prompt_version?.substring(0, 14) || new Date(run.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Appropriateness: run.avg_appropriateness,
    Helpfulness: run.avg_helpfulness,
    'Tone Match': run.avg_tone_match,
    Brevity: run.avg_brevity,
    'Func Alignment': run.avg_function_alignment,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        />
        <Legend />
        <Bar dataKey="Appropriateness" fill={DIMENSION_COLORS.Appropriateness} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Helpfulness" fill={DIMENSION_COLORS.Helpfulness} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Tone Match" fill={DIMENSION_COLORS['Tone Match']} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Brevity" fill={DIMENSION_COLORS.Brevity} radius={[2, 2, 0, 0]} />
        <Bar dataKey="Func Alignment" fill={DIMENSION_COLORS['Func Alignment']} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
