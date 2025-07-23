'use client';

import { useCallback } from 'react';
import { POSProduct, SelectedModifier, OrderItem } from '@/types/pos';

export interface UseProductToOrderOptions {
  vatRate?: number;
  currency?: string;
  onOrderItemCreated?: (orderItem: OrderItem) => void;
  validateProduct?: (product: POSProduct) => Promise<boolean> | boolean;
  validateModifiers?: (modifiers: SelectedModifier[]) => Promise<boolean> | boolean;
}

export const useProductToOrder = (options: UseProductToOrderOptions = {}) => {
  const {
    vatRate = 0.07, // 7% VAT for Thailand
    currency = 'THB',
    onOrderItemCreated,
    validateProduct,
    validateModifiers
  } = options;

  // Generate unique order item ID
  const generateOrderItemId = useCallback((): string => {
    return `order-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate modifier price for quantity
  const calculateModifierPrice = useCallback((
    modifier: SelectedModifier,
    basePrice: number,
    quantity: number
  ): number => {
    let modifierPrice = 0;

    // Base modifier price
    if (modifier.priceType === 'fixed') {
      modifierPrice += modifier.price * modifier.quantity;
    } else if (modifier.priceType === 'percentage') {
      modifierPrice += (basePrice * (modifier.price / 100)) * modifier.quantity;
    }

    // Add option price adjustments
    modifier.selectedOptions.forEach(option => {
      modifierPrice += option.priceAdjustment * modifier.quantity;
    });

    return modifierPrice * quantity;
  }, []);

  // Calculate total price for product with modifiers
  const calculateTotalPrice = useCallback((
    product: POSProduct,
    quantity: number,
    modifiers: SelectedModifier[]
  ): { subtotal: number; modifiersTotal: number; total: number } => {
    const basePrice = product.price * quantity;
    let modifiersTotal = 0;

    modifiers.forEach(modifier => {
      modifiersTotal += calculateModifierPrice(modifier, product.price, quantity);
    });

    const total = basePrice + modifiersTotal;

    return {
      subtotal: basePrice,
      modifiersTotal,
      total
    };
  }, [calculateModifierPrice]);

  // Convert product to order item
  const convertToOrderItem = useCallback(async (
    product: POSProduct,
    quantity: number = 1,
    modifiers: SelectedModifier[] = [],
    notes?: string
  ): Promise<OrderItem> => {
    // Validate product
    if (validateProduct) {
      const isValid = await validateProduct(product);
      if (!isValid) {
        throw new Error(`Product ${product.name} is not valid for ordering`);
      }
    }

    // Check product availability
    if (!product.isActive) {
      throw new Error(`Product ${product.name} is not available`);
    }

    // Validate modifiers
    if (validateModifiers && modifiers.length > 0) {
      const areValidModifiers = await validateModifiers(modifiers);
      if (!areValidModifiers) {
        throw new Error('One or more modifiers are not valid');
      }
    }

    // Validate required modifiers
    if (product.modifiers) {
      const requiredModifiers = product.modifiers.filter(m => m.required);
      
      for (const requiredModifier of requiredModifiers) {
        const hasModifier = modifiers.some(m => m.modifierId === requiredModifier.id);
        if (!hasModifier) {
          throw new Error(`Required modifier "${requiredModifier.name}" is missing`);
        }
      }
    }

    // Calculate pricing
    const { subtotal, modifiersTotal, total } = calculateTotalPrice(product, quantity, modifiers);

    // Create order item
    const orderItem: OrderItem = {
      id: generateOrderItemId(),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalPrice: total,
      modifiers,
      notes: notes || '',
      categoryId: product.categoryId,
      categoryName: product.categoryName || ''
    };

    // Notify callback
    if (onOrderItemCreated) {
      onOrderItemCreated(orderItem);
    }

    return orderItem;
  }, [
    validateProduct,
    validateModifiers,
    calculateTotalPrice,
    generateOrderItemId,
    onOrderItemCreated
  ]);

  // Quick convert (no modifiers)
  const quickConvert = useCallback(async (
    product: POSProduct,
    quantity: number = 1,
    notes?: string
  ): Promise<OrderItem> => {
    return convertToOrderItem(product, quantity, [], notes);
  }, [convertToOrderItem]);

  // Convert multiple products at once
  const convertMultiple = useCallback(async (
    products: Array<{
      product: POSProduct;
      quantity: number;
      modifiers?: SelectedModifier[];
      notes?: string;
    }>
  ): Promise<OrderItem[]> => {
    const orderItems: OrderItem[] = [];
    const errors: string[] = [];

    for (const item of products) {
      try {
        const orderItem = await convertToOrderItem(
          item.product,
          item.quantity,
          item.modifiers || [],
          item.notes
        );
        orderItems.push(orderItem);
      } catch (error) {
        errors.push(`${item.product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to convert some products: ${errors.join(', ')}`);
    }

    return orderItems;
  }, [convertToOrderItem]);

  // Update order item quantity
  const updateOrderItemQuantity = useCallback((
    orderItem: OrderItem,
    newQuantity: number
  ): OrderItem => {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Recalculate total price
    const basePrice = orderItem.unitPrice * newQuantity;
    let modifiersTotal = 0;

    orderItem.modifiers.forEach(modifier => {
      modifiersTotal += calculateModifierPrice(modifier, orderItem.unitPrice, newQuantity);
    });

    return {
      ...orderItem,
      quantity: newQuantity,
      totalPrice: basePrice + modifiersTotal
    };
  }, [calculateModifierPrice]);

  // Update order item modifiers
  const updateOrderItemModifiers = useCallback((
    orderItem: OrderItem,
    newModifiers: SelectedModifier[]
  ): OrderItem => {
    // Recalculate total price
    const basePrice = orderItem.unitPrice * orderItem.quantity;
    let modifiersTotal = 0;

    newModifiers.forEach(modifier => {
      modifiersTotal += calculateModifierPrice(modifier, orderItem.unitPrice, orderItem.quantity);
    });

    return {
      ...orderItem,
      modifiers: newModifiers,
      totalPrice: basePrice + modifiersTotal
    };
  }, [calculateModifierPrice]);

  // Update order item notes
  const updateOrderItemNotes = useCallback((
    orderItem: OrderItem,
    notes: string
  ): OrderItem => {
    return {
      ...orderItem,
      notes
    };
  }, []);

  // Calculate order summary
  const calculateOrderSummary = useCallback((orderItems: OrderItem[]) => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    return {
      itemCount: orderItems.length,
      totalQuantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      vatAmount,
      vatRate,
      total,
      currency,
      orderItems
    };
  }, [vatRate, currency]);

  // Format price
  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  }, [currency]);

  // Get modifier summary for display
  const getModifierSummary = useCallback((modifiers: SelectedModifier[]): string => {
    if (modifiers.length === 0) return '';

    const summaries = modifiers.map(modifier => {
      let summary = modifier.modifierName;
      
      if (modifier.quantity > 1) {
        summary += ` x${modifier.quantity}`;
      }
      
      if (modifier.selectedOptions.length > 0) {
        const optionNames = modifier.selectedOptions.map(opt => opt.optionName);
        summary += ` (${optionNames.join(', ')})`;
      }
      
      return summary;
    });

    return summaries.join(', ');
  }, []);

  // Validate order item
  const validateOrderItem = useCallback((orderItem: OrderItem): boolean => {
    // Basic validations
    if (!orderItem.id || !orderItem.productId || !orderItem.productName) {
      return false;
    }

    if (orderItem.quantity <= 0 || orderItem.unitPrice < 0 || orderItem.totalPrice < 0) {
      return false;
    }

    // Validate modifiers
    for (const modifier of orderItem.modifiers) {
      if (!modifier.modifierId || !modifier.modifierName || modifier.quantity <= 0) {
        return false;
      }
    }

    return true;
  }, []);

  return {
    // Main conversion functions
    convertToOrderItem,
    quickConvert,
    convertMultiple,

    // Order item updates
    updateOrderItemQuantity,
    updateOrderItemModifiers,
    updateOrderItemNotes,

    // Calculations
    calculateTotalPrice,
    calculateModifierPrice,
    calculateOrderSummary,

    // Utilities
    formatPrice,
    getModifierSummary,
    validateOrderItem,
    generateOrderItemId,

    // Configuration
    vatRate,
    currency
  };
};