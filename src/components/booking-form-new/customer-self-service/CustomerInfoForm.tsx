'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Phone, Mail, Loader2 } from 'lucide-react'

interface CustomerInfoFormProps {
  name: string
  onNameChange: (value: string) => void
  nameError?: string
  phone: string
  onPhoneChange: (value: string) => void
  phoneError?: string
  email: string
  onEmailChange: (value: string) => void
  emailError?: string
  isCheckingDuplicate?: boolean
}

export function CustomerInfoForm({
  name,
  onNameChange,
  nameError,
  phone,
  onPhoneChange,
  phoneError,
  email,
  onEmailChange,
  emailError,
  isCheckingDuplicate = false
}: CustomerInfoFormProps) {
  return (
    <div className="space-y-4">
      {/* Name Field */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-name" className="text-sm font-medium flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-[#005a32]" />
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="customer-name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`h-11 text-base px-3 ${nameError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#005a32]'}`}
          autoComplete="name"
          autoCapitalize="words"
        />
        {nameError && (
          <p className="text-xs text-red-500">{nameError}</p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-phone" className="text-sm font-medium flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-[#005a32]" />
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="customer-phone"
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className={`h-11 text-base px-3 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#005a32]'}`}
            autoComplete="tel"
            inputMode="numeric"
          />
          {isCheckingDuplicate && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
        {phoneError && (
          <p className="text-xs text-red-500">{phoneError}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-email" className="text-sm font-medium flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-[#005a32]" />
          Email <span className="text-gray-400 text-xs font-normal">(Optional)</span>
        </Label>
        <Input
          id="customer-email"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={`h-11 text-base px-3 ${emailError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#005a32]'}`}
          autoComplete="email"
          inputMode="email"
        />
        {emailError && (
          <p className="text-xs text-red-500">{emailError}</p>
        )}
      </div>
    </div>
  )
}
