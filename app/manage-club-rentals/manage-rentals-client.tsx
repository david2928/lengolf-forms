'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { CancelRentalModal } from '@/components/manage-club-rentals/CancelRentalModal'
import {
  Loader2,
  Search,
  RefreshCw,
  Plus,
  Phone,
  MapPin,
  Truck,
  X,
  CheckCircle2,
  LogOut,
  RotateCcw,
} from 'lucide-react'

interface ClubRental {
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
  duration_days: number | null
  rental_price: number
  add_ons: Array<{ key: string; label: string; price: number }>
  add_ons_total: number
  delivery_requested: boolean
  delivery_address: string | null
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  reserved: { label: 'Reserved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmed: { label: 'Paid', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  checked_out: { label: 'Checked Out', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  returned: { label: 'Returned', className: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
  no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'confirmed', label: 'Paid' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
]

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function ManageRentalsClient() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedRentalForCancel, setSelectedRentalForCancel] = useState<ClubRental | null>(null)
  const { toast } = useToast()

  const queryParams = new URLSearchParams()
  if (statusFilter !== 'all') queryParams.set('status', statusFilter)
  if (search) queryParams.set('search', search)

  const { data, error, isLoading, mutate } = useSWR<{ rentals: ClubRental[] }>(
    `/api/club-rentals?${queryParams.toString()}`,
    fetcher
  )

  const rentals = data?.rentals || []

  const handleSearch = () => {
    setSearch(searchInput.trim())
  }

  const handleStatusChange = async (rentalId: string, newStatus: string) => {
    setUpdating(rentalId)
    try {
      const res = await fetch(`/api/club-rentals/${rentalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' })
        return
      }
      mutate()
    } catch {
      toast({ title: 'Error', description: 'Failed to update rental', variant: 'destructive' })
    } finally {
      setUpdating(null)
    }
  }

  const handleOpenCancelModal = (rental: ClubRental) => {
    setSelectedRentalForCancel(rental)
    setIsCancelModalOpen(true)
  }

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false)
    setSelectedRentalForCancel(null)
  }

  const handleCancelSuccess = async (rentalId: string, employeeName: string, reason: string) => {
    // Capture before state is cleared by onClose
    const rental = selectedRentalForCancel
    toast({
      title: 'Rental Cancelled',
      description: `Rental ${rental?.rental_code} has been cancelled.`,
      variant: 'destructive',
    })
    mutate()

    // Send LINE notification (non-blocking)
    if (rental) {
      const r = rental
      const set = r.rental_club_sets
      try {
        const lineMessage = `🚫 CLUB RENTAL CANCELLED 🚫\n----------------------------------\n📋 Code: ${r.rental_code}\n👤 Customer: ${r.customer_name}${r.customer_phone ? `\n📞 Phone: ${r.customer_phone}` : ''}\n🏌️ Set: ${set?.name || 'N/A'}\n📅 ${r.start_date} → ${r.end_date}\n💰 Total: ฿${Number(r.total_price).toLocaleString()}\n----------------------------------\n🗑️ Cancelled By: ${employeeName}${reason ? `\n💬 Reason: ${reason}` : ''}`

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: lineMessage }),
        })
      } catch (e) {
        console.error('Failed to send LINE notification for rental cancellation:', e)
      }
    }
  }

  return (
    <div className="w-full">
      <div className="px-3 sm:px-4 text-center mb-6 sm:mb-8 py-3 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold">Manage Club Rentals</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage course club rental bookings
        </p>
      </div>

      <div className="container mx-auto max-w-3xl px-4 space-y-4">
        {/* Actions row */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/create-course-rental" className="inline-flex items-center whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1 flex-shrink-0" />
              New Rental
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                    statusFilter === f.value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search code, name, or phone..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading rentals...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            Failed to load rentals. <button onClick={() => mutate()} className="underline">Retry</button>
          </div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-1">No rentals found</p>
            <p className="text-sm">Try adjusting your filters or create a new rental.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map(rental => {
              const set = rental.rental_club_sets
              const statusCfg = STATUS_CONFIG[rental.status] || STATUS_CONFIG.reserved
              const isUpdating = updating === rental.id

              return (
                <Card key={rental.id} className={cn(
                  'transition-opacity',
                  isUpdating && 'opacity-50 pointer-events-none'
                )}>
                  <CardContent className="pt-4 pb-4">
                    {/* Top row: code + status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {rental.rental_code}
                      </span>
                      <Badge variant="outline" className={cn('text-xs', statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Club set */}
                    {set && (
                      <div className="flex items-center gap-1.5 mb-2">
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
                        <span className="text-sm text-gray-700">{set.name}</span>
                      </div>
                    )}

                    {/* Date range */}
                    <div className="text-sm text-gray-600 mb-1">
                      {formatDate(rental.start_date)}
                      {rental.start_time && ` ${rental.start_time.slice(0, 5)}`}
                      {' → '}
                      {formatDate(rental.end_date)}
                      {rental.duration_days && ` (${rental.duration_days}d)`}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                      <span className="font-medium text-gray-900">{rental.customer_name}</span>
                      {rental.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {rental.customer_phone}
                        </span>
                      )}
                    </div>

                    {/* Delivery */}
                    {rental.delivery_requested ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Truck className="h-3 w-3" />
                        Delivery: {rental.delivery_address || 'Address pending'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <MapPin className="h-3 w-3" />
                        Pickup at LENGOLF
                      </div>
                    )}

                    {/* Add-ons */}
                    {rental.add_ons && rental.add_ons.length > 0 && (
                      <div className="text-xs text-gray-500 mb-1">
                        Add-ons: {rental.add_ons.map(a => a.label).join(', ')}
                      </div>
                    )}

                    {/* Notes */}
                    {rental.notes && (
                      <div className="text-xs text-gray-400 italic mb-2">
                        {rental.notes}
                      </div>
                    )}

                    {/* Price + Actions row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm font-bold text-green-700">
                        ฿{Number(rental.total_price).toLocaleString()}
                      </span>

                      <div className="flex gap-1.5">
                        {rental.status === 'reserved' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() => handleStatusChange(rental.id, 'confirmed')}
                              disabled={isUpdating}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleOpenCancelModal(rental)}
                              disabled={isUpdating}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}

                        {rental.status === 'confirmed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-orange-700 border-orange-200 hover:bg-orange-50"
                              onClick={() => handleStatusChange(rental.id, 'checked_out')}
                              disabled={isUpdating}
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              Check Out
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleOpenCancelModal(rental)}
                              disabled={isUpdating}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}

                        {rental.status === 'checked_out' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => handleStatusChange(rental.id, 'returned')}
                            disabled={isUpdating}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Return
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <CancelRentalModal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        rental={selectedRentalForCancel}
        onSuccess={handleCancelSuccess}
      />
    </div>
  )
}
