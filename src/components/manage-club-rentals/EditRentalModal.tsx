'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Truck,
} from 'lucide-react'

interface ClubSet {
  id: string
  name: string
  tier: 'premium' | 'premium-plus'
  gender: 'mens' | 'womens'
  brand: string | null
  model: string | null
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

interface EditableRental {
  id: string
  rental_code: string
  rental_club_set_id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  rental_type: string
  status: string
  start_date: string
  end_date: string
  start_time: string | null
  return_time: string | null
  duration_days: number | null
  rental_price: number
  add_ons: AddOn[]
  add_ons_total: number
  delivery_requested: boolean
  delivery_address: string | null
  delivery_time: string | null
  delivery_fee: number
  total_price: number
  notes: string | null
  source: string
  created_at: string
  checked_out_at: string | null
  returned_at: string | null
  rental_club_sets: {
    name: string
    tier: string
    gender: string
    brand: string | null
    model: string | null
  } | null
}

interface EditRentalModalProps {
  isOpen: boolean
  onClose: () => void
  rental: EditableRental | null
  onSuccess: (updated: EditableRental, previous: Record<string, unknown>, employeeName: string) => void
}

const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
]

const DURATION_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '7 Days' },
  { days: 14, label: '14 Days' },
]

const ADD_ON_OPTIONS = [
  { key: 'gloves', label: 'Golf Glove', price: 600 },
  { key: 'balls', label: 'Practice Balls (1 bucket)', price: 400 },
]

