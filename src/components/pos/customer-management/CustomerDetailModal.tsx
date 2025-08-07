'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Package, 
  Clock,
  TrendingUp,
  Receipt,
  BookOpen,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { POSCustomer, CustomerDetailData } from '@/types/pos';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { TransactionHistoryTable } from './TransactionHistoryTable';
import { PackageHistoryTable } from './PackageHistoryTable';
import { BookingHistoryTable } from './BookingHistoryTable';

export interface CustomerDetailModalProps {
  customer: POSCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated?: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated
}) => {
  const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    primaryPhone: '',
    email: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const { isTablet, isMobile } = useResponsive();

  const handleEditStart = () => {
    if (customerDetail) {
      setEditFormData({
        fullName: customerDetail.customer.customer_name || '',
        primaryPhone: customerDetail.customer.contact_number || '',
        email: customerDetail.customer.email || '',
        notes: customerDetail.customer.notes || ''
      });
      setError(null); // Clear any previous errors
      setIsEditing(true);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditFormData({
      fullName: '',
      primaryPhone: '',
      email: '',
      notes: ''
    });
  };

  const handleEditSave = async () => {
    if (!customerDetail || saving) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerDetail.customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editFormData.fullName,
          primaryPhone: editFormData.primaryPhone,
          email: editFormData.email,
          notes: editFormData.notes
        }),
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        // Update the customer detail with new data
        setCustomerDetail(prev => prev ? {
          ...prev,
          customer: {
            ...prev.customer,
            customer_name: editFormData.fullName,
            contact_number: editFormData.primaryPhone,
            email: editFormData.email,
            notes: editFormData.notes
          }
        } : null);
        
        setIsEditing(false);
        
        // Call parent callback if provided
        if (onCustomerUpdated) {
          onCustomerUpdated();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setError('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomerDetail = useCallback(async () => {
    if (!customer?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/customers/${customer.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomerDetail(data);
      } else {
        setError('Failed to load customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  // Fetch customer details when modal opens
  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchCustomerDetail();
    }
  }, [isOpen, customer?.id, fetchCustomerDetail]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle modal close
  const handleClose = () => {
    setCustomerDetail(null);
    setError(null);
    setActiveTab('overview');
    setIsEditing(false);
    setEditFormData({
      fullName: '',
      primaryPhone: '',
      email: '',
      notes: ''
    });
    onClose();
  };

  if (!customer) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed z-50 bg-white",
          isTablet || isMobile
            ? "inset-0 w-screen h-screen m-0 p-0 rounded-none"
            : "left-[50%] top-[50%] w-[90vw] max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-lg shadow-lg",
          "focus:outline-none flex flex-col"
        )}>
          {/* Mobile Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 sm:hidden relative">
            <div className="flex items-center justify-between">
              {/* Customer Info */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {customerDetail?.customer.customer_name || customer?.name || 'Customer Details'}
                </h2>
                {customerDetail && (
                  <div className="text-sm text-gray-600">
                    {customerDetail.customer.customer_code}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            
          </div>
          
          {/* Desktop Header */}
          <div className="hidden sm:block">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
              <div className="flex items-center justify-between">
                {/* Customer Info */}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {customerDetail?.customer.customer_name || customer?.name || 'Customer Details'}
                  </h2>
                  {customerDetail && (
                    <div className="text-sm text-gray-600">
                      {customerDetail.customer.customer_code}
                    </div>
                  )}
                </div>
                
                {/* Desktop Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-500">Loading customer details...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 text-center">{error}</p>
            <Button onClick={fetchCustomerDetail} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : customerDetail ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex w-full flex-shrink-0 bg-white border-b border-gray-200 rounded-none p-0 h-auto">
              <TabsTrigger 
                value="overview" 
                className="flex-1 px-6 py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="transactions"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-6 py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger 
                value="packages"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-6 py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                Packages
              </TabsTrigger>
              <TabsTrigger 
                value="bookings"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-6 py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                Bookings
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto">
            
            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            <TabsContent value="overview" className={cn(
              "space-y-6",
              isTablet ? "px-8 py-6" : "px-6 py-4"
            )}>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={cn(
                    "grid gap-4",
                    isTablet ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
                  )}>
                    <div>
                      <label className={cn(
                        "font-medium text-gray-500",
                        isTablet ? "text-base" : "text-sm"
                      )}>Full Name</label>
                      {isEditing ? (
                        <Input
                          value={editFormData.fullName}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter full name"
                        />
                      ) : (
                        <p className={cn(
                          "font-semibold",
                          isTablet ? "text-xl" : "text-lg"
                        )}>{customerDetail.customer.customer_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className={cn(
                        "font-medium text-gray-500",
                        isTablet ? "text-base" : "text-sm"
                      )}>Phone Number</label>
                      {isEditing ? (
                        <Input
                          value={editFormData.primaryPhone}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, primaryPhone: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <p className={cn(
                          "flex items-center gap-2",
                          isTablet ? "text-base" : "text-sm"
                        )}>
                          <Phone className={cn(
                            isTablet ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          {customerDetail.customer.contact_number}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className={cn(
                        "font-medium text-gray-500",
                        isTablet ? "text-base" : "text-sm"
                      )}>Email</label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter email address"
                        />
                      ) : (
                        customerDetail.customer.email ? (
                          <p className={cn(
                            "flex items-center gap-2",
                            isTablet ? "text-base" : "text-sm"
                          )}>
                            <Mail className={cn(
                              isTablet ? "h-5 w-5" : "h-4 w-4"
                            )} />
                            {customerDetail.customer.email}
                          </p>
                        ) : (
                          <p className="text-gray-400 text-sm">No email provided</p>
                        )
                      )}
                    </div>
                    
                    {customerDetail.customer.date_of_birth && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(customerDetail.customer.date_of_birth)}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Preferred Contact</label>
                      <Badge variant="outline">
                        {customerDetail.customer.preferred_contact_method}
                      </Badge>
                    </div>
                    
                    {customerDetail.customer.address && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          {customerDetail.customer.address}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className={cn(
                "grid gap-4",
                isTablet ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
              )}>
                <Card>
                  <CardContent className={cn(isTablet ? "p-3" : "p-4")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn(
                          "font-medium text-gray-600",
                          isTablet ? "text-sm" : "text-xs"
                        )}>Lifetime Value</p>
                        <p className={cn(
                          "font-bold text-green-600",
                          isTablet ? "text-2xl" : "text-xl"
                        )}>
                          {formatCurrency(customerDetail.customer.total_lifetime_value)}
                        </p>
                      </div>
                      <TrendingUp className={cn(
                        "text-green-600",
                        isTablet ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className={cn(isTablet ? "p-3" : "p-4")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn(
                          "font-medium text-gray-600",
                          isTablet ? "text-sm" : "text-xs"
                        )}>Total Visits</p>
                        <p className={cn(
                          "font-bold text-blue-600",
                          isTablet ? "text-2xl" : "text-xl"
                        )}>
                          {customerDetail.customer.total_visits}
                        </p>
                      </div>
                      <User className={cn(
                        "text-blue-600",
                        isTablet ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className={cn(isTablet ? "p-3" : "p-4")}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={cn(
                          "font-medium text-gray-600",
                          isTablet ? "text-sm" : "text-xs"
                        )}>Active Packages</p>
                        <p className={cn(
                          "font-bold text-purple-600",
                          isTablet ? "text-2xl" : "text-xl"
                        )}>
                          {customerDetail.packageSummary.packageStatus?.active || 0}
                        </p>
                      </div>
                      <Package className={cn(
                        "text-purple-600",
                        isTablet ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                    
                    {/* Detailed Package Status */}
                    {customerDetail.packageSummary.packageStatus && customerDetail.packageSummary.packageStatus.total > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {customerDetail.packageSummary.packageStatus.created > 0 && (
                          <Badge className="text-xs bg-blue-500 text-white">
                            {customerDetail.packageSummary.packageStatus.created} Created
                          </Badge>
                        )}
                        {customerDetail.packageSummary.packageStatus.active > 0 && (
                          <Badge className="text-xs bg-green-500 text-white">
                            {customerDetail.packageSummary.packageStatus.active} Active
                          </Badge>
                        )}
                        {customerDetail.packageSummary.packageStatus.depleted > 0 && (
                          <Badge className="text-xs bg-orange-500 text-white">
                            {customerDetail.packageSummary.packageStatus.depleted} Used Up
                          </Badge>
                        )}
                        {customerDetail.packageSummary.packageStatus.expired > 0 && (
                          <Badge className="text-xs bg-red-500 text-white">
                            {customerDetail.packageSummary.packageStatus.expired} Expired
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className={cn(isTablet ? "p-3" : "p-4")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn(
                          "font-medium text-gray-600",
                          isTablet ? "text-sm" : "text-xs"
                        )}>Last Visit</p>
                        <p className={cn(
                          "font-bold text-gray-900",
                          isTablet ? "text-base" : "text-sm"
                        )}>
                          {formatDate(customerDetail.customer.last_visit_date)}
                        </p>
                      </div>
                      <Clock className={cn(
                        "text-gray-600",
                        isTablet ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              {(customerDetail.customer.notes || isEditing) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add customer notes..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {customerDetail.customer.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Edit Actions - Bottom of Overview Tab */}
              {customerDetail && (
                <div className="flex justify-center pt-4 border-t border-gray-200">
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={handleEditStart}
                      className="px-6 h-12 text-sm font-medium"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Customer Information
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={handleEditCancel}
                        disabled={saving}
                        className="px-6 h-12 text-sm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="lg"
                        onClick={handleEditSave}
                        disabled={saving}
                        className="px-6 h-12 text-sm bg-blue-600 hover:bg-blue-700"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="h-full p-0">
              <TransactionHistoryTable customerId={customer?.id} />
            </TabsContent>

            {/* Packages Tab */}
            <TabsContent value="packages" className="h-full p-0">
              <PackageHistoryTable customerId={customer?.id} />
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="h-full p-0">
              <BookingHistoryTable customerId={customer?.id} />
            </TabsContent>
            </div>
          </Tabs>
        ) : null}
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};