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
  customer_id?: string | null
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
  onSuccess: (updated: EditableRental, previous: Record<string, unknown>, employeeName: string, newRentalCodes?: { setName: string; code: string }[]) => void
}

const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
]

const ADD_ON_OPTIONS = [
  { key: 'gloves', label: 'Golf Glove', price: 600 },
  { key: 'balls', label: 'Golf Balls (6-pack)', price: 400 },
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
  // Form state — multi-select with quantities (like create flow)
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [endDate, setEndDate] = useState('')
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
      setSelectedQty({ [rental.rental_club_set_id]: 1 })
      setStartDate(rental.start_date)
      setStartTime(rental.start_time ? rental.start_time.slice(0, 5) : '')
      setReturnTime(rental.return_time ? rental.return_time.slice(0, 5) : '')
      setEndDate(rental.end_date)
      setDeliveryRequested(rental.delivery_requested)
      setDeliveryAddress(rental.delivery_address || '')
      setAddOns(rental.add_ons || [])
      setNotes(rental.notes || '')
      setEmployeeName('')
      setError(null)
    }
  }, [rental, isOpen])

  // Computed duration from start/end dates
  const durationDays = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1

  // Derived: expand selectedQty into a flat list of { set, qty } entries
  const selectedEntries = sets
    .filter(s => (selectedQty[s.id] || 0) > 0)
    .map(s => ({ set: s, qty: selectedQty[s.id] }))
  const totalSetsCount = selectedEntries.reduce((sum, e) => sum + e.qty, 0)

  // Fetch available sets when dates change
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

  // Quantity helpers
  const setQty = (setId: string, qty: number) => {
    setSelectedQty(prev => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[setId]
        return next
      }
      return { ...prev, [setId]: qty }
    })
  }

  // Price calculations
  const rentalPrice = durationDays > 0
    ? selectedEntries.reduce((sum, e) => sum + getCoursePrice(e.set, durationDays) * e.qty, 0)
    : 0
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

  const canSubmit =
    employeeName &&
    totalSetsCount > 0 &&
    startDate &&
    endDate &&
    (!deliveryRequested || deliveryAddress.trim()) &&
    !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit || !rental) return
    setIsSubmitting(true)
    setError(null)

    try {
      // Determine which set updates the existing rental (first selected entry)
      const firstEntry = selectedEntries[0]
      const firstSetId = firstEntry.set.id

      // 1. PUT update the existing rental with the first selected set
      const putRes = await fetch(`/api/club-rentals/${rental.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_club_set_id: firstSetId,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime || null,
          return_time: returnTime || null,
          delivery_requested: deliveryRequested,
          delivery_address: deliveryRequested ? deliveryAddress.trim() : null,
          add_ons: addOns,
          notes: notes.trim() || null,
          employee_name: employeeName,
        }),
      })

      const putData = await putRes.json()
      if (!putRes.ok) {
        setError(putData.error || 'Failed to update rental')
        return
      }

      // 2. Create new rentals for additional sets/quantities
      const newRentalCodes: { setName: string; code: string }[] = []
      const failed: string[] = []

      // Build list of additional rentals to create:
      // - First entry qty minus 1 (the existing rental covers 1)
      // - All other entries at full qty
      const additionalRentals: { set: ClubSet; count: number }[] = []
      selectedEntries.forEach((entry, idx) => {
        const count = idx === 0 ? entry.qty - 1 : entry.qty
        if (count > 0) {
          additionalRentals.push({ set: entry.set, count })
        }
      })

      for (const { set, count } of additionalRentals) {
        for (let i = 0; i < count; i++) {
          const postRes = await fetch('/api/clubs/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rental_club_set_id: set.id,
              rental_type: 'course',
              start_date: startDate,
              start_time: startTime || undefined,
              end_date: endDate,
              customer_name: rental.customer_name,
              customer_email: rental.customer_email || undefined,
              customer_phone: rental.customer_phone || undefined,
              customer_id: rental.customer_id || undefined,
              add_ons: [],
              delivery_requested: deliveryRequested,
              delivery_address: deliveryRequested ? deliveryAddress.trim() : undefined,
              return_time: returnTime || undefined,
              notes: notes.trim() || undefined,
              source: 'staff',
            }),
          })

          const postData = await postRes.json()
          if (postRes.ok) {
            newRentalCodes.push({ setName: set.name, code: postData.rental_code })
          } else {
            failed.push(`${set.name}: ${postData.error || 'Failed'}`)
          }
        }
      }

      if (failed.length > 0) {
        setError(`Updated original rental but failed to create some new ones: ${failed.join('; ')}`)
        // Still refresh the list but keep modal open so user sees the error
        onSuccess(putData.rental, putData.previous, employeeName, newRentalCodes.length > 0 ? newRentalCodes : undefined)
        return
      }

      onSuccess(
        putData.rental,
        putData.previous,
        employeeName,
        newRentalCodes.length > 0 ? newRentalCodes : undefined
      )
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
          {/* Club Set Selection — multi-select with quantities */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Club Sets</Label>
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
                  const qty = selectedQty[set.id] || 0
                  // The original set gets +1 availability since current rental occupies a slot
                  const maxAvailable = set.available_count
                  const isAvailable = maxAvailable > 0
                  const price1d = getCoursePrice(set, durationDays)

                  return (
                    <div
                      key={set.id}
                      className={cn(
                        'w-full p-2.5 rounded-lg border-2 transition-all',
                        qty > 0
                          ? 'border-green-600 bg-green-50'
                          : isAvailable
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-100 bg-gray-50 opacity-40'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
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
                            {!isAvailable && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">
                            {set.name.includes(' - ') ? set.name.split(' - ').slice(1).join(' - ') : set.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-700">&#3647;{price1d.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{durationDays}d rate</p>
                          </div>
                          {isAvailable && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQty(set.id, qty - 1)}
                                disabled={qty === 0}
                                className={cn(
                                  'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                                  qty > 0
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                )}
                              >
                                -
                              </button>
                              <span className="w-5 text-center text-sm font-bold text-gray-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(set.id, qty + 1)}
                                disabled={qty >= maxAvailable}
                                className={cn(
                                  'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                                  qty < maxAvailable
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                )}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {totalSetsCount > 0 && (
                  <p className="text-xs text-green-700 font-medium">
                    {totalSetsCount} {totalSetsCount === 1 ? 'set' : 'sets'} selected
                  </p>
                )}
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
                onChange={e => {
                  setStartDate(e.target.value)
                  if (endDate && e.target.value > endDate) setEndDate('')
                }}
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
                  min="09:00"
                  max="23:00"
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
                  min="09:00"
                  max="23:00"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="mt-0.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-end-date" className="text-xs text-gray-500">End Date</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                disabled={!startDate}
                onChange={e => setEndDate(e.target.value)}
                className="mt-0.5"
              />
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
          {totalSetsCount > 0 && (
            <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
              {selectedEntries.map(({ set, qty }) => (
                <div key={set.id} className="flex justify-between">
                  <span className="text-gray-600">
                    {set.name.includes(' - ') ? set.name.split(' - ').slice(1).join(' - ') : set.name}
                    {' '}({durationDays}d{qty > 1 ? ` x${qty}` : ''})
                  </span>
                  <span>&#3647;{(getCoursePrice(set, durationDays) * qty).toLocaleString()}</span>
                </div>
              ))}
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
