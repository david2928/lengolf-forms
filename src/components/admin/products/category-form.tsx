'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
  Archive, 
  Palette,
  Save,
  AlertCircle
} from 'lucide-react';
import { 
  Category, 
  CategoryFormData
} from '@/types/product-management';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface CategoryFormProps {
  category?: Category;
  parentCategories: Category[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  isLoading?: boolean;
}

// Predefined color options for categories
const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Brown', value: '#8B4513' },
  { name: 'Black', value: '#1F2937' }
];

// Common icon options for categories
const CATEGORY_ICONS = [
  'package',
  'cup-soda',
  'utensils',
  'wine',
  'beer',
  'coffee',
  'ice-cream',
  'cake',
  'pizza',
  'sandwich',
  'salad',
  'gamepad-2',
  'trophy',
  'star',
  'gift',
  'tag',
  'folder',
  'grid-3x3'
];

export function CategoryForm({
  category,
  parentCategories,
  onSubmit,
  onCancel,
  isOpen,
  isLoading = false
}: CategoryFormProps) {
  const isEditMode = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    setValue
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      parent_id: '',
      description: '',
      display_order: 0,
      color_code: CATEGORY_COLORS[0].value,
      icon: CATEGORY_ICONS[0],
      is_active: true
    },
    mode: 'onChange'
  });

  // Reset form when category changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          parent_id: category.parent_id || '',
          description: category.description || '',
          display_order: category.display_order,
          color_code: category.color_code || CATEGORY_COLORS[0].value,
          icon: category.icon || CATEGORY_ICONS[0],
          is_active: category.is_active
        });
      } else {
        reset({
          name: '',
          parent_id: '',
          description: '',
          display_order: 0,
          color_code: CATEGORY_COLORS[0].value,
          icon: CATEGORY_ICONS[0],
          is_active: true
        });
      }
    }
  }, [isOpen, category, reset]);

  const onFormSubmit = async (data: CategoryFormData) => {
    try {
      // Convert numeric strings to numbers and handle optional fields
      const formattedData: CategoryFormData = {
        ...data,
        parent_id: data.parent_id || undefined,
        description: data.description || undefined,
        display_order: data.display_order ? parseInt(data.display_order.toString()) : 0,
        color_code: data.color_code || undefined,
        icon: data.icon || undefined
      };

      await onSubmit(formattedData);
      
      toast({
        title: isEditMode ? "Category updated" : "Category created",
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

  const selectedColor = watch('color_code');
  const selectedIcon = watch('icon');

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Archive className="h-4 w-4 sm:h-5 sm:w-5" />
            {isEditMode ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditMode 
              ? 'Make changes to the category information below.'
              : 'Fill in the category details to create a new category.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Basic Information */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      {...register('name', { 
                        required: 'Category name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' }
                      })}
                      className={errors.name ? 'border-red-500' : ''}
                      placeholder="Enter category name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="parent_id">Parent Category</Label>
                    <Select
                      value={watch('parent_id')}
                      onValueChange={(value) => setValue('parent_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No parent (top level)</SelectItem>
                        {parentCategories.map((parentCategory) => (
                          <SelectItem key={parentCategory.id} value={parentCategory.id}>
                            {parentCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to create a top-level category
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      rows={3}
                      placeholder="Category description (optional)"
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
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Appearance & Settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Color Selection */}
                  <div>
                    <Label>Color</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setValue('color_code', color.value)}
                          className={cn(
                            'w-8 h-8 rounded-md border-2 transition-all',
                            selectedColor === color.value 
                              ? 'border-gray-900 scale-110' 
                              : 'border-gray-300 hover:border-gray-400'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <Input
                      type="color"
                      {...register('color_code')}
                      className="mt-2 h-8"
                      title="Custom color"
                    />
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select
                      value={watch('icon')}
                      onValueChange={(value) => setValue('icon', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ICONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  <div>
                    <Label>Preview</Label>
                    <div className="mt-2 p-3 rounded-lg border" style={{ backgroundColor: selectedColor + '20' }}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <span className="text-sm font-medium">
                          {watch('name') || 'Category Name'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_active">Active Status</Label>
                      <p className="text-xs text-gray-500">Category is visible and usable</p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={watch('is_active')}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {isEditMode && category && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Category Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(category.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{new Date(category.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slug:</span>
                      <span className="font-mono text-xs">{category.slug}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Warning for parent categories */}
          {!watch('parent_id') && (
            <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-blue-800">
                <p className="font-medium">Top-level category</p>
                <p>This will be a main category that can contain sub-categories.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} className="text-sm">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isLoading}
              className="min-w-[100px] text-sm"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">{isEditMode ? 'Update Category' : 'Create Category'}</span>
                  <span className="sm:hidden">{isEditMode ? 'Update' : 'Create'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}