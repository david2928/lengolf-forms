'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus } from 'lucide-react';
import { CustomProductData, POSProduct, CreateCustomProductResponse } from '@/types/pos';

interface CustomProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: POSProduct) => void;
  staffName?: string;
}

export const CustomProductModal: React.FC<CustomProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  staffName = 'Staff'
}) => {
  const [formData, setFormData] = useState<CustomProductData>({
    name: '',
    price: 0,
    description: '',
    createdBy: staffName
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        price: 0,
        description: '',
        createdBy: staffName
      });
      setErrors({});
    }
  }, [isOpen, staffName]);

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Product name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Product name must be less than 100 characters';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    } else if (formData.price > 99999) {
      newErrors.price = 'Price must be less than 99,999';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pos/products/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result: CreateCustomProductResponse = await response.json();

      if (result.success && result.product) {
        onProductCreated(result.product);
        onClose();
      } else {
        setErrors({ 
          general: result.error || 'Failed to create custom product' 
        });
      }
    } catch (error) {
      console.error('Error creating custom product:', error);
      setErrors({ 
        general: 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof CustomProductData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle price input with formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      handleInputChange('price', value === '' ? 0 : parseFloat(value));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none sm:w-full sm:h-full sm:max-w-none sm:max-h-none p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 p-6 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Plus className="w-6 h-6 text-blue-600" />
              Create Custom Product
            </DialogTitle>
          </DialogHeader>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">{errors.general}</span>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-3">
                <Label htmlFor="productName" className="text-lg font-medium">
                  Product Name *
                </Label>
                <Input
                  id="productName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Special Item, Custom Service"
                  className={`h-14 text-lg ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                  disabled={isLoading}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-base text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-3">
                <Label htmlFor="productPrice" className="text-lg font-medium">
                  Price (THB) *
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                    ฿
                  </span>
                  <Input
                    id="productPrice"
                    type="text"
                    value={formData.price === 0 ? '' : formData.price.toString()}
                    onChange={handlePriceChange}
                    placeholder="0.00"
                    className={`pl-12 h-14 text-lg ${errors.price ? 'border-red-300 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.price && (
                  <p className="text-base text-red-600">{errors.price}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="productDescription" className="text-lg font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="productDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional details about this custom product..."
                  rows={4}
                  className={`text-base ${errors.description ? 'border-red-300 focus:border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.description && (
                  <p className="text-base text-red-600">{errors.description}</p>
                )}
                <p className="text-sm text-gray-500">
                  {formData.description?.length || 0}/500 characters
                </p>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
                <p className="font-medium mb-2 text-base">Custom Product Info:</p>
                <ul className="text-sm space-y-1">
                  <li>• This product will be added to your order immediately</li>
                  <li>• It won&apos;t appear in the regular product catalog</li>
                  <li>• Perfect for one-time items or special services</li>
                </ul>
              </div>
            </form>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 border-t bg-gray-50">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-14 text-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim() || formData.price <= 0}
                className="flex-1 h-14 text-lg"
                onClick={handleSubmit}
              >
                {isLoading ? 'Creating...' : 'Create & Add'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};