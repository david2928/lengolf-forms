'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Discount } from '@/types/discount';
import { ProductEligibilitySelector } from './ProductEligibilitySelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface AdminDiscountFormProps {
  discountId?: string;
}

export function AdminDiscountForm({ discountId }: AdminDiscountFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    application_scope: 'receipt' as 'item' | 'receipt',
    availability_type: 'always' as 'always' | 'date_range',
    valid_from: '',
    valid_until: '',
    eligible_product_ids: [] as string[]
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!discountId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (discountId) {
      fetchDiscount();
    }
  }, [discountId, fetchDiscount]);

  const fetchDiscount = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch discount');
      }
      
      const discount = data.discount;
      
      setFormData({
        title: discount.title,
        description: discount.description || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value.toString(),
        application_scope: discount.application_scope,
        availability_type: discount.availability_type,
        valid_from: discount.valid_from ? discount.valid_from.split('T')[0] : '',
        valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : '',
        eligible_product_ids: discount.discount_product_eligibility?.map((e: any) => e.product_id) || []
      });
    } catch (error) {
      console.error('Error fetching discount:', error);
      setErrors({ fetch: 'Failed to load discount data' });
    } finally {
      setInitialLoading(false);
    }
  }, [discountId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      newErrors.discount_value = 'Discount value must be greater than 0';
    }
    if (formData.discount_type === 'percentage' && parseFloat(formData.discount_value) > 100) {
      newErrors.discount_value = 'Percentage cannot exceed 100%';
    }
    if (formData.availability_type === 'date_range') {
      if (!formData.valid_from) newErrors.valid_from = 'Start date is required';
      if (!formData.valid_until) newErrors.valid_until = 'End date is required';
      if (formData.valid_from && formData.valid_until && formData.valid_from >= formData.valid_until) {
        newErrors.valid_until = 'End date must be after start date';
      }
    }
    if (formData.application_scope === 'item' && formData.eligible_product_ids.length === 0) {
      newErrors.eligible_products = 'At least one product must be selected for item-level discounts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const url = discountId ? `/api/admin/discounts/${discountId}` : '/api/admin/discounts';
      const method = discountId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value)
        })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = '/admin/discounts';
      } else {
        setErrors({ submit: data.error || 'Failed to save discount' });
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      setErrors({ submit: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-center py-4">Loading discount...</div>;
  }

  if (errors.fetch) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {errors.fetch}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 overflow-x-hidden">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Staff Discount, Birthday Special"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Optional description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount-type">Discount Type *</Label>
            <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value as any })}>
              <SelectTrigger id="discount-type" className="w-full">
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount-value">
              Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
            </Label>
            <Input
              id="discount-value"
              type="number"
              step="0.01"
              min="0"
              max={formData.discount_type === 'percentage' ? '100' : undefined}
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
            />
            {errors.discount_value && <p className="text-red-500 text-sm mt-1">{errors.discount_value}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="application-scope">Application Scope *</Label>
          <Select value={formData.application_scope} onValueChange={(value) => setFormData({ ...formData, application_scope: value as any })}>
            <SelectTrigger id="application-scope" className="w-full">
              <SelectValue placeholder="Select application scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receipt">Receipt Level (apply to total)</SelectItem>
              <SelectItem value="item">Item Level (apply to specific products)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.application_scope === 'item' && (
          <div className="space-y-2">
            <Label htmlFor="eligible-products">Eligible Products *</Label>
            <ProductEligibilitySelector
              selectedProductIds={formData.eligible_product_ids}
              onChange={(productIds) => setFormData({ ...formData, eligible_product_ids: productIds })}
            />
            {errors.eligible_products && <p className="text-red-500 text-sm mt-1">{errors.eligible_products}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="availability-type">Availability *</Label>
          <Select value={formData.availability_type} onValueChange={(value) => setFormData({ ...formData, availability_type: value as any })}>
            <SelectTrigger id="availability-type" className="w-full">
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always Available</SelectItem>
              <SelectItem value="date_range">Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.availability_type === 'date_range' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid-from">Start Date *</Label>
              <Input
                id="valid-from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
              {errors.valid_from && <p className="text-red-500 text-sm mt-1">{errors.valid_from}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid-until">End Date *</Label>
              <Input
                id="valid-until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
              {errors.valid_until && <p className="text-red-500 text-sm mt-1">{errors.valid_until}</p>}
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : discountId ? 'Update Discount' : 'Create Discount'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.href = '/admin/discounts'}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}