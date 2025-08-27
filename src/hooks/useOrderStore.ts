'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Order, OrderItem, POSProduct, SelectedModifier, TableSession, Customer } from '@/types/pos';

// Order API endpoints
const ORDER_ENDPOINTS = {
  create: '/api/pos/orders',
  update: (id: string) => `/api/pos/orders/${id}`,
  get: (id: string) => `/api/pos/orders/${id}`,
  list: '/api/pos/orders',
  tableOrders: (tableSessionId: string) => `/api/pos/orders?tableSessionId=${tableSessionId}`
};

// Custom fetcher for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
};

// Order calculation utilities
const calculateModifierTotal = (modifiers: SelectedModifier[], basePrice: number, quantity: number): number => {
  return modifiers.reduce((total, modifier) => {
    let modifierPrice = 0;
    
    if (modifier.priceType === 'fixed') {
      modifierPrice = modifier.price * modifier.quantity;
    } else if (modifier.priceType === 'percentage') {
      modifierPrice = (basePrice * (modifier.price / 100)) * modifier.quantity;
    }
    
    // Add option price adjustments
    modifier.selectedOptions.forEach(option => {
      modifierPrice += option.priceAdjustment * modifier.quantity;
    });
    
    return total + (modifierPrice * quantity);
  }, 0);
};

const calculateItemTotal = (item: OrderItem): number => {
  const basePrice = item.unitPrice * item.quantity;
  const modifierTotal = calculateModifierTotal(item.modifiers, item.unitPrice, item.quantity);
  return basePrice + modifierTotal;
};

const calculateOrderTotals = (items: OrderItem[], vatRate: number = 0.07) => {
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const modifiersTotal = items.reduce((total, item) => 
    total + calculateModifierTotal(item.modifiers, item.unitPrice, item.quantity), 0
  );
  
  // Order-level discounts removed - only item-level and session-level discounts remain
  const subtotalAfterDiscount = subtotal + modifiersTotal;
  // Extract VAT from VAT-inclusive price (prices already include VAT)
  const vatAmount = subtotalAfterDiscount * vatRate / (1 + vatRate);
  const total = subtotalAfterDiscount; // Total is same as subtotal since VAT is already included
  
  return {
    itemCount: items.length,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    modifiersTotal,
    vatAmount,
    total
  };
};

// Generate unique IDs
const generateOrderId = (): string => {
  return `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateOrderNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${dateStr}-${timeStr}`;
};

