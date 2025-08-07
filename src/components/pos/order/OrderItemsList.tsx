'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OrderItem } from '@/types/pos';
import { QuantityControl } from './QuantityControl';
import { Trash2, Edit3, ChevronDown, ChevronUp, Package } from 'lucide-react';

export interface OrderItemsListProps {
  items: OrderItem[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  loading?: boolean;
  showGroupByCategory?: boolean;
  className?: string;
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({
  items,
  onQuantityChange,
  onRemove,
  onNotesChange,
  loading = false,
  showGroupByCategory = false,
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<{ [key: string]: string }>({});

  // Group items by category if requested
  const groupedItems = useCallback(() => {
    if (!showGroupByCategory) {
      return { 'All Items': items };
    }

    return items.reduce((groups, item) => {
      const category = item.categoryName || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, OrderItem[]>);
  }, [items, showGroupByCategory]);

  // Toggle item expansion
  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Handle notes editing
  const startEditingNotes = useCallback((itemId: string, currentNotes: string) => {
    setEditingNotes(itemId);
    setTempNotes(prev => ({ ...prev, [itemId]: currentNotes }));
  }, []);

  const saveNotes = useCallback((itemId: string) => {
    const notes = tempNotes[itemId] || '';
    onNotesChange(itemId, notes);
    setEditingNotes(null);
  }, [tempNotes, onNotesChange]);

  const cancelEditingNotes = useCallback(() => {
    setEditingNotes(null);
    setTempNotes({});
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get modifier summary
  const getModifierSummary = (item: OrderItem): string => {
    if (!item.modifiers || item.modifiers.length === 0) return '';
    
    return item.modifiers.map(modifier => {
      return modifier.modifier_name;
    }).join(', ');
  };

  // Calculate item subtotal
  const calculateItemSubtotal = (item: OrderItem): number => {
    return item.unitPrice * item.quantity;
  };

  // Calculate modifier total
  const calculateModifierTotal = (item: OrderItem): number => {
    return item.totalPrice - calculateItemSubtotal(item);
  };

  if (items.length === 0) {
    return (
      <div className={`order-items-list ${className}`}>
        <div className="p-8 text-center text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No items in order</p>
        </div>
      </div>
    );
  }

  const itemGroups = groupedItems();

  return (
    <div className={`order-items-list ${className}`}>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(itemGroups).map(([category, categoryItems]) => (
          <div key={category} className="mb-4">
            {showGroupByCategory && Object.keys(itemGroups).length > 1 && (
              <h3 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border-b border-gray-200">
                {category} ({categoryItems.length})
              </h3>
            )}
            
            <div className="divide-y divide-gray-200">
              {categoryItems.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                const isEditingNotes = editingNotes === item.id;
                const hasModifiers = item.modifiers && item.modifiers.length > 0;
                const hasNotes = item.notes && item.notes.trim().length > 0;
                const modifierSummary = getModifierSummary(item);
                const modifierTotal = calculateModifierTotal(item);

                return (
                  <div
                    key={item.id}
                    className={`
                      px-4 py-3 hover:bg-gray-50 transition-colors
                      ${loading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                  >
                    {/* Main Item Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {item.productName}
                            </h4>
                            
                            {/* Quick modifier/notes summary */}
                            {(modifierSummary || hasNotes) && !isExpanded && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {modifierSummary}
                                {modifierSummary && hasNotes && ' • '}
                                {hasNotes && `Note: ${item.notes}`}
                              </p>
                            )}

                            {/* Price breakdown */}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatCurrency(item.unitPrice)} × {item.quantity}
                              </span>
                              {modifierTotal > 0 && (
                                <>
                                  <span className="text-xs text-gray-400">+</span>
                                  <span className="text-xs text-gray-500">
                                    {formatCurrency(modifierTotal)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expand/Collapse button */}
                          {(hasModifiers || hasNotes) && (
                            <button
                              onClick={() => toggleItemExpansion(item.id)}
                              className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions and Total */}
                      <div className="flex items-center space-x-3">
                        {/* Total Price */}
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>

                        {/* Quantity Control */}
                        <QuantityControl
                          quantity={item.quantity}
                          onQuantityChange={(qty) => onQuantityChange(item.id, qty)}
                          min={0}
                          max={99}
                          size="sm"
                        />

                        {/* Remove Button */}
                        <button
                          onClick={() => onRemove(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 pl-4 space-y-3 border-l-2 border-gray-200">
                        {/* Modifiers */}
                        {hasModifiers && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">
                              Customizations:
                            </h5>
                            <div className="space-y-1">
                              {item.modifiers.map((modifier, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">
                                    • {modifier.modifier_name}
                                    <span className="text-gray-500 ml-1">({modifier.modifier_type})</span>
                                  </span>
                                  <span className="text-gray-600">
                                    {formatCurrency(modifier.modifier_price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="text-xs font-medium text-gray-700">
                              Special Instructions:
                            </h5>
                            {!isEditingNotes && (
                              <button
                                onClick={() => startEditingNotes(item.id, item.notes || '')}
                                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                          
                          {isEditingNotes ? (
                            <div className="space-y-2">
                              <textarea
                                value={tempNotes[item.id] || ''}
                                onChange={(e) => setTempNotes(prev => ({ 
                                  ...prev, 
                                  [item.id]: e.target.value 
                                }))}
                                className="
                                  w-full px-2 py-1 text-xs border border-gray-300 rounded
                                  focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
                                  resize-none
                                "
                                rows={2}
                                placeholder="Add special instructions..."
                                autoFocus
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => saveNotes(item.id)}
                                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditingNotes}
                                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600">
                              {item.notes || 'No special instructions'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};