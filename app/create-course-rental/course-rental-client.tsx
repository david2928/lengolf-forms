'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Truck,
  Calendar,
  Package,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { EnhancedEmployeeSelector } from '@/components/booking-form-new/selectors/enhanced-employee-selector'
import { EnhancedCustomerTypeSelector } from '@/components/booking-form-new/selectors/enhanced-customer-type-selector'
import { CustomerDetails } from '@/components/booking-form-new/customer-details'

interface ClubSet {
  id: string
  name: string
  slug: string
  tier: 'premium' | 'premium-plus'
  gender: 'mens' | 'womens'
  brand: string | null
  model: string | null
  specifications: string[]
  course_price_1d: number
  course_price_3d: number
  course_price_7d: number
  course_price_14d: number
  available_count: number
}

interface AddOn {
  key: string
  label: string
  price: number
}

const DURATION_OPTIONS = [
  { days: 1, label: '1 Day', description: 'Single round' },
  { days: 3, label: '3 Days', description: 'Weekend trip' },
  { days: 7, label: '7 Days', description: 'Full week' },
  { days: 14, label: '14 Days', description: 'Extended stay' },
]

const ADD_ON_OPTIONS = [
  { key: 'gloves', label: 'Golf Gloves', price: 600, description: 'Premium leather gloves' },
  { key: 'balls', label: 'Golf Balls (6-pack)', price: 400, description: 'Pro V1 quality balls' },
]

function getCoursePrice(set: ClubSet, days: number): number {
  if (days <= 1) return Number(set.course_price_1d)
  if (days <= 3) return Number(set.course_price_3d)
  if (days <= 7) return Number(set.course_price_7d)
  return Number(set.course_price_14d)
}

// Customer type matching booking form
interface NewCustomer {
  id: string
  customer_code: string
  customer_name: string
  contact_number?: string
  email?: string
  preferred_contact_method?: 'Phone' | 'LINE' | 'Email'
  customer_status: string
  lifetime_spending: string
  total_bookings: number
  last_visit_date?: string
  stable_hash_id?: string
}

