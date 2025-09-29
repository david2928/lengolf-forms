'use client';

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Trash2, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  GripVertical
} from 'lucide-react';
import { ProductWithCategory, ProductSort } from '@/types/product-management';
import { cn } from '@/lib/utils';

interface ProductListTableProps {
  products: ProductWithCategory[];
  selectedProducts: string[];
  onProductSelect: (productId: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  sort: ProductSort;
  onSortChange: (sort: ProductSort) => void;
  onProductEdit?: (product: ProductWithCategory) => void;
  onProductView?: (product: ProductWithCategory) => void;
  onProductDelete?: (product: ProductWithCategory) => void;
  onProductReorder?: (productId: string, targetDisplayOrder: number) => void;
  isLoading?: boolean;
  className?: string;
}

interface SortableHeaderProps {
  label: string;
  field: ProductSort['field'];
  currentSort: ProductSort;
  onSortChange: (sort: ProductSort) => void;
  className?: string;
}

function SortableHeader({ label, field, currentSort, onSortChange, className }: SortableHeaderProps) {
  const isActive = currentSort.field === field;
  const direction = isActive ? currentSort.direction : 'asc';
  
  const handleSort = () => {
    const newDirection = isActive && direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction: newDirection });
  };

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        onClick={handleSort}
        className="h-auto p-0 font-semibold hover:bg-transparent hover:text-gray-900 text-gray-700 flex items-center"
      >
        {label}
        <span className="ml-2">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </Button>
    </TableHead>
  );
}

function formatPrice(price: number): string {
  return `฿${price.toLocaleString()}`;
}

function formatProfitMargin(margin: number | null | undefined): string {
  if (margin === null || margin === undefined) return 'N/A';
  return `${margin.toFixed(1)}%`;
}

function getProfitMarginColor(margin: number | null | undefined): string {
  if (margin === null || margin === undefined) return 'text-gray-500';
  if (margin >= 70) return 'text-green-600';
  if (margin >= 50) return 'text-green-500';
  if (margin >= 30) return 'text-yellow-600';
  return 'text-red-600';
}

function getCategoryPath(category: any): string {
  if (!category) return 'Uncategorized';
  if (category.parent?.name) {
    return `${category.parent.name} › ${category.name}`;
  }
  return category.name;
}

