'use client'

import { useEffect, useState } from 'react'
import { refacSupabase } from '@/lib/refac-supabase'
import type { Customer } from '@/types/package-form'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error } = await refacSupabase
          .schema('backoffice')
          .from('customers')
          .select('*')
          .order('customer_name')

        if (error) {
          throw error
        }

        setCustomers(data || [])
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch customers'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  const refetchCustomers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await refacSupabase
        .schema('backoffice')
        .from('customers')
        .select('*')
        .order('customer_name')

      if (error) {
        throw error
      }

      setCustomers(data || [])
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch customers'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    customers,
    isLoading,
    error,
    refetchCustomers
  }
}