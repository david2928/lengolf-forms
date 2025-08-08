'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Package2,
  Calculator,
  Star,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import { ProductModifier, ModifierFormData } from '@/types/product-management';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface ProductModifierManagerProps {
  productId?: string;
  productCost?: number;
  modifiers: ProductModifier[];
  modifierType: 'time' | 'quantity' | null;
  onModifiersChange: (modifiers: ProductModifier[], modifierType: 'time' | 'quantity' | null) => void;
  hasModifiers: boolean;
  onHasModifiersChange: (hasModifiers: boolean) => void;
}

interface ModifierFormState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  modifier?: ProductModifier;
}

export function ProductModifierManager({
  productId,
  productCost = 0,
  modifiers,
  modifierType,
  onModifiersChange,
  hasModifiers,
  onHasModifiersChange
}: ProductModifierManagerProps) {
  const [formState, setFormState] = useState<ModifierFormState>({
    isOpen: false,
    mode: 'create'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate profit margin for a modifier
  const calculateProfitMargin = (price: number, costMultiplier: number) => {
    const actualCost = productCost * costMultiplier;
    return price > 0 ? ((price - actualCost) / price * 100) : 0;
  };

  const handleToggleModifiers = (enabled: boolean) => {
    if (!enabled) {
      // Clear all modifiers when disabling
      onModifiersChange([], null);
    }
    onHasModifiersChange(enabled);
  };

  const handleModifierTypeChange = (newType: 'time' | 'quantity') => {
    if (modifiers.length > 0) {
      const confirmChange = window.confirm(
        'Changing modifier type will remove all existing modifiers. Continue?'
      );
      if (!confirmChange) return;
    }
    onModifiersChange([], newType);
  };

  const handleCreateModifier = () => {
    if (!modifierType) {
      toast({
        title: "Select modifier type",
        description: "Please select whether this product uses time or quantity modifiers",
        variant: "destructive"
      });
      return;
    }

    setFormState({
      isOpen: true,
      mode: 'create'
    });
  };

  const handleEditModifier = (modifier: ProductModifier) => {
    setFormState({
      isOpen: true,
      mode: 'edit',
      modifier
    });
  };

  const handleDeleteModifier = async (modifierId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this modifier?');
    if (!confirmDelete) return;

    try {
      setIsLoading(true);

      if (!productId) {
        throw new Error('Product ID is required to delete modifiers');
      }

      const response = await fetch(`/api/admin/products/${productId}/modifiers/${modifierId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete modifier');
      }

      // Remove from local state
      const newModifiers = modifiers.filter(m => m.id !== modifierId);
      onModifiersChange(newModifiers, modifierType);
      
      toast({
        title: "Modifier deleted",
        description: "The modifier has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting modifier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete modifier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitModifier = async (data: ModifierFormData, keepOpen = false) => {
    try {
      setIsLoading(true);

      if (formState.mode === 'create') {
        // Make API call to create modifier
        if (!productId) {
          throw new Error('Product ID is required to create modifiers');
        }

        const response = await fetch(`/api/admin/products/${productId}/modifiers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            price: data.price,
            cost_multiplier: data.cost_multiplier,
            modifier_type: data.modifier_type,
            is_default: data.is_default || (modifiers.length === 0),
            display_order: data.display_order || modifiers.length
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create modifier');
        }

        const result = await response.json();
        const newModifier = result.data;

        // If this is set as default, remove default from others
        const updatedModifiers = data.is_default 
          ? modifiers.map(m => ({ ...m, is_default: false }))
          : modifiers;

        onModifiersChange([...updatedModifiers, newModifier], data.modifier_type);
        
        toast({
          title: "Modifier created",
          description: `Added "${data.name}" modifier successfully`
        });

        // Keep modal open for adding more modifiers if requested
        if (keepOpen) {
          // Reset form but keep modal open
          setFormState({ isOpen: true, mode: 'create' });
        } else {
          setFormState({ isOpen: false, mode: 'create' });
        }
      } else if (formState.modifier) {
        // Make API call to update modifier
        if (!productId) {
          throw new Error('Product ID is required to update modifiers');
        }

        const response = await fetch(`/api/admin/products/${productId}/modifiers/${formState.modifier.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            price: data.price,
            cost_multiplier: data.cost_multiplier,
            modifier_type: data.modifier_type,
            is_default: data.is_default || false,
            display_order: data.display_order || formState.modifier.display_order
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update modifier');
        }

        const result = await response.json();
        const updatedModifier = result.data;

        // Update local state with API response
        const updatedModifiers = modifiers.map(m => 
          m.id === formState.modifier!.id 
            ? updatedModifier
            : data.is_default ? { ...m, is_default: false } : m // Remove default from others if this is set as default
        );

        onModifiersChange(updatedModifiers, modifierType);
        
        toast({
          title: "Modifier updated",
          description: `Updated "${data.name}" modifier successfully`
        });

        // Just close the modifier dialog (not the whole product form)
        setFormState({ isOpen: false, mode: 'create' });
      }
    } catch (error) {
      console.error('Error saving modifier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save modifier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Product Modifiers
          </div>
          <Switch
            checked={hasModifiers}
            onCheckedChange={handleToggleModifiers}
          />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable modifiers to offer time-based or quantity-based pricing options
        </p>
      </CardHeader>

      {hasModifiers && (
        <CardContent className="space-y-4">
          {/* Modifier Type Selection */}
          <div className="space-y-2">
            <Label>Modifier Type</Label>
            <Select
              value={modifierType || ''}
              onValueChange={handleModifierTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select modifier type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time-based (1hr, 2hr, 3hr)
                  </div>
                </SelectItem>
                <SelectItem value="quantity">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    Quantity-based (1x, 2x, 3x)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Modifiers List */}
          {modifierType && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {modifierType === 'time' ? 'Time Options' : 'Quantity Options'}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateModifier}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add {modifierType === 'time' ? 'Time' : 'Quantity'}
                </Button>
              </div>

              {modifiers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No modifiers added yet. Click &ldquo;Add {modifierType === 'time' ? 'Time' : 'Quantity'}&rdquo; to create your first modifier.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {modifiers
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((modifier) => {
                      const profitMargin = calculateProfitMargin(modifier.price, modifier.cost_multiplier);
                      const actualCost = productCost * modifier.cost_multiplier;
                      
                      return (
                        <Card key={modifier.id} className={cn(
                          "relative",
                          modifier.is_default && "border-blue-200 bg-blue-50"
                        )}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{modifier.name}</span>
                                    {modifier.is_default && (
                                      <Badge variant="secondary" className="h-5 text-xs">
                                        <Star className="h-3 w-3 mr-1" />
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>Price: ฿{modifier.price.toFixed(2)}</span>
                                    <span>Cost: ฿{actualCost.toFixed(2)}</span>
                                    <span className={cn(
                                      "font-medium",
                                      profitMargin >= 70 ? 'text-green-600' :
                                      profitMargin >= 50 ? 'text-green-500' :
                                      profitMargin >= 30 ? 'text-yellow-600' : 'text-red-600'
                                    )}>
                                      Margin: {profitMargin.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditModifier(modifier)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteModifier(modifier.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Warning for missing cost */}
          {productCost === 0 && modifiers.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Missing Product Cost</p>
                  <p>Add a base cost to calculate accurate profit margins for modifiers.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      )}

      {/* Modifier Form Dialog */}
      <ModifierFormDialog
        isOpen={formState.isOpen}
        mode={formState.mode}
        modifier={formState.modifier}
        modifierType={modifierType}
        productCost={productCost}
        onSubmit={handleSubmitModifier}
        onClose={() => setFormState({ isOpen: false, mode: 'create' })}
        isLoading={isLoading}
      />
    </Card>
  );
}

interface ModifierFormDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  modifier?: ProductModifier;
  modifierType: 'time' | 'quantity' | null;
  productCost: number;
  onSubmit: (data: ModifierFormData, keepOpen?: boolean) => void;
  onClose: () => void;
  isLoading: boolean;
}

function ModifierFormDialog({
  isOpen,
  mode,
  modifier,
  modifierType,
  productCost,
  onSubmit,
  onClose,
  isLoading
}: ModifierFormDialogProps) {
  const [formData, setFormData] = useState<ModifierFormData>({
    name: '',
    price: 0,
    cost_multiplier: 1.0,
    modifier_type: modifierType || 'time',
    is_default: false,
    display_order: 0
  });

  const [profitPreview, setProfitPreview] = useState({ margin: 0, actualCost: 0 });

  // Function to reset form data to defaults
  const resetFormData = useCallback(() => {
    setFormData({
      name: '',
      price: 0,
      cost_multiplier: 1.0,
      modifier_type: modifierType || 'time',
      is_default: false,
      display_order: 0
    });
  }, [modifierType]);

  // Update form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && modifier) {
        setFormData({
          name: modifier.name,
          price: modifier.price,
          cost_multiplier: modifier.cost_multiplier,
          modifier_type: modifier.modifier_type,
          is_default: modifier.is_default,
          display_order: modifier.display_order
        });
      } else {
        resetFormData();
      }
    }
  }, [isOpen, mode, modifier, modifierType, resetFormData]);

  // Calculate profit preview
  useEffect(() => {
    const actualCost = productCost * formData.cost_multiplier;
    const margin = formData.price > 0 ? ((formData.price - actualCost) / formData.price * 100) : 0;
    setProfitPreview({ margin, actualCost });
  }, [formData.price, formData.cost_multiplier, productCost]);

  const handleSubmit = (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    onSubmit(formData, keepOpen);
  };

  const handleAddAnother = (e: React.FormEvent) => {
    handleSubmit(e, true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add' : 'Edit'} {modifierType === 'time' ? 'Time' : 'Quantity'} Modifier
          </DialogTitle>
          <DialogDescription>
            Configure the pricing and cost multiplier for this modifier option.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={modifierType === 'time' ? 'e.g., 2 Hours' : 'e.g., 3 Units'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price (THB) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cost_multiplier">Cost Multiplier *</Label>
              <Input
                id="cost_multiplier"
                type="number"
                step="0.1"
                min="0"
                value={formData.cost_multiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_multiplier: parseFloat(e.target.value) || 1 }))}
                required
              />
            </div>
          </div>

          {/* Profit Preview */}
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Profit Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Actual Cost:</span>
                  <span className="ml-1 font-medium">฿{profitPreview.actualCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Margin:</span>
                  <span className={cn(
                    'ml-1 font-medium',
                    profitPreview.margin >= 70 ? 'text-green-600' :
                    profitPreview.margin >= 50 ? 'text-green-500' :
                    profitPreview.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {profitPreview.margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_default">Default Option</Label>
              <p className="text-xs text-muted-foreground">Pre-selected in POS</p>
            </div>
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'create' && (
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleAddAnother}
                disabled={isLoading || !formData.name || !formData.price}
              >
                {isLoading ? 'Saving...' : 'Add & Create Another'}
              </Button>
            )}
            <Button type="submit" disabled={isLoading || !formData.name || !formData.price}>
              {isLoading ? 'Saving...' : (mode === 'create' ? 'Add Modifier' : 'Update Modifier')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}