function getCoursePrice(set: ClubSet, days: number): number {
  if (days <= 1) return Number(set.course_price_1d)
  if (days <= 3) return Number(set.course_price_3d)
  if (days <= 7) return Number(set.course_price_7d)
  return Number(set.course_price_14d)
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function EditRentalModal({ isOpen, onClose, rental, onSuccess }: EditRentalModalProps) {
  // Form state
  const [selectedSetId, setSelectedSetId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [deliveryRequested, setDeliveryRequested] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [notes, setNotes] = useState('')
  const [employeeName, setEmployeeName] = useState('')

  // Available sets
  const [sets, setSets] = useState<ClubSet[]>([])
  const [setsLoading, setSetsLoading] = useState(false)

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when rental changes
  useEffect(() => {
    if (rental && isOpen) {
      setSelectedSetId(rental.rental_club_set_id)
      setStartDate(rental.start_date)
      setStartTime(rental.start_time ? rental.start_time.slice(0, 5) : '')
      setReturnTime(rental.return_time ? rental.return_time.slice(0, 5) : '')
      setDurationDays(rental.duration_days || 1)
      setDeliveryRequested(rental.delivery_requested)
      setDeliveryAddress(rental.delivery_address || '')
      setAddOns(rental.add_ons || [])
      setNotes(rental.notes || '')
      setEmployeeName('')
      setError(null)
    }
  }, [rental, isOpen])

  // Computed end date
  const endDate = startDate
    ? (() => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + durationDays)
        return d.toISOString().split('T')[0]
      })()
    : ''

  // Fetch available sets when dates change
  // The current rental counts against availability in the DB, so we adjust
  // the count for the original set to account for "our" slot being occupied by us.
  const fetchSets = useCallback(async () => {
    if (!startDate) return
    setSetsLoading(true)
    try {
      let url = `/api/clubs/availability?type=course&date=${startDate}&end_date=${endDate}`
      if (startTime) url += `&start_time=${startTime.slice(0, 5)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const fetchedSets = (data.sets || []) as ClubSet[]

      // Adjust availability: the current rental occupies a slot on the original set.
      // If the dates still overlap with the original rental dates, add 1 back.
      if (rental) {
        const origStart = rental.start_date
        const origEnd = rental.end_date
        const datesOverlap = startDate <= origEnd && endDate >= origStart
        if (datesOverlap) {
          const idx = fetchedSets.findIndex(s => s.id === rental.rental_club_set_id)
          if (idx !== -1) {
            fetchedSets[idx] = {
              ...fetchedSets[idx],
              available_count: fetchedSets[idx].available_count + 1,
            }
          }
        }
      }

      setSets(fetchedSets)
    } catch {
      setSets([])
    } finally {
      setSetsLoading(false)
    }
  }, [startDate, endDate, startTime, rental])

  useEffect(() => {
    if (isOpen && startDate) {
      fetchSets()
    }
  }, [fetchSets, isOpen, startDate])

  // Selected set object
  const selectedSet = sets.find(s => s.id === selectedSetId) || null

  // Price calculations
  const rentalPrice = selectedSet ? getCoursePrice(selectedSet, durationDays) : 0
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0)
  const deliveryFee = deliveryRequested ? 500 : 0
  const totalPrice = rentalPrice + addOnsTotal + deliveryFee

  const toggleAddOn = (key: string, label: string, price: number) => {
    setAddOns(prev =>
      prev.find(a => a.key === key)
        ? prev.filter(a => a.key !== key)
        : [...prev, { key, label, price }]
    )
  }

  // Availability for current set selection
  const currentSetAvailable = selectedSet
    ? selectedSet.available_count > 0 ||
      // Current rental's set is always "available" for itself
      selectedSetId === rental?.rental_club_set_id
    : false

  const canSubmit =
    employeeName &&
    selectedSetId &&
    startDate &&
    currentSetAvailable &&
    (!deliveryRequested || deliveryAddress.trim()) &&
    !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit || !rental) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/club-rentals/${rental.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_club_set_id: selectedSetId,
          start_date: startDate,
          duration_days: durationDays,
          start_time: startTime || null,
          return_time: returnTime || null,
          delivery_requested: deliveryRequested,
          delivery_address: deliveryRequested ? deliveryAddress.trim() : null,
          add_ons: addOns,
          notes: notes.trim() || null,
          employee_name: employeeName,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update rental')
        return
      }

      onSuccess(data.rental, data.previous, employeeName)
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!rental) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] sm:h-auto sm:max-w-[550px] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rental {rental.rental_code}</DialogTitle>
          <DialogDescription>
            {rental.customer_name}
            {rental.customer_phone ? ` - ${rental.customer_phone}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Club Set Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Club Set</Label>
            {setsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sets...
              </div>
            ) : sets.length === 0 ? (
              <p className="text-sm text-gray-500">No sets available</p>
            ) : (
              <div className="space-y-1.5">
                {sets.map(set => {
                  const isSelected = selectedSetId === set.id
                  const isAvailable = set.available_count > 0 || set.id === rental.rental_club_set_id

                  return (
                    <button
                      key={set.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSetId(set.id)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-green-600 bg-green-50'
                          : isAvailable
                          ? 'border-gray-200 bg-white hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn(
                          'text-xs px-1.5 py-0',
                          set.tier === 'premium-plus'
                            ? 'bg-green-800 text-white border-green-800'
                            : 'bg-green-100 text-green-800 border-green-200'
                        )}>
                          {set.tier === 'premium-plus' ? 'Premium+' : 'Premium'}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                          {set.gender === 'mens' ? "Men's" : "Women's"}
                        </Badge>
                        <span className="text-sm text-gray-700">
                          {set.name.includes(' - ') ? set.name.split(' - ').slice(1).join(' - ') : set.name}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dates & Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Dates & Duration</Label>
            <div>
              <Label htmlFor="edit-start-date" className="text-xs text-gray-500">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-0.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-start-time" className="text-xs text-gray-500">Pickup Time</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  step="3600"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="mt-0.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-return-time" className="text-xs text-gray-500">Return Time</Label>
                <Input
                  id="edit-return-time"
                  type="time"
                  step="3600"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="mt-0.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Duration</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-0.5">
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
                    <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                    {selectedSet && (
                      <p className="text-xs font-bold text-green-700 mt-0.5">
                        &#3647;{getCoursePrice(selectedSet, opt.days).toLocaleString()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {startDate && endDate && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                {formatDateShort(startDate)}
                {startTime && ` ${startTime}`}
                {' \u2192 '}
                {formatDateShort(endDate)}
                {returnTime && ` ${returnTime}`}
                {' '}({durationDays} {durationDays === 1 ? 'day' : 'days'})
              </div>
            )}
          </div>

          {/* Delivery & Add-ons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Delivery & Add-ons</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryRequested(false)}
                className={cn(
                  'p-2.5 rounded-lg border-2 text-left transition-all',
                  !deliveryRequested ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <MapPin className="h-4 w-4 text-green-600 mb-0.5" />
                <p className="text-sm font-medium text-gray-900">Pickup</p>
                <p className="text-xs text-green-700 font-bold">Free</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryRequested(true)}
                className={cn(
                  'p-2.5 rounded-lg border-2 text-left transition-all',
                  deliveryRequested ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Truck className="h-4 w-4 text-green-600 mb-0.5" />
                <p className="text-sm font-medium text-gray-900">Delivery</p>
                <p className="text-xs text-green-700 font-bold">&#3647;500</p>
              </button>
            </div>

            {deliveryRequested && (
              <div>
                <Label htmlFor="edit-delivery-address" className="text-xs text-gray-500">Delivery Address</Label>
                <Textarea
                  id="edit-delivery-address"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Hotel name, street address..."
                  rows={2}
                  className="mt-0.5"
                />
              </div>
            )}

            {ADD_ON_OPTIONS.length > 0 && (
              <div className="space-y-1.5">
                {ADD_ON_OPTIONS.map(item => {
                  const isSelected = addOns.some(a => a.key === item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleAddOn(item.key, item.label, item.price)}
                      className={cn(
                        'w-full p-2.5 rounded-lg border-2 text-left transition-all flex items-center justify-between',
                        isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-sm text-gray-900">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-700">&#3647;{item.price.toLocaleString()}</span>
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
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Left-handed, specific requests, etc."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Price Summary */}
          {selectedSet && (
            <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Club rental ({durationDays}d)</span>
                <span>&#3647;{rentalPrice.toLocaleString()}</span>
              </div>
              {deliveryRequested && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span>&#3647;{deliveryFee.toLocaleString()}</span>
                </div>
              )}
              {addOns.map(a => (
                <div key={a.key} className="flex justify-between">
                  <span className="text-gray-600">{a.label}</span>
                  <span>&#3647;{a.price.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                <span className="text-gray-800">Total</span>
                <span className="text-green-700">&#3647;{totalPrice.toLocaleString()}</span>
              </div>
              {totalPrice !== Number(rental.total_price) && (
                <div className="text-xs text-gray-400 text-right">
                  was &#3647;{Number(rental.total_price).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Employee */}
          <div>
            <Label className="text-sm font-medium">Modified By</Label>
            <Select value={employeeName} onValueChange={setEmployeeName}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select your name (required)" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEES_LIST.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
