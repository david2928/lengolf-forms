import useSWR from 'swr'
import { AdminInventoryOverview } from '@/types/inventory'

const fetcher = async (url: string): Promise<AdminInventoryOverview> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }
  
  return response.json()
}

export function useAdminInventoryOverview() {
  const { data, error, mutate, isLoading } = useSWR<AdminInventoryOverview>(
    '/api/admin/inventory/overview',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      errorRetryCount: 3,
    }
  )

  return {
    data,
    isLoading,
    error,
    mutate,
  }
} 