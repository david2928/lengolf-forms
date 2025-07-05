import useSWR from 'swr'
import { ProductsApiResponse, UseInventoryProductsReturn } from '@/types/inventory'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const useInventoryProducts = (): UseInventoryProductsReturn => {
  const { data, error, isLoading, mutate } = useSWR<ProductsApiResponse>(
    '/api/inventory/products',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  )

  return {
    data,
    isLoading,
    error: error || null,
    mutate
  }
} 