'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { POSProduct } from '@/types/pos';
import { ProductCard } from './ProductCard';
import { ProductListItem } from './ProductListItem';
import { Loader2 } from 'lucide-react';

export interface LazyProductGridProps {
  products: POSProduct[];
  onProductSelect: (product: POSProduct) => void;
  onProductQuickAdd?: (product: POSProduct) => void;
  viewMode?: 'grid' | 'list';
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  enableVirtualization?: boolean;
  loadingDelay?: number;
  className?: string;
}

const DEFAULT_ITEM_HEIGHT = 280; // Grid mode height
const DEFAULT_LIST_HEIGHT = 140; // List mode height
const DEFAULT_OVERSCAN = 5;

export const LazyProductGrid: React.FC<LazyProductGridProps> = ({
  products,
  onProductSelect,
  onProductQuickAdd,
  viewMode = 'grid',
  itemHeight,
  containerHeight = 600,
  overscan = DEFAULT_OVERSCAN,
  enableVirtualization = true,
  loadingDelay = 150,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [loadedItems, setLoadedItems] = useState(new Set<number>());

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();

  // Calculate item dimensions based on view mode
  const actualItemHeight = useMemo(() => {
    if (itemHeight) return itemHeight;
    return viewMode === 'grid' ? DEFAULT_ITEM_HEIGHT : DEFAULT_LIST_HEIGHT;
  }, [itemHeight, viewMode]);

  // Calculate grid columns based on container width
  const columnsCount = useMemo(() => {
    if (viewMode === 'list') return 1;
    
    const minItemWidth = 200;
    const gap = 16;
    const padding = 32;
    const availableWidth = containerSize.width - padding;
    
    return Math.max(1, Math.floor((availableWidth + gap) / (minItemWidth + gap)));
  }, [containerSize.width, viewMode]);

  // Calculate total rows
  const rowsCount = useMemo(() => {
    return Math.ceil(products.length / columnsCount);
  }, [products.length, columnsCount]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!enableVirtualization) {
      return { startIndex: 0, endIndex: products.length - 1 };
    }

    const containerTop = scrollTop;
    const containerBottom = scrollTop + containerSize.height;

    const startRow = Math.max(0, Math.floor(containerTop / actualItemHeight) - overscan);
    const endRow = Math.min(rowsCount - 1, Math.ceil(containerBottom / actualItemHeight) + overscan);

    const startIndex = startRow * columnsCount;
    const endIndex = Math.min(products.length - 1, (endRow + 1) * columnsCount - 1);

    return { startIndex, endIndex };
  }, [scrollTop, containerSize.height, actualItemHeight, rowsCount, columnsCount, overscan, products.length, enableVirtualization]);

  // Get visible items
  const visibleItems = useMemo(() => {
    if (!enableVirtualization) {
      return products.map((product, index) => ({ product, index }));
    }

    const items = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (products[i]) {
        items.push({ product: products[i], index: i });
      }
    }
    return items;
  }, [products, visibleRange, enableVirtualization]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Setup resize observer
  useEffect(() => {
    if (!scrollElementRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserverRef.current.observe(scrollElementRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Loading simulation for items
  useEffect(() => {
    if (loadingDelay === 0) return;

    const newIndices = visibleItems
      .map(item => item.index)
      .filter(index => !loadedItems.has(index));

    if (newIndices.length === 0) return;

    setIsLoading(true);

    const timer = setTimeout(() => {
      setLoadedItems(prev => {
        const newSet = new Set(prev);
        newIndices.forEach(index => newSet.add(index));
        return newSet;
      });
      setIsLoading(false);
    }, loadingDelay);

    return () => clearTimeout(timer);
  }, [visibleItems, loadedItems, loadingDelay]);

  // Calculate item position
  const getItemStyle = useCallback((index: number) => {
    if (!enableVirtualization) return {};

    const row = Math.floor(index / columnsCount);
    const col = index % columnsCount;
    const itemWidth = `calc((100% - ${(columnsCount - 1) * 16}px) / ${columnsCount})`;

    return {
      position: 'absolute' as const,
      top: row * actualItemHeight,
      left: `calc(${col} * (${itemWidth} + 16px))`,
      width: itemWidth,
      height: actualItemHeight - 16, // Account for gap
    };
  }, [enableVirtualization, columnsCount, actualItemHeight]);

  // Get container styles
  const getContainerStyle = () => {
    if (!enableVirtualization) {
      return {
        height: containerHeight,
      };
    }

    return {
      height: containerHeight,
      overflow: 'auto',
    };
  };

  // Get content styles
  const getContentStyle = () => {
    if (!enableVirtualization) return {};

    return {
      height: rowsCount * actualItemHeight,
      position: 'relative' as const,
    };
  };

  // Get grid classes for non-virtualized mode
  const getGridClasses = () => {
    if (enableVirtualization) return '';
    
    if (viewMode === 'list') {
      return 'space-y-4';
    }
    
    return 'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
  };

  return (
    <div
      ref={scrollElementRef}
      className={`lazy-product-grid ${className}`}
      style={getContainerStyle()}
      onScroll={handleScroll}
    >
      <div
        className={getGridClasses()}
        style={getContentStyle()}
      >
        {visibleItems.map(({ product, index }) => {
          const isLoaded = loadingDelay === 0 || loadedItems.has(index);
          const itemStyle = enableVirtualization ? getItemStyle(index) : {};

          if (!isLoaded) {
            return (
              <div
                key={index}
                style={itemStyle}
                className="flex items-center justify-center bg-gray-100 rounded-lg"
              >
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading...</p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={product.id}
              style={itemStyle}
              className={enableVirtualization ? '' : 'transition-transform duration-200 hover:scale-102'}
            >
              {viewMode === 'grid' ? (
                <ProductCard
                  product={product}
                  onSelect={onProductSelect}
                  onQuickAdd={onProductQuickAdd}
                  index={index}
                />
              ) : (
                <ProductListItem
                  product={product}
                  onSelect={onProductSelect}
                  onQuickAdd={onProductQuickAdd}
                  index={index}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Loading indicator for lazy loading */}
      {isLoading && enableVirtualization && (
        <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && enableVirtualization && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Visible: {visibleRange.startIndex}-{visibleRange.endIndex}</div>
          <div>Total: {products.length}</div>
          <div>Columns: {columnsCount}</div>
          <div>Loaded: {loadedItems.size}</div>
        </div>
      )}
    </div>
  );
};

// Hook for easier usage
export const useLazyProductGrid = (options: {
  products: POSProduct[];
  containerHeight?: number;
  viewMode?: 'grid' | 'list';
  enableVirtualization?: boolean;
}) => {
  const { products, containerHeight = 600, viewMode = 'grid', enableVirtualization = true } = options;

  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const itemHeight = viewMode === 'grid' ? DEFAULT_ITEM_HEIGHT : DEFAULT_LIST_HEIGHT;
  const itemsPerView = Math.ceil(containerHeight / itemHeight);

  useEffect(() => {
    const start = Math.floor(scrollPosition / itemHeight);
    const end = Math.min(products.length - 1, start + itemsPerView + DEFAULT_OVERSCAN);
    setVisibleRange({ start, end });
  }, [scrollPosition, itemHeight, itemsPerView, products.length]);

  return {
    visibleRange,
    setScrollPosition,
    itemHeight,
    itemsPerView,
    totalHeight: products.length * itemHeight,
  };
};