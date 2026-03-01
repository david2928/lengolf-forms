import useSWR from 'swr';
import { EvalRun, EvalSample, EvalTrendPoint, RunListParams, SampleListParams } from '@/types/ai-eval';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
});

const swrConfig = {
  dedupingInterval: 30000,
  revalidateOnFocus: false,
  errorRetryCount: 2,
};

// ─── Eval Runs (paginated list) ─────────────────────────────────────────────

interface RunsResponse {
  data: EvalRun[];
  total: number;
  limit: number;
  offset: number;
}

export function useEvalRuns(params: RunListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.prompt_version) searchParams.set('prompt_version', params.prompt_version);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);

  const qs = searchParams.toString();
  const url = `/api/ai-eval/runs${qs ? `?${qs}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<RunsResponse>(url, fetcher, swrConfig);

  return {
    runs: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// ─── Trends ─────────────────────────────────────────────────────────────────

interface TrendsResponse {
  data: EvalTrendPoint[];
}

export function useEvalTrends(limit = 20) {
  const url = `/api/ai-eval/trends?limit=${limit}`;

  const { data, error, isLoading } = useSWR<TrendsResponse>(url, fetcher, swrConfig);

  return {
    trends: data?.data || [],
    isLoading,
    isError: !!error,
  };
}

// ─── Run Detail ─────────────────────────────────────────────────────────────

interface RunDetailResponse {
  data: EvalRun;
}

export function useEvalRunDetail(runId: string | null) {
  const url = runId ? `/api/ai-eval/runs/${runId}` : null;

  const { data, error, isLoading } = useSWR<RunDetailResponse>(url, fetcher, swrConfig);

  return {
    run: data?.data || null,
    isLoading,
    isError: !!error,
  };
}

// ─── Samples for a run ─────────────────────────────────────────────────────

interface SamplesResponse {
  data: EvalSample[];
  total: number;
  limit: number;
  offset: number;
}

export function useEvalSamples(runId: string | null, params: SampleListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.intent) searchParams.set('intent', params.intent);
  if (params.min_score !== undefined) searchParams.set('min_score', String(params.min_score));
  if (params.max_score !== undefined) searchParams.set('max_score', String(params.max_score));

  const qs = searchParams.toString();
  const url = runId ? `/api/ai-eval/runs/${runId}/samples${qs ? `?${qs}` : ''}` : null;

  const { data, error, isLoading, mutate } = useSWR<SamplesResponse>(url, fetcher, swrConfig);

  return {
    samples: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