const generateOrderItemId = (): string => {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Interface for order management hook
interface UseOrderManagerOptions {
  tableSessionId?: string;
  orderId?: string;
  autoSave?: boolean;
  vatRate?: number;
}

interface OrderManagerReturn {
  // Current order state
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  
  // Order management
  createOrder: (tableSession?: TableSession, customer?: Customer) => Promise<Order>;
  clearOrder: () => void;
  saveOrder: () => Promise<void>;
  
  // Item management
  addItem: (product: POSProduct, quantity?: number, modifiers?: SelectedModifier[], notes?: string) => Promise<void>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  updateItemModifiers: (itemId: string, modifiers: SelectedModifier[]) => Promise<void>;
  updateItemNotes: (itemId: string, notes: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  
  // Bulk operations
  addMultipleItems: (items: Array<{ product: POSProduct; quantity: number; modifiers?: SelectedModifier[]; notes?: string }>) => Promise<void>;
  clearAllItems: () => Promise<void>;
  duplicateItem: (itemId: string) => Promise<void>;
  
  // Order-level discount management removed - now using session-level and item-level discounts only
  
  // Order calculations
  getOrderSummary: () => {
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
    modifiersTotal: number;
    vatAmount: number;
    total: number;
  };
  
  // Utility functions
  refreshOrder: () => Promise<void>;
}

/**
 * Order Management Hook using SWR
 * 
 * Provides comprehensive order management functionality with optimistic updates,
 * automatic synchronization, and error handling.
 */
export const useOrderManager = (options: UseOrderManagerOptions = {}): OrderManagerReturn => {
  const { tableSessionId, orderId, autoSave = true, vatRate = 0.07 } = options;
  
  // Local state for current order (optimistic updates)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // SWR for order data synchronization
  const { data: serverOrder, mutate: mutateOrder } = useSWR(
    orderId ? ORDER_ENDPOINTS.get(orderId) : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000
    }
  );
  
  // SWR for table orders (when tableSessionId is provided)
  const { data: tableOrders, mutate: mutateTableOrders } = useSWR(
    tableSessionId ? ORDER_ENDPOINTS.tableOrders(tableSessionId) : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  );
  
  // Save order to server
  const saveOrderToServer = useCallback(async (order: Order): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        order.id ? ORDER_ENDPOINTS.update(order.id) : ORDER_ENDPOINTS.create,
        {
          method: order.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(order)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to save order');
      }
      
      const savedOrder = await response.json();
      setCurrentOrder(savedOrder);
      
      // Mutate relevant SWR caches
      if (orderId) {
        mutateOrder(savedOrder);
      }
      if (tableSessionId) {
        mutateTableOrders();
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save order');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [orderId, tableSessionId, mutateOrder, mutateTableOrders]);
  
  // Optimistic update helper
  const updateOrderOptimistically = useCallback(async (updater: (order: Order) => Order) => {
    if (!currentOrder) return;
    
    const optimisticOrder = updater(currentOrder);
    setCurrentOrder(optimisticOrder);
    
    if (autoSave) {
      try {
        await saveOrderToServer(optimisticOrder);
      } catch (error) {
        // Revert on error
        setCurrentOrder(currentOrder);
        throw error;
      }
    }
  }, [currentOrder, autoSave, saveOrderToServer]);
  
  // Order management functions
  const createOrder = useCallback(async (tableSession?: TableSession, customer?: Customer): Promise<Order> => {
    const order: Order = {
      id: generateOrderId(),
      orderNumber: generateOrderNumber(),
      tableSessionId: tableSession?.id,
      customerId: customer?.id,
      staffPin: '', // Will be set by staff authentication
      items: [],
      status: 'draft',
      totalAmount: 0,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setCurrentOrder(order);
    setError(null);
    
    // Only save to server if autoSave is enabled and we have a valid order
    if (autoSave && tableSession?.id) {
      try {
        await saveOrderToServer(order);
      } catch (error) {
        console.warn('Failed to save order to server, continuing with local order:', error);
        // Continue with local order even if server save fails
      }
    }
    
    return order;
  }, [autoSave, saveOrderToServer]);
  
  const clearOrder = useCallback(() => {
    setCurrentOrder(null);
    setError(null);
  }, []);
  
  const saveOrder = useCallback(async () => {
    if (!currentOrder) {
      setError('No order to save');
      return;
    }
    
    await saveOrderToServer(currentOrder);
  }, [currentOrder, saveOrderToServer]);
  
  // Item management functions
  const addItem = useCallback(async (
    product: POSProduct,
    quantity: number = 1,
    modifiers: SelectedModifier[] = [],
    notes: string = ''
  ) => {
    if (!currentOrder) {
      setError('No active order to add items to');
      return;
    }
    
    const orderItem: OrderItem = {
      id: generateOrderItemId(),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      totalPrice: 0,
      modifiers,
      notes,
      categoryId: product.categoryId,
      categoryName: product.categoryName || ''
    };
    
    orderItem.totalPrice = calculateItemTotal(orderItem);
    
    await updateOrderOptimistically(order => {
      const updatedItems = [...order.items, orderItem];
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically]);
  
  const removeItem = useCallback(async (itemId: string) => {
    if (!currentOrder) return;
    
    await updateOrderOptimistically(order => {
      const updatedItems = order.items.filter(item => item.id !== itemId);
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically]);
  
  const updateItemQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!currentOrder) return;
    
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }
    
    await updateOrderOptimistically(order => {
      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity };
          updatedItem.totalPrice = calculateItemTotal(updatedItem);
          return updatedItem;
        }
        return item;
      });
      
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically, removeItem]);
  
  const updateItemModifiers = useCallback(async (itemId: string, modifiers: SelectedModifier[]) => {
    if (!currentOrder) return;
    
    await updateOrderOptimistically(order => {
      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, modifiers };
          updatedItem.totalPrice = calculateItemTotal(updatedItem);
          return updatedItem;
        }
        return item;
      });
      
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically]);
  
  const updateItemNotes = useCallback(async (itemId: string, notes: string) => {
    if (!currentOrder) return;
    
    await updateOrderOptimistically(order => ({
      ...order,
      items: order.items.map(item => 
        item.id === itemId ? { ...item, notes } : item
      ),
      updatedAt: new Date()
    }));
  }, [currentOrder, updateOrderOptimistically]);
  
  // Bulk operations
  const addMultipleItems = useCallback(async (
    items: Array<{ product: POSProduct; quantity: number; modifiers?: SelectedModifier[]; notes?: string }>
  ) => {
    if (!currentOrder) {
      setError('No active order to add items to');
      return;
    }
    
    const newItems: OrderItem[] = items.map(({ product, quantity, modifiers = [], notes = '' }) => {
      const orderItem: OrderItem = {
        id: generateOrderItemId(),
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: 0,
        modifiers,
        notes,
        categoryId: product.categoryId,
        categoryName: product.categoryName || ''
      };
      
      orderItem.totalPrice = calculateItemTotal(orderItem);
      return orderItem;
    });
    
    await updateOrderOptimistically(order => {
      const updatedItems = [...order.items, ...newItems];
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically]);
  
  const clearAllItems = useCallback(async () => {
    if (!currentOrder) return;
    
    await updateOrderOptimistically(order => ({
      ...order,
      items: [],
      totalAmount: 0,
      vatAmount: 0,
      updatedAt: new Date()
    }));
  }, [currentOrder, updateOrderOptimistically]);
  
  const duplicateItem = useCallback(async (itemId: string) => {
    if (!currentOrder) return;
    
    const itemToDuplicate = currentOrder.items.find(item => item.id === itemId);
    if (!itemToDuplicate) return;
    
    const duplicatedItem: OrderItem = {
      ...itemToDuplicate,
      id: generateOrderItemId()
    };
    
    await updateOrderOptimistically(order => {
      const updatedItems = [...order.items, duplicatedItem];
      const totals = calculateOrderTotals(updatedItems, vatRate);
      
      return {
        ...order,
        items: updatedItems,
        totalAmount: totals.total,
        vatAmount: totals.vatAmount,
        updatedAt: new Date()
      };
    });
  }, [currentOrder, vatRate, updateOrderOptimistically]);
  
  // Order-level discount management removed - now using session-level and item-level discounts only
  
  // Order calculations
  const getOrderSummary = useCallback(() => {
    if (!currentOrder) {
      return {
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
        modifiersTotal: 0,
        discountAmount: 0,
        vatAmount: 0,
        total: 0
      };
    }
    
    return calculateOrderTotals(currentOrder.items, vatRate);
  }, [currentOrder, vatRate]);
  
  // Utility functions
  const refreshOrder = useCallback(async () => {
    if (orderId) {
      await mutateOrder();
    }
    if (tableSessionId) {
      await mutateTableOrders();
    }
  }, [orderId, tableSessionId, mutateOrder, mutateTableOrders]);
  
  return {
    currentOrder,
    isLoading,
    error,
    createOrder,
    clearOrder,
    saveOrder,
    addItem,
    updateItemQuantity,
    updateItemModifiers,
    updateItemNotes,
    removeItem,
    addMultipleItems,
    clearAllItems,
    duplicateItem,
    getOrderSummary,
    refreshOrder
  };
};

// Legacy compatibility - export a simplified version that matches the original interface
export const useOrderStore = () => {
  const orderManager = useOrderManager();
  
  return {
    ...orderManager
  };
};