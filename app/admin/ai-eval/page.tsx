'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEvalRuns, useEvalTrends, useEvalRunDetail, useEvalSamples } from '@/hooks/useAiEvalDashboard';
import { EvalKPICards } from '@/components/ai-eval/EvalKPICards';
import { ScoreTrendsChart } from '@/components/ai-eval/ScoreTrendsChart';
import { ScoreDistributionChart } from '@/components/ai-eval/ScoreDistributionChart';
import { IntentPerformanceChart } from '@/components/ai-eval/IntentPerformanceChart';
import { RunHistoryTable } from '@/components/ai-eval/RunHistoryTable';
import { SampleExplorerTable } from '@/components/ai-eval/SampleExplorerTable';
import { PromptComparisonChart } from '@/components/ai-eval/PromptComparisonChart';
import { RefreshCw, Play, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function AiEvalDashboard() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [sampleIntent, setSampleIntent] = useState<string>('');
  const [triggering, setTriggering] = useState(false);

  const { runs, isLoading: runsLoading, mutate: mutateRuns } = useEvalRuns({ limit: 30 });
  const { trends, isLoading: trendsLoading } = useEvalTrends(30);
  const { run: selectedRun } = useEvalRunDetail(selectedRunId);
  const { samples, isLoading: samplesLoading } = useEvalSamples(selectedRunId, {
    intent: sampleIntent || undefined,
    limit: 100,
  });

  // Latest and previous runs for KPI comparison
  const latestRun = runs.length > 0 ? runs[0] : null;
  const previousRun = runs.length > 1 ? runs[1] : null;

  const handleSelectRun = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setSampleIntent('');
  }, []);

  const handleRefresh = useCallback(() => {
    mutateRuns();
  }, [mutateRuns]);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    try {
      const resp = await fetch('/api/ai-eval/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_count: 50, batch_size: 10 }),
      });
      const result = await resp.json();
      if (resp.ok) {
        toast({ title: 'Eval run triggered', description: 'Refresh in a few minutes to see results.' });
        setTimeout(() => mutateRuns(), 5000);
      } else {
        toast({ title: 'Trigger failed', description: result.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Trigger failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  }, [mutateRuns]);

  // Get unique intents from selected run for filter
  const intentOptions = selectedRun?.by_intent?.map((i) => i.intent) || [];

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Eval Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track AI suggestion quality across prompt versions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleTrigger} disabled={triggering}>
            {triggering ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Run Eval
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="samples">Sample Explorer</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {runsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              <EvalKPICards currentRun={latestRun} previousRun={previousRun} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ScoreTrendsChart trends={trends} />
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Distribution (Latest)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScoreDistributionChart run={latestRun} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance by Intent (Latest)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <IntentPerformanceChart intents={latestRun?.by_intent || []} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Run History Tab */}
        <TabsContent value="history" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eval Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <RunHistoryTable
                runs={runs}
                selectedRunId={selectedRunId}
                onSelectRun={handleSelectRun}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt Version Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <PromptComparisonChart runs={runs.filter((r) => r.status === 'completed')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sample Explorer Tab */}
        <TabsContent value="samples" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedRunId
                ? `Viewing samples for run ${selectedRunId.substring(0, 8)}...`
                : 'Select a run from the History tab to view samples'}
            </div>
            {intentOptions.length > 0 && (
              <select
                className="border rounded px-2 py-1 text-sm bg-background"
                value={sampleIntent}
                onChange={(e) => setSampleIntent(e.target.value)}
              >
                <option value="">All intents</option>
                {intentOptions.map((intent) => (
                  <option key={intent} value={intent}>{intent}</option>
                ))}
              </select>
            )}
          </div>

          <Card>
            <CardContent className="pt-4">
              <SampleExplorerTable samples={samples} isLoading={samplesLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
