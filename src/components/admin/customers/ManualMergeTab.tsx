'use client';

import { useState } from 'react';
import {
  Users,
  ArrowRight,
  Merge,
  Phone,
  Mail,
  Calendar,
  Receipt,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle,
  User,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomerSearchSelect } from '@/components/admin/customers/customer-search-select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number: string;
  email?: string;
  address?: string;
  total_visits: number;
  total_lifetime_value: string;
  alternate_phone_numbers?: string[];
  created_at: string;
  counts: {
    bookings: number;
    sales: number;
    packages: number;
    profiles: number;
  };
}

interface MergePreview {
  primary: Customer;
  secondary: Customer;
  merge_preview: {
    will_be_merged: {
      bookings: number;
      sales: number;
      packages: number;
      profiles: number;
      total: number;
    };
    resulting_totals: {
      visits: number;
      lifetime_value: number;
      total_records: number;
    };
  };
}

export function ManualMergeTab() {
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string>('');
  const [secondaryCustomerId, setSecondaryCustomerId] = useState<string>('');
  const [previewData, setPreviewData] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  const handleCustomerSelect = (type: 'primary' | 'secondary', customerId: string) => {
    if (type === 'primary') {
      setPrimaryCustomerId(customerId);
    } else {
      setSecondaryCustomerId(customerId);
    }
    // Clear preview when customers change
    setPreviewData(null);
  };

  const generatePreview = async () => {
    if (!primaryCustomerId || !secondaryCustomerId) {
      toast.error('Please select both customers');
      return;
    }

    if (primaryCustomerId === secondaryCustomerId) {
      toast.error('Cannot merge a customer with itself');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/customers/manual-merge?primaryId=${primaryCustomerId}&secondaryId=${secondaryCustomerId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate preview');
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error(error.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const performMerge = async () => {
    if (!previewData) {
      toast.error('Please generate a preview first');
      return;
    }

    setMerging(true);
    try {
      const response = await fetch('/api/customers/manual-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryCustomerId,
          secondaryCustomerId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to merge customers');
      }

      const result = await response.json();

      toast.success(result.message, {
        description: `Merged ${result.merged_counts.total} records. All phone numbers preserved.`,
        duration: 10000
      });

      // Reset form
      setPrimaryCustomerId('');
      setSecondaryCustomerId('');
      setPreviewData(null);

    } catch (error: any) {
      console.error('Error merging customers:', error);
      toast.error(error.message || 'Failed to merge customers');
    } finally {
      setMerging(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!num) return '฿0';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Manual Customer Merge
          </CardTitle>
          <CardDescription>
            Merge any two customers regardless of phone numbers. Useful for consolidating duplicate customers
            who used different contact information. All phone numbers will be preserved.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Customers to Merge</CardTitle>
          <CardDescription>
            Choose the primary customer (who will keep their customer code) and the secondary customer (who will be merged into the primary)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Customer */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Primary Customer (keeps customer code)
              </label>
              <CustomerSearchSelect
                value={primaryCustomerId}
                onSelect={(customerId) => handleCustomerSelect('primary', customerId)}
                placeholder="Search for primary customer..."
              />
              <p className="text-xs text-muted-foreground">
                This customer will retain their customer code and be the final merged record
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Secondary Customer */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Secondary Customer (will be merged)
              </label>
              <CustomerSearchSelect
                value={secondaryCustomerId}
                onSelect={(customerId) => handleCustomerSelect('secondary', customerId)}
                placeholder="Search for secondary customer..."
              />
              <p className="text-xs text-muted-foreground">
                This customer&apos;s data will be merged into the primary customer and then deleted
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={generatePreview}
              disabled={!primaryCustomerId || !secondaryCustomerId || loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Generate Merge Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Step 2: Review Merge Preview
            </CardTitle>
            <CardDescription>
              Review what will happen when these customers are merged
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Customer Details */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Primary Customer (Will Keep)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {previewData.primary.customer_name}</div>
                    <div><strong>Code:</strong> {previewData.primary.customer_code}</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {previewData.primary.contact_number}
                    </div>
                    {previewData.primary.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {previewData.primary.email}
                      </div>
                    )}
                    <div><strong>Created:</strong> {format(new Date(previewData.primary.created_at), 'dd MMM yyyy')}</div>
                    <div><strong>Visits:</strong> {previewData.primary.total_visits}</div>
                    <div><strong>Lifetime Value:</strong> {formatCurrency(previewData.primary.total_lifetime_value)}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <h4 className="font-medium mb-2">Current Records:</h4>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {previewData.primary.counts.bookings} bookings
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Receipt className="h-3 w-3 mr-1" />
                        {previewData.primary.counts.sales} sales
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {previewData.primary.counts.packages} packages
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {previewData.primary.counts.profiles} profiles
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Customer Details */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Secondary Customer (Will Be Merged)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {previewData.secondary.customer_name}</div>
                    <div><strong>Code:</strong> {previewData.secondary.customer_code}</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {previewData.secondary.contact_number}
                    </div>
                    {previewData.secondary.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {previewData.secondary.email}
                      </div>
                    )}
                    <div><strong>Created:</strong> {format(new Date(previewData.secondary.created_at), 'dd MMM yyyy')}</div>
                    <div><strong>Visits:</strong> {previewData.secondary.total_visits}</div>
                    <div><strong>Lifetime Value:</strong> {formatCurrency(previewData.secondary.total_lifetime_value)}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <h4 className="font-medium mb-2">Records to be Merged:</h4>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {previewData.secondary.counts.bookings} bookings
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Receipt className="h-3 w-3 mr-1" />
                        {previewData.secondary.counts.sales} sales
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {previewData.secondary.counts.packages} packages
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {previewData.secondary.counts.profiles} profiles
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Merge Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">After Merge Summary:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Combined Visits</div>
                  <div className="text-lg font-bold text-blue-800">
                    {previewData.merge_preview.resulting_totals.visits}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Combined Lifetime Value</div>
                  <div className="text-lg font-bold text-blue-800">
                    {formatCurrency(previewData.merge_preview.resulting_totals.lifetime_value)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Total Records</div>
                  <div className="text-lg font-bold text-blue-800">
                    {previewData.merge_preview.resulting_totals.total_records}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-blue-700">
                  <strong>Phone Numbers:</strong> Primary phone ({previewData.primary.contact_number}) will be kept as main contact.
                  Secondary phone ({previewData.secondary.contact_number}) will be stored as alternate contact.
                </div>
              </div>
            </div>

            {/* Warnings */}
            {previewData.primary.customer_name !== previewData.secondary.customer_name && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Different Names:</strong> &quot;{previewData.primary.customer_name}&quot; vs &quot;{previewData.secondary.customer_name}&quot;.
                  The primary customer name will be kept.
                </AlertDescription>
              </Alert>
            )}

            {/* Merge Button */}
            <div className="mt-6 flex justify-center">
              <Button
                onClick={performMerge}
                disabled={merging}
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                {merging ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Merge className="h-4 w-4 mr-2" />
                )}
                Confirm Merge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}