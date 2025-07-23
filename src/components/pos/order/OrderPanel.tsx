'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OrderHeader } from './OrderHeader';
import { OrderItemsList } from './OrderItemsList';
import { OrderTotals } from './OrderTotals';
import { OrderActions } from './OrderActions';
import { Order, OrderItem, Customer, TableSession } from '@/types/pos';
import { ShoppingCart, AlertCircle } from 'lucide-react';

export interface OrderPanelProps {
  order: Order | null;
  tableSession?: TableSession | null;
  customer?: Customer | null;
  onItemQuantityChange: (itemId: string, quantity: number) => void;
  onItemRemove: (itemId: string) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
  onCustomerAssign: (customer: Customer) => void;
  onCustomerRemove: () => void;
  onCheckout: () => void;
  onClearOrder: () => void;
  onSaveOrder?: () => void;
  onDiscountApply?: (discountAmount: number) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  order,
  tableSession,
  customer,
  onItemQuantityChange,
  onItemRemove,
  onItemNotesChange,
  onCustomerAssign,
  onCustomerRemove,
  onCheckout,
  onClearOrder,
  onSaveOrder,
  onDiscountApply,
  loading = false,
  error = null,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Calculate order statistics
  const orderStats = useCallback(() => {
    if (!order || !order.items) {
      return {
        itemCount: 0,
        totalQuantity: 0,
        uniqueItems: 0
      };
    }

    return {
      itemCount: order.items.length,
      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: new Set(order.items.map(item => item.productId)).size
    };
  }, [order]);

  const stats = orderStats();

  // Handle collapse toggle for mobile
  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Check if order is empty
  const isOrderEmpty = !order || order.items.length === 0;

  // Get panel styles based on collapse state
  const getPanelStyles = () => {
    const baseStyles = 'order-panel bg-white shadow-lg flex flex-col h-full';
    
    if (isCollapsed) {
      return `${baseStyles} md:w-96`;
    }
    
    return `${baseStyles} w-full md:w-96`;
  };

  return (
    <div className={`${getPanelStyles()} ${className}`}>
      {/* Order Header */}
      <div className="flex-shrink-0 border-b border-gray-200 rounded-t-xl">
        <OrderHeader
          order={order}
          tableSession={tableSession}
          customer={customer}
          onCollapseToggle={handleCollapseToggle}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 p-6 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Order Content */}
      {!isCollapsed && (
        <>
          {/* Order Items or Empty State */}
          <div className="flex-1 overflow-hidden">
            {isOrderEmpty ? (
              <div className="h-full flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">
                    No items in order
                  </h3>
                  <p className="text-base text-gray-500 max-w-sm mx-auto">
                    Add products from the catalog to start creating an order
                  </p>
                </div>
              </div>
            ) : (
              <OrderItemsList
                items={order?.items || []}
                onQuantityChange={onItemQuantityChange}
                onRemove={onItemRemove}
                onNotesChange={onItemNotesChange}
                loading={loading}
              />
            )}
          </div>

          {/* Order Footer */}
          {!isOrderEmpty && (
            <>
              {/* Order Totals */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-slate-50">
                <OrderTotals
                  order={order}
                  onDiscountApply={onDiscountApply}
                  showDiscountButton={!!onDiscountApply}
                />
              </div>

              {/* Order Actions */}
              <div className="flex-shrink-0 border-t border-gray-200 rounded-b-xl bg-white">
                <OrderActions
                  order={order}
                  onCheckout={onCheckout}
                  onClearOrder={onClearOrder}
                  onSaveOrder={onSaveOrder}
                  disabled={loading || isOrderEmpty}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Collapsed State Summary */}
      {isCollapsed && !isOrderEmpty && (
        <div className="p-6 border-t border-gray-200 rounded-b-xl bg-slate-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Items:</span>
              <span className="font-medium">{stats.totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg">
                {formatCurrency(order?.totalAmount || 0)}
              </span>
            </div>
            <button
              onClick={handleCollapseToggle}
              className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              View Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}