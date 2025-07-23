'use client';

import { useState, useCallback, useEffect } from 'react';
import { POSProduct, SelectedModifier } from '@/types/pos';

export interface ProductSelection {
  product: POSProduct;
  quantity: number;
  modifiers: SelectedModifier[];
  notes: string;
  totalPrice: number;
  selectionId: string;
  timestamp: Date;
}

export interface UseProductSelectionOptions {
  onSelectionChange?: (selections: ProductSelection[]) => void;
  maxSelections?: number;
  persistToStorage?: boolean;
  storageKey?: string;
}

export const useProductSelection = (options: UseProductSelectionOptions = {}) => {
  const {
    onSelectionChange,
    maxSelections = 100,
    persistToStorage = false,
    storageKey = 'pos-product-selections'
  } = options;

  const [selections, setSelections] = useState<ProductSelection[]>([]);
  const [recentSelections, setRecentSelections] = useState<ProductSelection[]>([]);

  // Load from storage on mount
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSelections(parsed.selections || []);
          setRecentSelections(parsed.recent || []);
        }
      } catch (error) {
        console.error('Failed to load product selections from storage:', error);
      }
    }
  }, [persistToStorage, storageKey]);

  // Save to storage when selections change
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          selections,
          recent: recentSelections
        }));
      } catch (error) {
        console.error('Failed to save product selections to storage:', error);
      }
    }
  }, [selections, recentSelections, persistToStorage, storageKey]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selections);
  }, [selections, onSelectionChange]);

  // Calculate total price for a product with modifiers
  const calculateTotalPrice = useCallback((
    product: POSProduct,
    quantity: number,
    modifiers: SelectedModifier[]
  ): number => {
    let total = product.price * quantity;

    modifiers.forEach(modifier => {
      if (modifier.priceType === 'fixed') {
        total += modifier.price * modifier.quantity * quantity;
      } else if (modifier.priceType === 'percentage') {
        total += (product.price * (modifier.price / 100)) * modifier.quantity * quantity;
      }

      // Add option price adjustments
      modifier.selectedOptions.forEach(option => {
        total += option.priceAdjustment * modifier.quantity * quantity;
      });
    });

    return total;
  }, []);

  // Add a product selection
  const addSelection = useCallback((
    product: POSProduct,
    quantity: number = 1,
    modifiers: SelectedModifier[] = [],
    notes: string = ''
  ): string => {
    const selectionId = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalPrice = calculateTotalPrice(product, quantity, modifiers);

    const newSelection: ProductSelection = {
      product,
      quantity,
      modifiers,
      notes,
      totalPrice,
      selectionId,
      timestamp: new Date()
    };

    setSelections(prev => {
      const updated = [...prev, newSelection];
      
      // Enforce max selections limit
      if (updated.length > maxSelections) {
        return updated.slice(-maxSelections);
      }
      
      return updated;
    });

    // Add to recent selections (keep last 20)
    setRecentSelections(prev => {
      const updated = [newSelection, ...prev.filter(s => s.product.id !== product.id)];
      return updated.slice(0, 20);
    });

    return selectionId;
  }, [calculateTotalPrice, maxSelections]);

  // Remove a selection
  const removeSelection = useCallback((selectionId: string) => {
    setSelections(prev => prev.filter(s => s.selectionId !== selectionId));
  }, []);

  // Update selection quantity
  const updateSelectionQuantity = useCallback((selectionId: string, quantity: number) => {
    if (quantity <= 0) {
      removeSelection(selectionId);
      return;
    }

    setSelections(prev => prev.map(selection => {
      if (selection.selectionId === selectionId) {
        const totalPrice = calculateTotalPrice(selection.product, quantity, selection.modifiers);
        return {
          ...selection,
          quantity,
          totalPrice
        };
      }
      return selection;
    }));
  }, [calculateTotalPrice, removeSelection]);

  // Update selection modifiers
  const updateSelectionModifiers = useCallback((
    selectionId: string,
    modifiers: SelectedModifier[]
  ) => {
    setSelections(prev => prev.map(selection => {
      if (selection.selectionId === selectionId) {
        const totalPrice = calculateTotalPrice(selection.product, selection.quantity, modifiers);
        return {
          ...selection,
          modifiers,
          totalPrice
        };
      }
      return selection;
    }));
  }, [calculateTotalPrice]);

  // Update selection notes
  const updateSelectionNotes = useCallback((selectionId: string, notes: string) => {
    setSelections(prev => prev.map(selection => {
      if (selection.selectionId === selectionId) {
        return {
          ...selection,
          notes
        };
      }
      return selection;
    }));
  }, []);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelections([]);
  }, []);

  // Find selection by ID
  const findSelection = useCallback((selectionId: string): ProductSelection | undefined => {
    return selections.find(s => s.selectionId === selectionId);
  }, [selections]);

  // Get selections for a specific product
  const getProductSelections = useCallback((productId: string): ProductSelection[] => {
    return selections.filter(s => s.product.id === productId);
  }, [selections]);

  // Quick add product (simplified version)
  const quickAdd = useCallback((product: POSProduct, quantity: number = 1): string => {
    return addSelection(product, quantity, [], '');
  }, [addSelection]);

  // Duplicate a selection
  const duplicateSelection = useCallback((selectionId: string): string | null => {
    const selection = findSelection(selectionId);
    if (!selection) return null;

    return addSelection(
      selection.product,
      selection.quantity,
      selection.modifiers,
      selection.notes
    );
  }, [findSelection, addSelection]);

  // Get total count of selected items
  const getTotalItemCount = useCallback((): number => {
    return selections.reduce((total, selection) => total + selection.quantity, 0);
  }, [selections]);

  // Get total price of all selections
  const getTotalPrice = useCallback((): number => {
    return selections.reduce((total, selection) => total + selection.totalPrice, 0);
  }, [selections]);

  // Get unique products count
  const getUniqueProductsCount = useCallback((): number => {
    const uniqueProductIds = new Set(selections.map(s => s.product.id));
    return uniqueProductIds.size;
  }, [selections]);

  // Group selections by product
  const getGroupedSelections = useCallback((): Record<string, ProductSelection[]> => {
    return selections.reduce((groups, selection) => {
      const productId = selection.product.id;
      if (!groups[productId]) {
        groups[productId] = [];
      }
      groups[productId].push(selection);
      return groups;
    }, {} as Record<string, ProductSelection[]>);
  }, [selections]);

  // Get selection statistics
  const getSelectionStats = useCallback(() => {
    const groupedSelections = getGroupedSelections();
    const categories = new Set(selections.map(s => s.product.categoryName));
    const tabs = new Set(selections.map(s => s.product.categoryName));

    return {
      totalSelections: selections.length,
      totalItems: getTotalItemCount(),
      totalPrice: getTotalPrice(),
      uniqueProducts: getUniqueProductsCount(),
      categoriesCount: categories.size,
      tabsCount: tabs.size,
      categories: Array.from(categories),
      tabs: Array.from(tabs),
      groupedSelections
    };
  }, [selections, getGroupedSelections, getTotalItemCount, getTotalPrice, getUniqueProductsCount]);

  // Export selections (for order creation)
  const exportSelections = useCallback(() => {
    return selections.map(selection => ({
      productId: selection.product.id,
      productName: selection.product.name,
      quantity: selection.quantity,
      unitPrice: selection.product.price,
      totalPrice: selection.totalPrice,
      modifiers: selection.modifiers,
      notes: selection.notes,
      categoryId: selection.product.categoryId,
      categoryName: selection.product.categoryName
    }));
  }, [selections]);

  return {
    // State
    selections,
    recentSelections,

    // Actions
    addSelection,
    removeSelection,
    updateSelectionQuantity,
    updateSelectionModifiers,
    updateSelectionNotes,
    clearSelections,
    quickAdd,
    duplicateSelection,

    // Queries
    findSelection,
    getProductSelections,
    getGroupedSelections,
    getSelectionStats,
    exportSelections,

    // Computed values
    totalItemCount: getTotalItemCount(),
    totalPrice: getTotalPrice(),
    uniqueProductsCount: getUniqueProductsCount(),
    hasSelections: selections.length > 0,
    isEmpty: selections.length === 0,

    // Utils
    calculateTotalPrice
  };
};