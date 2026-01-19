'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Instagram, Facebook, Search, Music, Users, MapPin, PenSquare, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerReferralSelectorProps {
  value: string | null
  onChange: (value: string | null) => void
  error?: string
}

const referralSources = [
  { value: 'Instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { value: 'Facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { value: 'Google', label: 'Google', icon: Search, color: 'bg-red-500' },
  { value: 'TikTok', label: 'TikTok', icon: Music, color: 'bg-black' },
  { value: 'Friends', label: 'Friends', icon: Users, color: 'bg-[#005a32]' },
  { value: 'Mall Advertisement', label: 'Mall Ad', icon: MapPin, color: 'bg-orange-500' },
]

export function CustomerReferralSelector({
  value,
  onChange,
  error
}: CustomerReferralSelectorProps) {
  const [showOther, setShowOther] = useState(false)
  const [otherText, setOtherText] = useState('')

  // Check if current value is a predefined source or "other"
  const isPredefined = referralSources.some(s => s.value === value)
  const isOtherSelected = value && !isPredefined

  const handleSourceSelect = (sourceValue: string) => {
    setShowOther(false)
    setOtherText('')
    onChange(sourceValue === value ? null : sourceValue)
  }

  const handleOtherClick = () => {
    setShowOther(true)
    onChange(null)
  }

  const handleOtherTextChange = (text: string) => {
    setOtherText(text)
    if (text.trim()) {
      onChange(text.trim())
    } else {
      onChange(null)
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 text-[#005a32]" />
        How did you hear about us? <span className="text-red-500">*</span>
      </Label>

      {/* Card Grid - Compact */}
      <div className="grid grid-cols-3 gap-2">
        {referralSources.map((source) => {
          const Icon = source.icon
          const isSelected = value === source.value
          return (
            <button
              key={source.value}
              type="button"
              onClick={() => handleSourceSelect(source.value)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 min-h-[76px]',
                isSelected
                  ? 'border-[#005a32] bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center mb-1.5',
                source.color
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className={cn(
                'text-xs font-medium text-center leading-tight',
                isSelected ? 'text-[#005a32]' : 'text-gray-700'
              )}>
                {source.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Other Option */}
      <div>
        {!showOther && !isOtherSelected ? (
          <button
            type="button"
            onClick={handleOtherClick}
            className={cn(
              'w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all',
              'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            )}
          >
            <PenSquare className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Other</span>
          </button>
        ) : (
          <div className={cn(
            'p-3 rounded-lg border-2 transition-all',
            isOtherSelected
              ? 'border-[#005a32] bg-green-50'
              : 'border-gray-200 bg-white'
          )}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                <PenSquare className="h-4 w-4 text-white" />
              </div>
              <Input
                type="text"
                placeholder="Please specify..."
                value={isOtherSelected ? (value || '') : otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                className="flex-1 h-9 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
                autoFocus={showOther}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
