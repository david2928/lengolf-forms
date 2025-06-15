'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  AlertTriangle, 
  Package, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { useAdminInventoryOverview } from '@/hooks/use-admin-inventory'
import { ProductCard } from './product-card'
import { CollapsedProductCard } from './collapsed-product-card'
import { InventorySearchFilters } from './inventory-search-filters'
import { InventoryCostModal } from './inventory-cost-modal'
import { AdminInventoryProductWithStatus } from '@/types/inventory'

export function InventoryDashboard() {
  const { data, isLoading, error, mutate } = useAdminInventoryOverview()
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // View toggle state
  const [isConsolidatedView, setIsConsolidatedView] = useState(true)
  
  // Expanded cards state for consolidated view
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  
  // Modal states
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  
  // Section refs for scrolling
  const needsReorderRef = useRef<HTMLDivElement>(null)
  const lowStockRef = useRef<HTMLDivElement>(null)

  const handleRefresh = () => {
    mutate()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
  }

  const handleCostCardClick = () => {
    setIsCostModalOpen(true)
  }

  const handleNeedsReorderClick = () => {
    needsReorderRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }

  const handleLowStockClick = () => {
    lowStockRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }

  const handleCardExpand = (productId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Extract categories and apply filtering
  const { categories, filteredData, resultCounts } = useMemo(() => {
    if (!data?.products) {
      return {
        categories: [],
        filteredData: null,
        resultCounts: { total: 0, filtered: 0 }
      }
    }

    // Extract unique categories from all products
    const allProducts = [
      ...(data.products.needs_reorder || []),
      ...(data.products.low_stock || []),
      ...(data.products.sufficient_stock || [])
    ]

    const uniqueCategories = Array.from(
      new Set(allProducts.map(product => product.category_name))
    ).sort()

    // Apply filters
    const filterProducts = (products: AdminInventoryProductWithStatus[]) => {
      return products.filter(product => {
        const matchesSearch = !searchQuery || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesCategory = selectedCategory === 'all' || 
          product.category_name === selectedCategory

        return matchesSearch && matchesCategory
      })
    }

    const filteredProducts = {
      needs_reorder: filterProducts(data.products.needs_reorder || []),
      low_stock: filterProducts(data.products.low_stock || []),
      sufficient_stock: filterProducts(data.products.sufficient_stock || [])
    }

    const totalCount = allProducts.length
    const filteredCount = filteredProducts.needs_reorder.length + 
                         filteredProducts.low_stock.length + 
                         filteredProducts.sufficient_stock.length

    return {
      categories: uniqueCategories,
      filteredData: {
        summary: {
          ...data.summary,
          needs_reorder_count: filteredProducts.needs_reorder.length,
          low_stock_count: filteredProducts.low_stock.length,
          sufficient_stock_count: filteredProducts.sufficient_stock.length
        },
        products: filteredProducts
      },
      resultCounts: { total: totalCount, filtered: filteredCount }
    }
  }, [data, searchQuery, selectedCategory])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load inventory data. Please refresh the page and try again.
          {error.message && ` Error: ${error.message}`}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleCostCardClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(data?.summary?.total_inventory_value || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current stock valuation • Click for details
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleNeedsReorderClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Reorder</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#B00020' }}>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                data?.summary?.needs_reorder_count || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Items below threshold
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleLowStockClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Package className="h-4 w-4" style={{ color: '#C77700' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#C77700' }}>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                data?.summary?.low_stock_count || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Items running low
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sufficient Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                data?.summary?.sufficient_stock_count || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Items well stocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Product Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Products grouped by reorder status
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isConsolidatedView ? 'Consolidated View' : 'Expanded View'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConsolidatedView(!isConsolidatedView)}
                className="h-8 px-2"
                title={isConsolidatedView ? 'Switch to Expanded View' : 'Switch to Consolidated View'}
              >
                {isConsolidatedView ? (
                  <ToggleRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Sticky Search/Filter Bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4">
          <InventorySearchFilters
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onClearFilters={handleClearFilters}
            categories={categories}
            resultCounts={resultCounts}
          />
        </div>
      </div>

      {/* Product Sections */}
      <div className="space-y-8">
        {/* Needs Reorder Section */}
        <div ref={needsReorderRef}>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Needs Reorder ({filteredData?.summary?.needs_reorder_count || 0})
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredData?.products?.needs_reorder && filteredData.products.needs_reorder.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredData.products.needs_reorder.map((product: any) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onUpdate={handleRefresh}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No items need reordering (with current filters)'
                      : 'No items need reordering'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Low Stock Section */}
        <div ref={lowStockRef}>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800">
              <Package className="h-3 w-3" />
              Low Stock ({filteredData?.summary?.low_stock_count || 0})
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredData?.products?.low_stock && filteredData.products.low_stock.length > 0 ? (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {filteredData.products.low_stock.map((product: any) => (
                 <ProductCard 
                   key={product.id} 
                   product={product} 
                   onUpdate={handleRefresh}
                 />
               ))}
             </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No items are running low (with current filters)'
                      : 'No items are running low'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sufficient Stock Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3" />
              Sufficient Stock ({filteredData?.summary?.sufficient_stock_count || 0})
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredData?.products?.sufficient_stock && filteredData.products.sufficient_stock.length > 0 ? (
            isConsolidatedView ? (
              <div className="space-y-2">
                {filteredData.products.sufficient_stock.map((product: any) => (
                  expandedCards.has(product.id) ? (
                    <div key={product.id} className="border border-green-200 rounded-lg p-1 bg-green-50/50">
                      <ProductCard 
                        product={product} 
                        onUpdate={handleRefresh}
                        showCollapseButton={true}
                        onCollapse={() => handleCardExpand(product.id)}
                      />
                    </div>
                  ) : (
                    <CollapsedProductCard 
                      key={product.id} 
                      product={product} 
                      onUpdate={handleRefresh}
                      isExpanded={expandedCards.has(product.id)}
                      onExpand={() => handleCardExpand(product.id)}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredData.products.sufficient_stock.map((product: any) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onUpdate={handleRefresh}
                  />
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No items with sufficient stock (with current filters)'
                      : 'No items with sufficient stock'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cost Modal */}
      <InventoryCostModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        products={filteredData?.products}
        totalValue={data?.summary?.total_inventory_value || 0}
      />
    </div>
  )
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
} 