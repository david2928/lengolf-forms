'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, X, Loader2, MapPin, ExternalLink } from 'lucide-react';
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
import { updateCompetitor, deleteCompetitor } from '@/hooks/use-competitors';
import { Platform } from '@/types/competitor-tracking';

interface EditCompetitorModalProps {
  competitorId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  business_type: string;
  notes: string;
  is_active: boolean;
  social_accounts: Array<{
    id?: number;
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

export function EditCompetitorModal({ competitorId, onClose, onSuccess }: EditCompetitorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      business_type: 'golf_academy',
      notes: '',
      is_active: true,
      social_accounts: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'social_accounts'
  });

  // Load competitor data
  useEffect(() => {
    const loadCompetitor = async () => {
      try {
        const response = await fetch(`/api/admin/competitors`);
        if (!response.ok) throw new Error('Failed to fetch competitors');
        
        const data = await response.json();
        const competitor = data.competitors.find((c: any) => c.id === competitorId);
        
        if (competitor) {
          setValue('name', competitor.name);
          setValue('business_type', competitor.business_type || 'golf_academy');
          setValue('notes', competitor.notes || '');
          setValue('is_active', competitor.is_active);
          setCompetitorName(competitor.name);
          
          // Load social accounts
          const socialAccounts = competitor.social_accounts?.map((account: any) => ({
            id: account.id,
            platform: account.platform,
            account_handle: account.account_handle || '',
            account_url: account.account_url
          })) || [];
          setValue('social_accounts', socialAccounts);
        }
      } catch (error) {
        console.error('Error loading competitor:', error);
        toast.error('Failed to load competitor data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCompetitor();
  }, [competitorId, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await updateCompetitor(competitorId, data);
      toast.success('Competitor updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update competitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${competitorName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCompetitor(competitorId);
      toast.success(`${competitorName} deleted successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete competitor');
    } finally {
      setIsDeleting(false);
    }
  };

  const getGoogleMapsUrl = (name: string) => {
    const query = encodeURIComponent(name + ' golf');
    return `https://www.google.com/maps/search/${query}`;
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Competitor</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
              <p className="text-gray-600">Loading competitor data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Competitor</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getGoogleMapsUrl(competitorName), '_blank')}
                className="flex items-center gap-2"
                disabled={!competitorName}
              >
                <MapPin className="h-4 w-4" />
                <ExternalLink className="h-3 w-3" />
                Maps
              </Button>
            </div>
          </div>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this competitor"
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active competitor
            </Label>
          </div>

          {/* Social Media Accounts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Social Media Accounts</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ platform: 'instagram', account_handle: '', account_url: '' })}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
            
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start p-3 border rounded-lg bg-gray-50">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`social_accounts.${index}.platform`} className="text-sm">Platform</Label>
                      <Select
                        value={watch(`social_accounts.${index}.platform`)}
                        onValueChange={(value) => setValue(`social_accounts.${index}.platform`, value as Platform)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select platform" />
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
                      <Label htmlFor={`social_accounts.${index}.account_handle`} className="text-sm">Handle</Label>
                      <Input
                        id={`social_accounts.${index}.account_handle`}
                        {...register(`social_accounts.${index}.account_handle`)}
                        placeholder="@username"
                        className="h-9"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`social_accounts.${index}.account_url`} className="text-sm">URL</Label>
                      <Input
                        id={`social_accounts.${index}.account_url`}
                        {...register(`social_accounts.${index}.account_url`, {
                          required: 'URL is required'
                        })}
                        placeholder="https://..."
                        className="h-9"
                      />
                      {errors.social_accounts?.[index]?.account_url && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.social_accounts[index]?.account_url?.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm">No social media accounts added</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;Add Account&quot; to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Competitor'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}