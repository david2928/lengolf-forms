'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Edit, BarChart3, ShoppingCart } from 'lucide-react'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { EditProductModal } from './edit-product-modal'
import { PurchaseLinkModal } from './purchase-link-modal'
import { TrendChartModal } from './trend-chart-modal'

interface CollapsedProductCardProps {
  product: AdminInventoryProductWithStatus
  onUpdate: () => void
  isExpanded?: boolean
  onExpand?: () => void
}

export function CollapsedProductCard({ product, onUpdate, isExpanded, onExpand }: CollapsedProductCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false)

  const handleCardClick = () => {
    if (onExpand) {
      onExpand()
    }
  }

  return (
    <>
      <Card 
        className="border-l-4 border-green-500 bg-green-50/30 hover:shadow-md transition-shadow cursor-pointer"
        role="article"
        aria-label={`${product.name}, ${product.current_stock || 0} in stock, sufficient stock status`}
        tabIndex={0}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            {/* Left side: Product info */}
            <div className="flex items-center gap-2.5 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium text-xs">{product.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {product.category_name}
              </span>
            </div>

            {/* Center: Stock quantity */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-600">
                {product.current_stock || 0} {product.unit || ''}
              </span>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-0.5 ml-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditModalOpen(true)
                }}
                className="h-6 w-6 p-0"
                title="Edit product"
                aria-label={`Edit product details for ${product.name}`}
              >
                <Edit className="h-2.5 w-2.5" />
              </Button>
              
              {product.input_type === 'number' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsTrendModalOpen(true)
                  }}
                  className="h-6 w-6 p-0"
                  title="View trend"
                >
                  <BarChart3 className="h-2.5 w-2.5" />
                </Button>
              )}
              
              {product.purchase_link && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPurchaseModalOpen(true)
                  }}
                  className="h-6 w-6 p-0"
                  title="Purchase info"
                >
                  <ShoppingCart className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditProductModal
        product={product}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
      />

      {product.purchase_link && (
        <PurchaseLinkModal
          product={product}
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
        />
      )}

      {product.input_type === 'number' && (
        <TrendChartModal
          product={product}
          isOpen={isTrendModalOpen}
          onClose={() => setIsTrendModalOpen(false)}
        />
      )}
    </>
  )
} 