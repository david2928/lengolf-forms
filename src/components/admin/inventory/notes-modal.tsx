'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { StickyNote } from 'lucide-react'

interface NotesModalProps {
  product: AdminInventoryProductWithStatus
  isOpen: boolean
  onClose: () => void
}

export function NotesModal({ product, isOpen, onClose }: NotesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes: {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/20">
            {product.notes ? (
              <p className="text-sm whitespace-pre-wrap">{product.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No notes available for this product.
              </p>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            To edit notes, use the Edit button on the product card.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}