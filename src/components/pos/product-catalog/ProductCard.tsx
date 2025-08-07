'use client';

import React from 'react';
import { POSProduct } from '@/types/pos';
import { Plus, Star, AlertCircle, Package, Clock, Package2, ChevronRight } from 'lucide-react';

export interface ProductCardProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
  onQuickAdd?: (product: POSProduct) => void;
  index?: number;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onQuickAdd,
  index,
  className = ''
}) => {
  // Get display color or fallback
  const getDisplayColor = () => {
    if (product.posDisplayColor) {
      return product.posDisplayColor;
    }
    
    // Default colors by category
    const categoryColors = {
      'DRINK': '#3B82F6', // Blue
      'FOOD': '#F59E0B',  // Orange
      'GOLF': '#10B981',  // Green
      'PACKAGES': '#8B5CF6', // Purple
      'OTHER': '#6B7280'  // Gray
    };
    
    return categoryColors[product.categoryName as keyof typeof categoryColors] || categoryColors.OTHER;
  };

  // Format price with currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Get image URL with fallback
  const getImageUrl = () => {
    if (product.imageUrl) {
      return product.imageUrl;
    }
    
    // Generate a placeholder based on product name
    const initials = product.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=${getDisplayColor().replace('#', '')}&color=fff&bold=true`;
  };

  // Handle card click
  const handleCardClick = () => {
    onSelect(product);
  };

  // Handle quick add click
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd?.(product);
  };

  // Get availability status
  const getAvailabilityStatus = () => {
    if (!product.isActive) {
      return { status: 'inactive', label: 'Unavailable', color: 'text-red-600' };
    }
    
    // Add more availability logic here if needed
    return { status: 'active', label: 'Available', color: 'text-green-600' };
  };

  const availability = getAvailabilityStatus();

  // Get modifier info
  const getModifierInfo = () => {
    if (!product.hasModifiers || !product.modifiers.length) {
      return null;
    }

    const defaultModifier = product.modifiers.find(m => m.isDefault) || product.modifiers[0];
    const modifierType = product.modifiers[0]?.modifierType;
    
    return {
      defaultModifier,
      modifierType,
      icon: modifierType === 'time' ? Clock : Package2,
      count: product.modifiers.length
    };
  };

  const modifierInfo = getModifierInfo();

  // Handle quick add for products with modifiers
  const handleQuickAddWithModifiers = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (modifierInfo?.defaultModifier) {
      // For products with modifiers, quick add uses the default modifier
      onQuickAdd?.(product);
    } else {
      // For products without modifiers, regular quick add
      onQuickAdd?.(product);
    }
  };

  return (
    <div
      className={`
        product-card bg-white rounded-xl border border-slate-200
        hover:shadow-lg hover:border-slate-300 transition-all duration-200
        cursor-pointer active:scale-[0.98] touch-manipulation
        p-4 sm:p-6 flex flex-col items-center text-center
        min-h-[120px] min-w-[140px] sm:min-h-[160px] sm:min-w-[180px]
        ${!product.isActive ? 'opacity-50' : ''}
        ${className}
        relative
      `}
      onClick={handleCardClick}
      data-product-id={product.id}
    >
      {/* Modifier Indicator */}
      {modifierInfo && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
          <modifierInfo.icon className="h-3 w-3" />
        </div>
      )}

      {/* Product Name */}
      <div className="text-sm sm:text-base font-semibold text-slate-900 mb-2 leading-tight h-10 sm:h-12 overflow-hidden">
        <div className="line-clamp-2">
          {product.name}
        </div>
      </div>
      
      {/* Price Display */}
      <div className="mb-3">
        {modifierInfo ? (
          <div className="text-lg sm:text-xl font-bold text-blue-600">
            From {formatPrice(modifierInfo.defaultModifier.price)}
          </div>
        ) : (
          <div className="text-lg sm:text-xl font-bold text-blue-600">
            {formatPrice(product.price)}
          </div>
        )}
      </div>
      
      {product.unit && !modifierInfo && (
        <div className="text-xs sm:text-sm text-slate-500 mb-3">
          per {product.unit}
        </div>
      )}

      {/* Action Buttons */}
      {product.isActive && (
        <div className="mt-auto w-full">
          {modifierInfo && onQuickAdd ? (
            // Products with modifiers: horizontal layout to match single button height
            <div className="flex gap-2">
              <button
                onClick={handleQuickAddWithModifiers}
                className="
                  bg-green-600 text-white px-2 py-2 sm:px-3 sm:py-3 rounded-lg 
                  text-xs sm:text-sm font-medium
                  hover:bg-green-700 transition-colors
                  active:scale-95
                  min-h-[40px] sm:min-h-[48px]
                  flex items-center justify-center flex-1
                "
              >
                1 Hour
              </button>
              
              <button
                onClick={handleCardClick}
                className="
                  bg-blue-600 text-white px-2 py-2 sm:px-3 sm:py-3 rounded-lg 
                  text-xs sm:text-sm font-medium
                  hover:bg-blue-700 transition-colors
                  active:scale-95
                  min-h-[40px] sm:min-h-[48px]
                  flex items-center justify-center gap-1 flex-1
                "
              >
                More
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : (
            // Products without modifiers: single button
            <button
              onClick={handleQuickAdd}
              className="
                bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg 
                text-sm sm:text-base font-medium
                hover:bg-blue-700 transition-colors w-full
                active:scale-95
                min-h-[40px] sm:min-h-[48px]
                flex items-center justify-center gap-2
              "
            >
              Add
            </button>
          )}
        </div>
      )}
      
      {/* Status indicator for inactive products */}
      {!product.isActive && (
        <div className="text-xs text-red-600 font-medium mt-auto">
          Unavailable
        </div>
      )}
    </div>
  );
};