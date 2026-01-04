import { useState, useEffect } from 'react';
import useSWR from 'swr';

interface PackageFilters {
  search: string;
  customer_id?: string;
  package_type_id?: string;
  status?: string;
  page: number;
  limit: number;
}

interface Package {
  id: string;
  customer_name: string;
  customer_id?: string;
  package_type_id: number;
  package_type_name: string;
  purchase_date: string;
  expiration_date: string;
  first_use_date?: string;
  employee_name?: string;
  total_hours?: number;
  total_used_hours: number;
  remaining_hours?: number;
  is_unlimited: boolean;
  last_modified_by?: string;
  last_modified_at?: string;
  modification_notes?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface KPIs {
  total: number;
  active: number;
  expiringSoon: number;
  unlimited: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch packages');
  }
  return response.json();
};

export function useAdminPackages() {
  const [filters, setFilters] = useState<PackageFilters>({
    search: '',
    page: 1,
    limit: 50
  });

  // Build query string
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  const { data, error, mutate } = useSWR(
    `/api/admin/packages?${queryParams.toString()}`,
    fetcher
  );

  const packages: Package[] = data?.data || [];
  const pagination: Pagination | undefined = data?.pagination;
  const kpis: KPIs | undefined = data?.kpis;

  const updateFilters = (newFilters: Partial<PackageFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1 // Reset to page 1 unless explicitly setting page
    }));
  };

  const refreshPackages = () => {
    mutate();
  };

  return {
    packages,
    pagination,
    kpis,
    isLoading: !error && !data,
    error: error?.message,
    filters,
    updateFilters,
    refreshPackages
  };
}