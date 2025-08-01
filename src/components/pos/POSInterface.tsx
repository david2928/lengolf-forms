'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { ProductCatalog } from './product-catalog/ProductCatalog';
import { SimplifiedOrderPanel } from './order/SimplifiedOrderPanel';
import { POSHeader } from './POSHeader';
import { TableSession, Customer, POSProduct, SelectedModifier, OrderItem } from '@/types/pos';
import { AlertCircle, ArrowLeft, ShoppingCart, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface POSInterfaceProps {
  tableSession: TableSession;
  onBack: () => void;
  className?: string;
}

export const POSInterface: React.FC<POSInterfaceProps> = ({
  tableSession,
  onBack,
  className = ''
}) => {
  // Simplified state management
  const [runningTab, setRunningTab] = useState<OrderItem[]>([]); // Confirmed orders
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]); // Pending order items
  const [error, setError] = useState<string | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<'running' | 'current'>('running');
  
  // Discount state management
  const [appliedReceiptDiscountId, setAppliedReceiptDiscountId] = useState<string | null>(null);
  
  // Mobile enhancement states
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'products' | 'order'>('products');
  const [orderPanelExpanded, setOrderPanelExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const orderPanelRef = useRef<HTMLDivElement>(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<string | null>(null);
  // Notification system - support multiple notifications
  interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    icon: 'plus' | 'minus' | 'check' | 'x';
  }
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mobile view switching
  const handleMobileViewSwitch = (view: 'products' | 'order') => {
    setMobileView(view);
    if (view === 'order') {
      setOrderPanelExpanded(true);
    }
  };

  // Handle order panel drag
  const handleOrderPanelDrag = (event: any, info: any) => {
    if (!isMobile) return;
    setDragY(info.offset.y);
  };

  const handleOrderPanelDragEnd = (event: any, info: any) => {
    if (!isMobile) return;
    
    const { offset } = info;
    if (offset.y < -100) {
      setOrderPanelExpanded(true);
    } else if (offset.y > 100) {
      setOrderPanelExpanded(false);
    }
    setDragY(0);
  };

  // Get customer from table session or booking
  const customer = tableSession.customer || (tableSession.booking ? {
    id: tableSession.booking.customerId || 'booking-customer',
    name: tableSession.booking.name,
    email: tableSession.booking.email,
    phone: tableSession.booking.phone || tableSession.booking.phoneNumber,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } : null);
  
  // Load existing running tab on mount
  useEffect(() => {
    const loadRunningTab = async () => {
      try {
        const response = await fetch(`/api/pos/table-sessions/${tableSession.id}/orders`);
        if (response.ok) {
          const data = await response.json();
          setRunningTab(data.orders || []);
        } else {
          // Table session might not have any orders yet
          setRunningTab([]);
        }
      } catch (error) {
        console.error('Failed to load running tab:', error);
        setRunningTab([]);
      }
    };

    loadRunningTab();
  }, [tableSession.id]);

  // Auto-open current order tab when first item is added
  useEffect(() => {
    if (currentOrder.length > 0) {
      setActiveOrderTab('current');
    }
  }, [currentOrder.length]);

  // Product selection handlers
  const handleProductSelect = (product: POSProduct, modifiers: SelectedModifier[] = [], notes: string = '') => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price,
      modifiers,
      notes,
      categoryId: product.categoryId,
      categoryName: product.categoryName || ''
    };
    
    // Check if item already exists in current order
    const existingItemIndex = currentOrder.findIndex(item => 
      item.productId === product.id && 
      JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity
      const updatedOrder = [...currentOrder];
      updatedOrder[existingItemIndex].quantity += 1;
      updatedOrder[existingItemIndex].totalPrice = 
        updatedOrder[existingItemIndex].quantity * updatedOrder[existingItemIndex].unitPrice;
      setCurrentOrder(updatedOrder);
    } else {
      // Add new item
      setCurrentOrder(prev => [...prev, newItem]);
    }
    
    // Trigger add notification
    addNotification({
      type: 'success',
      title: 'Added to order',
      message: product.name,
      icon: 'plus'
    });
    
    // Auto-switch to current order tab when product is added
    setActiveOrderTab('current');
    
    // On mobile, stay on products view when item is added
    // Don't switch views automatically
  };
  
  const handleProductQuickAdd = (product: POSProduct) => {
    handleProductSelect(product, [], '');
  };

  // Order management handlers
  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleItemRemove(itemId);
      return;
    }
    
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          totalPrice: quantity * item.unitPrice
        };
      }
      return item;
    }));
  };
  
  const handleItemRemove = (itemId: string) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleConfirmOrder = async () => {
    if (currentOrder.length === 0) return;
    
    try {
      // Calculate total for this order
      const orderTotal = currentOrder.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Send current order to API to confirm and save to normalized tables
      const response = await fetch(`/api/pos/table-sessions/${tableSession.id}/confirm-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItems: currentOrder,
          orderTotal,
          notes: null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm order');
      }
      
      const result = await response.json();
      
      // Move current order items to running tab locally
      setRunningTab(prev => [...prev, ...currentOrder]);
      
      // Clear current order
      setCurrentOrder([]);
      
      // Navigate back to table view after successful order confirmation
      onBack();
    } catch (error) {
      setError('Failed to confirm order. Please try again.');
      console.error('Failed to confirm order:', error);
    }
  };
  
  const handleClearCurrentOrder = () => {
    setCurrentOrder([]);
  };

  const handleBackWithCheck = () => {
    // If there are items in the current order, warn the user
    if (currentOrder.length > 0) {
      const confirmed = window.confirm(
        'You have items in your current order that haven\'t been confirmed yet. Going back will lose these items. Are you sure?'
      );
      if (!confirmed) {
        return;
      }
    }
    
    // Clear any unsaved order and go back
    setCurrentOrder([]);
    onBack();
  };

  const handleRemoveRunningTabItem = async (itemId: string, reason: string, staffPin: string, quantityToRemove?: number) => {
    try {
      // Find the item before removal for notification
      const itemToRemove = runningTab.find(item => item.id === itemId);
      
      const response = await fetch(`/api/pos/table-sessions/${tableSession.id}/remove-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          reason,
          staffPin,
          quantityToRemove
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item');
      }

      // Show success notification
      if (itemToRemove) {
        const isPartialRemoval = quantityToRemove && quantityToRemove < itemToRemove.quantity;
        addNotification({
          type: 'success',
          title: isPartialRemoval ? 'Quantity reduced' : 'Item removed',
          message: `${itemToRemove.productName}${isPartialRemoval ? ` (-${quantityToRemove})` : ''}`,
          icon: 'minus'
        });
      }

      // Update running tab locally - handle partial vs full removal
      if (quantityToRemove) {
        setRunningTab(prev => prev.map(item => {
          if (item.id === itemId) {
            const newQuantity = item.quantity - quantityToRemove;
            if (newQuantity <= 0) {
              return null; // Will be filtered out
            }
            const unitPrice = item.totalPrice / item.quantity;
            return {
              ...item,
              quantity: newQuantity,
              totalPrice: unitPrice * newQuantity
            };
          }
          return item;
        }).filter(Boolean) as typeof prev);
      } else {
        // Full removal
        setRunningTab(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to remove running tab item:', error);
      
      // Show error notification
      addNotification({
        type: 'error',
        title: 'Removal failed',
        message: error instanceof Error ? error.message : 'Failed to remove item',
        icon: 'x'
      });
      
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  // Discount handlers
  const handleItemDiscountApplied = (itemId: string, discountId: string, discountDetails?: any) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        // If we have discount calculation results, apply them
        if (discountDetails && discountDetails.final_amount !== undefined) {
          return {
            ...item,
            applied_discount_id: discountId,
            totalPrice: discountDetails.final_amount,
            discount_amount: discountDetails.discount_amount
          };
        }
        // Otherwise just store the discount ID (calculation will be done elsewhere)
        return {
          ...item,
          applied_discount_id: discountId
        };
      }
      return item;
    }));
  };

  const handleItemDiscountRemoved = (itemId: string) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        const { applied_discount_id, discount_amount, ...itemWithoutDiscount } = item;
        // Restore original price
        const originalPrice = item.unitPrice * item.quantity;
        return {
          ...itemWithoutDiscount,
          totalPrice: originalPrice
        } as OrderItem;
      }
      return item;
    }));
  };

  const handleReceiptDiscountApplied = (discountId: string) => {
    setAppliedReceiptDiscountId(discountId);
  };

  const handleReceiptDiscountRemoved = () => {
    setAppliedReceiptDiscountId(null);
  };

  return (
    <div className={`pos-interface fixed inset-0 flex flex-col bg-slate-50 ${className}`} data-testid="pos-interface">
      {/* Notification System - Supports stacking */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`bg-white border shadow-lg rounded-lg overflow-hidden max-w-xs ${
              notification.type === 'success' ? 'border-green-200' :
              notification.type === 'error' ? 'border-red-200' :
              'border-yellow-200'
            }`}
          >
            <div className={`border-l-4 p-3 ${
              notification.type === 'success' ? 'bg-green-50 border-green-400' :
              notification.type === 'error' ? 'bg-red-50 border-red-400' :
              'bg-yellow-50 border-yellow-400'
            }`}>
              <div className="flex items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    notification.type === 'success' ? 'bg-green-400' :
                    notification.type === 'error' ? 'bg-red-400' :
                    'bg-yellow-400'
                  }`}
                >
                  {notification.icon === 'plus' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {notification.icon === 'minus' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {notification.icon === 'check' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {notification.icon === 'x' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    notification.type === 'success' ? 'text-green-800' :
                    notification.type === 'error' ? 'text-red-800' :
                    'text-yellow-800'
                  }`}>
                    {notification.title}
                  </p>
                  <p className={`text-xs truncate ${
                    notification.type === 'success' ? 'text-green-600' :
                    notification.type === 'error' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <POSHeader
        tableSession={tableSession}
        customer={customer}
        onBack={handleBackWithCheck}
        className="flex-shrink-0"
      />
      
      {/* Tab Selection - Top Level - Only show on order view for mobile */}
      {(runningTab.length > 0 || currentOrder.length > 0) && (!isMobile || mobileView === 'order') && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveOrderTab('running')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeOrderTab === 'running'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Running Tab ({runningTab.length})
            </button>
            <button
              onClick={() => setActiveOrderTab('current')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeOrderTab === 'current'
                  ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Current Order ({currentOrder.length})
            </button>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">Error: {error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content - Responsive Layout */}
      {isMobile ? (
        // Mobile Layout: Full-screen view switching
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile View Container */}
          <div className="flex-1 relative overflow-hidden">
            <motion.div
              key={mobileView}
              initial={{ x: mobileView === 'order' ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: mobileView === 'order' ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0"
            >
              {mobileView === 'products' ? (
                <div className="h-full bg-white">
                  <ProductCatalog
                    onProductSelect={handleProductSelect}
                    onProductQuickAdd={handleProductQuickAdd}
                    showSearch={true}
                    showFilters={true}
                    className="h-full"
                    rememberLastCategory={lastSelectedCategory}
                    onCategoryChange={setLastSelectedCategory}
                    onBack={handleBackWithCheck}
                    showBackButton={true}
                  />
                </div>
              ) : (
                <div className="h-full bg-white">
                  <SimplifiedOrderPanel
                    runningTab={runningTab}
                    currentOrder={currentOrder}
                    tableSession={tableSession}
                    customer={customer}
                    onItemQuantityChange={handleItemQuantityChange}
                    onItemRemove={handleItemRemove}
                    onConfirmOrder={handleConfirmOrder}
                    onClearCurrentOrder={handleClearCurrentOrder}
                    onRemoveRunningTabItem={handleRemoveRunningTabItem}
                    onItemDiscountApplied={handleItemDiscountApplied}
                    onItemDiscountRemoved={handleItemDiscountRemoved}
                    onReceiptDiscountApplied={handleReceiptDiscountApplied}
                    onReceiptDiscountRemoved={handleReceiptDiscountRemoved}
                    appliedReceiptDiscountId={appliedReceiptDiscountId}
                    className="h-full"
                    activeTab={activeOrderTab}
                    onTabChange={setActiveOrderTab}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* View Toggle Buttons */}
              <div className="flex bg-slate-100 rounded-lg p-1 min-w-0">
                <Button
                  variant={mobileView === 'products' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleMobileViewSwitch('products')}
                  className={cn(
                    "flex-1 h-10 transition-all min-w-0",
                    mobileView === 'products' && "shadow-sm"
                  )}
                >
                  Products
                </Button>
                <Button
                  variant={mobileView === 'order' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleMobileViewSwitch('order')}
                  className={cn(
                    "flex-1 h-10 transition-all min-w-0 whitespace-nowrap",
                    mobileView === 'order' && "shadow-sm"
                  )}
                >
                  <ShoppingCart className="w-6 h-6 mr-2" />
                  <span>Order ({currentOrder.length})</span>
                </Button>
              </div>

              {/* Quick Order Summary */}
              {currentOrder.length > 0 && (
                <div className="ml-4 text-right">
                  <div className="text-sm font-medium text-slate-900">
                    ฿{currentOrder.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentOrder.length} items
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Desktop Layout: Side-by-side
        <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
          {/* Product Catalog - Left Side (60%) */}
          <div className="w-3/5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm min-h-0">
            <ProductCatalog
              onProductSelect={handleProductSelect}
              onProductQuickAdd={handleProductQuickAdd}
              showSearch={false}
              showFilters={false}
              className="h-full"
              onBack={handleBackWithCheck}
              showBackButton={true}
            />
          </div>
          
          {/* Order Panel - Right Side (40%) */}
          <div className="w-2/5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm min-h-0">
            <SimplifiedOrderPanel
              runningTab={runningTab}
              currentOrder={currentOrder}
              tableSession={tableSession}
              customer={customer}
              onItemQuantityChange={handleItemQuantityChange}
              onItemRemove={handleItemRemove}
              onConfirmOrder={handleConfirmOrder}
              onClearCurrentOrder={handleClearCurrentOrder}
              onRemoveRunningTabItem={handleRemoveRunningTabItem}
              onItemDiscountApplied={handleItemDiscountApplied}
              onItemDiscountRemoved={handleItemDiscountRemoved}
              onReceiptDiscountApplied={handleReceiptDiscountApplied}
              onReceiptDiscountRemoved={handleReceiptDiscountRemoved}
              appliedReceiptDiscountId={appliedReceiptDiscountId}
              className="h-full"
              activeTab={activeOrderTab}
              onTabChange={setActiveOrderTab}
            />
          </div>
        </div>
      )}
    </div>
  );
};