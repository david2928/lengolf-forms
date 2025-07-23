"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  colorTheme: string;
  productCount: number;
  description?: string;
}

interface MobileCategorySelectorProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
  className?: string;
}

const MobileCategorySelector: React.FC<MobileCategorySelectorProps> = ({
  categories,
  onCategorySelect,
  className
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Add slight delay for visual feedback
    setTimeout(() => {
      onCategorySelect(categoryId);
    }, 150);
  };

  const getCategoryIcon = (category: Category) => {
    // Map category names to emojis for visual appeal
    const iconMap: Record<string, string> = {
      'DRINK': '🥤',
      'FOOD': '🍽️',
      'GOLF': '⛳',
      'PACKAGES': '📦',
      'EQUIPMENT': '🏌️',
      'MERCHANDISE': '👕',
      'LESSONS': '🎯'
    };
    
    return category.icon || iconMap[category.name.toUpperCase()] || '📂';
  };

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Category
        </h2>
        <p className="text-gray-600">
          Choose a category to browse products
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "p-6 cursor-pointer transition-all duration-200",
                "hover:shadow-lg active:shadow-md",
                "border-2 border-transparent",
                selectedCategory === category.id && "border-blue-500 bg-blue-50"
              )}
              onClick={() => handleCategorySelect(category.id)}
              style={{
                borderLeftColor: category.colorTheme,
                borderLeftWidth: '6px'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Category Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ 
                      backgroundColor: category.colorTheme + '20',
                      border: `2px solid ${category.colorTheme}30`
                    }}
                  >
                    {getCategoryIcon(category)}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {category.displayName}
                    </h3>
                    
                    {category.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {category.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="secondary"
                        className="text-xs"
                        style={{ 
                          backgroundColor: category.colorTheme + '15',
                          color: category.colorTheme 
                        }}
                      >
                        {category.productCount} products
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="ml-4">
                  <ChevronRight 
                    className="w-6 h-6 text-gray-400"
                    style={{ 
                      color: selectedCategory === category.id ? category.colorTheme : undefined 
                    }}
                  />
                </div>
              </div>

              {/* Visual feedback for selection */}
              {selectedCategory === category.id && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="h-1 rounded-full mt-4"
                  style={{ backgroundColor: category.colorTheme }}
                />
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {categories.length}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {categories.reduce((total, cat) => total + cat.productCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Products</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              ⭐
            </div>
            <div className="text-sm text-gray-600">Featured</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCategorySelector;