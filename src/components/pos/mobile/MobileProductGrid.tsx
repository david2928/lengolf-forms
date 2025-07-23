"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Minus, 
  Search, 
  Filter, 
  Star,
  Clock,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  posDisplayColor?: string;
  image?: string;
  isActive: boolean;
  isFeatured?: boolean;
  isSimUsage?: boolean;
  preparationTime?: number;
  unit?: string;
}

interface MobileProductGridProps {
  products: Product[];
  categoryName: string;
  onProductSelect: (product: Product, quantity: number) => void;
  onQuantityChange?: (productId: string, quantity: number) => void;
  className?: string;
}

const MobileProductGrid: React.FC<MobileProductGridProps> = ({
  products,
  categoryName,
  onProductSelect,
  onQuantityChange,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'featured'>('featured');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => 
      product.isActive && 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'featured':
        default:
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.name.localeCompare(b.name);
      }
    });

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
    
    onQuantityChange?.(productId, newQuantity);
  };

  const handleAddToOrder = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    onProductSelect(product, quantity);
    
    // Reset quantity after adding
    setQuantities(prev => ({
      ...prev,
      [product.id]: 0
    }));
  };

  const getProductInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with Search */}
      <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {categoryName}
          </h2>
          <p className="text-sm text-gray-600">
            {filteredProducts.length} products available
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 text-base"
          />
        </div>

        {/* Filter and Sort */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="featured">Featured First</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price Low-High</option>
          </select>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer">
                  SIM Products
                </Badge>
                <Badge variant="outline" className="cursor-pointer">
                  Under ฿100
                </Badge>
                <Badge variant="outline" className="cursor-pointer">
                  Quick Prep
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Grid */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Card 
                className={cn(
                  "relative overflow-hidden h-full",
                  "transition-all duration-200",
                  "hover:shadow-lg active:shadow-md active:scale-98"
                )}
                style={{
                  borderColor: product.posDisplayColor || '#E5E7EB',
                  borderWidth: '2px'
                }}
              >
                {/* Featured Badge */}
                {product.isFeatured && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}

                {/* Product Image or Icon */}
                <div 
                  className="h-32 flex items-center justify-center relative"
                  style={{ 
                    backgroundColor: product.posDisplayColor ? 
                      product.posDisplayColor + '15' : '#F3F4F6' 
                  }}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold text-white"
                      style={{ backgroundColor: product.posDisplayColor || '#6B7280' }}
                    >
                      {getProductInitials(product.name)}
                    </div>
                  )}

                  {/* Quick indicators */}
                  <div className="absolute top-2 right-2 flex flex-col space-y-1">
                    {product.isSimUsage && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        SIM
                      </Badge>
                    )}
                    {product.preparationTime && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        <Clock className="w-3 h-3 mr-1" />
                        {product.preparationTime}m
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">
                    {product.name}
                  </h3>
                  
                  {product.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        ฿{product.price.toFixed(2)}
                      </span>
                      {product.unit && (
                        <span className="text-xs text-gray-500 ml-1">
                          /{product.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleQuantityChange(
                          product.id, 
                          Math.max(0, (quantities[product.id] || 0) - 1)
                        )}
                        disabled={(quantities[product.id] || 0) === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {quantities[product.id] || 0}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleQuantityChange(
                          product.id, 
                          (quantities[product.id] || 0) + 1
                        )}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddToOrder(product)}
                      className="flex-1 ml-3"
                      disabled={(quantities[product.id] || 0) === 0}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProductGrid;