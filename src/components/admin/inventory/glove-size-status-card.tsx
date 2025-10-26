'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Edit,
  BarChart3,
  AlertTriangle,
  Package,
  CheckCircle
} from 'lucide-react'
import { AdminInventoryProductWithStatus, GloveSizeStatus } from '@/types/inventory'
import { EditProductModal } from './edit-product-modal'
import { TrendChartModal } from './trend-chart-modal'

interface GloveSizeStatusCardProps {
  product: AdminInventoryProductWithStatus
  onUpdate: () => void
}

export function GloveSizeStatusCard({ product, onUpdate }: GloveSizeStatusCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false)

  const { size_breakdown } = product

  if (!size_breakdown) {
    return null
  }

  const criticalSizes = size_breakdown.sizes.filter(s => s.status === 'REORDER_NEEDED')
  const lowSizes = size_breakdown.sizes.filter(s => s.status === 'LOW_STOCK')

  const getOverallBorderColor = () => {
    if (criticalSizes.length > 0) return 'border-red-200 bg-red-50'
    if (lowSizes.length > 0) return 'border-amber-200 bg-amber-50'
    return 'border-green-200 bg-green-50'
  }

  const getSizeBadgeStyles = (status: string) => {
    switch (status) {
      case 'REORDER_NEEDED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'LOW_STOCK':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'ADEQUATE':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const renderSizeBadge = (sizeStatus: GloveSizeStatus) => {
    const colorClass = getSizeBadgeStyles(sizeStatus.status)

    return (
      <div
        key={sizeStatus.size}
        className={`${colorClass} border-2 rounded-lg p-2 text-center transition-all hover:shadow-sm`}
        role="status"
        aria-label={`Size ${sizeStatus.size}: ${sizeStatus.quantity} units, status ${sizeStatus.status.toLowerCase()}`}
      >
        <div className="text-xs font-medium text-muted-foreground">Size {sizeStatus.size}</div>
        <div className="text-lg font-bold">{sizeStatus.quantity}</div>
      </div>
    )
  }

  return (
    <>
      <Card
        className={`${getOverallBorderColor()} border-l-4 hover:shadow-md transition-shadow`}
        role="article"
        aria-label={`${product.name}, ${criticalSizes.length} critical sizes, ${lowSizes.length} low stock sizes`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium leading-tight">
                {product.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.category_name}
              </p>
            </div>
            <div className="flex flex-col gap-1 ml-2">
              {criticalSizes.length > 0 && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-0.5 text-xs px-1.5 py-0.5"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {criticalSizes.length} {criticalSizes.length === 1 ? 'size' : 'sizes'} critical
                </Badge>
              )}
              {lowSizes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800"
                >
                  <Package className="h-2.5 w-2.5" />
                  {lowSizes.length} low
                </Badge>
              )}
              {criticalSizes.length === 0 && lowSizes.length === 0 && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-green-100 text-green-800"
                >
                  <CheckCircle className="h-2.5 w-2.5" />
                  All sizes OK
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Size Grid - 4x2 layout matching input form */}
          <div className="space-y-2">
            {/* Row 1: Sizes 18-21 */}
            <div className="grid grid-cols-4 gap-2">
              {size_breakdown.sizes.slice(0, 4).map(renderSizeBadge)}
            </div>

            {/* Row 2: Sizes 22-25 */}
            <div className="grid grid-cols-4 gap-2">
              {size_breakdown.sizes.slice(4, 8).map(renderSizeBadge)}
            </div>
          </div>

          {/* Summary Information */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>Total: {size_breakdown.total_quantity} gloves</span>
            </div>
            <div>
              Reorder at: {product.reorder_threshold || 'Not set'} per size
            </div>
          </div>

          {/* Supplier Information */}
          {product.supplier && (
            <div className="text-xs">
              <span className="text-muted-foreground">Supplier: </span>
              <span className="font-medium">{product.supplier}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => setIsEditModalOpen(true)}
              aria-label={`Edit product details for ${product.name}`}
            >
              <Edit className="h-2.5 w-2.5 mr-1" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsTrendModalOpen(true)}
              title="View usage trends"
              aria-label={`View usage trends for ${product.name}`}
            >
              <BarChart3 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditProductModal
        product={product}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
      />

      <TrendChartModal
        product={product}
        isOpen={isTrendModalOpen}
        onClose={() => setIsTrendModalOpen(false)}
      />
    </>
  )
}
