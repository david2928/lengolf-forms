'use client';

import React from 'react';
import Image from 'next/image';
import { POSProduct } from '@/types/pos';
import { Plus, Star, AlertCircle, Package, Info } from 'lucide-react';

export interface ProductListItemProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
  onQuickAdd?: (product: POSProduct) => void;
  showDescription?: boolean;
  index?: number;
  className?: string;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  onSelect,
  onQuickAdd,
  showDescription = true,
  index,
  className = ''
}) => {
  // Get display color or fallback
  const getDisplayColor = () => {
    if (product.posDisplayColor) {
      return product.posDisplayColor;
    }
    
    const categoryColors = {
      'DRINK': '#3B82F6',
      'FOOD': '#F59E0B',
      'GOLF': '#10B981',
      'PACKAGES': '#8B5CF6',
      'OTHER': '#6B7280'
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
    
    const initials = product.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=80&background=${getDisplayColor().replace('#', '')}&color=fff&bold=true`;
  };

  // Handle item click
  const handleItemClick = () => {
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
    
    return { status: 'active', label: 'Available', color: 'text-green-600' };
  };

  const availability = getAvailabilityStatus();

  return (
    <div
      className={`
        product-list-item bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-md hover:border-gray-300 transition-all duration-200
        cursor-pointer active:scale-99 touch-manipulation
        ${!product.isActive ? 'opacity-60' : ''}
        ${className}
      `}
      onClick={handleItemClick}
    >
      <div className="p-4 flex items-center space-x-4">
        {/* Product Image */}
        <div className="relative flex-shrink-0">
          <Image
            src={getImageUrl()}
            alt={product.name}
            width={64}
            height={64}
            className="w-16 h-16 object-cover rounded-lg"
            loading="lazy"
            unoptimized={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=80&background=f3f4f6&color=6b7280`;
            }}
          />
          
          {/* Category Color Indicator */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: getDisplayColor() }}
          />
        </div>

        {/* Product Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Product Name and Category */}
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-base truncate">
                  {product.name}
                </h3>
                
                {/* Popularity indicator */}
                {product.relevanceScore && product.relevanceScore > 80 && (
                  <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
                )}
                
                {/* Unavailable indicator */}
                {!product.isActive && (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
              </div>
              
              {/* Category */}
              <p className="text-sm text-gray-500 mb-1">
                {product.categoryName}
              </p>
              
              {/* Description */}
              {showDescription && product.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price and Actions */}
            <div className="flex items-center space-x-3 ml-4">
              {/* Price */}
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {formatPrice(product.price)}
                </div>
                {product.unit && (
                  <div className="text-xs text-gray-500">
                    per {product.unit}
                  </div>
                )}
              </div>
              
              {/* Quick Add Button */}
              {onQuickAdd && product.isActive && (
                <button
                  onClick={handleQuickAdd}
                  className="
                    flex items-center justify-center w-10 h-10 bg-indigo-500 text-white rounded-full
                    hover:bg-indigo-600 transition-colors shadow-md
                    active:scale-95
                  "
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {/* SKU */}
            {product.sku && (
              <span className="bg-gray-100 px-2 py-1 rounded font-mono">
                SKU: {product.sku}
              </span>
            )}
            
            {/* Modifiers indicator */}
            {product.modifiers && product.modifiers.length > 0 && (
              <span className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-2 py-1 rounded">
                <Package className="h-3 w-3" />
                <span>{product.modifiers.length} options</span>
              </span>
            )}
            
            {/* Additional info indicator */}
            {product.description && (
              <span className="flex items-center space-x-1">
                <Info className="h-3 w-3" />
                <span>Details available</span>
              </span>
            )}
          </div>
          
          {/* Availability Status */}
          <span className={`font-medium ${availability.color}`}>
            {availability.label}
          </span>
        </div>
      </div>
    </div>
  );
};