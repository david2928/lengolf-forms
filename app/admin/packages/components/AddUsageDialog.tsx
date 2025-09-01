'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AddUsageDialogProps {
  isOpen: boolean;
  packageId: string;
  packageName: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddUsageDialog: React.FC<AddUsageDialogProps> = ({
  isOpen,
  packageId,
  packageName,
  customerName,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    usedHours: '',
    usedDate: new Date().toISOString().split('T')[0],
    employeeName: '',
    bookingId: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.usedHours || !formData.usedDate || !formData.employeeName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/packages/${packageId}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usedHours: parseFloat(formData.usedHours),
          usedDate: formData.usedDate,
          employeeName: formData.employeeName,
          bookingId: formData.bookingId || null,
          notes: formData.notes || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add usage record');
      }

      toast({
        title: 'Success',
        description: 'Usage record added successfully'
      });

      // Reset form
      setFormData({
        usedHours: '',
        usedDate: new Date().toISOString().split('T')[0],
        employeeName: '',
        bookingId: '',
        notes: ''
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding usage:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add usage record',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        usedHours: '',
        usedDate: new Date().toISOString().split('T')[0],
        employeeName: '',
        bookingId: '',
        notes: ''
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Usage Record</DialogTitle>
          <DialogDescription>
            {customerName} - {packageName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usedHours">Hours Used *</Label>
            <Input
              id="usedHours"
              type="number"
              step="0.5"
              min="0"
              placeholder="1.0"
              value={formData.usedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, usedHours: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usedDate">Usage Date *</Label>
            <Input
              id="usedDate"
              type="date"
              value={formData.usedDate}
              onChange={(e) => setFormData(prev => ({ ...prev, usedDate: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeName">Employee Name *</Label>
            <Input
              id="employeeName"
              type="text"
              placeholder="Enter employee name"
              value={formData.employeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookingId">Booking ID (Optional)</Label>
            <Input
              id="bookingId"
              type="text"
              placeholder="Enter booking ID if applicable"
              value={formData.bookingId}
              onChange={(e) => setFormData(prev => ({ ...prev, bookingId: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this usage"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Usage'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};