export function CourseRentalClient() {
  // Staff selection
  const [employeeName, setEmployeeName] = useState<string | null>(null)

  // Club set selection
  const [sets, setSets] = useState<ClubSet[]>([])
  const [setsLoading, setSetsLoading] = useState(true)
  const [selectedSet, setSelectedSet] = useState<ClubSet | null>(null)

  // Dates & Time
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [durationDays, setDurationDays] = useState(1)

  // Delivery
  const [deliveryRequested, setDeliveryRequested] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')

  // Add-ons
  const [addOns, setAddOns] = useState<AddOn[]>([])

  // Customer (reusing booking form pattern)
  const [isNewCustomer, setIsNewCustomer] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerCache, setSelectedCustomerCache] = useState<NewCustomer | null>(null)
  const [phoneError, setPhoneError] = useState<string>('')

  // SWR customer fetch (same pattern as booking form)
  const searchUrl = searchQuery.length >= 2
    ? `/api/customers?search=${encodeURIComponent(searchQuery)}&limit=100`
    : '/api/customers?limit=100&sortBy=lastVisit&sortOrder=desc'

  const { data: customersResponse } = useSWR<{ customers: NewCustomer[] }>(
    searchUrl,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch customers')
      return response.json()
    }
  )

  const customers = customersResponse?.customers || []

  const handleCustomerSelect = (customer: NewCustomer) => {
    setSelectedCustomerCache(customer)
    setCustomerId(customer.id)
    setCustomerName(customer.customer_name)
    setCustomerPhone(customer.contact_number || '')
    setCustomerEmail(customer.email || '')
  }

  const handleSelfServiceCustomerCreated = (customer: NewCustomer, _referralSource: string) => {
    setSelectedCustomerCache(customer)
    setIsNewCustomer(false)
    setCustomerId(customer.id)
    setCustomerName(customer.customer_name)
    setCustomerPhone(customer.contact_number || '')
    setCustomerEmail(customer.email || '')
  }

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rentalCode, setRentalCode] = useState('')
  const [error, setError] = useState('')

  // Computed
  const endDate = startDate
    ? (() => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + durationDays)
        return d.toISOString().split('T')[0]
      })()
    : ''

  const rentalPrice = selectedSet ? getCoursePrice(selectedSet, durationDays) : 0
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0)
  const deliveryFee = deliveryRequested ? 500 : 0
  const totalPrice = rentalPrice + addOnsTotal + deliveryFee

  const [todayStr] = useState(() => new Date().toISOString().split('T')[0])

  // Fetch available sets
  const fetchSets = useCallback(async () => {
    setSetsLoading(true)
    try {
      const dateParam = startDate || todayStr
      const ed = startDate ? endDate : dateParam
      let url = `/api/clubs/availability?type=course&date=${dateParam}&end_date=${ed}`
      if (startTime) url += `&start_time=${startTime}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSets(data.sets || [])
    } catch {
      setSets([])
    } finally {
      setSetsLoading(false)
    }
  }, [startDate, endDate, startTime, todayStr])

  useEffect(() => {
    fetchSets()
  }, [fetchSets])

  const toggleAddOn = (key: string, label: string, price: number) => {
    setAddOns(prev =>
      prev.find(a => a.key === key)
        ? prev.filter(a => a.key !== key)
        : [...prev, { key, label, price }]
    )
  }

  const canSubmit =
    employeeName &&
    selectedSet &&
    startDate &&
    customerName.trim() &&
    customerPhone.trim() &&
    (!deliveryRequested || deliveryAddress.trim()) &&
    (sets.find(s => s.id === selectedSet.id)?.available_count ?? 0) > 0

  const handleSubmit = async () => {
    if (!canSubmit || !selectedSet) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/clubs/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_club_set_id: selectedSet.id,
          rental_type: 'course',
          start_date: startDate,
          start_time: startTime || undefined,
          end_date: endDate,
          duration_days: durationDays,
          customer_id: customerId || undefined,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim(),
          add_ons: addOns,
          delivery_requested: deliveryRequested,
          delivery_address: deliveryRequested ? deliveryAddress.trim() : undefined,
          notes: notes.trim() || undefined,
          source: 'staff',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create reservation')
        return
      }

      setRentalCode(data.rental_code)

      // Send LINE notification (non-blocking)
      try {
        const dateDisplay = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const endDateDisplay = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const pickupDisplay = startTime ? ` ${startTime}` : ''
        const returnDisplay = returnTime ? ` ${returnTime}` : pickupDisplay

        let lineMessage = `Club Rental Booking (${data.rental_code})`
        lineMessage += `\nSet: ${selectedSet.name}`
        lineMessage += `\nDates: ${dateDisplay}${pickupDisplay} → ${endDateDisplay}${returnDisplay} (${durationDays}d)`
        lineMessage += `\n${deliveryRequested ? `Delivery: ${deliveryAddress.trim()}` : 'Pickup at LENGOLF'}`
        lineMessage += `\nCustomer: ${customerName.trim()}`
        lineMessage += `\nPhone: ${customerPhone.trim()}`
        if (addOns.length > 0) {
          lineMessage += `\nAdd-ons: ${addOns.map(a => a.label).join(', ')}`
        }
        lineMessage += `\nTotal: ฿${totalPrice.toLocaleString()}`
        lineMessage += `\nCreated by: ${employeeName}`

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: lineMessage }),
        })
      } catch (notifyErr) {
        console.warn('[CourseRental] LINE notification failed (non-blocking):', notifyErr)
      }

      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setEmployeeName(null)
    setSelectedSet(null)
    setStartDate('')
    setStartTime('')
    setReturnTime('')
    setDurationDays(1)
    setDeliveryRequested(false)
    setDeliveryAddress('')
    setAddOns([])
    setIsNewCustomer(null)
    setCustomerId(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setNotes('')
    setSearchQuery('')
    setSelectedCustomerCache(null)
    setPhoneError('')
    setSubmitted(false)
    setRentalCode('')
    setError('')
    fetchSets()
  }

  // Success state
  if (submitted) {
    return (
      <div className="w-full">
        <div className="px-3 sm:px-4 text-center mb-6 sm:mb-8 py-3 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold">Course Club Rental</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Rental created successfully
          </p>
        </div>
        <div className="container mx-auto max-w-2xl px-4">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Course Rental Created</h2>
                <p className="text-sm text-gray-500">Rental code</p>
                <p className="text-2xl font-bold text-green-700 font-mono tracking-wider mt-1">{rentalCode}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Club Set</span>
                  <span className="font-medium text-gray-900">{selectedSet?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates</span>
                  <span className="font-medium text-gray-900">
                    {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {startTime && ` ${startTime}`}
                    {durationDays > 1 && ` - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${startTime ? ` ${startTime}` : ''}`}
                    {' '}({durationDays}d)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{deliveryRequested ? 'Delivery' : 'Pickup'}</span>
                  <span className="font-medium text-gray-900">
                    {deliveryRequested ? 'Delivery' : 'Pickup at LENGOLF'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-green-700">฿{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={handleReset} className="w-full">
                Create Another Rental
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="px-3 sm:px-4 text-center mb-6 sm:mb-8 py-3 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold">Create Course Rental</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Book clubs for on-course use (not linked to a bay booking)
        </p>
      </div>

      <div className="container mx-auto max-w-2xl px-4 space-y-4">
        {/* Section 1: Staff Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedEmployeeSelector
              value={employeeName}
              onChange={setEmployeeName}
            />
          </CardContent>
        </Card>

        {/* Section 2: Club Set Selection */}
        {employeeName && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Club Set
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {setsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available sets...
              </div>
            ) : sets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No club sets available</p>
            ) : (
              <div className="space-y-2">
                {sets.map(set => {
                  const isSelected = selectedSet?.id === set.id
                  const isAvailable = set.available_count > 0
                  const price1d = getCoursePrice(set, 1)
                  const tierColor = set.tier === 'premium-plus'
                    ? { bg: 'bg-green-50', border: 'border-green-800' }
                    : { bg: 'bg-green-50', border: 'border-green-200' }

                  return (
                    <button
                      key={set.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSet(isSelected ? null : set)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border-2 transition-all',
                        isSelected
                          ? `${tierColor.border} ${tierColor.bg} shadow-sm`
                          : isAvailable
                          ? 'border-gray-200 bg-white hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="outline" className={cn(
                              'text-xs px-1.5 py-0',
                              set.tier === 'premium-plus' ? 'bg-green-800 text-white border-green-800' : 'bg-green-100 text-green-800 border-green-200'
                            )}>
                              {set.tier === 'premium-plus' ? 'Premium+' : 'Premium'}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                              {set.gender === 'mens' ? "Men's" : "Women's"}
                            </Badge>
                            {!isAvailable && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm text-gray-900 truncate">{set.name}</p>
                          {set.brand && (
                            <p className="text-xs text-gray-500">{set.brand} {set.model || ''}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-700">฿{price1d.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">per day</p>
                        </div>
                      </div>

                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Section 3: Dates & Duration */}
        {employeeName && selectedSet && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates & Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  min={todayStr}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-time">Pickup Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    step="3600"
                    value={startTime}
                    onChange={e => {
                      setStartTime(e.target.value)
                      if (!returnTime) setReturnTime(e.target.value)
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="return-time">Return Time</Label>
                  <Input
                    id="return-time"
                    type="time"
                    step="3600"
                    value={returnTime}
                    onChange={e => setReturnTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Duration</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDurationDays(opt.days)}
                      className={cn(
                        'p-2 rounded-lg border-2 text-center transition-all',
                        durationDays === opt.days
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs font-bold text-green-700 mt-0.5">
                        ฿{getCoursePrice(selectedSet, opt.days).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {startDate && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                  {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {startTime && ` ${startTime}`}
                  {' '}&rarr;{' '}
                  {new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {returnTime && ` ${returnTime}`}
                  {' '}({durationDays} {durationDays === 1 ? 'day' : 'days'})
                </div>
              )}

              {startDate && (() => {
                const match = sets.find(s => s.id === selectedSet.id)
                if (match && match.available_count <= 0) {
                  return (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                      This set is not available for the selected dates.
                    </div>
                  )
                }
                return null
              })()}
            </CardContent>
          </Card>
        )}

        {/* Section 4: Delivery & Add-ons */}
        {employeeName && selectedSet && startDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Delivery & Add-ons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryRequested(false)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    !deliveryRequested
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <MapPin className="h-4 w-4 text-green-600 mb-1" />
                  <p className="text-sm font-medium text-gray-900">Pickup</p>
                  <p className="text-xs text-gray-500">At LENGOLF</p>
                  <p className="text-xs font-bold text-green-700 mt-1">Free</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryRequested(true)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    deliveryRequested
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Truck className="h-4 w-4 text-green-600 mb-1" />
                  <p className="text-sm font-medium text-gray-900">Delivery</p>
                  <p className="text-xs text-gray-500">Hotel/location</p>
                  <p className="text-xs font-bold text-green-700 mt-1">฿500</p>
                </button>
              </div>

              {deliveryRequested && (
                <div>
                  <Label htmlFor="delivery-address">Delivery Address</Label>
                  <Textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Hotel name, street address..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              )}

              {ADD_ON_OPTIONS.length > 0 && (
                <div>
                  <Label className="mb-2 block">Optional Add-ons</Label>
                  <div className="space-y-2">
                    {ADD_ON_OPTIONS.map(item => {
                      const isSelected = addOns.some(a => a.key === item.key)
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleAddOn(item.key, item.label, item.price)}
                          className={cn(
                            'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between',
                            isSelected
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-700">฿{item.price.toLocaleString()}</span>
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center',
                              isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                            )}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Customer */}
        {employeeName && selectedSet && startDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EnhancedCustomerTypeSelector
                value={isNewCustomer}
                onChange={(value) => {
                  setIsNewCustomer(value)
                  setSelectedCustomerCache(null)
                  setCustomerId(null)
                  setCustomerName('')
                  setCustomerPhone('')
                  setCustomerEmail('')
                }}
              />

              {isNewCustomer !== null && (
                <CustomerDetails
                  isNewCustomer={isNewCustomer}
                  customers={customers}
                  selectedCustomerId={customerId || ''}
                  onCustomerSelect={handleCustomerSelect}
                  customerName={customerName}
                  onCustomerNameChange={setCustomerName}
                  phoneNumber={customerPhone}
                  onPhoneNumberChange={setCustomerPhone}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedCustomerCache={selectedCustomerCache}
                  onPhoneError={setPhoneError}
                  customerEmail={customerEmail}
                  onCustomerEmailChange={setCustomerEmail}
                  onSelfServiceCustomerCreated={handleSelfServiceCustomerCreated}
                />
              )}

              {/* Notes field */}
              {(isNewCustomer !== null && customerName.trim()) && (
                <div>
                  <Label htmlFor="notes" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Left-handed, specific requests, etc."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 6: Summary & Submit */}
        {employeeName && selectedSet && startDate && customerName.trim() && customerPhone.trim() && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Club Set</span>
                  <span className="font-medium text-gray-900">{selectedSet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period</span>
                  <span className="font-medium text-gray-900 text-right">
                    {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {startTime && ` ${startTime}`}
                    {' → '}
                    {new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {returnTime && ` ${returnTime}`}
                    {' '}({durationDays}d)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{deliveryRequested ? 'Delivery' : 'Pickup'}</span>
                  <span className="font-medium text-gray-900 text-right">
                    {deliveryRequested ? `Delivery (฿500)` : 'At LENGOLF (Free)'}
                  </span>
                </div>
                {deliveryRequested && deliveryAddress.trim() && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{deliveryAddress.trim()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900">{customerName}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Club rental ({durationDays}d)</span>
                  <span>฿{rentalPrice.toLocaleString()}</span>
                </div>
                {deliveryRequested && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span>฿{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                {addOns.map(a => (
                  <div key={a.key} className="flex justify-between">
                    <span className="text-gray-600">{a.label}</span>
                    <span>฿{a.price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                  <span className="text-gray-800">Total</span>
                  <span className="text-green-700">฿{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Rental...
                  </>
                ) : (
                  <>
                    Create Course Rental
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
