'use client';

import React, { useState, useCallback } from 'react';
import { Order } from '@/types/pos';
import { 
  CreditCard, 
  Save, 
  Trash2, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Printer,
  Share2
} from 'lucide-react';

export interface OrderActionsProps {
  order: Order | null;
  onCheckout: () => void;
  onClearOrder: () => void;
  onSaveOrder?: () => void;
  onPrintOrder?: () => void;
  onShareOrder?: () => void;
  disabled?: boolean;
  loading?: boolean;
  showAdvancedActions?: boolean;
  className?: string;
}

export const OrderActions: React.FC<OrderActionsProps> = ({
  order,
  onCheckout,
  onClearOrder,
  onSaveOrder,
  onPrintOrder,
  onShareOrder,
  disabled = false,
  loading = false,
  showAdvancedActions = false,
  className = ''
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if order is valid for checkout
  const isOrderValid = order && order.items && order.items.length > 0;
  const canCheckout = isOrderValid && !disabled && !loading;
  const canSave = isOrderValid && onSaveOrder && !disabled;
  const canClear = isOrderValid && !disabled && !loading;

  // Handle action with loading state
  const handleActionWithLoading = useCallback(async (
    action: () => void | Promise<void>,
    actionName: string
  ) => {
    if (actionLoading) return;
    
    setActionLoading(actionName);
    try {
      await Promise.resolve(action());
    } finally {
      setActionLoading(null);
    }
  }, [actionLoading]);

  // Handle checkout
  const handleCheckout = useCallback(() => {
    handleActionWithLoading(onCheckout, 'checkout');
  }, [onCheckout, handleActionWithLoading]);

  // Handle save order
  const handleSaveOrder = useCallback(() => {
    if (!onSaveOrder) return;
    handleActionWithLoading(onSaveOrder, 'save');
  }, [onSaveOrder, handleActionWithLoading]);

  // Handle print order
  const handlePrintOrder = useCallback(() => {
    if (!onPrintOrder) return;
    handleActionWithLoading(onPrintOrder, 'print');
  }, [onPrintOrder, handleActionWithLoading]);

  // Handle share order
  const handleShareOrder = useCallback(() => {
    if (!onShareOrder) return;
    handleActionWithLoading(onShareOrder, 'share');
  }, [onShareOrder, handleActionWithLoading]);

  // Handle clear order with confirmation
  const handleClearOrder = useCallback(() => {
    if (!canClear) return;
    
    if (showConfirmClear) {
      handleActionWithLoading(onClearOrder, 'clear');
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmClear(false), 3000);
    }
  }, [canClear, showConfirmClear, onClearOrder, handleActionWithLoading]);

  // Get order status info
  const getOrderStatusInfo = () => {
    if (!order) return null;
    
    const statusConfig = {
      draft: {
        icon: Clock,
        text: 'Draft',
        color: 'text-gray-600 bg-gray-100'
      },
      active: {
        icon: CheckCircle,
        text: 'Active',
        color: 'text-green-600 bg-green-100'
      },
      completed: {
        icon: CheckCircle,
        text: 'Completed',
        color: 'text-blue-600 bg-blue-100'
      },
      cancelled: {
        icon: AlertTriangle,
        text: 'Cancelled',
        color: 'text-red-600 bg-red-100'
      }
    };
    
    return statusConfig[order.status] || statusConfig.draft;
  };

  const statusInfo = getOrderStatusInfo();
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <div className={`order-actions p-6 space-y-4 ${className}`}>
      {/* Order Status */}
      {order && statusInfo && (
        <div className="flex items-center justify-center">
          <div className={`
            flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium
            ${statusInfo.color}
          `}>
            <StatusIcon className="h-4 w-4" />
            <span>{statusInfo.text}</span>
            {order.orderNumber && (
              <span className="opacity-75">#{order.orderNumber}</span>
            )}
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <div className="space-y-3">
        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={!canCheckout || actionLoading === 'checkout'}
          className={`
            w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-lg font-semibold text-lg transition-colors
            ${canCheckout
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
            ${actionLoading === 'checkout' ? 'opacity-75' : ''}
          `}
        >
          {actionLoading === 'checkout' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Checkout & Pay</span>
            </>
          )}
        </button>

        {/* Secondary Actions Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Save Order */}
          {onSaveOrder && (
            <button
              onClick={handleSaveOrder}
              disabled={!canSave || actionLoading === 'save'}
              className={`
                flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-colors
                ${canSave
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
                ${actionLoading === 'save' ? 'opacity-75' : ''}
              `}
            >
              {actionLoading === 'save' ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save</span>
            </button>
          )}

          {/* Clear Order */}
          <button
            onClick={handleClearOrder}
            disabled={!canClear || actionLoading === 'clear'}
            className={`
              flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${showConfirmClear
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : canClear
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
              ${actionLoading === 'clear' ? 'opacity-75' : ''}
            `}
          >
            {actionLoading === 'clear' ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
            ) : showConfirmClear ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Confirm Clear</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Actions */}
      {showAdvancedActions && isOrderValid && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Print Order */}
            {onPrintOrder && (
              <button
                onClick={handlePrintOrder}
                disabled={disabled || actionLoading === 'print'}
                className={`
                  flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-colors
                  bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                  ${actionLoading === 'print' ? 'opacity-75' : ''}
                `}
              >
                {actionLoading === 'print' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <Printer className="h-3 w-3" />
                )}
                <span>Print</span>
              </button>
            )}

            {/* Share Order */}
            {onShareOrder && (
              <button
                onClick={handleShareOrder}
                disabled={disabled || actionLoading === 'share'}
                className={`
                  flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-colors
                  bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                  ${actionLoading === 'share' ? 'opacity-75' : ''}
                `}
              >
                {actionLoading === 'share' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <Share2 className="h-3 w-3" />
                )}
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order Summary Footer */}
      {order && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              {order.createdAt && (
                <span>
                  Created: {new Date(order.createdAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              {order.staffPin && (
                <span>Staff: {order.staffPin}</span>
              )}
            </div>
            {order.items && (
              <span>
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};