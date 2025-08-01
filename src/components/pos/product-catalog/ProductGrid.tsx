'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { POSProduct } from '@/types/pos';
import { ProductCard } from './ProductCard';
import { ProductListItem } from './ProductListItem';
import { Grid, List, Loader2, AlertCircle } from 'lucide-react';

export interface ProductGridProps {
  products: POSProduct[];
  onProductSelect: (product: POSProduct) => void;
  onProductQuickAdd?: (product: POSProduct) => void;
  loading?: boolean;
  error?: string;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  enableLazyLoading?: boolean;
  enableVirtualization?: boolean;
  itemsPerPage?: number;
  className?: string;
}

const MOBILE_ITEMS_PER_PAGE = 6; // Show exactly 6 products at once on mobile (3x2 grid)
const ITEM_HEIGHT = 120; // For virtualization

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductSelect,
  onProductQuickAdd,
  loading = false,
  error,
  viewMode = 'grid',
  onViewModeChange,
  enableLazyLoading = true,
  enableVirtualization = false,
  itemsPerPage = MOBILE_ITEMS_PER_PAGE, // Default to 6 items per page for mobile
  className = ''
}) => {
  const [displayedProducts, setDisplayedProducts] = useState<POSProduct[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // For mobile, show all products and make them scrollable
  useEffect(() => {
    setDisplayedProducts(products);
    setHasMore(false); // No pagination needed
  }, [products]);

  // Reset to page 1 when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Load more products
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate async loading
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const newProducts = products.slice(startIndex, endIndex);
    
    setDisplayedProducts(prev => [...prev, ...newProducts]);
    setCurrentPage(nextPage);
    setHasMore(endIndex < products.length);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, currentPage, itemsPerPage, products]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [enableLazyLoading, hasMore, isLoadingMore, loadMore]);

  // Get responsive grid classes - optimized for tablet view
  const getGridClasses = () => {
    const baseClasses = 'grid gap-4 auto-rows-fr';
    
    if (viewMode === 'list') {
      return 'space-y-2 sm:space-y-3';
    }
    
    // Responsive grid: 2 cols mobile, 3 cols tablet (686x991), 4+ cols desktop
    return `${baseClasses} grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
  };

  // Handle product selection with feedback
  const handleProductSelect = useCallback((product: POSProduct) => {
    // Add visual feedback
    const cardElement = document.querySelector(`[data-product-id="${product.id}"]`);
    if (cardElement) {
      cardElement.classList.add('animate-pulse');
      setTimeout(() => {
        cardElement.classList.remove('animate-pulse');
      }, 150);
    }
    
    onProductSelect(product);
  }, [onProductSelect]);

  // Handle quick add with feedback
  const handleQuickAdd = useCallback((product: POSProduct) => {
    // Add visual feedback
    const cardElement = document.querySelector(`[data-product-id="${product.id}"]`);
    if (cardElement) {
      cardElement.classList.add('scale-105', 'shadow-lg');
      setTimeout(() => {
        cardElement.classList.remove('scale-105', 'shadow-lg');
      }, 300);
    }
    
    onProductQuickAdd?.(product);
  }, [onProductQuickAdd]);

  // Render loading state
  if (loading && displayedProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load products</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (displayedProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4h-2M4 9h2" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">No products found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-grid ${className}`}>
      {/* Simple Product Count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {displayedProducts.length} products
          </span>
        </div>
      </div>

      {/* Products Grid/List */}
      <div ref={gridRef} className={getGridClasses()}>
        {displayedProducts.map((product, index) => (
          <div
            key={product.id}
            data-product-id={product.id}
            className="transition-transform duration-200 hover:scale-102"
          >
            {viewMode === 'grid' ? (
              <ProductCard
                product={product}
                onSelect={handleProductSelect}
                onQuickAdd={handleQuickAdd}
                index={index}
              />
            ) : (
              <ProductListItem
                product={product}
                onSelect={handleProductSelect}
                onQuickAdd={handleQuickAdd}
                index={index}
              />
            )}
          </div>
        ))}
      </div>


      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-gray-600">Loading more products...</span>
          </div>
        </div>
      )}

      {/* Load More Trigger (for intersection observer) */}
      {enableLazyLoading && hasMore && (
        <div
          ref={observerRef}
          className="h-4 w-full"
          style={{ minHeight: '1px' }}
        />
      )}
    </div>
  );
};