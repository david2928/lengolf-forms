'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createClub as adminCreateClub,
  updateClub,
  uploadClubImage,
  type UsedClub,
  type ClubSet,
} from '@/hooks/use-used-clubs'

const BRANDS = ['Callaway', 'TaylorMade', 'Titleist', 'Ping', 'Mizuno', 'Cobra', 'Srixon', 'Other']
const CLUB_TYPES = ['Driver', 'Irons (3-PW)', 'Wedge', 'Putter', 'Hybrid', 'Fairway Wood', 'Full Set', 'Partial Set']
const GENDERS = ["Men's", "Women's", 'Unisex']
const CONDITIONS = ['Excellent', 'Good', 'Fair']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  club?: UsedClub | null
  sets: ClubSet[]
}

interface FormState {
  brand: string
  model: string
  club_type: string
  gender: string
  condition: string
  price: string
  cost: string
  set_id: string
  description: string
  available_for_sale: boolean
  available_for_rental: boolean
}

const toForm = (club?: UsedClub | null): FormState => ({
  brand: club?.brand ?? '',
  model: club?.model ?? '',
  club_type: club?.club_type ?? '',
  gender: club?.gender ?? 'Unisex',
  condition: club?.condition ?? '',
  price: club?.price != null ? String(club.price) : '',
  cost: club?.cost != null ? String(club.cost) : '',
  set_id: club?.set_id ?? '',
  description: club?.description ?? '',
  available_for_sale: club?.available_for_sale ?? true,
  available_for_rental: club?.available_for_rental ?? false,
})

export function ClubEditDialog({ open, onOpenChange, onSuccess, club, sets }: Props) {
  const [form, setForm] = useState<FormState>(toForm(club))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(club?.image_url ?? null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toForm(club))
      setImageFile(null)
      setImagePreview(club?.image_url ?? null)
    }
  }, [open, club])

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.club_type || !form.condition || !form.price) {
      toast.error('Brand, type, condition, and price are required')
      return
    }

    setSubmitting(true)
    try {
      let image_url: string | null = imagePreview && !imageFile ? imagePreview : null
      if (imageFile) {
        image_url = await uploadClubImage(imageFile)
      }

      const payload = {
        brand: form.brand,
        model: form.model || null,
        club_type: form.club_type,
        gender: form.gender,
        condition: form.condition,
        price: Number(form.price),
        cost: form.cost ? Number(form.cost) : null,
        description: form.description || null,
        image_url,
        available_for_sale: form.available_for_sale,
        available_for_rental: form.available_for_rental,
        set_id: form.set_id || null,
      }

      if (club) {
        await updateClub(club.id, payload)
        toast.success('Club updated')
      } else {
        // Admin creates via admin route (includes cost)
        const res = await fetch('/api/admin/used-clubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to create club')
        }
        toast.success('Club added')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{club ? 'Edit Club' : 'Add Club'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
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
              <Label>Model</Label>
              <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Warbird" disabled={submitting} />
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

          {/* Condition / Price / Cost */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Condition <span className="text-red-500">*</span></Label>
              <Select value={form.condition} onValueChange={v => set('condition', v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sale Price (THB) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)} placeholder="3500" disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                Purchase Cost (THB)
                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">internal</span>
              </Label>
              <Input type="number" min={0} value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="1200" disabled={submitting} />
            </div>
          </div>

          {/* Set */}
          <div className="space-y-1.5">
            <Label>Part of a Set</Label>
            <Select value={form.set_id || '_none'} onValueChange={v => set('set_id', v === '_none' ? '' : v)} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="None – standalone club" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None – standalone club</SelectItem>
                {sets.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.brand})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Shaft type, flex, any wear notes…" rows={3} disabled={submitting} />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Photo</Label>
            {imagePreview ? (
              <div className="relative w-full h-44 rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              >
                <input {...getInputProps()} />
                <Upload size={20} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isDragActive ? 'Drop here…' : 'Drag & drop or click to upload'}</p>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="rounded-lg border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available for Sale</p>
                <p className="text-xs text-muted-foreground">Shows on the website</p>
              </div>
              <Switch checked={form.available_for_sale} onCheckedChange={v => set('available_for_sale', v)} disabled={submitting} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available for Rental</p>
                <p className="text-xs text-muted-foreground">Can be rented for rounds</p>
              </div>
              <Switch checked={form.available_for_rental} onCheckedChange={v => set('available_for_rental', v)} disabled={submitting} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : club ? 'Save Changes' : 'Add Club'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
