'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CreditCard, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/pos-utils';
import type { Table, OrderItem } from '@/types/pos';
import { ReceiptDiscountButton } from '../discount/ReceiptDiscountButton';

export interface OccupiedTableDetailsPanelProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: () => void;
  onPayment: () => void;
  onCancel: () => void;
  onPrintBill?: () => void;
  onRefreshTable?: () => void;
}

export function OccupiedTableDetailsPanel({
  table,
  isOpen,
  onClose,
  onAddOrder,
  onPayment,
  onCancel,
  onPrintBill,
  onRefreshTable
}: OccupiedTableDetailsPanelProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [appliedReceiptDiscountId, setAppliedReceiptDiscountId] = useState<string | null>(null);
  const [receiptDiscountAmount, setReceiptDiscountAmount] = useState<number>(0);
  const [appliedReceiptDiscount, setAppliedReceiptDiscount] = useState<any>(null);
  const [localTableData, setLocalTableData] = useState<Table | null>(table);
  const [ordersApiTotalAmount, setOrdersApiTotalAmount] = useState<number>(0);

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

  // Update local table data when table prop changes
  useEffect(() => {
    setLocalTableData(table);
  }, [table]);

  // Fetch order items when panel opens
  useEffect(() => {
    if (isOpen && table?.currentSession?.id) {
      setIsLoadingOrders(true);
      fetch(`/api/pos/table-sessions/${table.currentSession.id}/orders`)
        .then(response => response.json())
        .then(data => {
          setOrderItems(data.orders || []);
          
          // Capture totalAmount from orders API as fallback
          if (data.totalAmount) {
            setOrdersApiTotalAmount(data.totalAmount);
          }
          
          // Load receipt discount information if available
          if (data.receiptDiscount) {
            setAppliedReceiptDiscountId(data.receiptDiscount.id);
            setReceiptDiscountAmount(data.receiptDiscount.amount || 0);
            setAppliedReceiptDiscount(data.receiptDiscount);
          } else {
            setAppliedReceiptDiscountId(null);
            setReceiptDiscountAmount(0);
            setAppliedReceiptDiscount(null);
          }
        })
        .catch(error => {
          console.error('Failed to load order items:', error);
          setOrderItems([]);
          setAppliedReceiptDiscountId(null);
          setReceiptDiscountAmount(0);
          setAppliedReceiptDiscount(null);
        })
        .finally(() => {
          setIsLoadingOrders(false);
        });
    }
  }, [isOpen, table?.currentSession?.id]);

  // Handle print bill functionality
  const handlePrintBill = async () => {
    if (!table?.currentSession?.id || !onPrintBill) return;
    
    setIsPrintingBill(true);
    try {
      await onPrintBill();
    } catch (error) {
      console.error('Failed to print bill:', error);
    } finally {
      setIsPrintingBill(false);
    }
  };

  // Receipt discount handlers
  const handleReceiptDiscountApplied = async (discountId: string) => {
    if (!table?.currentSession?.id) {
      console.error('No table session available for applying receipt discount');
      return;
    }

    try {
      // Use the new simplified session-level API
      const applyResponse = await fetch(`/api/pos/table-sessions/${table.currentSession.id}/receipt-discount/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discountId
        })
      });

      if (applyResponse.ok) {
        const result = await applyResponse.json();
        console.log('✅ Successfully applied receipt discount:', result);
        
        // Refresh table data to get updated session totals
        if (onRefreshTable) {
          await onRefreshTable();
        }
        
        // Fetch updated table session data
        const tableResponse = await fetch(`/api/pos/tables/${table.id}`);
        if (tableResponse.ok) {
          const updatedTableData = await tableResponse.json();
          setLocalTableData(updatedTableData);
        }
        
        // Refresh order items and session data
        const refreshResponse = await fetch(`/api/pos/table-sessions/${table.currentSession.id}/orders`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setOrderItems(refreshData.orders || []);
          
          if (refreshData.totalAmount) {
            setOrdersApiTotalAmount(refreshData.totalAmount);
          }
          
          // Update local state with session-level receipt discount
          if (refreshData.receiptDiscount) {
            setAppliedReceiptDiscountId(refreshData.receiptDiscount.id);
            setReceiptDiscountAmount(refreshData.receiptDiscount.amount || 0);
            setAppliedReceiptDiscount(refreshData.receiptDiscount);
          }
        }
      } else {
        const error = await applyResponse.json();
        console.error('Failed to apply receipt discount:', error);
        alert(`Failed to apply discount: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying receipt discount:', error);
      alert('Error applying discount');
    }
  };

  const handleReceiptDiscountRemoved = async () => {
    if (!table?.currentSession?.id || !appliedReceiptDiscountId) {
      return;
    }

    try {
      // Use the new simplified session-level API
      const removeResponse = await fetch(`/api/pos/table-sessions/${table.currentSession.id}/receipt-discount/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (removeResponse.ok) {
        const result = await removeResponse.json();
        console.log('✅ Successfully removed receipt discount:', result);
        
        // Refresh table data to get updated session totals
        if (onRefreshTable) {
          await onRefreshTable();
        }
        
        // Fetch updated table session data
        const tableResponse = await fetch(`/api/pos/tables/${table.id}`);
        if (tableResponse.ok) {
          const updatedTableData = await tableResponse.json();
          setLocalTableData(updatedTableData);
        }
        
        // Refresh order items and session data
        const refreshResponse = await fetch(`/api/pos/table-sessions/${table.currentSession.id}/orders`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setOrderItems(refreshData.orders || []);
          
          if (refreshData.totalAmount) {
            setOrdersApiTotalAmount(refreshData.totalAmount);
          }
          
          // Clear discount state since it was removed
          setAppliedReceiptDiscountId(null);
          setReceiptDiscountAmount(0);
          setAppliedReceiptDiscount(null);
        }
      } else {
        const error = await removeResponse.json();
        console.error('Failed to remove receipt discount:', error);
        alert(`Error removing discount: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing receipt discount:', error);
      alert('Error removing discount');
    }
  };

  // Early return after all hooks
  if (!table || !table.currentSession) return null;

  const session = table.currentSession;
  const customer = session.customer || session.booking;
  const sessionDuration = formatDuration(session.sessionStart);

  // Use the actual table session total (which includes all order-level discounts via database trigger)
  // Use localTableData for calculations to ensure we have the most up-to-date data
  const currentTable = localTableData || table;
  const tableTotalAmount = currentTable.currentSession?.totalAmount || 0;
  
  // Use orders API totalAmount as fallback if table data is zero or stale
  const totalInclVat = tableTotalAmount > 0 ? tableTotalAmount : ordersApiTotalAmount;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Total amount calculation debug:', {
      tableTotalAmount,
      ordersApiTotalAmount,
      finalTotalInclVat: totalInclVat,
      usingFallback: tableTotalAmount <= 0 && ordersApiTotalAmount > 0
    });
  }
  const vatRate = 0.07; // 7% VAT
  const vatAmount = totalInclVat * vatRate / (1 + vatRate); // Extract VAT from VAT-inclusive price
  const totalExclVat = totalInclVat - vatAmount; // Subtotal without VAT
  
  // Use subtotal from session if available, otherwise calculate from items
  const originalItemsTotal = session.subtotalAmount || orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const currentItemsTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemLevelDiscounts = originalItemsTotal - currentItemsTotal;
  
  // Use the ACTUAL receipt discount amount from the API data
  // receiptDiscountAmount is set from API response in useEffect
  const receiptLevelDiscounts = receiptDiscountAmount;
  
  // Total of ALL discounts applied
  const totalDiscountAmount = itemLevelDiscounts + receiptLevelDiscounts;

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
            className="fixed inset-x-0 bottom-0 z-50 h-auto max-h-[95vh] w-full bg-white rounded-t-2xl shadow-2xl flex flex-col"
          >
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center py-3 bg-white rounded-t-2xl cursor-grab active:cursor-grabbing touch-manipulation">
                <motion.div 
                  whileTap={{ scale: 1.1 }}
                  className="w-8 h-1 bg-gray-300 rounded-full"
                />
              </div>

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-5 rounded-t-2xl sm:rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Table Icon */}
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", damping: 15 }}
                      className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md"
                    >
                      <span className="text-white font-bold text-xl">
                        {table.displayName.slice(-2)}
                      </span>
                    </motion.div>
                    
                    {/* Table Info - Cleaner Layout */}
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-blue-900">
                        {table.displayName}
                      </h2>
                      {customer && (
                        <div className="text-base text-blue-700 font-medium">
                          {customer.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
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
                className="flex-1 bg-white px-6 py-6 flex flex-col justify-center items-start text-left min-h-0"
              >
                {/* Order Details - Always Shown */}
                {isLoadingOrders ? (
                  <div className="text-gray-500 text-lg">Loading order details...</div>
                ) : orderItems.length > 0 ? (
                  <div className="w-full flex flex-col flex-1 space-y-4 min-h-0">
                    <h3 className="text-xl font-semibold text-gray-900 flex-shrink-0">Order Details</h3>
                    
                    {/* Order Items - Dynamic Scrolling */}
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0">
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-600">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                              {item.applied_discount_id && (
                                <span className="ml-2 text-green-600 font-medium">• Discount Applied</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {item.applied_discount_id ? (
                              <div>
                                <div className="text-xs text-gray-500 line-through">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </div>
                                <div className="font-semibold text-green-700">
                                  {formatCurrency(item.totalPrice)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(item.totalPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Receipt Discount */}
                    <div className="border-t border-gray-200 pt-4 flex-shrink-0">
                      <ReceiptDiscountButton
                        orderItems={orderItems}
                        appliedDiscountId={appliedReceiptDiscountId}
                        discountAmount={receiptDiscountAmount}
                        appliedDiscountDetails={appliedReceiptDiscount}
                        onDiscountApplied={handleReceiptDiscountApplied}
                        onDiscountRemoved={handleReceiptDiscountRemoved}
                      />
                    </div>
                    
                    {/* Order Summary */}
                    <div className="border-t border-gray-200 pt-4 space-y-2 flex-shrink-0">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(originalItemsTotal)}</span>
                      </div>
                      {receiptLevelDiscounts > 0 && appliedReceiptDiscount && (
                        <div className="flex justify-between text-sm text-green-700 font-medium">
                          <span>Discount {appliedReceiptDiscount.type === 'percentage' ? `(${appliedReceiptDiscount.value}%)` : ''}:</span>
                          <span>-{formatCurrency(receiptLevelDiscounts)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT (7%) incl.:</span>
                        <span>{formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-green-800 border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(totalInclVat)}</span>
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
                className="bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex-shrink-0"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                  {/* Print Bill Button */}
                  {orderItems.length > 0 && onPrintBill && (
                    <Button
                      data-testid="print-bill-button"
                      onClick={handlePrintBill}
                      disabled={isPrintingBill || totalInclVat <= 0}
                      size="lg"
                      variant="outline"
                      className="h-12 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 active:bg-purple-100 active:border-purple-500 font-semibold shadow-sm hover:shadow-md active:shadow-sm transition-all duration-150 active:scale-[0.98] touch-manipulation"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      {isPrintingBill ? 'Printing...' : 'Print Bill'}
                    </Button>
                  )}

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