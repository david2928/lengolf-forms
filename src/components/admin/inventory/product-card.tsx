'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Edit, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Package,
  CheckCircle,
  ShoppingCart,
  BarChart3
} from 'lucide-react'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { EditProductModal } from './edit-product-modal'
import { PurchaseLinkModal } from './purchase-link-modal'
import { TrendChartModal } from './trend-chart-modal'

interface ProductCardProps {
  product: AdminInventoryProductWithStatus
  onUpdate: () => void
}

export function ProductCard({ product, onUpdate }: ProductCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false)

  const getStatusInfo = () => {
    switch (product.reorder_status) {
      case 'REORDER_NEEDED':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          label: 'Needs Reorder'
        }
      case 'LOW_STOCK':
        return {
          icon: Package,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeVariant: 'secondary' as const,
          label: 'Low Stock'
        }
      case 'ADEQUATE':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'secondary' as const,
          label: 'Sufficient Stock'
        }
      default:
        return {
          icon: Package,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'secondary' as const,
          label: 'Unknown'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStockPercentage = () => {
    if (!product.reorder_threshold || product.reorder_threshold <= 0 || !product.current_stock) return 0
    return Math.min((product.current_stock / product.reorder_threshold) * 100, 100)
  }

  return (
    <>
      <Card className={`${statusInfo.borderColor} ${statusInfo.bgColor} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-medium leading-tight">
                {product.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {product.category_name}
              </p>
            </div>
            <Badge variant={statusInfo.badgeVariant} className="ml-2 flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stock Level */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Current Stock</span>
              <span className={`font-medium ${statusInfo.color}`}>
                {product.current_stock || 0} {product.unit || ''}
              </span>
            </div>
            
            {/* Stock Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  product.reorder_status === 'REORDER_NEEDED' ? 'bg-red-500' :
                  product.reorder_status === 'LOW_STOCK' ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(getStockPercentage(), 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>Reorder at: {product.reorder_threshold || 'Not set'}</span>
              <span>{Math.round(getStockPercentage())}%</span>
            </div>
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            
            {/* Show trend button only for numerical products */}
            {product.input_type === 'number' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTrendModalOpen(true)}
                title="View 14-day trend"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
            )}
            
            {product.purchase_link && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPurchaseModalOpen(true)}
                title="Purchase information"
              >
                <ShoppingCart className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EditProductModal
        product={product}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
      />

      <PurchaseLinkModal
        product={product}
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      <TrendChartModal
        product={product}
        isOpen={isTrendModalOpen}
        onClose={() => setIsTrendModalOpen(false)}
      />
    </>
  )
} 