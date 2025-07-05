'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AdminInventoryProductWithStatus, UpdateProductMetadataRequest } from '@/types/inventory'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EditProductModalProps {
  product: AdminInventoryProductWithStatus
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function EditProductModal({ product, isOpen, onClose, onUpdate }: EditProductModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<UpdateProductMetadataRequest>({
    unit_cost: product.unit_cost || undefined,
    image_url: product.image_url || undefined,
    purchase_link: product.purchase_link || undefined,
    reorder_threshold: product.reorder_threshold || undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/inventory/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to update product: ${errorData}`)
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof UpdateProductMetadataRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'unit_cost' || field === 'reorder_threshold' 
        ? (value === '' ? undefined : parseFloat(value))
        : (value === '' ? undefined : value)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Unit Cost (฿)</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.unit_cost || ''}
              onChange={(e) => handleInputChange('unit_cost', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder_threshold">Reorder Threshold</Label>
            <Input
              id="reorder_threshold"
              type="number"
              min="0"
              placeholder="Enter reorder threshold"
              value={formData.reorder_threshold || ''}
              onChange={(e) => handleInputChange('reorder_threshold', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase_link">Purchase Link</Label>
            <Input
              id="purchase_link"
              type="url"
              placeholder="https://example.com/product"
              value={formData.purchase_link || ''}
              onChange={(e) => handleInputChange('purchase_link', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.image_url || ''}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 