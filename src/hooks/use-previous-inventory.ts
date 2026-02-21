import useSWR from 'swr'

interface PreviousInventoryResponse {
  previousValues: Record<string, number>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const usePreviousInventory = () => {
  const today = new Date().toISOString().split('T')[0]

  const { data, error, isLoading } = useSWR<PreviousInventoryResponse>(
    `/api/inventory/submissions/previous?date=${today}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    }
  )

  return {
    previousValues: data?.previousValues ?? {},
    isLoading,
    error: error || null,
  }
}
