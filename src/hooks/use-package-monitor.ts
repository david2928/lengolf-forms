import useSWR from 'swr';
import { PackageMonitorData } from '@/types/package-monitor';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
};

export function usePackageMonitor() {
  const { data, error, mutate } = useSWR<PackageMonitorData>('/api/packages/monitor', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });

  return {
    data: data ? {
      diamond: {
        count: data.diamond_active ?? 0,
        packages: data.diamond_packages ?? []
      },
      expiring: {
        count: data.expiring_count ?? 0,
        packages: data.expiring_packages ?? []
      }
    } : {
      diamond: { count: 0, packages: [] },
      expiring: { count: 0, packages: [] }
    },
    isLoading: !error && !data,
    error,
    refresh: mutate
  };
}