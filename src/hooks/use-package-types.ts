import useSWR from 'swr';

interface PackageType {
  id: number;
  name: string;
  display_name?: string;
  hours?: number;
  type?: string;
  display_order?: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch package types');
  }
  return response.json();
};

export function usePackageTypes() {
  const { data, error, mutate } = useSWR('/api/package-types', fetcher);

  const packageTypes: PackageType[] = data?.data || [];

  return {
    packageTypes,
    isLoading: !error && !data,
    error: error?.message,
    refreshPackageTypes: mutate
  };
}