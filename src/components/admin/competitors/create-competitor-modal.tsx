'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import { createCompetitor } from '@/hooks/use-competitors';
import { Platform } from '@/types/competitor-tracking';

interface CreateCompetitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  business_type: string;
  location: string;
  notes: string;
  social_accounts: Array<{
    platform: Platform;
    account_handle: string;
    account_url: string;
  }>;
}

const platforms: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'line', label: 'LINE' },
  { value: 'google_reviews', label: 'Google Reviews' },
];

export function CreateCompetitorModal({ open, onOpenChange, onSuccess }: CreateCompetitorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      business_type: 'golf_academy',
      location: '',
      notes: '',
      social_accounts: [{ platform: 'instagram', account_handle: '', account_url: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'social_accounts'
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Filter out empty social accounts
      const validAccounts = data.social_accounts.filter(account => 
        account.platform && account.account_url.trim()
      );

      await createCompetitor({
        ...data,
        social_accounts: validAccounts
      });
      
      toast.success('Competitor created successfully');
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create competitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Competitor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Competitor name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Input
                id="business_type"
                {...register('business_type')}
                placeholder="e.g., golf_academy"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="City, Country"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this competitor"
              rows={3}
            />
          </div>

          {/* Social Media Accounts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Social Media Accounts</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ platform: 'instagram', account_handle: '', account_url: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Account {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      defaultValue={field.platform}
                      onValueChange={(value) => {
                        const accounts = [...fields];
                        accounts[index] = { ...accounts[index], platform: value as Platform };
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((platform) => (
                          <SelectItem key={platform.value} value={platform.value}>
                            {platform.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Handle (optional)</Label>
                    <Input
                      {...register(`social_accounts.${index}.account_handle`)}
                      placeholder="@username"
                    />
                  </div>

                  <div>
                    <Label>URL *</Label>
                    <Input
                      {...register(`social_accounts.${index}.account_url`, {
                        required: 'URL is required'
                      })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Competitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}