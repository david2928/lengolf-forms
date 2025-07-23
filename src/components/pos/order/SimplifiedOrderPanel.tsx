'use client';

import React, { useState } from 'react';
import { Order, OrderItem, Customer, TableSession } from '@/types/pos';
import { ShoppingCart, Check, Trash2, Plus, Minus, X, CreditCard } from 'lucide-react';
import { RemoveItemModal } from './RemoveItemModal';
import { SimplifiedPaymentModal } from '../payment/SimplifiedPaymentModal';
import { PaymentProcessingResponse } from '@/types/payment';

export interface SimplifiedOrderPanelProps {
  // Running tab (confirmed orders from previous sessions)
  runningTab: OrderItem[];
  // Current order (not confirmed yet)
  currentOrder: OrderItem[];
  tableSession?: TableSession | null;
  customer?: Customer | null;
  onItemQuantityChange: (itemId: string, quantity: number) => void;
  onItemRemove: (itemId: string) => void;
  onConfirmOrder: () => void;
  onClearCurrentOrder: () => void;
  className?: string;
  // Tab control props
  activeTab?: 'running' | 'current';
  onTabChange?: (tab: 'running' | 'current') => void;
  // Running tab item removal
  onRemoveRunningTabItem?: (itemId: string, reason: string, staffPin: string) => Promise<void>;
}

export const SimplifiedOrderPanel: React.FC<SimplifiedOrderPanelProps> = ({
  runningTab,
  currentOrder,
  tableSession,
  customer,
  onItemQuantityChange,
  onItemRemove,
  onConfirmOrder,
  onClearCurrentOrder,
  className = '',
  activeTab = 'running',
  onTabChange,
  onRemoveRunningTabItem
}) => {
  // Use external activeTab if provided, otherwise fall back to local state
  const [localActiveTab, setLocalActiveTab] = useState<'running' | 'current'>('running');
  const currentActiveTab = onTabChange ? activeTab : localActiveTab;
  
  const handleTabChange = (tab: 'running' | 'current') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };
  
  const showRunningTab = currentActiveTab === 'running';
  
  // Remove item modal state
  const [removeItemModal, setRemoveItemModal] = useState<{
    isOpen: boolean;
    item: OrderItem | null;
  }>({
    isOpen: false,
    item: null
  });

  // Calculate totals
  const runningTabTotal = runningTab.reduce((total, item) => total + item.totalPrice, 0);
  const currentOrderTotal = currentOrder.reduce((total, item) => total + item.totalPrice, 0);
  const grandTotal = runningTabTotal + currentOrderTotal;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const hasCurrentOrder = currentOrder.length > 0;
  const hasRunningTab = runningTab.length > 0;

  // Handle running tab item removal
  const handleRemoveRunningTabItem = (item: OrderItem) => {
    setRemoveItemModal({
      isOpen: true,
      item
    });
  };

  const handleConfirmRemoval = async (reason: string, staffPin: string) => {
    if (!removeItemModal.item || !onRemoveRunningTabItem) return;

    try {
      await onRemoveRunningTabItem(removeItemModal.item.id, reason, staffPin);
      setRemoveItemModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const handleCancelRemoval = () => {
    setRemoveItemModal({ isOpen: false, item: null });
  };

  return (
    <div className={`simplified-order-panel bg-white flex flex-col h-full ${className}`}>
      {/* Content - No redundant header or tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {/* Running Tab */}
          {showRunningTab && (
            <div className="p-4 space-y-3">
              {hasRunningTab ? (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Confirmed Items
                  </div>
                  {runningTab.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity}x @ {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                        {onRemoveRunningTabItem && (
                          <button
                            onClick={() => handleRemoveRunningTabItem(item)}
                            className="w-6 h-6 flex items-center justify-center text-red-600 hover:bg-red-100 rounded"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No confirmed items
                  </h3>
                  <p className="text-sm text-gray-500">
                    Confirmed orders will appear here
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Order */}
          {!showRunningTab && (
            <div className="p-4 space-y-3">
              {hasCurrentOrder ? (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Current Order (Not Confirmed)
                  </div>
                  {currentOrder.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            onClick={() => onItemQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onItemQuantityChange(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="text-sm text-gray-600">@ {formatCurrency(item.unitPrice)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                        <button
                          onClick={() => onItemRemove(item.id)}
                          className="w-6 h-6 flex items-center justify-center text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No items in current order
                  </h3>
                  <p className="text-sm text-gray-500">
                    Add products from the menu to start an order
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
          {hasRunningTab && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Running Tab Total:</span>
              <span className="font-medium text-gray-900">{formatCurrency(runningTabTotal)}</span>
            </div>
          )}
          {hasCurrentOrder && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Order:</span>
              <span className="font-medium text-orange-700">{formatCurrency(currentOrderTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        {hasCurrentOrder && (
          <div className="border-t border-gray-200 p-4 space-y-2">
            <button
              onClick={onConfirmOrder}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Check className="h-5 w-5" />
              <span>Confirm Order ({currentOrder.length} items)</span>
            </button>
            <button
              onClick={onClearCurrentOrder}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Current Order</span>
            </button>
          </div>
        )}
      </div>

      {/* Remove Item Modal */}
      <RemoveItemModal
        item={removeItemModal.item}
        isOpen={removeItemModal.isOpen}
        onConfirm={handleConfirmRemoval}
        onCancel={handleCancelRemoval}
      />
    </div>
  );
};