'use client';

import React from 'react';
import { Coffee, Utensils, Flag, Package, MoreHorizontal, Folder } from 'lucide-react';

export interface CategoryTabsProps {
  categories: any[]; // Dynamic categories from database
  activeTab: string;
  onTabChange: (categoryId: string) => void;
  showProductCounts?: boolean;
  className?: string;
}

// Dynamic icon mapping based on category name
const getIconForCategory = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('drink') || name.includes('beverage')) return Coffee;
  if (name.includes('food') || name.includes('meal')) return Utensils;
  if (name.includes('golf') || name.includes('sport')) return Flag;
  if (name.includes('package')) return Package;
  return Folder; // Default icon
};

// Dynamic color mapping based on category name
const getColorForCategory = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('drink') || name.includes('beverage')) return { 
    color: 'text-blue-600', activeColor: 'text-blue-700' 
  };
  if (name.includes('food') || name.includes('meal')) return { 
    color: 'text-orange-600', activeColor: 'text-orange-700' 
  };
  if (name.includes('golf') || name.includes('sport')) return { 
    color: 'text-green-600', activeColor: 'text-green-700' 
  };
  if (name.includes('package')) return { 
    color: 'text-purple-600', activeColor: 'text-purple-700' 
  };
  return { color: 'text-gray-600', activeColor: 'text-gray-700' }; // Default
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeTab,
  onTabChange,
  showProductCounts = true,
  className = ''
}) => {
  return (
    <div className={`category-tabs ${className}`}>
      {/* Dynamic Tab Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide bg-white border-b border-gray-200">
        {categories.map((category) => {
          const isActive = activeTab === category.id;
          const productCount = category.productCount || 0;
          const IconComponent = getIconForCategory(category.name);
          const colors = getColorForCategory(category.name);
          
          return (
            <button
              key={category.id}
              onClick={() => onTabChange(category.id)}
              className={`
                flex items-center justify-center px-6 py-4 min-w-0 flex-shrink-0
                transition-all duration-200 ease-in-out
                touch-manipulation select-none
                ${isActive 
                  ? 'bg-slate-50 border-b-2 border-slate-800 text-slate-800' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }
              `}
              style={{ minHeight: '60px', minWidth: '120px' }}
            >
              <div className="flex flex-col items-center space-y-1">
                <IconComponent 
                  className={`h-5 w-5 ${isActive ? colors.activeColor : colors.color}`} 
                />
                <span className="font-medium text-sm">
                  {category.name}
                </span>
                {showProductCounts && productCount > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${isActive 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-200 text-slate-700'
                    }
                  `}>
                    {productCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Clean Status Bar */}
      {showProductCounts && (
        <div className="px-4 py-2 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {categories.find(cat => cat.id === activeTab)?.name || 'All Categories'}
            </span>
            <span className="text-xs text-slate-500">
              {categories.find(cat => cat.id === activeTab)?.productCount || 0} items
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTabs;