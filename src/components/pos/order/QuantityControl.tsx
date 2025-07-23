'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';

export interface QuantityControlProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showInput?: boolean;
  className?: string;
}

export const QuantityControl: React.FC<QuantityControlProps> = ({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
  step = 1,
  size = 'md',
  disabled = false,
  showInput = false,
  className = ''
}) => {
  const [tempValue, setTempValue] = useState<string>(quantity.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update temp value when quantity prop changes
  useEffect(() => {
    if (!isEditing) {
      setTempValue(quantity.toString());
    }
  }, [quantity, isEditing]);

  // Get size-specific styles
  const getSizeStyles = () => {
    const sizeMap = {
      xs: {
        button: 'w-6 h-6',
        icon: 'h-3 w-3',
        text: 'text-xs',
        input: 'w-8 h-6 text-xs',
        minWidth: 'min-w-4'
      },
      sm: {
        button: 'w-8 h-8',
        icon: 'h-3 w-3',
        text: 'text-sm',
        input: 'w-10 h-8 text-sm',
        minWidth: 'min-w-6'
      },
      md: {
        button: 'w-10 h-10',
        icon: 'h-4 w-4',
        text: 'text-base',
        input: 'w-12 h-10 text-base',
        minWidth: 'min-w-8'
      },
      lg: {
        button: 'w-12 h-12',
        icon: 'h-5 w-5',
        text: 'text-lg',
        input: 'w-16 h-12 text-lg',
        minWidth: 'min-w-10'
      }
    };
    return sizeMap[size];
  };

  const styles = getSizeStyles();

  // Handle increment
  const handleIncrement = useCallback(() => {
    if (disabled) return;
    
    const newQuantity = Math.min(quantity + step, max);
    if (newQuantity !== quantity) {
      onQuantityChange(newQuantity);
    }
  }, [quantity, step, max, disabled, onQuantityChange]);

  // Handle decrement
  const handleDecrement = useCallback(() => {
    if (disabled) return;
    
    const newQuantity = Math.max(quantity - step, min);
    if (newQuantity !== quantity) {
      onQuantityChange(newQuantity);
    }
  }, [quantity, step, min, disabled, onQuantityChange]);

  // Handle direct input
  const handleInputChange = useCallback((value: string) => {
    setTempValue(value);
  }, []);

  // Handle input blur/submit
  const handleInputSubmit = useCallback(() => {
    setIsEditing(false);
    
    const numValue = parseInt(tempValue, 10);
    if (isNaN(numValue)) {
      setTempValue(quantity.toString());
      return;
    }
    
    const clampedValue = Math.max(min, Math.min(max, numValue));
    if (clampedValue !== quantity) {
      onQuantityChange(clampedValue);
    }
    setTempValue(clampedValue.toString());
  }, [tempValue, quantity, min, max, onQuantityChange]);

  // Handle input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(quantity.toString());
    }
  }, [handleInputSubmit, quantity]);

  // Handle touch gestures for mobile
  const handleQuantityClick = useCallback(() => {
    if (showInput && !disabled) {
      setIsEditing(true);
    }
  }, [showInput, disabled]);

  const canDecrement = !disabled && quantity > min;
  const canIncrement = !disabled && quantity < max;

  return (
    <div className={`quantity-control flex items-center ${className}`}>
      {/* Decrement Button */}
      <button
        onClick={handleDecrement}
        disabled={!canDecrement}
        className={`
          ${styles.button} flex items-center justify-center rounded-l-lg border border-gray-300
          hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
        aria-label="Decrease quantity"
      >
        <Minus className={`${styles.icon} ${canDecrement ? 'text-gray-600' : 'text-gray-400'}`} />
      </button>

      {/* Quantity Display/Input */}
      <div className={`
        ${showInput && isEditing ? styles.input : styles.button} 
        flex items-center justify-center border-t border-b border-gray-300
        ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}
        ${showInput && !isEditing ? 'cursor-pointer hover:bg-gray-50' : ''}
      `}>
        {showInput && isEditing ? (
          <input
            type="number"
            value={tempValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={handleInputKeyDown}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={`
              w-full text-center border-0 outline-none bg-transparent
              ${styles.text} font-semibold
            `}
            autoFocus
          />
        ) : (
          <span
            onClick={handleQuantityClick}
            className={`
              ${styles.text} ${styles.minWidth} text-center font-semibold
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
          >
            {quantity}
          </span>
        )}
      </div>

      {/* Increment Button */}
      <button
        onClick={handleIncrement}
        disabled={!canIncrement}
        className={`
          ${styles.button} flex items-center justify-center rounded-r-lg border border-gray-300
          hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
        aria-label="Increase quantity"
      >
        <Plus className={`${styles.icon} ${canIncrement ? 'text-gray-600' : 'text-gray-400'}`} />
      </button>
    </div>
  );
};

// Quick preset components for common use cases
export const QuantityControlSmall: React.FC<Omit<QuantityControlProps, 'size'>> = (props) => (
  <QuantityControl {...props} size="sm" />
);

export const QuantityControlLarge: React.FC<Omit<QuantityControlProps, 'size'>> = (props) => (
  <QuantityControl {...props} size="lg" />
);

export const QuantityControlWithInput: React.FC<Omit<QuantityControlProps, 'showInput'>> = (props) => (
  <QuantityControl {...props} showInput />
);