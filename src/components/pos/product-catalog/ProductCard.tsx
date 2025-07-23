'use client';

import React from 'react';
import { POSProduct } from '@/types/pos';
import { Plus, Star, AlertCircle, Package } from 'lucide-react';

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

  return (
    <div
      className={`
        product-card bg-white rounded-xl border border-slate-200
        hover:shadow-lg hover:border-slate-300 transition-all duration-200
        cursor-pointer active:scale-[0.98] touch-manipulation
        p-4 flex flex-col items-center text-center
        ${!product.isActive ? 'opacity-50' : ''}
        ${className}
      `}
      onClick={handleCardClick}
      style={{ minHeight: '120px', minWidth: '140px' }}
    >
      {/* Product Name */}
      <div className="text-sm font-semibold text-slate-900 mb-2 leading-tight h-10 overflow-hidden">
        <div className="line-clamp-2">
          {product.name}
        </div>
      </div>
      
      {/* Price */}
      <div className="text-lg font-bold text-blue-600 mb-3">
        {formatPrice(product.price)}
      </div>
      
      {product.unit && (
        <div className="text-xs text-slate-500 mb-3">
          per {product.unit}
        </div>
      )}

      {/* Quick Add Button */}
      {onQuickAdd && product.isActive && (
        <button
          onClick={handleQuickAdd}
          className="
            bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium
            hover:bg-blue-700 transition-colors w-full
            active:scale-95 mt-auto
          "
        >
          Add
        </button>
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