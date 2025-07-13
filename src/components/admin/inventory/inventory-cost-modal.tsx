'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminInventoryProductWithStatus } from '@/types/inventory'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface InventoryCostModalProps {
  isOpen: boolean
  onClose: () => void
  products: {
    needs_reorder: AdminInventoryProductWithStatus[]
    low_stock: AdminInventoryProductWithStatus[]
    sufficient_stock: AdminInventoryProductWithStatus[]
  } | undefined
  totalValue: number
}

const COLORS = [
  '#0088FE',
  '#00C49F', 
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF7C7C',
  '#8DD1E1',
  '#D084D0'
]

export function InventoryCostModal({ 
  isOpen, 
  onClose, 
  products,
  totalValue 
}: InventoryCostModalProps) {
  const { costByCategory, expensiveProducts } = useMemo(() => {
    if (!products) {
      return { costByCategory: [], expensiveProducts: [] }
    }

    // Combine all products
    const allProducts = [
      ...(products.needs_reorder || []),
      ...(products.low_stock || []),
      ...(products.sufficient_stock || [])
    ]

    // Calculate cost by category
    const categoryTotals: Record<string, number> = {}
    allProducts.forEach(product => {
      const value = (product.current_stock || 0) * (product.unit_cost || 0)
      if (value > 0) {
        categoryTotals[product.category_name] = (categoryTotals[product.category_name] || 0) + value
      }
    })

    const costByCategory = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Get top 5 most expensive products by total value
    const expensiveProducts = allProducts
      .map(product => ({
        ...product,
        totalValue: (product.current_stock || 0) * (product.unit_cost || 0)
      }))
      .filter(product => product.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)

    return { costByCategory, expensiveProducts }
  }, [products])

  const formatCurrency = (value: number) => {
    return `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / totalValue) * 100).toFixed(1)
      return (
        <div className="bg-white p-3 shadow-lg border rounded-lg">
          <p className="font-medium">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Cost Breakdown</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Enhanced Category Legend with Percentages */}
              <div className="mt-4 space-y-2">
                {costByCategory.map((category, index) => {
                  const percentage = ((category.value / totalValue) * 100).toFixed(1);
                  return (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate" title={category.name}>
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="font-medium block">
                          {formatCurrency(category.value)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Most Expensive Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Most Expensive SKUs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expensiveProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category_name}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {product.current_stock} × {formatCurrency(product.unit_cost || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(product.totalValue)}
                      </p>
                      <Badge 
                        variant={
                          product.reorder_status === 'REORDER_NEEDED' ? 'destructive' :
                          product.reorder_status === 'LOW_STOCK' ? 'secondary' : 'default'
                        }
                        className="text-xs"
                      >
                        {product.reorder_status === 'REORDER_NEEDED' 
                          ? (product.name.toLowerCase().includes('cash') ? 'Collection Needed' : 'Needs Reorder')
                          : product.reorder_status === 'LOW_STOCK' 
                          ? (product.name.toLowerCase().includes('cash') ? 'Near Collection Threshold' : 'Low Stock') 
                          : 'Sufficient'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {expensiveProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No products with cost data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{costByCategory.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {costByCategory.length > 0 ? formatCurrency(costByCategory[0].value) : '฿0.00'}
                </p>
                <p className="text-sm text-muted-foreground">Highest Category</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {expensiveProducts.length > 0 ? formatCurrency(expensiveProducts[0].totalValue) : '฿0.00'}
                </p>
                <p className="text-sm text-muted-foreground">Most Expensive Item</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
} 