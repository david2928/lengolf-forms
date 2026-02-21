'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, X, ImageIcon, Plus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  uploadClubImage,
} from '@/hooks/use-used-clubs'

const BRANDS = ['Callaway', 'TaylorMade', 'Titleist', 'Ping', 'Mizuno', 'Cobra', 'Srixon', 'Other']
const CLUB_TYPES = ['Driver', 'Irons (3-PW)', 'Wedge', 'Putter', 'Hybrid', 'Fairway Wood', 'Full Set', 'Partial Set']
const GENDERS = ['Men\'s', 'Women\'s', 'Unisex']
const CONDITIONS = ['Excellent', 'Good', 'Fair']

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-700',
  Good: 'bg-amber-100 text-amber-700',
  Fair: 'bg-gray-100 text-gray-600',
}

interface FormState {
  brand: string
  model: string
  club_type: string
  gender: string
  condition: string
  price: string
  set_id: string
  description: string
  available_for_sale: boolean
  available_for_rental: boolean
}

const EMPTY_FORM: FormState = {
  brand: '',
  model: '',
  club_type: '',
  gender: 'Unisex',
  condition: '',
  price: '',
  set_id: '',
  description: '',
  available_for_sale: true,
  available_for_rental: false,
}

export function ClubUploadForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { clubs: recentClubs, mutate: refreshRecent } = useRecentClubs()
  const { sets } = useClubSets()

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: submitting,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0]
      toast.error(err?.code === 'file-too-large' ? 'Image must be under 5 MB' : 'Invalid file type')
    },
  })

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.club_type || !form.condition || !form.price) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      let image_url: string | null = null
      if (imageFile) {
        image_url = await uploadClubImage(imageFile)
      }

      await createClub({
        brand: form.brand,
        model: form.model || null,
        club_type: form.club_type,
        gender: form.gender,
        condition: form.condition,
        price: Number(form.price),
        description: form.description || null,
        image_url,
        available_for_sale: form.available_for_sale,
        available_for_rental: form.available_for_rental,
        set_id: form.set_id || null,
      })

      toast.success('Club added to inventory!')
      setForm(EMPTY_FORM)
      removeImage()
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

        {/* Condition / Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Condition <span className="text-red-500">*</span></Label>
            <Select value={form.condition} onValueChange={v => set('condition', v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Asking Price (THB) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min={0}
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="e.g. 3500"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Set */}
        {sets.length > 0 && (
          <div className="space-y-1.5">
            <Label>Part of a Set <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.set_id} onValueChange={v => set('set_id', v === '_none' ? '' : v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="None – standalone club" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None – standalone club</SelectItem>
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

        {/* Image upload */}
        <div className="space-y-1.5">
          <Label>Photo <span className="text-muted-foreground text-xs">(optional, max 5 MB)</span></Label>
          {imagePreview ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
                ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={24} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop here…' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP, HEIC — max 5 MB</p>
            </div>
          )}
        </div>

        {/* Availability toggles */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Available for Sale</p>
              <p className="text-xs text-muted-foreground">Show on the website immediately</p>
            </div>
            <Switch
              checked={form.available_for_sale}
              onCheckedChange={v => set('available_for_sale', v)}
              disabled={submitting}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Available for Rental</p>
              <p className="text-xs text-muted-foreground">Can be rented out for rounds</p>
            </div>
            <Switch
              checked={form.available_for_rental}
              onCheckedChange={v => set('available_for_rental', v)}
              disabled={submitting}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</span>
          ) : (
            <span className="flex items-center gap-2"><Plus size={16} /> Add Club</span>
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
              <Card key={club.id} className="shadow-none">
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
                      {club.brand}{club.model ? ` ${club.model}` : ''} — {club.club_type}
                    </p>
                    <p className="text-xs text-muted-foreground">{club.gender} · {club.price.toLocaleString()} THB</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${CONDITION_COLORS[club.condition] || ''}`}
                  >
                    {club.condition}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
