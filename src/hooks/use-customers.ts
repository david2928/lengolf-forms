import useSWR from 'swr'

export interface Customer {
  id: string;
  customer_name: string;
  contact_number: string;
  stable_hash_id: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch customers')
  const data = await res.json()
  return data as Customer[]
}

export function useCustomers() {
  const { data: customers, error, isLoading, mutate } = useSWR(
    '/api/customers',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true, // Refresh when tab becomes active
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  )

  return {
    customers: customers || [],
    isLoading,
    error,
    refresh: mutate,
  }
}