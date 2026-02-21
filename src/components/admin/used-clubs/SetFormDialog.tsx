'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createSet, updateSet, type ClubSet } from '@/hooks/use-used-clubs'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editSet?: ClubSet | null
}

export function SetFormDialog({ open, onOpenChange, onSuccess, editSet }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editSet?.name ?? '')
      setBrand(editSet?.brand ?? '')
      setDescription(editSet?.description ?? '')
    }
  }, [open, editSet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !brand.trim()) {
      toast.error('Name and brand are required')
      return
    }
    setSubmitting(true)
    try {
      if (editSet) {
        await updateSet({ id: editSet.id, name, brand, description })
        toast.success('Set updated')
      } else {
        await createSet({ name, brand, description })
        toast.success('Set created')
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editSet ? 'Edit Set' : 'New Club Set'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Set Name <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Callaway Warbird Full Set #1"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand <span className="text-red-500">*</span></Label>
            <Input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Callaway"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notes about this set"
              rows={2}
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editSet ? 'Save Changes' : 'Create Set'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
