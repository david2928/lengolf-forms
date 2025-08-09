'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Package {
  id?: string;
  customer_name: string;
  customer_id?: string;
  package_type_id: number;
  purchase_date: string;
  expiration_date: string;
  first_use_date?: string;
  employee_name?: string;
}

interface PackageType {
  id: number;
  name: string;
  display_name?: string;
  hours?: number;
}

interface PackageFormProps {
  isOpen: boolean;
  package?: Package;
  packageTypes: PackageType[];
  onClose: () => void;
}

export const PackageForm: React.FC<PackageFormProps> = ({
  isOpen,
  package: editingPackage,
  packageTypes,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_id: '',
    package_type_id: '',
    purchase_date: '',
    expiration_date: '',
    first_use_date: '',
    employee_name: '',
    modification_notes: ''
  });

  // Reset form when package changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingPackage) {
        setFormData({
          customer_name: editingPackage.customer_name || '',
          customer_id: editingPackage.customer_id || '',
          package_type_id: editingPackage.package_type_id?.toString() || '',
          purchase_date: editingPackage.purchase_date || '',
          expiration_date: editingPackage.expiration_date || '',
          first_use_date: editingPackage.first_use_date || '',
          employee_name: editingPackage.employee_name || '',
          modification_notes: ''
        });
      } else {
        // Reset form for new package
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          customer_name: '',
          customer_id: '',
          package_type_id: '',
          purchase_date: today,
          expiration_date: '',
          first_use_date: '',
          employee_name: '',
          modification_notes: ''
        });
      }
    }
  }, [isOpen, editingPackage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Don't send customer data on updates - it's not editable
      const submitData: any = {
        package_type_id: parseInt(formData.package_type_id),
        purchase_date: formData.purchase_date,
        expiration_date: formData.expiration_date,
        first_use_date: formData.first_use_date || null,
        employee_name: formData.employee_name || null,
        modification_notes: formData.modification_notes || undefined
      };
      
      // Only include customer data for new packages (which we don't support anymore)
      if (!editingPackage) {
        submitData.customer_name = formData.customer_name;
        submitData.customer_id = formData.customer_id || null;
      }

      const url = editingPackage 
        ? `/api/admin/packages/${editingPackage.id}`
        : '/api/admin/packages';
      
      const method = editingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${editingPackage ? 'update' : 'create'} package`);
      }

      toast.success(`Package ${editingPackage ? 'updated' : 'created'} successfully`);
      onClose();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save package');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = 
    formData.package_type_id && 
    formData.purchase_date && 
    formData.expiration_date &&
    (!editingPackage || formData.modification_notes.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingPackage ? 'Edit Package' : 'Create Package'}
          </DialogTitle>
          <DialogDescription>
            {editingPackage 
              ? 'Update package details and provide a reason for changes.'
              : 'Create a new package for a customer.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information - Read Only for Edit */}
          {editingPackage && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm text-muted-foreground">Customer</Label>
              <div className="mt-1 font-medium text-lg">{formData.customer_name}</div>
              {formData.customer_id && (
                <div className="text-xs text-muted-foreground mt-1">ID: {formData.customer_id}</div>
              )}
            </div>
          )}

          {/* Package Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package_type_id">Package Type *</Label>
              <Select
                value={formData.package_type_id}
                onValueChange={(value) => handleChange('package_type_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package type" />
                </SelectTrigger>
                <SelectContent>
                  {packageTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.display_name || type.name}
                      {type.hours && ` (${type.hours}h)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee_name">Employee Name</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => handleChange('employee_name', e.target.value)}
                placeholder="Staff who created package"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="expiration_date">Expiration Date *</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => handleChange('expiration_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="first_use_date">First Use Date</Label>
              <Input
                id="first_use_date"
                type="date"
                value={formData.first_use_date}
                onChange={(e) => handleChange('first_use_date', e.target.value)}
              />
            </div>
          </div>

          {/* Modification Reason (for edits) */}
          {editingPackage && (
            <div>
              <Label htmlFor="modification_notes">Reason for Changes *</Label>
              <Textarea
                id="modification_notes"
                value={formData.modification_notes}
                onChange={(e) => handleChange('modification_notes', e.target.value)}
                placeholder="Explain why these changes are being made..."
                rows={3}
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingPackage ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingPackage ? 'Update Package' : 'Create Package'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};