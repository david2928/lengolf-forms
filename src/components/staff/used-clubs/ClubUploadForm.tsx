'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, X, ImageIcon, Plus, Clock, Info, Pencil, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  useRecentClubs,
  useClubSets,
  createClub,
  staffUpdateClub,
  uploadClubImages,
  type UsedClub,
} from '@/hooks/use-used-clubs'

const BRANDS = ['Callaway', 'TaylorMade', 'Titleist', 'Ping', 'Mizuno', 'Cobra', 'Srixon', 'Cleveland', 'Wilson', 'Bridgestone', 'Dunlop', 'Majesty', 'Kasco', 'MacGregor', 'Odyssey', 'XXIO', 'Honma', 'Other']
const CLUB_TYPES = ['Driver', 'Iron Set', 'Iron', 'Wedge', 'Putter', 'Hybrid', 'Fairway Wood', 'Full Set', 'Partial Set']
const GENDERS = ['Men', 'Women']
const CONDITIONS = ['Excellent', 'Good', 'Fair']

const SPEC_HINTS: Record<string, string> = {
  'Iron Set': 'e.g. 5-PW, 3-PW',
  'Iron': 'e.g. 7 Iron, 4 Iron',
  'Wedge': 'e.g. 56\u00B0, 52\u00B0 Gap Wedge',
  'Driver': 'e.g. 10.5\u00B0, Regular flex',
  'Hybrid': 'e.g. 3H 19\u00B0',
  'Fairway Wood': 'e.g. 3 Wood 15\u00B0',
}

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-700',
  Good: 'bg-amber-100 text-amber-700',
  Fair: 'bg-gray-100 text-gray-600',
}

interface FormState {
  brand: string
  model: string
  club_type: string
  specification: string
  shaft: string
  gender: string
  condition: string
  set_id: string
  description: string
}

const EMPTY_FORM: FormState = {
  brand: '',
  model: '',
  club_type: '',
  specification: '',
  shaft: '',
  gender: 'Men',
  condition: '',
  set_id: '',
  description: '',
}

interface ImageEntry {
  file: File | null  // null for existing uploaded images
  preview: string
  isExisting: boolean
}

interface FormProps {
  initialEditClub?: UsedClub | null
  onEditReset?: () => void
}

