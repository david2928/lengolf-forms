'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { 
  MessageCircle, 
  PersonStanding, 
  Phone, 
  MessageSquare, 
  Instagram,
  Globe,
  Dumbbell,
  PenSquare
} from "lucide-react"

interface ContactMethodSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function ContactMethodSelector({
  value,
  onChange,
  error
}: ContactMethodSelectorProps) {
  const [otherMethod, setOtherMethod] = useState('')

  const contactMethods = [
    { value: 'LINE', label: 'LINE', icon: MessageCircle },
    { value: 'Walk-in', label: 'Walk-in', icon: PersonStanding },
    { value: 'Phone', label: 'Phone', icon: Phone },
    { value: 'Whatsapp', label: 'Whatsapp', icon: MessageSquare },
    { value: 'Instagram/Facebook', label: 'Instagram/Facebook', icon: Instagram },
    { value: 'Website / ResOS', label: 'Website / ResOS', icon: Globe },
    { value: 'ClassPass', label: 'ClassPass', icon: Dumbbell },
  ]

  return (
    <div className="space-y-3">
      <Label className="text-base">Customer Contacted Via</Label>
      <RadioGroup value={value || ''} onValueChange={onChange}>
        <div className="grid gap-3">
          {contactMethods.map((method) => {
            const Icon = method.icon
            return (
              <label
                key={method.value}
                className="cursor-pointer"
                htmlFor={`contact-${method.value.toLowerCase()}`}
              >
                <div className="flex items-center rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem
                    value={method.value}
                    id={`contact-${method.value.toLowerCase()}`}
                    className="mr-3"
                  />
                  <div className="flex items-center flex-grow gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="block">
                      {method.label}
                    </span>
                  </div>
                </div>
              </label>
            )
          })}
          
          {/* Other Option */}
          <div className="flex items-center rounded-lg border p-3">
            <RadioGroupItem 
              value="other" 
              id="contact-other"
              className="mr-3"
              checked={value === otherMethod}
            />
            <PenSquare className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Other method..."
              value={otherMethod}
              onChange={(e) => {
                setOtherMethod(e.target.value)
                if (e.target.value) {
                  onChange(e.target.value)
                }
              }}
              className="flex-grow border-0 focus-visible:ring-0 p-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}