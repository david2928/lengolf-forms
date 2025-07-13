'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { ExternalLink, Copy, CheckCircle, Package, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PurchaseLinkModalProps {
  product: AdminInventoryProductWithStatus
  isOpen: boolean
  onClose: () => void
}

export function PurchaseLinkModal({ product, isOpen, onClose }: PurchaseLinkModalProps) {
  const [copied, setCopied] = useState(false)

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getStatusInfo = () => {
    const isCashProduct = product.name.toLowerCase().includes('cash')
    
    switch (product.reorder_status) {
      case 'REORDER_NEEDED':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          badgeVariant: 'destructive' as const,
          label: isCashProduct ? 'Collection Needed' : 'Needs Reorder'
        }
      case 'LOW_STOCK':
        return {
          icon: Package,
          color: 'text-amber-600',
          badgeVariant: 'secondary' as const,
          label: isCashProduct ? 'Near Collection Threshold' : 'Low Stock'
        }
      default:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          badgeVariant: 'secondary' as const,
          label: 'Sufficient Stock'
        }
    }
  }

  const handleCopyLink = async () => {
    if (!product.purchase_link) return

    try {
      await navigator.clipboard.writeText(product.purchase_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleOpenLink = () => {
    if (product.purchase_link) {
      window.open(product.purchase_link, '_blank', 'noopener,noreferrer')
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  if (!product.purchase_link) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Purchase Information</DialogTitle>
          </DialogHeader>
          
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              No purchase link available for {product.name}. Please contact your supplier directly or update the product information.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Product Summary */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-lg">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.category_name}</p>
              </div>
              <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Stock</span>
                <p className="font-medium">
                  {product.current_stock || 0} {product.unit || ''}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Reorder Threshold</span>
                <p className="font-medium">
                  {product.reorder_threshold || 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Unit Cost</span>
                <p className="font-medium">
                  {product.unit_cost ? formatCurrency(product.unit_cost) : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Stock Value</span>
                <p className="font-medium">
                  {product.unit_cost && product.current_stock ? 
                    formatCurrency(product.current_stock * product.unit_cost) : 
                    'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          {product.supplier && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Supplier Information</h4>
              <p className="text-sm text-muted-foreground">{product.supplier}</p>
            </div>
          )}

          {/* Purchase Link */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Purchase Link</h4>
            <div className="space-y-3">
              <div className="bg-muted rounded p-3 text-sm font-mono break-all">
                {product.purchase_link}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleOpenLink}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Purchase Link
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 