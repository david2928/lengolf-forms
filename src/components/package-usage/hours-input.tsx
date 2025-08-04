'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface HoursInputProps {
  value: number | null
  onChange: (value: number | null) => void
  maxHours?: number
  isDisabled?: boolean
}

export function HoursInput({ value, onChange, maxHours = 30, isDisabled = false }: HoursInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>(value?.toString() || '');

  // Sync internal state with prop value when it changes
  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!newValue) {
      onChange(null);
      setError(null);
      return;
    }

    const numValue = parseFloat(newValue);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      onChange(null);
    } else if (numValue < 0.5) {
      setError('Minimum value is 0.5');
      onChange(null);
    } else if (numValue > maxHours) {
      setError(`Maximum value is ${maxHours}`);
      onChange(null);
    } else {
      setError(null);
      onChange(numValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="hours-input">
        Used Hours
      </Label>
      <Input
        id="hours-input"
        type="text"
        value={inputValue}
        onChange={handleChange}
        disabled={isDisabled}
        placeholder="Enter hours here (0.5 allowed)"
        className="w-full"
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}