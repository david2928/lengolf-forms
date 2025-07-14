'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calculator,
  Save,
  X
} from 'lucide-react';
import { 
  Product, 
  ProductFormData, 
  Category,
  PRODUCT_UNITS,
  ProductUnit
} from '@/types/product-management';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  isLoading?: boolean;
}

interface FormData extends ProductFormData {
  // Additional form-specific fields for validation
}

export function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isOpen,
  isLoading = false
}: ProductFormProps) {
  const [profitPreview, setProfitPreview] = useState<{
    margin: number;
    profit: number;
  } | null>(null);

  const isEditMode = !!product;
  const subCategories = categories.filter(c => c.parent_id);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    setValue,
    trigger
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      category_id: '',
      description: '',
      price: 0,
      cost: 0,
      sku: '',
      external_code: '',
      unit: 'pieces',
      is_sim_usage: false,
      is_active: true,
      display_order: 0,
      pos_display_color: ''
    },
    mode: 'onChange'
  });

  const watchedPrice = watch('price');
  const watchedCost = watch('cost');

  // Calculate profit preview when price or cost changes
  useEffect(() => {
    const price = parseFloat(watchedPrice?.toString() || '0');
    const cost = parseFloat(watchedCost?.toString() || '0');
    
    if (price > 0 && cost >= 0) {
      const profit = price - cost;
      const margin = cost > 0 ? (profit / price) * 100 : 100;
      setProfitPreview({ margin, profit });
    } else {
      setProfitPreview(null);
    }
  }, [watchedPrice, watchedCost]);

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          name: product.name,
          category_id: product.category_id,
          description: product.description || '',
          price: product.price,
          cost: product.cost || 0,
          sku: product.sku || '',
          external_code: product.external_code || '',
          unit: (product.unit as ProductUnit) || 'pieces',
          is_sim_usage: product.is_sim_usage,
          is_active: product.is_active,
          display_order: product.display_order,
          pos_display_color: product.pos_display_color || ''
        });
      } else {
        reset({
          name: '',
          category_id: '',
          description: '',
          price: 0,
          cost: 0,
          sku: '',
          external_code: '',
          unit: 'pieces',
          is_sim_usage: false,
          is_active: true,
          display_order: 0,
          pos_display_color: ''
        });
      }
    }
  }, [isOpen, product, reset]);

  const onFormSubmit = async (data: FormData) => {
    try {
      // Convert numeric strings to numbers
      const formattedData: ProductFormData = {
        ...data,
        price: parseFloat(data.price.toString()),
        cost: data.cost ? parseFloat(data.cost.toString()) : undefined,
        display_order: data.display_order ? parseInt(data.display_order.toString()) : undefined
      };

      await onSubmit(formattedData);
      
      toast({
        title: isEditMode ? "Product updated" : "Product created",
        description: `Successfully ${isEditMode ? 'updated' : 'created'} "${data.name}"`,
      });
      
      onCancel(); // Close the dialog
    } catch (error) {
      toast({
        title: isEditMode ? "Update failed" : "Creation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            {isEditMode ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditMode 
              ? 'Make changes to the product information below.'
              : 'Fill in the product details to create a new product.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        {...register('name', { 
                          required: 'Product name is required',
                          minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        className={errors.name ? 'border-red-500' : ''}
                        placeholder="Enter product name"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="category_id">Category *</Label>
                      <Select
                        value={watch('category_id')}
                        onValueChange={(value) => setValue('category_id', value, { shouldValidate: true })}
                      >
                        <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category_id && (
                        <p className="text-sm text-red-600 mt-1">{errors.category_id.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={watch('unit')}
                        onValueChange={(value) => setValue('unit', value as ProductUnit)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        {...register('sku')}
                        placeholder="Product SKU (optional)"
                      />
                    </div>

                    <div>
                      <Label htmlFor="external_code">External Code</Label>
                      <Input
                        id="external_code"
                        {...register('external_code')}
                        placeholder="Supplier code (optional)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...register('description')}
                        rows={3}
                        placeholder="Product description (optional)"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing & Cost
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (THB) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('price', { 
                          required: 'Price is required',
                          min: { value: 0, message: 'Price must be non-negative' }
                        })}
                        className={errors.price ? 'border-red-500' : ''}
                        placeholder="0.00"
                      />
                      {errors.price && (
                        <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="cost">Cost (THB)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('cost', {
                          min: { value: 0, message: 'Cost must be non-negative' }
                        })}
                        className={errors.cost ? 'border-red-500' : ''}
                        placeholder="0.00"
                      />
                      {errors.cost && (
                        <p className="text-sm text-red-600 mt-1">{errors.cost.message}</p>
                      )}
                    </div>
                  </div>

                  {profitPreview && (
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Profit Analysis</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Profit Margin:</span>
                            <span className={cn(
                              'ml-2 font-medium',
                              profitPreview.margin >= 70 ? 'text-green-600' :
                              profitPreview.margin >= 50 ? 'text-green-500' :
                              profitPreview.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                            )}>
                              {profitPreview.margin.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Profit Amount:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              ฿{profitPreview.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Settings & Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_active">Active Status</Label>
                      <p className="text-xs text-gray-500">Product is available for sale</p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={watch('is_active')}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_sim_usage">Simulator Usage</Label>
                      <p className="text-xs text-gray-500">Used for golf simulator</p>
                    </div>
                    <Switch
                      id="is_sim_usage"
                      checked={watch('is_sim_usage')}
                      onCheckedChange={(checked) => setValue('is_sim_usage', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="0"
                      {...register('display_order')}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                  </div>

                  <div>
                    <Label htmlFor="pos_display_color">POS Display Color</Label>
                    <Input
                      id="pos_display_color"
                      type="color"
                      {...register('pos_display_color')}
                      className="h-10"
                    />
                    <p className="text-xs text-gray-500 mt-1">Background color for POS display</p>
                  </div>
                </CardContent>
              </Card>

              {isEditMode && product && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{new Date(product.updated_at).toLocaleDateString()}</span>
                    </div>
                    {product.created_by && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created By:</span>
                        <span>{product.created_by}</span>
                      </div>
                    )}
                    {product.is_custom_product && (
                      <Badge variant="secondary" className="w-full justify-center">
                        Custom Product
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {isEditMode ? 'Update Product' : 'Create Product'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}