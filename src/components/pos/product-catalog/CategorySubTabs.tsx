'use client';

import React from 'react';
import { POSCategory } from '@/types/pos';

export interface CategorySubTabsProps {
  categories: POSCategory[];
  activeCategory?: string;
  onCategoryChange: (categoryId: string | null) => void;
  showProductCounts?: boolean;
  maxVisible?: number;
  className?: string;
}

export const CategorySubTabs: React.FC<CategorySubTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  showProductCounts = true,
  maxVisible = 8,
  className = ''
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  // Sort categories by display order and name
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={`category-sub-tabs ${className}`}>
      <div className="flex overflow-x-auto scrollbar-hide space-x-2 p-3 bg-gray-50">
        {/* Category options */}
        {sortedCategories.slice(0, maxVisible).map((category) => {
          const isActive = activeCategory === category.id;
          const hasProducts = (category.productCount || 0) > 0;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              disabled={!hasProducts}
              className={`
                flex items-center px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 min-w-0 flex-shrink-0
                touch-manipulation select-none
                ${isActive
                  ? 'bg-indigo-500 text-white shadow-md transform scale-105'
                  : hasProducts
                    ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:shadow-sm'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                }
              `}
              style={{ 
                minHeight: '36px', 
                minWidth: '80px',
                backgroundColor: isActive ? undefined : category.colorTheme ? `${category.colorTheme}20` : undefined
              }}
            >
              <div className="flex items-center space-x-2">
                {/* Category icon if available */}
                {category.icon && (
                  <span className="text-sm">{category.icon}</span>
                )}
                
                {/* Category name */}
                <span className="truncate max-w-24">
                  {category.name}
                </span>
                
                {/* Product count badge */}
                {showProductCounts && (category.productCount || 0) > 0 && (
                  <div className={`
                    px-1.5 py-0.5 rounded text-xs font-bold
                    ${isActive
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'bg-gray-500 text-white'
                    }
                  `}>
                    {category.productCount}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Show more indicator if there are hidden categories */}
        {sortedCategories.length > maxVisible && (
          <div className="flex items-center px-3 py-2 text-xs text-gray-500">
            +{sortedCategories.length - maxVisible} more
          </div>
        )}
      </div>

    </div>
  );
};

export default CategorySubTabs;