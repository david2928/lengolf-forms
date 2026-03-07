'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ClubSet {
  id: string
  name: string
  slug: string
  tier: 'premium' | 'premium-plus'
  gender: 'mens' | 'womens'
  brand: string | null
  model: string | null
  specifications: string[]
  indoor_price_1h: number
  indoor_price_2h: number
  indoor_price_4h: number
  available_count: number
}

export interface ClubRentalSelection {
  setId: string | null
  setName: string | null
  tier: string | null
  gender: string | null
}

interface ClubRentalSelectorProps {
  value: ClubRentalSelection
  onChange: (value: ClubRentalSelection) => void
  bookingDate: string | null  // YYYY-MM-DD
  startTime: string | null    // HH:mm
  durationHours: number | null
}

function getPrice(set: ClubSet, hours: number): number {
  if (hours <= 1) return Number(set.indoor_price_1h)
  if (hours <= 2) return Number(set.indoor_price_2h)
  return Number(set.indoor_price_4h)
}

export function ClubRentalSelector({
  value,
  onChange,
  bookingDate,
  startTime,
  durationHours,
}: ClubRentalSelectorProps) {
  const [sets, setSets] = useState<ClubSet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingDate) return

    const fetchSets = async () => {
      setLoading(true)
      setError('')
      try {
        let url = `/api/clubs/availability?type=indoor&date=${bookingDate}`
        if (startTime) url += `&start_time=${startTime}`
        if (durationHours) url += `&duration=${durationHours}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setSets(data.sets || [])
      } catch {
        setError('Could not load club availability')
        setSets([])
      } finally {
        setLoading(false)
      }
    }

    fetchSets()
  }, [bookingDate, startTime, durationHours])

  const handleSelect = (set: ClubSet | null) => {
    if (!set) {
      onChange({ setId: null, setName: null, tier: null, gender: null })
    } else {
      onChange({ setId: set.id, setName: set.name, tier: set.tier, gender: set.gender })
    }
  }

  const isNone = !value.setId

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* No Rental option */}
        <Badge
          variant={isNone ? 'default' : 'secondary'}
          className={cn(
            'cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium',
            isNone
              ? 'bg-gray-600 text-white scale-105 shadow-md border-0'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:shadow-sm'
          )}
          onClick={() => handleSelect(null)}
        >
          No Club Rental
        </Badge>

        {/* Standard (always available, no tracking) */}
        <Badge
          variant={value.tier === 'standard' ? 'default' : 'secondary'}
          className={cn(
            'cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium',
            value.tier === 'standard'
              ? 'bg-gray-600 text-white scale-105 shadow-md border-0'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:shadow-sm'
          )}
          onClick={() => onChange({ setId: 'standard', setName: 'Standard Set', tier: 'standard', gender: null })}
        >
          Standard (Free)
        </Badge>
      </div>

      {/* Premium sets from DB */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking club availability...
        </div>
      ) : error ? (
        <p className="text-xs text-amber-600">{error}</p>
      ) : sets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sets.map((set) => {
            const isSelected = value.setId === set.id
            const isAvailable = set.available_count > 0
            const price = durationHours ? getPrice(set, durationHours) : getPrice(set, 1)
            const tierColor = set.tier === 'premium-plus'
              ? { gradient: 'from-green-700 to-green-800', bg: 'bg-green-50', border: 'border-green-800' }
              : { gradient: 'from-green-600 to-green-700', bg: 'bg-green-50', border: 'border-green-200' }

            return (
              <Badge
                key={set.id}
                variant={isSelected ? 'default' : 'secondary'}
                className={cn(
                  'cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium',
                  !isAvailable && 'opacity-40 cursor-not-allowed',
                  isSelected
                    ? `bg-gradient-to-r ${tierColor.gradient} text-white scale-105 shadow-md border-0`
                    : `${tierColor.bg} ${tierColor.border} text-gray-700 hover:shadow-sm`
                )}
                onClick={() => {
                  if (!isAvailable) return
                  if (isSelected) {
                    handleSelect(null)
                  } else {
                    handleSelect(set)
                  }
                }}
              >
                <span className="flex items-center gap-1.5">
                  {set.tier === 'premium-plus' ? 'Premium+' : 'Premium'}
                  {' · '}
                  {set.gender === 'mens' ? "Men's" : "Women's"}
                  {price > 0 && (
                    <span className={cn('text-xs', isSelected ? 'text-white/80' : 'text-gray-500')}>
                      ฿{price.toLocaleString()}
                    </span>
                  )}
                  {!isAvailable && (
                    <span className="text-xs text-red-500 font-semibold ml-1">Unavailable</span>
                  )}
                </span>
              </Badge>
            )
          })}
        </div>
      ) : bookingDate ? (
        <p className="text-xs text-gray-500">No premium sets found</p>
      ) : null}

      {/* Selected set details */}
      {value.setId && value.setId !== 'standard' && (() => {
        const selectedSet = sets.find(s => s.id === value.setId)
        if (!selectedSet) return null
        const price = durationHours ? getPrice(selectedSet, durationHours) : 0
        return (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
            {selectedSet.brand} {selectedSet.model}
            {selectedSet.specifications?.length > 0 && (
              <span className="ml-1">· {(selectedSet.specifications as string[]).join(', ')}</span>
            )}
            {price > 0 && (
              <span className="ml-1 font-semibold text-green-700">· ฿{price.toLocaleString()}</span>
            )}
          </div>
        )
      })()}
    </div>
  )
}
