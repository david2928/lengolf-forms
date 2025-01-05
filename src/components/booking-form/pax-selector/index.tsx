'use client'

import { Label } from '@/components/ui/label'

interface PaxSelectorProps {
  value: number | null
  onChange: (value: number) => void
  error?: string
}

export function PaxSelector({ value, onChange, error }: PaxSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Number of People</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            onClick={() => onChange(number)}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${value === number 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            type="button"
          >
            {number}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}