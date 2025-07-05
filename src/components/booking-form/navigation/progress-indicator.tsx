'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface StepInfo {
  title: string
  description: string
  status: 'complete' | 'current' | 'upcoming'
}

interface ProgressIndicatorProps {
  steps: StepInfo[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={cn(
                "flex flex-col items-center",
                step.status === 'complete' && "text-primary",
                step.status === 'current' && "text-primary",
                step.status === 'upcoming' && "text-muted-foreground"
              )}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background transition-colors",
                  step.status === 'complete' && "border-primary",
                  step.status === 'current' && "border-primary border-dashed",
                  step.status === 'upcoming' && "border-gray-300"
                )}
              >
                {step.status === 'complete' ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Title & Description */}
              <div className="mt-2 text-center">
                <div className="text-xs font-medium sm:text-sm whitespace-nowrap">{step.title}</div>
                <div className="hidden text-xs text-muted-foreground sm:block">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}