import useSWR from 'swr'

interface PreviousInventoryResponse {
  previousValues: Record<string, number>
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch previous inventory values')
  }
  return res.json()
}

export const usePreviousInventory = () => {
  // Use Bangkok timezone to avoid wrong date during early morning hours
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

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
