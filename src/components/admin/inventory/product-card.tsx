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
  BarChart3,
  Banknote,
  DollarSign,
  Link,
  Clock,
  ChevronUp
} from 'lucide-react'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { EditProductModal } from './edit-product-modal'
import { TrendChartModal } from './trend-chart-modal'

interface ProductCardProps {
  product: AdminInventoryProductWithStatus
  onUpdate: () => void
  showCollapseButton?: boolean
  onCollapse?: () => void
}

export function ProductCard({ product, onUpdate, showCollapseButton, onCollapse }: ProductCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isTrendModalOpen, setIsTrendModalOpen] = useState(false)

  const isCashProduct = product.name.toLowerCase().includes('cash')
  
  const getStatusInfo = () => {
    switch (product.reorder_status) {
      case 'REORDER_NEEDED':
        if (isCashProduct) {
          // For cash, "REORDER_NEEDED" means cash is BELOW threshold (needs more cash, not collection)
          return {
            icon: Package,
            color: '#6B7280',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            badgeVariant: 'secondary' as const,
            label: 'Below Collection Threshold'
          }
        }
        return {
          icon: AlertTriangle,
          color: '#B00020',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          label: 'Needs Reorder'
        }
      case 'LOW_STOCK':
        if (isCashProduct) {
          return {
            icon: Package,
            color: '#6B7280',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            badgeVariant: 'secondary' as const,
            label: 'Cash Level OK'
          }
        }
        return {
          icon: Package,
          color: '#C77700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeVariant: 'secondary' as const,
          label: 'Low Stock'
        }
      case 'ADEQUATE':
        if (isCashProduct) {
          return {
            icon: DollarSign,
            color: '#2563EB',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            badgeVariant: 'secondary' as const,
            label: 'Collection Available'
          }
        }
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
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatCashAmount = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getStockPercentage = () => {
    if (!product.reorder_threshold || product.reorder_threshold <= 0 || !product.current_stock) return 0
    return Math.min((product.current_stock / product.reorder_threshold) * 100, 100)
  }

  const getCashProgressBarColor = () => {
    const percentage = getStockPercentage()
    if (isNaN(percentage) || percentage === 0) return 'bg-gray-300'
    
    // For cash: green until 50% of threshold, then yellow to red (needs collection)
    if (percentage <= 50) {
      return 'bg-green-500' // Low-medium cash = green (good)
    } else if (percentage <= 80) {
      return 'bg-yellow-500' // Higher cash = yellow (warning)
    } else {
      return 'bg-red-500' // Very high cash = red (needs collection)
    }
  }

  return (
    <>
      <Card 
        className={`${statusInfo.borderColor} ${statusInfo.bgColor} hover:shadow-md transition-shadow`}
        role="article"
        aria-label={`${product.name}, ${product.current_stock || 0} in stock, status ${statusInfo.label.toLowerCase()}`}
        tabIndex={0}
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
              {/* Last Updated Tooltip */}
              {product.last_updated_at && (
                <div 
                  className="inline-flex items-center mt-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  title={`Last updated: ${new Date(product.last_updated_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} by ${product.last_updated_by || 'Unknown'}`}
                >
                  <Clock className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <Badge 
              variant={statusInfo.badgeVariant} 
              className="ml-1.5 flex items-center gap-0.5 text-xs px-1.5 py-0.5"
              role="status"
              aria-live="polite"
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          {/* Stock Level */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Current Stock</span>
              <span className="font-medium" style={{ color: statusInfo.color }}>
                {product.input_type === 'stock_slider' && product.current_stock_text 
                  ? product.current_stock_text 
                  : isCashProduct 
                    ? formatCashAmount(product.current_stock || 0)
                    : `${product.current_stock || 0} ${product.unit || ''}`}
              </span>
            </div>
            
            {/* Stock Progress Bar - Only show for numeric products */}
            {product.input_type !== 'stock_slider' && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${
                      isCashProduct 
                        ? getCashProgressBarColor()
                        : product.reorder_status === 'REORDER_NEEDED' ? 'bg-red-500' :
                          product.reorder_status === 'LOW_STOCK' ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(getStockPercentage(), 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <div className="flex items-center gap-0.5">
                    <Package className="h-2.5 w-2.5" />
                    <span>
                      {isCashProduct 
                        ? `Collect at: ${product.reorder_threshold ? formatCashAmount(product.reorder_threshold) : 'Not set'}` 
                        : `Reorder at: ${product.reorder_threshold || 'Not set'}`}
                    </span>
                  </div>
                  <span>{Math.round(getStockPercentage())}%</span>
                </div>
              </>
            )}
            
            {/* Stock Slider Status Information */}
            {product.input_type === 'stock_slider' && (
              <div className="text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-0.5">
                  <Package className="h-2.5 w-2.5" />
                  <span>Stock slider product - Status based</span>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Info for stock slider products */}
          {product.input_type === 'stock_slider' && product.supplier && (
            <div className="text-xs">
              <div className="flex items-center gap-0.5 text-muted-foreground mb-0.5">
                <Package className="h-2.5 w-2.5" />
                <span>Supplier</span>
              </div>
              <p className="font-medium text-sm">{product.supplier}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-1.5 pt-1">
            {showCollapseButton && onCollapse && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={onCollapse}
                title="Collapse to summary view"
                aria-label={`Collapse ${product.name} to summary view`}
              >
                <ChevronUp className="h-2.5 w-2.5" />
              </Button>
            )}
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
            
            {/* Show trend button only for numerical products */}
            {product.input_type === 'number' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setIsTrendModalOpen(true)}
                title="View 14-day trend"
                aria-label={`View usage trends for ${product.name}`}
              >
                <BarChart3 className="h-2.5 w-2.5" />
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


      <TrendChartModal
        product={product}
        isOpen={isTrendModalOpen}
        onClose={() => setIsTrendModalOpen(false)}
      />
    </>
  )
} 