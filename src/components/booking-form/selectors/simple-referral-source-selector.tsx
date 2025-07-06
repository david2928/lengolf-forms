'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SimpleReferralSourceSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SimpleReferralSourceSelector({
  value,
  onChange,
  disabled = false
}: SimpleReferralSourceSelectorProps) {
  const referralSources = [
    'Instagram',
    'Facebook',
    'Google',
    'TikTok',
    'Friends',
    'Mall Advertisement',
    'Other'
  ]

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select referral source" />
        </SelectTrigger>
        <SelectContent>
          {referralSources.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}