'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CreditCard, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Table, OrderItem } from '@/types/pos';

export interface OccupiedTableDetailsPanelProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: () => void;
  onPayment: () => void;
  onCancel: () => void;
}

export function OccupiedTableDetailsPanel({
  table,
  isOpen,
  onClose,
  onAddOrder,
  onPayment,
  onCancel
}: OccupiedTableDetailsPanelProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Format session duration
  const formatDuration = (start?: Date | string) => {
    if (!start) return '';
    
    const startDate = start instanceof Date ? start : new Date(start);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Fetch order items when panel opens
  useEffect(() => {
    if (isOpen && table?.currentSession?.id) {
      setIsLoadingOrders(true);
      fetch(`/api/pos/table-sessions/${table.currentSession.id}/orders`)
        .then(response => response.json())
        .then(data => {
          setOrderItems(data.orders || []);
        })
        .catch(error => {
          console.error('Failed to load order items:', error);
          setOrderItems([]);
        })
        .finally(() => {
          setIsLoadingOrders(false);
        });
    }
  }, [isOpen, table?.currentSession?.id]);

  // Early return after all hooks
  if (!table || !table.currentSession) return null;

  const session = table.currentSession;
  const customer = session.customer || session.booking;
  const sessionDuration = formatDuration(session.sessionStart);

  // Calculate VAT (prices already include VAT)
  const totalInclVat = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const vatRate = 0.07; // 7% VAT
  const totalExclVat = totalInclVat / (1 + vatRate); // Remove VAT from inclusive price
  const vatAmount = totalInclVat - totalExclVat; // VAT amount is the difference

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{ y: 300, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 300, opacity: 0, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300,
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
            className="fixed inset-x-0 bottom-0 z-50 h-auto max-h-[85vh] w-full bg-white rounded-t-2xl shadow-2xl flex flex-col"
          >
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center py-3 bg-white rounded-t-2xl cursor-grab active:cursor-grabbing touch-manipulation">
                <motion.div 
                  whileTap={{ scale: 1.1 }}
                  className="w-8 h-1 bg-gray-300 rounded-full"
                />
              </div>

              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-5 rounded-t-2xl sm:rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Table Icon */}
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", damping: 15 }}
                      className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-md"
                    >
                      <span className="text-white font-bold text-xl">
                        {table.displayName.slice(-2)}
                      </span>
                    </motion.div>
                    
                    {/* Table Info - Cleaner Layout */}
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-green-900">
                        {table.displayName}
                      </h2>
                      {customer && (
                        <div className="text-base text-green-700 font-medium">
                          {customer.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content - Simple and Clean */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex-1 bg-white px-6 py-6 flex flex-col justify-center items-start text-left"
              >
                {/* Order Details - Always Shown */}
                {isLoadingOrders ? (
                  <div className="text-gray-500 text-lg">Loading order details...</div>
                ) : orderItems.length > 0 ? (
                  <div className="w-full space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
                    
                    {/* Order Items */}
                    <div className="space-y-3">
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-600">
                              {item.quantity} × ฿{item.unitPrice.toFixed(0)}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900">
                            ฿{item.totalPrice.toFixed(0)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Order Summary */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal (excl. VAT):</span>
                        <span>฿{totalExclVat.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT (7%):</span>
                        <span>฿{vatAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-green-800 border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>฿{totalInclVat.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-lg text-gray-500">No orders yet</div>
                    <div className="text-sm text-gray-400">Table is ready for orders</div>
                  </div>
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Modify Order Button */}
                  <Button
                    data-testid="add-order-button"
                    onClick={onAddOrder}
                    size="lg"
                    className="h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold shadow-md hover:shadow-lg active:shadow-sm transition-all duration-150 active:scale-[0.98] touch-manipulation sm:col-span-1"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {orderItems.length > 0 ? 'Modify Order' : 'Add Order'}
                  </Button>

                  {/* Payment Button */}
                  <Button
                    onClick={onPayment}
                    size="lg"
                    className="h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold shadow-md hover:shadow-lg active:shadow-sm transition-all duration-150 active:scale-[0.98] touch-manipulation sm:col-span-1"
                    disabled={session.totalAmount <= 0}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment
                  </Button>

                  {/* Cancel Button */}
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    size="lg"
                    className="h-12 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 active:bg-red-100 active:border-red-500 font-semibold shadow-sm hover:shadow-md active:shadow-sm transition-all duration-150 active:scale-[0.98] touch-manipulation sm:col-span-1"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>
                </div>
              </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}