export function ProductListTable({
  products,
  selectedProducts,
  onProductSelect,
  onSelectAll,
  isAllSelected,
  isPartiallySelected,
  sort,
  onSortChange,
  onProductEdit,
  onProductView,
  onProductDelete,
  onProductReorder,
  isLoading = false,
  className
}: ProductListTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, product: ProductWithCategory) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: product.id,
      name: product.name,
      display_order: product.display_order
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetProduct: ProductWithCategory) => {
    e.preventDefault();
    const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (draggedData.id === targetProduct.id) return;

    // Call the reorder function if provided
    if (onProductReorder) {
      onProductReorder(draggedData.id, targetProduct.display_order);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Eye className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or create a new product.</p>
          <Button>Add New Product</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="w-12 py-4 px-6">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all products"
                  className={isPartiallySelected ? "data-[state=checked]:bg-gray-400" : ""}
                />
              </TableHead>
              <TableHead className="w-12 py-4 px-2 font-semibold text-gray-700">Order</TableHead>
              <SortableHeader 
                label="Product" 
                field="name" 
                currentSort={sort} 
                onSortChange={onSortChange}
                className="min-w-[200px] font-semibold text-gray-700 py-4 px-6"
              />
              <TableHead className="min-w-[180px] font-semibold text-gray-700 py-4 px-6">Category</TableHead>
              <TableHead className="min-w-[120px] font-semibold text-gray-700 py-4 px-6">Vendor</TableHead>
              <SortableHeader
                label="Price"
                field="price"
                currentSort={sort}
                onSortChange={onSortChange}
                className="text-right font-semibold text-gray-700 py-4 px-6"
              />
              <SortableHeader 
                label="Cost" 
                field="cost" 
                currentSort={sort} 
                onSortChange={onSortChange}
                className="text-right font-semibold text-gray-700 py-4 px-6"
              />
              <TableHead className="text-right font-semibold text-gray-700 py-4 px-6">Margin</TableHead>
              <TableHead className="font-semibold text-gray-700 py-4 px-6">Status</TableHead>
              <TableHead className="w-12 py-4 px-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/50 cursor-move',
                  selectedProducts.includes(product.id) && 'bg-blue-50/50',
                  hoveredRow === product.id && 'bg-gray-50'
                )}
                onMouseEnter={() => setHoveredRow(product.id)}
                onMouseLeave={() => setHoveredRow(null)}
                draggable={onProductReorder ? true : false}
                onDragStart={(e) => onProductReorder && handleDragStart(e, product)}
                onDragOver={handleDragOver}
                onDrop={(e) => onProductReorder && handleDrop(e, product)}
              >
                <TableCell className="py-4 px-6">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => onProductSelect(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>

                <TableCell className="py-4 px-2 text-center">
                  <div className="flex items-center justify-center">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="ml-1 text-sm text-gray-500">{product.display_order || 0}</span>
                  </div>
                </TableCell>
                    
                <TableCell className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        {product.is_custom_product && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                        {!product.show_in_staff_ui && (
                          <Badge variant="outline" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                <TableCell className="py-4 px-6">
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      {(product.category as any)?.parent?.name && (
                        <>
                          <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                            {(product.category as any).parent.name}
                          </span>
                          <span className="text-gray-400">›</span>
                        </>
                      )}
                      <span className="text-gray-900 font-medium">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                    {product.unit && (
                      <p className="text-xs text-muted-foreground mt-1">Unit: {product.unit}</p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-4 px-6">
                  {product.vendor ? (
                    <span className="text-sm text-gray-900 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium">
                      {product.vendor}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right py-4 px-6">
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right py-4 px-6">
                  {product.cost ? (
                    <span className="text-sm text-gray-600">
                      {formatPrice(product.cost)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                <TableCell className="text-right py-4 px-6">
                  <span className={cn(
                    'text-sm font-medium',
                    getProfitMarginColor(product.profit_margin)
                  )}>
                    {formatProfitMargin(product.profit_margin)}
                  </span>
                </TableCell>
                
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      product.is_active ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                    <span className="text-sm text-gray-600">
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell className="py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onProductView && (
                            <DropdownMenuItem onClick={() => onProductView(product)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {onProductEdit && (
                            <DropdownMenuItem onClick={() => onProductEdit(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Product
                            </DropdownMenuItem>
                          )}
                          {product.external_code && (
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              External Code: {product.external_code}
                            </DropdownMenuItem>
                          )}
                          {onProductDelete && (
                            <>
                              <DropdownMenuItem className="text-red-600" onClick={() => onProductDelete(product)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Product
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {/* Mobile Select All */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onSelectAll}
              aria-label="Select all products"
              className={isPartiallySelected ? "data-[state=checked]:bg-gray-400" : ""}
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedProducts.length > 0 
                ? `${selectedProducts.length} selected` 
                : 'Select all'}
            </span>
          </div>
          
          {/* Mobile Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortChange({ field: 'name', direction: 'asc' })}>
                Name A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: 'name', direction: 'desc' })}>
                Name Z-A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: 'price', direction: 'desc' })}>
                Price High-Low
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: 'price', direction: 'asc' })}>
                Price Low-High
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Product Cards */}
        {products.map((product) => (
          <Card 
            key={product.id} 
            className={cn(
              'p-3 transition-colors',
              selectedProducts.includes(product.id) && 'ring-2 ring-blue-400 bg-blue-50/50'
            )}
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => onProductSelect(product.id)}
                  aria-label={`Select ${product.name}`}
                  className="mt-1"
                />
                
                {/* Product Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Product Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {product.name}
                        </h3>
                        {product.is_custom_product && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                        {!product.show_in_staff_ui && (
                          <Badge variant="outline" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      
                      {product.sku && (
                        <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                      )}
                      
                      {product.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {onProductView && (
                          <DropdownMenuItem onClick={() => onProductView(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onProductEdit && (
                          <DropdownMenuItem onClick={() => onProductEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Product
                          </DropdownMenuItem>
                        )}
                        {product.external_code && (
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            External Code: {product.external_code}
                          </DropdownMenuItem>
                        )}
                        {onProductDelete && (
                          <DropdownMenuItem className="text-red-600" onClick={() => onProductDelete(product)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Product
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Category */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500">Category:</span>
                    {(product.category as any)?.parent?.name && (
                      <>
                        <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                          {(product.category as any).parent.name}
                        </span>
                        <span className="text-gray-400">›</span>
                      </>
                    )}
                    <span className="text-gray-900 font-medium">
                      {product.category?.name || 'Uncategorized'}
                    </span>
                  </div>

                  {/* Vendor */}
                  {product.vendor && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-500">Vendor:</span>
                      <span className="text-gray-900 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        {product.vendor}
                      </span>
                    </div>
                  )}

                  {/* Price & Cost Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <div className="font-semibold text-gray-900">
                        {formatPrice(product.price)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost:</span>
                      <div className="font-medium">
                        {product.cost ? formatPrice(product.cost) : '—'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status & Margin */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        product.is_active ? 'bg-green-500' : 'bg-gray-400'
                      )} />
                      <span className="text-xs text-gray-600">
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-xs">
                      <span className="text-gray-500">Margin: </span>
                      <span className={cn(
                        'font-medium',
                        getProfitMarginColor(product.profit_margin)
                      )}>
                        {formatProfitMargin(product.profit_margin)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}