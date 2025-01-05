'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Customer } from '@/types/package-form'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error } = await supabase
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
  }, [supabase])

  const refetchCustomers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
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