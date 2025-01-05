'use client'

import { useStepContext } from '../navigation/step-context'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Customer Info' },
  { id: 2, title: 'Booking Details' },
  { id: 3, title: 'Time & Bay' },
]

export default function StepHeader() {
  const { currentStep, completedSteps } = useStepContext()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = completedSteps.includes(`step${step.id}`)
          
          return (
            <div key={step.id} className="space-y-2">
              <div className="relative">
                <div
                  className={cn(
                    'h-2 w-full rounded-full',
                    isActive ? 'bg-primary' : isCompleted ? 'bg-primary/70' : 'bg-muted'
                  )}
                />
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute right-0 top-1/2 h-0.5 w-8 -translate-y-1/2 translate-x-4',
                      isCompleted ? 'bg-primary/70' : 'bg-muted'
                    )}
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-primary/70 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}