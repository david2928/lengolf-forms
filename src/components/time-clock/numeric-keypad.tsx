'use client'

import { Button } from '@/components/ui/button'
import { Delete } from 'lucide-react'

interface NumericKeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  onClear: () => void
  disabled?: boolean
}

export function NumericKeypad({ onDigit, onBackspace, onClear, disabled = false }: NumericKeypadProps) {
  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['Clear', '0', 'Back']
  ]

  const handleButtonClick = (value: string) => {
    if (disabled) return
    
    if (value === 'Back') {
      onBackspace()
    } else if (value === 'Clear') {
      onClear()
    } else {
      onDigit(value)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {digits.flat().map((value, index) => {
        const isSpecial = value === 'Clear' || value === 'Back'
        const isZero = value === '0'
        
        return (
          <Button
            key={index}
            onClick={() => handleButtonClick(value)}
            disabled={disabled}
            variant={isSpecial ? "outline" : "default"}
            size="lg"
            className={`
              h-14 text-lg font-semibold
              ${isSpecial ? 'col-span-1' : ''}
              ${isZero ? 'col-span-1' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              hover:scale-105 active:scale-95 transition-transform
            `}
          >
            {value === 'Back' ? (
              <Delete className="h-5 w-5" />
            ) : (
              value
            )}
          </Button>
        )
      })}
    </div>
  )
} 