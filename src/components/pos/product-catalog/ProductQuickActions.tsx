'use client';

import React, { useState } from 'react';
import { POSProduct } from '@/types/pos';
import { Plus, Minus, Eye, Heart, Share2, ShoppingCart, Info } from 'lucide-react';

export interface ProductQuickActionsProps {
  product: POSProduct;
  onQuickAdd?: (product: POSProduct, quantity?: number) => void;
  onViewDetails?: (product: POSProduct) => void;
  onAddToFavorites?: (product: POSProduct) => void;
  onShare?: (product: POSProduct) => void;
  showQuantitySelector?: boolean;
  showFavorites?: boolean;
  showShare?: boolean;
  defaultQuantity?: number;
  maxQuantity?: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProductQuickActions: React.FC<ProductQuickActionsProps> = ({
  product,
  onQuickAdd,
  onViewDetails,
  onAddToFavorites,
  onShare,
  showQuantitySelector = true,
  showFavorites = false,
  showShare = false,
  defaultQuantity = 1,
  maxQuantity = 99,
  orientation = 'horizontal',
  size = 'md',
  className = ''
}) => {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'w-8 h-8',
      icon: 'h-3 w-3',
      text: 'text-xs',
      spacing: 'space-x-1'
    },
    md: {
      button: 'w-10 h-10',
      icon: 'h-4 w-4',
      text: 'text-sm',
      spacing: 'space-x-2'
    },
    lg: {
      button: 'w-12 h-12',
      icon: 'h-5 w-5',
      text: 'text-base',
      spacing: 'space-x-3'
    }
  };

  const config = sizeConfig[size];

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!onQuickAdd || isAdding) return;

    setIsAdding(true);
    try {
      await onQuickAdd(product, showQuantitySelector ? quantity : defaultQuantity);
      
      // Reset quantity after successful add
      if (showQuantitySelector) {
        setQuantity(defaultQuantity);
      }
    } catch (error) {
      console.error('Failed to add product:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle favorites toggle
  const handleFavoritesToggle = () => {
    setIsFavorited(!isFavorited);
    if (onAddToFavorites) {
      onAddToFavorites(product);
    }
  };

  // Handle share
  const handleShare = () => {
    if (onShare) {
      onShare(product);
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(product);
    }
  };

  // Get layout classes
  const getLayoutClasses = () => {
    const baseClasses = 'flex items-center';
    
    if (orientation === 'vertical') {
      return `${baseClasses} flex-col space-y-2`;
    }
    
    return `${baseClasses} ${config.spacing}`;
  };

  return (
    <div className={`product-quick-actions ${getLayoutClasses()} ${className}`}>
      {/* Quantity Selector */}
      {showQuantitySelector && (
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className={`
              ${config.button} flex items-center justify-center rounded-md
              bg-white text-gray-600 hover:text-gray-800 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
            `}
          >
            <Minus className={config.icon} />
          </button>
          
          <div className={`
            min-w-12 text-center font-semibold ${config.text}
            px-2 py-1
          `}>
            {quantity}
          </div>
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= maxQuantity}
            className={`
              ${config.button} flex items-center justify-center rounded-md
              bg-white text-gray-600 hover:text-gray-800 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
            `}
          >
            <Plus className={config.icon} />
          </button>
        </div>
      )}

      {/* Add to Cart Button */}
      {onQuickAdd && (
        <button
          onClick={handleAddToCart}
          disabled={!product.isActive || isAdding}
          className={`
            ${config.button} flex items-center justify-center rounded-lg
            bg-indigo-500 text-white hover:bg-indigo-600 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-95 shadow-sm
            ${isAdding ? 'animate-pulse' : ''}
          `}
        >
          {isAdding ? (
            <div className={`${config.icon} animate-spin rounded-full border-2 border-white border-t-transparent`} />
          ) : (
            <ShoppingCart className={config.icon} />
          )}
        </button>
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <button
          onClick={handleViewDetails}
          className={`
            ${config.button} flex items-center justify-center rounded-lg
            bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800
            transition-colors active:scale-95
          `}
        >
          <Info className={config.icon} />
        </button>
      )}

      {/* Favorites Button */}
      {showFavorites && onAddToFavorites && (
        <button
          onClick={handleFavoritesToggle}
          className={`
            ${config.button} flex items-center justify-center rounded-lg
            transition-colors active:scale-95
            ${isFavorited
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }
          `}
        >
          <Heart className={`${config.icon} ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      )}

      {/* Share Button */}
      {showShare && onShare && (
        <button
          onClick={handleShare}
          className={`
            ${config.button} flex items-center justify-center rounded-lg
            bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800
            transition-colors active:scale-95
          `}
        >
          <Share2 className={config.icon} />
        </button>
      )}
    </div>
  );
};

// Simplified quick add button component
export interface QuickAddButtonProps {
  product: POSProduct;
  onAdd: (product: POSProduct) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  product,
  onAdd,
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const handleAdd = async () => {
    if (disabled || isAdding) return;

    setIsAdding(true);
    try {
      await onAdd(product);
    } catch (error) {
      console.error('Failed to add product:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      onClick={handleAdd}
      disabled={disabled || !product.isActive || isAdding}
      className={`
        ${sizeClasses[size]} flex items-center justify-center rounded-full
        bg-indigo-500 text-white hover:bg-indigo-600 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95 shadow-md hover:shadow-lg
        ${isAdding ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {isAdding ? (
        <div className={`${iconSizes[size]} animate-spin rounded-full border-2 border-white border-t-transparent`} />
      ) : (
        <Plus className={iconSizes[size]} />
      )}
    </button>
  );
};