'use client';

import { EvalRun } from '@/types/ai-eval';
import { Badge } from '@/components/ui/badge';

interface RunHistoryTableProps {
  runs: EvalRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    running: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RunHistoryTable({ runs, selectedRunId, onSelectRun }: RunHistoryTableProps) {
  if (runs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No eval runs found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Date</th>
            <th className="text-left py-2 px-3 font-medium">Version</th>
            <th className="text-left py-2 px-3 font-medium">Label</th>
            <th className="text-center py-2 px-3 font-medium">Samples</th>
            <th className="text-center py-2 px-3 font-medium">Overall</th>
            <th className="text-center py-2 px-3 font-medium">A</th>
            <th className="text-center py-2 px-3 font-medium">H</th>
            <th className="text-center py-2 px-3 font-medium">T</th>
            <th className="text-center py-2 px-3 font-medium">B</th>
            <th className="text-center py-2 px-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isSelected = run.id === selectedRunId;
            return (
              <tr
                key={run.id}
                className={`border-b cursor-pointer transition-colors ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
                onClick={() => onSelectRun(run.id)}
              >
                <td className="py-2 px-3 whitespace-nowrap">{formatDate(run.started_at)}</td>
                <td className="py-2 px-3 font-mono text-xs">{run.prompt_version?.substring(0, 20) || '--'}</td>
                <td className="py-2 px-3">
                  {run.prompt_label && (
                    <Badge variant="outline" className="text-xs">{run.prompt_label}</Badge>
                  )}
                </td>
                <td className="py-2 px-3 text-center">{run.judged_samples}/{run.total_samples}</td>
                <td className="py-2 px-3 text-center font-semibold">{run.avg_overall?.toFixed(2) ?? '--'}</td>
                <td className="py-2 px-3 text-center">{run.avg_appropriateness?.toFixed(1) ?? '--'}</td>
                <td className="py-2 px-3 text-center">{run.avg_helpfulness?.toFixed(1) ?? '--'}</td>
                <td className="py-2 px-3 text-center">{run.avg_tone_match?.toFixed(1) ?? '--'}</td>
                <td className="py-2 px-3 text-center">{run.avg_brevity?.toFixed(1) ?? '--'}</td>
                <td className="py-2 px-3 text-center">{statusBadge(run.status)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