export function ClubUploadForm({ initialEditClub, onEditReset }: FormProps = {}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [images, setImages] = useState<ImageEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingClub, setEditingClub] = useState<UsedClub | null>(null)

  const { clubs: recentClubs, mutate: refreshRecent } = useRecentClubs()
  const { sets } = useClubSets()


  const onDrop = useCallback((accepted: File[]) => {
    const newEntries: ImageEntry[] = accepted.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }))
    setImages(prev => {
      const combined = [...prev, ...newEntries]
      if (combined.length > 5) {
        combined.slice(5).forEach(e => { if (!e.isExisting) URL.revokeObjectURL(e.preview) })
        toast.error('Maximum 5 photos per club')
        return combined.slice(0, 5)
      }
      return combined
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
    disabled: submitting || images.length >= 5,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0]
      toast.error(err?.code === 'file-too-large' ? 'Image must be under 5 MB' : 'Invalid file type')
    },
  })

  const removeImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index]
      if (removed && !removed.isExisting) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeAllImages = () => {
    setImages(prev => {
      prev.forEach(e => { if (!e.isExisting) URL.revokeObjectURL(e.preview) })
      return []
    })
  }

  const set = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const startEditing = (club: UsedClub) => {
    setEditingClub(club)
    setForm({
      brand: club.brand,
      model: club.model || '',
      club_type: club.club_type,
      specification: club.specification || '',
      shaft: club.shaft || '',
      gender: club.gender,
      condition: club.condition,
      set_id: club.set_id || '',
      description: club.description || '',
    })
    // Load existing images
    removeAllImages()
    const existingUrls = (club.image_urls && club.image_urls.length > 0)
      ? club.image_urls
      : (club.image_url ? [club.image_url] : [])
    setImages(existingUrls.map(url => ({
      file: null,
      preview: url,
      isExisting: true,
    })))
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    setEditingClub(null)
    setForm(EMPTY_FORM)
    removeAllImages()
    onEditReset?.()
  }

  // Load club from parent (e.g. browse tab click)
  useEffect(() => {
    if (initialEditClub && initialEditClub.id !== editingClub?.id) {
      startEditing(initialEditClub)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditClub])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.club_type || !form.condition) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      // Upload new files only
      const newFiles = images.filter(e => !e.isExisting && e.file).map(e => e.file!)
      const newUrls = newFiles.length > 0 ? await uploadClubImages(newFiles) : []
      // Combine existing URLs with newly uploaded ones
      const existingUrls = images.filter(e => e.isExisting).map(e => e.preview)
      const allImageUrls = [...existingUrls, ...newUrls]

      if (editingClub) {
        // Update existing club
        await staffUpdateClub(editingClub.id, {
          brand: form.brand,
          model: form.model || null,
          club_type: form.club_type,
          specification: form.specification || null,
          shaft: form.shaft || null,
          gender: form.gender,
          condition: form.condition,
          description: form.description || null,
          image_url: allImageUrls[0] || null,
          image_urls: allImageUrls,
          set_id: form.set_id || null,
        })
        toast.success('Club updated!')
        setEditingClub(null)
      } else {
        // Create new club
        await createClub({
          brand: form.brand,
          model: form.model || null,
          club_type: form.club_type,
          specification: form.specification || null,
          shaft: form.shaft || null,
          gender: form.gender,
          condition: form.condition,
          price: 0,
          description: form.description || null,
          image_url: allImageUrls[0] || null,
          image_urls: allImageUrls,
          purchased_at: null,
          available_for_sale: false,
          available_for_rental: false,
          set_id: form.set_id || null,
        })
        toast.success('Club added to inventory!')
      }

      setForm(EMPTY_FORM)
      removeAllImages()
      refreshRecent()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Edit mode banner */}
        {editingClub && (
          <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-sm font-medium text-amber-800">
              Editing: {editingClub.brand} {editingClub.model || ''} ({editingClub.club_type})
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEditing} className="text-amber-700 hover:text-amber-900">
              <ArrowLeft size={14} className="mr-1" /> Cancel
            </Button>
          </div>
        )}

        {/* Brand / Model */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Brand <span className="text-red-500">*</span></Label>
            <Select value={form.brand} onValueChange={v => set('brand', v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Model <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.model}
              onChange={e => set('model', e.target.value)}
              placeholder="e.g. Warbird"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Type / Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Club Type <span className="text-red-500">*</span></Label>
            <Select value={form.club_type} onValueChange={v => set('club_type', v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {CLUB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={v => set('gender', v)} disabled={submitting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Iron set note */}
        <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>Bay set irons</strong> (e.g. 5-PW) should be added as one <strong>Iron Set</strong> entry. Only add individual <strong>Iron</strong> entries for standalone irons sold separately.
          </p>
        </div>

        {/* Specification + Shaft */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Specification <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.specification}
              onChange={e => set('specification', e.target.value)}
              placeholder={SPEC_HINTS[form.club_type] || 'e.g. 10.5\u00B0, 3-PW'}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Shaft <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.shaft}
              onChange={e => set('shaft', e.target.value)}
              placeholder="e.g. Graphite Regular"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-1.5">
          <Label>Condition <span className="text-red-500">*</span></Label>
          <Select value={form.condition} onValueChange={v => set('condition', v)} disabled={submitting}>
            <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
            <SelectContent>
              {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Set */}
        {sets.length > 0 && (
          <div className="space-y-1.5">
            <Label>Part of a Set <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.set_id} onValueChange={v => set('set_id', v === '_none' ? '' : v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="None – standalone club" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None &ndash; standalone club</SelectItem>
                {sets.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.brand})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Any notes about condition, shaft type, flex, etc."
            rows={3}
            disabled={submitting}
          />
        </div>

        {/* Image upload - multiple */}
        <div className="space-y-1.5">
          <Label>Photos <span className="text-muted-foreground text-xs">(optional, up to 5, max 5 MB each)</span></Label>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((entry, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X size={12} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop zone (show when under 5 images) */}
          {images.length < 5 && (
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
                ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={24} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop here\u2026' : images.length > 0 ? 'Add more photos' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP, HEIC &mdash; max 5 MB each</p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> {editingClub ? 'Updating\u2026' : 'Saving\u2026'}</span>
          ) : (
            <span className="flex items-center gap-2">
              {editingClub ? <><Pencil size={16} /> Update Club</> : <><Plus size={16} /> Add Club</>}
            </span>
          )}
        </Button>
      </form>

      {/* ── Recent Submissions ── */}
      {recentClubs.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            Recently Added
          </h2>
          <div className="space-y-2">
            {recentClubs.map(club => (
              <Card
                key={club.id}
                className={`shadow-none cursor-pointer transition-colors hover:bg-accent/50 ${editingClub?.id === club.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => startEditing(club)}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {club.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={club.image_url} alt="" className="h-12 w-12 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon size={18} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {club.brand === 'Other' ? (club.model || 'Other') : `${club.brand}${club.model ? ` ${club.model}` : ''}`} &mdash; {club.club_type}{club.specification ? ` (${club.specification})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{club.gender} &middot; {club.condition}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${CONDITION_COLORS[club.condition] || ''}`}
                    >
                      {club.condition}
                    </Badge>
                    <Pencil size={14} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Tap a club to edit or add photos</p>
        </div>
      )}
    </div>
  )
}
