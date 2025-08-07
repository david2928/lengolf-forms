'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock, Package2, Star, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  displayOrder: number;
  modifierType: 'time' | 'quantity';
  isRequired: boolean;
  required: boolean;
  priceType: 'fixed' | 'percentage';
  maxSelections: number;
  description?: string;
  options?: Array<{
    id: string;
    name: string;
    priceAdjustment: number;
  }>;
}

export interface POSProductWithModifiers {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  hasModifiers: boolean;
  modifiers: ProductModifier[];
  isActive: boolean;
}

export interface ModifierSelectionModalProps {
  product: POSProductWithModifiers | null;
  isOpen: boolean;
  onComplete: (product: POSProductWithModifiers, selectedModifier: ProductModifier) => void;
  onCancel: () => void;
  onQuickAdd?: (product: POSProductWithModifiers, defaultModifier: ProductModifier) => void;
  className?: string;
}

export const ModifierSelectionModal: React.FC<ModifierSelectionModalProps> = ({
  product,
  isOpen,
  onComplete,
  onCancel,
  onQuickAdd,
  className = ''
}) => {
  const [selectedModifier, setSelectedModifier] = useState<ProductModifier | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Initialize with default modifier when modal opens
  useEffect(() => {
    if (isOpen && product && product.modifiers.length > 0) {
      const defaultModifier = product.modifiers.find(m => m.isDefault) || product.modifiers[0];
      setSelectedModifier(defaultModifier);
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setSelectedModifier(null);
    }
  }, [isOpen, product]);

  if (!product || !product.modifiers.length || !isVisible) {
    return null;
  }

  const sortedModifiers = [...product.modifiers].sort((a, b) => 
    a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)
  );

  const defaultModifier = sortedModifiers.find(m => m.isDefault) || sortedModifiers[0];
  const modifierType = product.modifiers[0]?.modifierType;

  const handleModifierSelect = (modifier: ProductModifier) => {
    setSelectedModifier(modifier);
  };

  const handleComplete = () => {
    if (selectedModifier) {
      onComplete(product, selectedModifier);
    }
  };

  const handleQuickAdd = () => {
    if (onQuickAdd && defaultModifier) {
      onQuickAdd(product, defaultModifier);
    } else if (defaultModifier) {
      onComplete(product, defaultModifier);
    }
  };

  const getIcon = () => {
    return modifierType === 'time' ? Clock : Package2;
  };

  const getTitle = () => {
    if (modifierType === 'time') {
      return 'Select Duration';
    } else if (modifierType === 'quantity') {
      return 'Select Quantity';
    }
    return 'Select Option';
  };

  const Icon = getIcon();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden",
              "max-h-[90vh] flex flex-col",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gray-50 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getTitle()}
                    </h2>
                    <p className="text-sm text-gray-600">{product.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modifier Options - Tablet Optimized Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedModifiers.map((modifier) => {
                  const isSelected = selectedModifier?.id === modifier.id;
                  
                  return (
                    <motion.div
                      key={modifier.id}
                      whileTap={{ scale: 0.98 }}
                      className="relative"
                    >
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md",
                          "border-2",
                          isSelected 
                            ? "border-blue-500 bg-blue-50 shadow-md" 
                            : "border-gray-200 hover:border-gray-300",
                          "min-h-[120px]" // Ensure consistent height for tablet tapping
                        )}
                        onClick={() => handleModifierSelect(modifier)}
                      >
                        <CardContent className="p-4 h-full flex flex-col">
                          {/* Header with consistent height */}
                          <div className="flex items-center justify-between mb-2 h-8">
                            <span className="font-medium text-gray-900 text-base">
                              {modifier.name}
                            </span>
                            {modifier.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          
                          {/* Price with consistent height */}
                          <div className="text-2xl font-bold text-blue-600 mb-2">
                            ฿{modifier.price.toFixed(2)}
                          </div>
                          
                          {/* Status text with fixed height - always reserve space */}
                          <div className="text-xs font-medium mb-4 h-4">
                            {modifier.isDefault && (
                              <span className="text-blue-600">Most Popular</span>
                            )}
                          </div>
                          
                          {/* Selection Indicator - pushed to bottom */}
                          <div className="flex justify-end mt-auto">
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected 
                                ? "border-blue-500 bg-blue-500" 
                                : "border-gray-300"
                            )}>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 border-t px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {defaultModifier && (
                    <Button
                      variant="outline"
                      onClick={handleQuickAdd}
                      className="text-sm"
                    >
                      Quick Add - {defaultModifier.name} (฿{defaultModifier.price.toFixed(2)})
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    disabled={!selectedModifier}
                    className="min-w-[120px]"
                  >
                    Add to Order - ฿{selectedModifier?.price.toFixed(2) || '0.00'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};