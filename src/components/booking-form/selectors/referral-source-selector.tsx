'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Instagram, Facebook, Search, Music, Users, MapPin, PenSquare } from "lucide-react"

interface ReferralSourceSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function ReferralSourceSelector({
  value,
  onChange,
  error,
  disabled = false
}: ReferralSourceSelectorProps) {
  const [otherText, setOtherText] = useState('')

  const referralSources = [
    { value: 'Instagram', label: 'Instagram', icon: Instagram },
    { value: 'Facebook', label: 'Facebook', icon: Facebook },
    { value: 'Google', label: 'Google', icon: Search },
    { value: 'TikTok', label: 'TikTok', icon: Music },
    { value: 'Friends', label: 'Friends', icon: Users },
    { value: 'Mall Advertisement', label: 'Mall Advertisement', icon: MapPin },
  ]

  return (
    <div className="space-y-3">
      <Label className="text-base">Where did they hear about us?</Label>
      <RadioGroup value={value || ''} onValueChange={disabled ? undefined : onChange}>
        <div className="grid gap-3">
          {referralSources.map((source) => {
            const Icon = source.icon
            return (
              <label
                key={source.value}
                className={disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                htmlFor={`referral-${source.value.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`flex items-center rounded-lg border p-3 ${disabled ? '' : 'hover:bg-accent'}`}>
                  <RadioGroupItem
                    value={source.value}
                    id={`referral-${source.value.toLowerCase().replace(/\s+/g, '-')}`}
                    className="mr-3"
                    disabled={disabled}
                  />
                  <div className="flex items-center flex-grow gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="block">
                      {source.label}
                    </span>
                  </div>
                </div>
              </label>
            )
          })}
          
          {/* Other Option */}
          <div className={`flex items-center rounded-lg border p-3 ${disabled ? 'opacity-50' : ''}`}>
            <RadioGroupItem 
              value="other" 
              id="referral-other"
              className="mr-3"
              checked={value === otherText}
              disabled={disabled}
            />
            <PenSquare className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Other referral source..."
              value={otherText}
              onChange={(e) => {
                setOtherText(e.target.value)
                if (e.target.value) {
                  onChange(e.target.value)
                }
              }}
              className="flex-grow border-0 focus-visible:ring-0 p-0"
              onClick={(e) => e.stopPropagation()}
              disabled={disabled}
            />
          </div>
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}