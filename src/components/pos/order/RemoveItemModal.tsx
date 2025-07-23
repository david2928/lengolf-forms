'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderItem } from '@/types/pos';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

export interface RemoveItemModalProps {
  item: OrderItem | null;
  isOpen: boolean;
  onConfirm: (reason: string, staffPin: string, quantityToRemove?: number) => void;
  onCancel: () => void;
}

export const RemoveItemModal: React.FC<RemoveItemModalProps> = ({
  item,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [quantityToRemove, setQuantityToRemove] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset form when item changes
  React.useEffect(() => {
    if (item) {
      setQuantityToRemove(item.quantity); // Default to removing all
      setReason('');
      setStaffPin('');
      setShowSuccess(false);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !staffPin.trim()) {
      alert('Please provide both a reason and staff PIN');
      return;
    }

    if (quantityToRemove <= 0 || quantityToRemove > (item?.quantity || 0)) {
      alert('Invalid quantity to remove');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim(), staffPin.trim(), quantityToRemove);
      
      // Show success animation
      setShowSuccess(true);
      
      // Reset form after delay
      setTimeout(() => {
        setReason('');
        setStaffPin('');
        setQuantityToRemove(1);
        setShowSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error removing item:', error);
      setShowSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setStaffPin('');
    setQuantityToRemove(1);
    setShowSuccess(false);
    onCancel();
  };

  if (!isOpen || !item) return null;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-lg max-w-md w-full relative overflow-hidden"
          >
            {/* Success Animation Overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="absolute inset-0 bg-green-50 flex items-center justify-center z-10"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", damping: 15, stiffness: 400 }}
                      className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle className="w-8 h-8 text-white" />
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg font-semibold text-green-800 mb-2"
                    >
                      Item Removed Successfully
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-green-600"
                    >
                      {quantityToRemove === item.quantity 
                        ? `${item.productName} was completely removed from the order`
                        : `${quantityToRemove} ${item.productName} removed from the order`
                      }
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Main Form Content */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: showSuccess ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", damping: 20, stiffness: 300 }}
                    className="p-2 bg-red-100 rounded-lg"
                  >
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </motion.div>
                  <div>
                    <motion.h3 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg font-semibold text-gray-900"
                    >
                      Remove Item
                    </motion.h3>
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-gray-500"
                    >
                      This action requires authorization
                    </motion.p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <motion.form 
                onSubmit={handleSubmit} 
                className="p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
          {/* Item Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{item.productName}</h4>
                <p className="text-sm text-gray-500">Total Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
              </div>
            </div>
          </div>

          {/* Quantity to Remove */}
          <div>
            <label htmlFor="quantityToRemove" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Remove *
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setQuantityToRemove(Math.max(1, quantityToRemove - 1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-600"
                disabled={quantityToRemove <= 1}
              >
                -
              </button>
              <div className="flex-1 max-w-20">
                <input
                  type="number"
                  id="quantityToRemove"
                  value={quantityToRemove}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setQuantityToRemove(Math.min(Math.max(1, value), item.quantity));
                  }}
                  min="1"
                  max={item.quantity}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-center"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setQuantityToRemove(Math.min(item.quantity, quantityToRemove + 1))}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-600"
                disabled={quantityToRemove >= item.quantity}
              >
                +
              </button>
              <div className="text-sm text-gray-500">
                / {item.quantity}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {quantityToRemove === item.quantity 
                ? 'Removing all items (item will be deleted)'
                : `Removing ${quantityToRemove} of ${item.quantity} items`
              }
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Removal *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer changed mind, Item not available, Wrong order..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              rows={3}
              maxLength={200}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{reason.length}/200 characters</p>
          </div>

          {/* Staff PIN Input */}
          <div>
            <label htmlFor="staffPin" className="block text-sm font-medium text-gray-700 mb-2">
              Staff PIN *
            </label>
            <input
              type="password"
              id="staffPin"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value)}
              placeholder="Enter your staff PIN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              maxLength={10}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim() || !staffPin.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {quantityToRemove === item.quantity 
                      ? 'Remove Item' 
                      : `Remove ${quantityToRemove}`
                    }
                  </span>
                </>
              )}
            </button>
          </div>
              </motion.form>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};