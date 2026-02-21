'use client'

import { useState, useMemo } from 'react'
import { Search, ImageIcon, Tag, X, ChevronLeft, ChevronRight, Pencil, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStaffClubList, type UsedClub } from '@/hooks/use-used-clubs'

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-700',
  Good: 'bg-amber-100 text-amber-700',
  Fair: 'bg-gray-100 text-gray-600',
}

interface Props {
  onEdit?: (club: UsedClub) => void
}

function ImageViewer({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const hasMultiple = images.length > 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      <div
        className="relative max-w-[90vw] max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`Photo ${index + 1}`}
          className="max-w-full max-h-[85vh] rounded-lg object-contain"
        />

        {hasMultiple && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
              onClick={() => setIndex(i => (i + 1) % images.length)}
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type FilterChipValue = string | null

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors
        ${active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
    >
      {label}
    </button>
  )
}

export function ClubInventoryBrowser({ onEdit }: Props) {
  const { clubs, isLoading } = useStaffClubList()
  const [query, setQuery] = useState('')
  const [viewingImages, setViewingImages] = useState<string[] | null>(null)
  const [brandFilter, setBrandFilter] = useState<FilterChipValue>(null)
  const [typeFilter, setTypeFilter] = useState<FilterChipValue>(null)
  const [conditionFilter, setConditionFilter] = useState<FilterChipValue>(null)
  const [genderFilter, setGenderFilter] = useState<FilterChipValue>(null)
  const [setFilter, setSetFilter] = useState<FilterChipValue>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'for_sale' | 'not_listed'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Derive unique values from data
  const brands = useMemo(() => {
    const counts = new Map<string, number>()
    clubs.forEach(c => counts.set(c.brand, (counts.get(c.brand) || 0) + 1))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand)
  }, [clubs])
  const types = useMemo(() => Array.from(new Set(clubs.map(c => c.club_type))).sort(), [clubs])
  const sets = useMemo(() => {
    const map = new Map<string, { id: string; name: string; brand: string; count: number }>()
    clubs.forEach(c => {
      if (c.club_sets) {
        const existing = map.get(c.club_sets.id)
        if (existing) existing.count++
        else map.set(c.club_sets.id, { ...c.club_sets, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [clubs])

  const hasActiveFilters = brandFilter || typeFilter || conditionFilter || genderFilter || setFilter || statusFilter !== 'all'
  const activeFilterCount = [brandFilter, typeFilter, conditionFilter, genderFilter, setFilter, statusFilter !== 'all' ? statusFilter : null].filter(Boolean).length

  const filtered = useMemo(() => {
    return clubs.filter(c => {
      // Text search
      if (query.trim()) {
        const q = query.toLowerCase()
        const matches =
          c.brand.toLowerCase().includes(q) ||
          (c.model && c.model.toLowerCase().includes(q)) ||
          c.club_type.toLowerCase().includes(q) ||
          (c.specification && c.specification.toLowerCase().includes(q)) ||
          (c.shaft && c.shaft.toLowerCase().includes(q)) ||
          c.gender.toLowerCase().includes(q) ||
          c.condition.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.club_sets && c.club_sets.name.toLowerCase().includes(q))
        if (!matches) return false
      }
      // Filters
      if (brandFilter && c.brand !== brandFilter) return false
      if (typeFilter && c.club_type !== typeFilter) return false
      if (conditionFilter && c.condition !== conditionFilter) return false
      if (genderFilter && c.gender !== genderFilter) return false
      if (setFilter && c.set_id !== setFilter) return false
      if (statusFilter === 'for_sale' && !c.available_for_sale) return false
      if (statusFilter === 'not_listed' && c.available_for_sale) return false
      return true
    })
  }, [clubs, query, brandFilter, typeFilter, conditionFilter, genderFilter, setFilter, statusFilter])

  const clearAllFilters = () => {
    setBrandFilter(null)
    setTypeFilter(null)
    setConditionFilter(null)
    setGenderFilter(null)
    setSetFilter(null)
    setStatusFilter('all')
  }

  const toggleFilter = (current: FilterChipValue, value: string, setter: (v: FilterChipValue) => void) => {
    setter(current === value ? null : value)
  }

  const openImages = (club: UsedClub, e: React.MouseEvent) => {
    e.stopPropagation()
    const urls = (club.image_urls && club.image_urls.length > 0)
      ? club.image_urls
      : (club.image_url ? [club.image_url] : [])
    if (urls.length > 0) setViewingImages(urls)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {viewingImages && (
        <ImageViewer images={viewingImages} onClose={() => setViewingImages(null)} />
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search brand, model, shaft..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0 relative"
          onClick={() => setShowFilters(v => !v)}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {/* Brand */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Brand</p>
            <div className="flex flex-wrap gap-1.5">
              {brands.map(b => (
                <FilterChip key={b} label={b} active={brandFilter === b} onClick={() => toggleFilter(brandFilter, b, setBrandFilter)} />
              ))}
            </div>
          </div>

          {/* Club Type */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {types.map(t => (
                <FilterChip key={t} label={t} active={typeFilter === t} onClick={() => toggleFilter(typeFilter, t, setTypeFilter)} />
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Condition</p>
            <div className="flex flex-wrap gap-1.5">
              {['Excellent', 'Good', 'Fair'].map(c => (
                <FilterChip key={c} label={c} active={conditionFilter === c} onClick={() => toggleFilter(conditionFilter, c, setConditionFilter)} />
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Gender</p>
            <div className="flex flex-wrap gap-1.5">
              {['Men', 'Women'].map(g => (
                <FilterChip key={g} label={g} active={genderFilter === g} onClick={() => toggleFilter(genderFilter, g, setGenderFilter)} />
              ))}
            </div>
          </div>

          {/* Set */}
          {sets.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Set</p>
              <div className="flex flex-wrap gap-1.5">
                {sets.map(s => (
                  <FilterChip key={s.id} label={`${s.name} (${s.count})`} active={setFilter === s.id} onClick={() => toggleFilter(setFilter, s.id, setSetFilter)} />
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
              <FilterChip label="For sale" active={statusFilter === 'for_sale'} onClick={() => setStatusFilter('for_sale')} />
              <FilterChip label="Not listed" active={statusFilter === 'not_listed'} onClick={() => setStatusFilter('not_listed')} />
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} club{filtered.length !== 1 ? 's' : ''}{query || hasActiveFilters ? ' found' : ' in inventory'}
      </p>

      {/* Club list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {query || hasActiveFilters ? 'No clubs match your search' : 'No clubs in inventory yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(club => (
            <Card key={club.id} className="shadow-none">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {club.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={club.image_url}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover shrink-0 cursor-pointer ring-offset-2 hover:ring-2 hover:ring-primary/40 transition-shadow"
                      onClick={e => openImages(club, e)}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {club.brand === 'Other' ? (club.model || 'Other') : `${club.brand}${club.model ? ` ${club.model}` : ''}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {club.club_type}{club.specification ? ` (${club.specification})` : ''} &middot; {club.gender}
                          {club.shaft && <span className="block">{club.shaft}</span>}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${CONDITION_COLORS[club.condition] || ''}`}>
                        {club.condition}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3">
                        {club.price > 0 ? (
                          <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
                            <Tag size={12} />
                            &#3647;{club.price.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Price not set</span>
                        )}
                        {club.available_for_sale && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">On sale</Badge>
                        )}
                        {club.available_for_rental && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">For rent</Badge>
                        )}
                      </div>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => onEdit(club)}
                        >
                          <Pencil size={12} className="mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    {club.club_sets && (
                      <p className="text-xs text-primary/70 mt-1">Set: {club.club_sets.name}</p>
                    )}
                    {club.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{club.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
