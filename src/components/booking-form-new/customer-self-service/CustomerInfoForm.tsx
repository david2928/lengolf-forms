'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Phone, Mail, Loader2 } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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

      {/* Phone Field with Country Code Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="customer-phone" className="text-sm font-medium flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-[#005a32]" />
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <PhoneInput
            international
            defaultCountry="TH"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(value) => onPhoneChange(value || '')}
            className={`phone-input-custom h-11 text-base ${phoneError ? 'phone-input-error' : ''}`}
          />
          {isCheckingDuplicate && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
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

      {/* Custom styles for PhoneInput */}
      <style jsx global>{`
        .phone-input-custom {
          display: flex;
          align-items: center;
          border: 1px solid hsl(var(--input));
          border-radius: calc(var(--radius) - 2px);
          background-color: transparent;
          padding: 0 12px;
        }

        .phone-input-custom:focus-within {
          outline: none;
          ring: 2px;
          ring-color: #005a32;
          border-color: #005a32;
          box-shadow: 0 0 0 2px rgba(0, 90, 50, 0.2);
        }

        .phone-input-error {
          border-color: rgb(239 68 68) !important;
        }

        .phone-input-error:focus-within {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
        }

        .phone-input-custom .PhoneInputCountry {
          margin-right: 8px;
        }

        .phone-input-custom .PhoneInputCountrySelect {
          padding: 4px;
          border: none;
          background: transparent;
        }

        .phone-input-custom .PhoneInputCountrySelect:focus {
          outline: none;
        }

        .phone-input-custom .PhoneInputInput {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1rem;
          line-height: 1.5;
          padding: 0;
          height: 100%;
        }

        .phone-input-custom .PhoneInputInput:focus {
          outline: none;
        }

        .phone-input-custom .PhoneInputInput::placeholder {
          color: hsl(var(--muted-foreground));
          opacity: 0.7;
        }

        .phone-input-custom .PhoneInputCountryIcon {
          width: 24px;
          height: 18px;
        }

        .phone-input-custom .PhoneInputCountryIconImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}
