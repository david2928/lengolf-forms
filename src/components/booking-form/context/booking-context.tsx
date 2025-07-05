'use client'

import React, { createContext, useReducer, ReactNode } from 'react'
import type { BookingFormData } from '@/types/booking-form'

interface BookingContextState {
  formData: Partial<BookingFormData>
  errors: Record<string, string | undefined>
}

type BookingContextAction = 
  | { type: 'SET_FIELD'; field: keyof BookingFormData; value: any }
  | { type: 'SET_ERROR'; field: string; error: string | undefined }
  | { type: 'RESET_FORM' }

interface BookingContextType extends BookingContextState {
  onValueChange: <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => void
  setError: (field: string, error: string | undefined) => void
  resetForm: () => void
}

const initialState: BookingContextState = {
  formData: {
    numberOfPax: 1,
    isNewCustomer: false
  },
  errors: {}
}

function bookingReducer(state: BookingContextState, action: BookingContextAction): BookingContextState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value
        }
      }
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: action.error
        }
      }
    case 'RESET_FORM':
      return initialState
    default:
      return state
  }
}

export const BookingContext = createContext<BookingContextType | undefined>(undefined)

interface BookingProviderProps {
  children: ReactNode
}

export function BookingProvider({ children }: BookingProviderProps) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)

  const onValueChange = <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
    dispatch({ type: 'SET_FIELD', field, value })
    // Clear error when field is updated
    dispatch({ type: 'SET_ERROR', field, error: undefined })
  }

  const setError = (field: string, error: string | undefined) => {
    dispatch({ type: 'SET_ERROR', field, error })
  }

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' })
  }

  const value = {
    ...state,
    onValueChange,
    setError,
    resetForm
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}