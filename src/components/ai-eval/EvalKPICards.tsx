'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EvalRun } from '@/types/ai-eval';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EvalKPICardsProps {
  currentRun: EvalRun | null;
  previousRun: EvalRun | null;
}

interface KPICardProps {
  title: string;
  value: number | null;
  previousValue: number | null;
  max?: number;
}

function KPICard({ title, value, previousValue, max = 5 }: KPICardProps) {
  const displayValue = value != null ? value.toFixed(2) : '--';
  const delta = value != null && previousValue != null ? value - previousValue : null;
  const deltaStr = delta != null ? (delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)) : null;

  const DeltaIcon = delta != null
    ? delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus
    : null;
  const deltaColor = delta != null
    ? delta > 0.05 ? 'text-green-600' : delta < -0.05 ? 'text-red-600' : 'text-muted-foreground'
    : '';

  // Color based on score (1-5 scale)
  const scoreColor = value != null
    ? value >= 4 ? 'text-green-600' : value >= 3 ? 'text-yellow-600' : 'text-red-600'
    : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className={`text-2xl font-bold ${scoreColor}`}>{displayValue}</span>
          <span className="text-xs text-muted-foreground">/ {max}</span>
        </div>
        {deltaStr && DeltaIcon && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${deltaColor}`}>
            <DeltaIcon className="h-3 w-3" />
            <span>{deltaStr} vs prev</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EvalKPICards({ currentRun, previousRun }: EvalKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KPICard
        title="Overall"
        value={currentRun?.avg_overall ?? null}
        previousValue={previousRun?.avg_overall ?? null}
      />
      <KPICard
        title="Appropriateness"
        value={currentRun?.avg_appropriateness ?? null}
        previousValue={previousRun?.avg_appropriateness ?? null}
      />
      <KPICard
        title="Helpfulness"
        value={currentRun?.avg_helpfulness ?? null}
        previousValue={previousRun?.avg_helpfulness ?? null}
      />
      <KPICard
        title="Tone Match"
        value={currentRun?.avg_tone_match ?? null}
        previousValue={previousRun?.avg_tone_match ?? null}
      />
      <KPICard
        title="Brevity"
        value={currentRun?.avg_brevity ?? null}
        previousValue={previousRun?.avg_brevity ?? null}
      />
    </div>
  );
}
