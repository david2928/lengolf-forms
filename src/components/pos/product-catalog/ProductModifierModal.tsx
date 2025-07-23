'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { POSProduct, ProductModifier, SelectedModifier } from '@/types/pos';
import { X, Plus, Minus, AlertCircle, Check } from 'lucide-react';

export interface ProductModifierModalProps {
  product: POSProduct;
  isOpen: boolean;
  onComplete: (product: POSProduct, modifiers: SelectedModifier[], notes: string) => void;
  onCancel: () => void;
  className?: string;
}

interface ModifierSelection {
  [modifierId: string]: {
    selected: boolean;
    quantity: number;
    options: string[];
  };
}

export const ProductModifierModal: React.FC<ProductModifierModalProps> = ({
  product,
  isOpen,
  onComplete,
  onCancel,
  className = ''
}) => {
  const [modifierSelections, setModifierSelections] = useState<ModifierSelection>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize modifier selections
  useEffect(() => {
    if (!product.modifiers) return;

    const initialSelections: ModifierSelection = {};
    
    product.modifiers.forEach(modifier => {
      initialSelections[modifier.id] = {
        selected: modifier.isRequired || modifier.isDefault,
        quantity: modifier.isRequired || modifier.isDefault ? 1 : 0,
        options: modifier.options ? [] : []
      };
    });

    setModifierSelections(initialSelections);
  }, [product.modifiers]);

  // Calculate total price
  useEffect(() => {
    let total = product.price * quantity;

    Object.entries(modifierSelections).forEach(([modifierId, selection]) => {
      if (!selection.selected) return;

      const modifier = product.modifiers?.find(m => m.id === modifierId);
      if (!modifier) return;

      if (modifier.priceType === 'fixed') {
        total += modifier.price * selection.quantity * quantity;
      } else if (modifier.priceType === 'percentage') {
        total += (product.price * (modifier.price / 100)) * selection.quantity * quantity;
      }
    });

    setTotalPrice(total);
  }, [product, modifierSelections, quantity]);

  // Validate selections
  const validateSelections = useCallback((): string[] => {
    const validationErrors: string[] = [];

    if (!product.modifiers) return validationErrors;

    product.modifiers.forEach(modifier => {
      const selection = modifierSelections[modifier.id];
      
      if (modifier.isRequired && (!selection || !selection.selected)) {
        validationErrors.push(`${modifier.name} is required`);
      }

      if (modifier.options && modifier.options.length > 0 && selection?.selected) {
        if (selection.options.length === 0) {
          validationErrors.push(`Please select an option for ${modifier.name}`);
        }
      }
    });

    return validationErrors;
  }, [product.modifiers, modifierSelections]);

  // Update errors when selections change
  useEffect(() => {
    const validationErrors = validateSelections();
    setErrors(validationErrors);
  }, [validateSelections]);

  // Handle modifier toggle
  const handleModifierToggle = (modifierId: string) => {
    setModifierSelections(prev => {
      const modifier = product.modifiers?.find(m => m.id === modifierId);
      if (!modifier) return prev;

      const currentSelection = prev[modifierId];
      const newSelected = !currentSelection.selected;

      return {
        ...prev,
        [modifierId]: {
          ...currentSelection,
          selected: newSelected,
          quantity: newSelected ? Math.max(1, currentSelection.quantity) : 0
        }
      };
    });
  };

  // Handle modifier quantity change
  const handleModifierQuantityChange = (modifierId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setModifierSelections(prev => ({
      ...prev,
      [modifierId]: {
        ...prev[modifierId],
        quantity: newQuantity,
        selected: newQuantity > 0
      }
    }));
  };

  // Handle modifier option selection
  const handleModifierOptionSelect = (modifierId: string, optionId: string) => {
    setModifierSelections(prev => {
      const modifier = product.modifiers?.find(m => m.id === modifierId);
      if (!modifier) return prev;

      const currentSelection = prev[modifierId];
      let newOptions = [...currentSelection.options];

      if (newOptions.includes(optionId)) {
        newOptions = newOptions.filter(id => id !== optionId);
      } else {
        // For single-select modifiers, replace the selection
        if (modifier.maxSelections === 1) {
          newOptions = [optionId];
        } else {
          newOptions.push(optionId);
        }
      }

      return {
        ...prev,
        [modifierId]: {
          ...currentSelection,
          options: newOptions,
          selected: newOptions.length > 0 || currentSelection.selected
        }
      };
    });
  };

  // Handle product quantity change
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  // Handle complete
  const handleComplete = () => {
    const validationErrors = validateSelections();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Build selected modifiers array
    const selectedModifiers: SelectedModifier[] = [];

    Object.entries(modifierSelections).forEach(([modifierId, selection]) => {
      if (!selection.selected) return;

      const modifier = product.modifiers?.find(m => m.id === modifierId);
      if (!modifier) return;

      selectedModifiers.push({
        modifierId: modifier.id,
        modifierName: modifier.name,
        price: modifier.price,
        priceType: modifier.priceType,
        quantity: selection.quantity,
        selectedOptions: selection.options.map(optionId => {
          const option = modifier.options?.find((o: any) => o.id === optionId);
          return {
            optionId,
            optionName: option?.name || '',
            priceAdjustment: option?.priceAdjustment || 0
          };
        })
      });
    });

    onComplete(product, selectedModifiers, notes);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden
          ${className}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                Customize Order
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {product.name}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-96">
            <div className="p-6 space-y-6">
              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="
                      w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300
                      hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  
                  <span className="text-lg font-semibold min-w-8 text-center">
                    {quantity}
                  </span>
                  
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 99}
                    className="
                      w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300
                      hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modifiers */}
              {product.modifiers && product.modifiers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Customizations
                  </label>
                  
                  <div className="space-y-4">
                    {product.modifiers.map(modifier => {
                      const selection = modifierSelections[modifier.id] || {
                        selected: false,
                        quantity: 0,
                        options: []
                      };

                      return (
                        <div
                          key={modifier.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selection.selected}
                                onChange={() => handleModifierToggle(modifier.id)}
                                disabled={modifier.isRequired}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <div>
                                <span className="font-medium text-gray-900">
                                  {modifier.name}
                                </span>
                                {modifier.isRequired && (
                                  <span className="ml-2 text-xs text-red-600">
                                    Required
                                  </span>
                                )}
                                {modifier.description && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {modifier.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(modifier.price)}
                                {modifier.priceType === 'percentage' && '%'}
                              </span>
                              
                              {selection.selected && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleModifierQuantityChange(
                                      modifier.id,
                                      Math.max(0, selection.quantity - 1)
                                    )}
                                    disabled={modifier.isRequired && selection.quantity <= 1}
                                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  
                                  <span className="w-8 text-center text-sm">
                                    {selection.quantity}
                                  </span>
                                  
                                  <button
                                    onClick={() => handleModifierQuantityChange(
                                      modifier.id,
                                      selection.quantity + 1
                                    )}
                                    className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Modifier Options */}
                          {modifier.options && modifier.options.length > 0 && selection.selected && (
                            <div className="ml-7 space-y-2">
                              {modifier.options.map((option: any) => (
                                <label
                                  key={option.id}
                                  className="flex items-center space-x-2 cursor-pointer"
                                >
                                  <input
                                    type={modifier.maxSelections === 1 ? 'radio' : 'checkbox'}
                                    name={modifier.maxSelections === 1 ? `modifier-${modifier.id}` : undefined}
                                    checked={selection.options.includes(option.id)}
                                    onChange={() => handleModifierOptionSelect(modifier.id, option.id)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.name}
                                  </span>
                                  {option.priceAdjustment !== 0 && (
                                    <span className="text-sm text-gray-500">
                                      ({option.priceAdjustment > 0 ? '+' : ''}{formatPrice(option.priceAdjustment)})
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Special Instructions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  className="
                    w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    text-sm resize-none
                  "
                  rows={3}
                />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">
                        Please fix the following errors:
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-lg font-semibold text-gray-900">
              Total: {formatPrice(totalPrice)}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="
                  px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg
                  hover:bg-gray-50 transition-colors
                "
              >
                Cancel
              </button>
              
              <button
                onClick={handleComplete}
                disabled={errors.length > 0}
                className="
                  px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg
                  hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors flex items-center space-x-2
                "
              >
                <Check className="h-4 w-4" />
                <span>Add to Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};