/**
 * Customer Management React Hooks
 * CMS-009: Customer React Hooks Development
 */

import { useState, useEffect, useCallback } from 'react';

// Types
export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  preferred_contact_method?: 'Phone' | 'LINE' | 'Email';
  customer_status: string;
  lifetime_spending: number;
  total_bookings: number;
  last_visit_date?: string;
  active_packages: number;
  created_at: string;
  search_rank?: number;
}

export interface CustomerKPIs {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  newCustomersPreviousMonth: number;
  growthRate: number;
  totalLifetimeValue: number;
  averageLifetimeValue: number;
  customersWithPackages: number;
  customersWithRecentActivity: number;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email' | 'all';
  // Quick filter: include customers who have not visited in the last N days (includes null last_visit_date)
  notVisitedDays?: number;
  // Package history filter: active_packages >=1 (yes) or =0 (no)
  hasPackage?: 'yes' | 'no';
  sortBy?: 'fullName' | 'customerCode' | 'registrationDate' | 'lastVisit' | 'lifetimeValue' | 'totalBookings';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
  kpis: CustomerKPIs;
}

export interface CreateCustomerData {
  fullName: string;
  primaryPhone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  linkedProfileIds?: string[];
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  updateReason?: string;
}

export interface CustomerMatch {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  match_method: 'phone' | 'name' | 'email';
  similarity?: number;
}

export interface CustomerMatchRequest {
  phone?: string;
  customerName?: string;
  email?: string;
}

// Main hook for customer list with filtering and pagination
export function useCustomers(filters: CustomerFilters = {}, options?: { enabled?: boolean }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current: 1,
    limit: 50
  });
  const [kpis, setKpis] = useState<CustomerKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (options && options.enabled === false) {
      // Skip fetching when explicitly disabled
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/customers?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data: CustomersResponse = await response.json();
      
      setCustomers(data.customers);
      setPagination(data.pagination);
      setKpis(data.kpis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters, options]);

  useEffect(() => {
    if (options && options.enabled === false) {
      // Ensure loading is false when disabled
      setLoading(false);
      return;
    }
    fetchCustomers();
  }, [fetchCustomers, options]);

  const refetch = useCallback(() => {
    if (options && options.enabled === false) return;
    fetchCustomers();
  }, [fetchCustomers, options]);

  return {
    customers,
    pagination,
    kpis,
    loading,
    error,
    refetch
  };
}

// Hook for individual customer details
export function useCustomer(customerId: string | null) {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to fetch customer');
      }

      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomer(customerId);
    } else {
      setCustomer(null);
      setError(null);
    }
  }, [customerId, fetchCustomer]);

  const refetch = useCallback(() => {
    if (customerId) {
      fetchCustomer(customerId);
    }
  }, [customerId, fetchCustomer]);

  return {
    customer,
    loading,
    error,
    refetch
  };
}

// Hook for customer form operations (create/update)
export function useCustomerForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCallback(async (customerData: CreateCustomerData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Duplicate customers found
          throw new Error(data.error || 'Potential duplicates found');
        }
        throw new Error(data.error || 'Failed to create customer');
      }

      return data.customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, customerData: UpdateCustomerData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      return data.customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateCustomer = useCallback(async (customerId: string, reason: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate customer');
      }

      return data.customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    loading,
    error
  };
}

// Hook for customer matching/search operations
export function useCustomerMatching() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findCustomerMatch = useCallback(async (searchData: CustomerMatchRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/customers/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for customer match');
      }

      return {
        match: data.match as CustomerMatch | null,
        found: data.found as boolean,
        matchMethod: data.matchMethod as string | null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDuplicates = useCallback(async (searchData: {
    fullName: string;
    primaryPhone?: string;
    email?: string;
    excludeCustomerId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/customers/search-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for duplicates');
      }

      return {
        potentialDuplicates: data.potentialDuplicates as Array<{
          customer: CustomerMatch;
          matchScore: number;
          matchReasons: string[];
        }>,
        duplicateCount: data.duplicateCount as number,
        hasHighConfidenceMatches: data.hasHighConfidenceMatches as boolean
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    findCustomerMatch,
    searchDuplicates,
    loading,
    error
  };
}

// Hook for customer analytics/KPIs
export function useCustomerAnalytics(dateFrom?: string, dateTo?: string) {
  const [kpis, setKpis] = useState<CustomerKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/customers/kpis?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer KPIs');
      }

      const data = await response.json();
      setKpis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const refetch = useCallback(() => {
    fetchKpis();
  }, [fetchKpis]);

  return {
    kpis,
    loading,
    error,
    refetch
  };
}