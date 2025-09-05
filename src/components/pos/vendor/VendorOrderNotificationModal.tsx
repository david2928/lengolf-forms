'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, AlertCircle } from 'lucide-react';

// Local type definition to avoid importing the service on client side
export interface VendorOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
}

// Local function to format vendor order message (simplified format)
function formatVendorOrderMessage(
  orderNumber: number,
  items: VendorOrderItem[],
  staffName?: string
): string {
  const lines: string[] = [];
  
  // Simple header with order number
  lines.push(`Order ${orderNumber}:`);
  
  // Add items
  items.forEach(item => {
    let itemLine = `${item.quantity} ${item.productName}`;
    if (item.notes && item.notes.trim()) {
      itemLine += ` (${item.notes.trim()})`;
    }
    lines.push(itemLine);
  });
  
  return lines.join('\n');
}

interface VendorOrderNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: VendorOrderItem[], customMessage?: string) => Promise<void>;
  vendorName: string;
  items: VendorOrderItem[];
  orderNumber: number;
  staffName?: string;
}

export default function VendorOrderNotificationModal({
  isOpen,
  onClose,
  onConfirm,
  vendorName,
  items: initialItems,
  orderNumber,
  staffName
}: VendorOrderNotificationModalProps) {
  const [items, setItems] = useState<VendorOrderItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  // Generate auto message whenever items change
  const autoMessage = formatVendorOrderMessage(orderNumber, items, staffName);

  // Update custom message when auto message changes (unless user is actively editing)
  useEffect(() => {
    if (!useCustomMessage) {
      setCustomMessage(autoMessage);
    }
  }, [autoMessage, useCustomMessage]);

  if (!isOpen) return null;

  const handleNotesChange = (index: number, notes: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], notes };
    setItems(updatedItems);
  };

  const handleMessageChange = (message: string) => {
    setCustomMessage(message);
    setUseCustomMessage(true); // Mark as user-edited
  };

  const handleResetMessage = () => {
    setUseCustomMessage(false);
    setCustomMessage(autoMessage);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onConfirm(items, customMessage);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Send Order to {vendorName}
              </h2>
              <p className="text-sm text-gray-500">
                Order #{orderNumber} • Review items and add notes before sending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Failed to send notification</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {item.quantity} × {item.productName}
                    </h4>
                  </div>
                </div>
                
                {/* Notes Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (optional)
                  </label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(index, e.target.value)}
                    placeholder="e.g., no sauce, extra crispy, on the side..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Preview - Editable */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">LINE Message</h3>
            {useCustomMessage && (
              <button
                onClick={handleResetMessage}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
                disabled={isLoading}
              >
                Reset to Auto
              </button>
            )}
          </div>
          <div className="bg-gray-50 border rounded-lg">
            <textarea
              value={customMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="w-full h-24 p-4 text-sm text-gray-800 font-mono bg-transparent border-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg"
              placeholder="Message content will appear here..."
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can edit this message before sending. Changes to item notes above will update the message automatically.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {vendorName}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}