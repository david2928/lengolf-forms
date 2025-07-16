import useSWR from 'swr';
import { CompetitorWithAccounts, Platform } from '@/types/competitor-tracking';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCompetitors() {
  const { data, error, mutate } = useSWR<{ competitors: CompetitorWithAccounts[] }>(
    '/api/admin/competitors',
    fetcher
  );

  return {
    competitors: data?.competitors || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useCompetitorMetrics(competitorId: number, platform?: Platform, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (platform) params.append('platform', platform);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `/api/admin/competitors/${competitorId}/metrics?${params.toString()}`;
  
  const { data, error, mutate } = useSWR(url, fetcher);

  return {
    metrics: data?.metrics || [],
    summary: data?.summary,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export async function createCompetitor(data: {
  name: string;
  business_type?: string;
  location?: string;
  notes?: string;
  social_accounts?: Array<{
    platform: Platform;
    account_handle?: string;
    account_url: string;
  }>;
}) {
  const response = await fetch('/api/admin/competitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create competitor');
  }

  return response.json();
}

export async function updateCompetitor(id: number, data: {
  name?: string;
  business_type?: string;
  notes?: string;
  is_active?: boolean;
  social_accounts?: Array<{
    id?: number;
    platform: Platform;
    account_handle?: string;
    account_url: string;
  }>;
}) {
  // Update basic competitor data
  const { social_accounts, ...competitorData } = data;
  
  const response = await fetch(`/api/admin/competitors/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(competitorData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update competitor');
  }

  // Update social accounts if provided
  if (social_accounts !== undefined) {
    const socialResponse = await fetch(`/api/admin/competitors/${id}/social-accounts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ social_accounts }),
    });

    if (!socialResponse.ok) {
      const error = await socialResponse.json();
      throw new Error(error.error || 'Failed to update social accounts');
    }
  }

  return response.json();
}

export async function deleteCompetitor(id: number) {
  const response = await fetch(`/api/admin/competitors/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete competitor');
  }

  return response.json();
}

export async function triggerManualSync() {
  const response = await fetch('/api/competitors/sync', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to trigger sync');
  }

  return response.json();
}