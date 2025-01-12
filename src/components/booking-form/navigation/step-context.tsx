'use client'

import React, { createContext, useContext } from 'react'

interface StepContextType {
  currentStep: number
  setCurrentStep: (step: number) => void
  canProgress: boolean
  setCanProgress: (can: boolean) => void
  isSubmitting: boolean
  completedSteps: string[]
}

const StepContext = createContext<StepContextType | undefined>(undefined)

export function useStepContext() {
  const context = useContext(StepContext)
  if (!context) {
    throw new Error('useStepContext must be used within a StepProvider')
  }
  return context
}

interface StepProviderProps {
  currentStep: number
  setCurrentStep: (step: number) => void
  canProgress: boolean
  setCanProgress: (can: boolean) => void
  isSubmitting: boolean
  children: React.ReactNode
}

export function StepProvider({
  currentStep,
  setCurrentStep,
  canProgress,
  setCanProgress,
  isSubmitting,
  children,
}: StepProviderProps) {
  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => `step${i + 1}`)

  return (
    <StepContext.Provider value={{ 
      currentStep,
      setCurrentStep,
      canProgress,
      setCanProgress,
      isSubmitting,
      completedSteps
    }}>
      {children}
    </StepContext.Provider>
  )
}