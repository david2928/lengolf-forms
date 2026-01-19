'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check } from 'lucide-react'
import { CustomerInfoForm } from './CustomerInfoForm'
import { CustomerReferralSelector } from './CustomerReferralSelector'
import { toast } from 'sonner'

export interface CustomerSelfServiceData {
  name: string
  phone: string
  email: string
  referralSource: string
}

interface CustomerSelfServiceOverlayProps {
  isOpen: boolean
  onComplete: (data: CustomerSelfServiceData) => void
  onCancel: () => void
}

export function CustomerSelfServiceOverlay({
  isOpen,
  onComplete,
  onCancel,
}: CustomerSelfServiceOverlayProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [referralSource, setReferralSource] = useState<string | null>(null)

  // Validation states
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [referralError, setReferralError] = useState('')
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when fullscreen overlay is open
      document.body.style.overflow = 'hidden'
      // Reset form state when opening
      setName('')
      setPhone('')
      setEmail('')
      setReferralSource(null)
      setNameError('')
      setPhoneError('')
      setEmailError('')
      setReferralError('')
      setDuplicateError('')
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Validate name
  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required')
      return false
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
      return false
    }
    setNameError('')
    return true
  }

  // Normalize Thai phone number (strip +66 or 66 prefix)
  const normalizeThaiPhone = (value: string): string => {
    let digitsOnly = value.replace(/\D/g, '')
    // Handle +66 or 66 prefix (Thai country code)
    if (digitsOnly.startsWith('66') && digitsOnly.length > 10) {
      digitsOnly = '0' + digitsOnly.substring(2)
    }
    return digitsOnly
  }

  // Validate phone
  const validatePhone = (value: string): boolean => {
    const normalized = normalizeThaiPhone(value)
    if (!normalized) {
      setPhoneError('Phone number is required')
      return false
    }
    if (normalized.length < 9 || normalized.length > 10) {
      setPhoneError('Phone number must be 9-10 digits')
      return false
    }
    setPhoneError('')
    return true
  }

  // Validate email (optional but must be valid if provided)
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('')
      return true // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  // Validate referral source (required)
  const validateReferral = (value: string | null): boolean => {
    if (!value || !value.trim()) {
      setReferralError('Please select how you heard about us')
      return false
    }
    setReferralError('')
    return true
  }

  // Check for duplicate phone number
  const checkPhoneDuplicate = async (phoneNumber: string): Promise<boolean> => {
    const normalized = normalizeThaiPhone(phoneNumber)
    if (normalized.length < 6) {
      setDuplicateError('')
      return true
    }

    setIsCheckingDuplicate(true)
    try {
      const response = await fetch('/api/customers/search-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name || 'temp',
          primaryPhone: normalized,
          email: undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        const exactPhoneMatch = (data.potentialDuplicates || []).find((dup: any) =>
          dup.matchReasons &&
          dup.matchReasons.some((reason: string) => reason.includes('Phone number match'))
        )

        if (exactPhoneMatch) {
          const customer = exactPhoneMatch.customer
          setDuplicateError(`This phone number is already registered to ${customer.customer_name} (${customer.customer_code})`)
          return false
        }
      }
      setDuplicateError('')
      return true
    } catch (error) {
      console.error('Error checking phone duplicates:', error)
      setDuplicateError('')
      return true // Allow submission if check fails
    } finally {
      setIsCheckingDuplicate(false)
    }
  }

  const handleSubmit = async () => {
    // Run all validations
    const isNameValid = validateName(name)
    const isPhoneValid = validatePhone(phone)
    const isEmailValid = validateEmail(email)
    const isReferralValid = validateReferral(referralSource)

    if (!isNameValid || !isPhoneValid || !isEmailValid || !isReferralValid) {
      return
    }

    // Check for duplicate phone
    const isPhoneUnique = await checkPhoneDuplicate(phone)
    if (!isPhoneUnique) {
      return
    }

    // All validations passed - use normalized phone
    const normalizedPhone = normalizeThaiPhone(phone)
    const data: CustomerSelfServiceData = {
      name: name.trim(),
      phone: normalizedPhone,
      email: email.trim(),
      referralSource: referralSource!
    }

    onComplete(data)
  }

  if (!isOpen) return null

  const normalizedPhoneLength = normalizeThaiPhone(phone).length
  const isFormValid = name.trim().length >= 2 &&
                      normalizedPhoneLength >= 9 &&
                      normalizedPhoneLength <= 10 &&
                      !phoneError &&
                      !duplicateError &&
                      (email === '' || !emailError) &&
                      referralSource !== null &&
                      referralSource.trim() !== ''

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Compact Header - Lengolf Green */}
      <div className="flex-shrink-0 bg-[#005a32] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-1 text-white hover:bg-[#004525] -ml-2 h-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-lg font-semibold">Welcome to Lengolf!</h2>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-md mx-auto space-y-5">
          {/* Customer Info Form */}
          <CustomerInfoForm
            name={name}
            onNameChange={(value) => {
              setName(value)
              if (nameError) validateName(value)
            }}
            nameError={nameError}
            phone={phone}
            onPhoneChange={(value) => {
              setPhone(value)
              if (phoneError) validatePhone(value)
              if (duplicateError) setDuplicateError('')
            }}
            phoneError={phoneError || duplicateError}
            email={email}
            onEmailChange={(value) => {
              setEmail(value)
              if (emailError) validateEmail(value)
            }}
            emailError={emailError}
            isCheckingDuplicate={isCheckingDuplicate}
          />

          {/* Referral Source Selector */}
          <CustomerReferralSelector
            value={referralSource}
            onChange={(value) => {
              setReferralSource(value)
              if (referralError) validateReferral(value)
            }}
            error={referralError}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isCheckingDuplicate}
            className="w-full h-12 text-base font-semibold bg-[#005a32] hover:bg-[#004525] disabled:bg-gray-300"
          >
            {isCheckingDuplicate ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Done
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
