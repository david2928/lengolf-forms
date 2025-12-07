'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ArrowLeft,
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
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { useCustomerModal } from '@/contexts/CustomerModalContext';
import { TransactionHistoryTable } from '@/components/pos/customer-management/TransactionHistoryTable';
import { PackageHistoryTable } from '@/components/pos/customer-management/PackageHistoryTable';
import { BookingHistoryTable } from '@/components/pos/customer-management/BookingHistoryTable';
import { LineUserSearchSelect } from '@/components/admin/customers/line-user-search-select';

interface CustomerProfile {
  id: string;
  email?: string;
  display_name: string;
  phone_number?: string;
  provider: string;
  provider_id: string;
  picture_url?: string;
  updated_at: string;
  marketing_preference: boolean;
}

interface CustomerDetailData {
  customer: {
    id: string;
    customer_code: string;
    customer_name: string;
    contact_number: string;
    email?: string;
    date_of_birth?: string;
    address?: string;
    notes?: string;
    preferred_contact_method?: string;
    total_lifetime_value: number;
    total_visits: number;
    last_visit_date?: string;
    customer_create_date?: string;
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    customer_profiles?: CustomerProfile[];
  };
  packageSummary: {
    activePackages: number;
    totalPackages: number;
    lastPackagePurchase: number | null;
    packageStatus?: {
      created: number;
      active: number;
      expired: number;
      depleted: number;
      total: number;
    };
  };
}

export const CustomerDetailModal: React.FC = () => {
  const { state, closeCustomerModal, goBack, canGoBack } = useCustomerModal();
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
  const [lineProfile, setLineProfile] = useState<{
    line_user_id: string;
    display_name: string;
    picture_url?: string;
  } | null>(null);

  const handleEditStart = () => {
    if (customerDetail) {
      setEditFormData({
        fullName: customerDetail.customer.customer_name || '',
        primaryPhone: customerDetail.customer.contact_number || '',
        email: customerDetail.customer.email || '',
        notes: customerDetail.customer.notes || ''
      });
      setError(null);
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
    if (!state.customerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${state.customerId}`);
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
  }, [state.customerId]);

  // Fetch customer details when modal opens
  useEffect(() => {
    if (state.isOpen && state.customerId) {
      fetchCustomerDetail();
      setActiveTab('overview');
      setIsEditing(false);
    }
  }, [state.isOpen, state.customerId, fetchCustomerDetail]);

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

  // Handle LINE user link success
  const handleLineLink = useCallback(async () => {
    // Refetch customer data to update LINE profile
    await fetchCustomerDetail();
  }, [fetchCustomerDetail]);

  // Initialize LINE profile from customer data
  useEffect(() => {
    if (customerDetail?.customer?.customer_profiles) {
      // Find LINE profile from profiles array
      const lineProfileData = customerDetail.customer.customer_profiles.find(
        (profile) => profile.provider === 'line'
      );

      if (lineProfileData) {
        setLineProfile({
          line_user_id: lineProfileData.provider_id,
          display_name: lineProfileData.display_name,
          picture_url: lineProfileData.picture_url
        });
      } else {
        setLineProfile(null);
      }
    } else {
      setLineProfile(null);
    }
  }, [customerDetail]);

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
    closeCustomerModal();
  };

  if (!state.isOpen) return null;

  return (
    <DialogPrimitive.Root open={state.isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed z-50 bg-white",
          isTablet || isMobile
            ? "inset-0 w-screen h-screen max-h-screen m-0 p-0 rounded-none overflow-hidden"
            : "left-[50%] top-[50%] w-[90vw] max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-lg shadow-lg",
          "focus:outline-none flex flex-col"
        )}>
          {/* Mobile Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-4 block sm:hidden relative">
            <div className="flex items-center justify-between">
              {/* Back button and Customer Info */}
              <div className="flex items-center space-x-3">
                {canGoBack && (
                  <button
                    onClick={goBack}
                    className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-gray-900 line-clamp-1">
                    {customerDetail?.customer.customer_name || state.customerName || 'Customer Details'}
                  </h2>
                  {(customerDetail?.customer.customer_code || state.customerCode) && (
                    <div className="text-sm text-gray-600">
                      {customerDetail?.customer.customer_code || state.customerCode}
                    </div>
                  )}
                  {canGoBack && state.navigationHistory[0] && (
                    <div className="text-xs text-gray-500">
                      From: {state.navigationHistory[0].label}
                    </div>
                  )}
                </div>
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
                {/* Back button and Customer Info */}
                <div className="flex items-center space-x-4">
                  {canGoBack && (
                    <button
                      onClick={goBack}
                      className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                      title={`Back to ${state.navigationHistory[0]?.label}`}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900">
                      {customerDetail?.customer.customer_name || state.customerName || 'Customer Details'}
                    </h2>
                    {(customerDetail?.customer.customer_code || state.customerCode) && (
                      <div className="text-sm text-gray-600">
                        {customerDetail?.customer.customer_code || state.customerCode}
                      </div>
                    )}
                    {canGoBack && state.navigationHistory[0] && (
                      <div className="text-xs text-gray-500">
                        From: {state.navigationHistory[0].label}
                      </div>
                    )}
                  </div>
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
                className="flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none text-sm sm:text-base"
              >
                <span className="block sm:hidden">Info</span>
                <span className="hidden sm:block">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none text-sm sm:text-base",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="block sm:hidden">Orders</span>
                <span className="hidden sm:block">Transactions</span>
              </TabsTrigger>
              <TabsTrigger
                value="packages"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none text-sm sm:text-base",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="block sm:hidden">Pkgs</span>
                <span className="hidden sm:block">Packages</span>
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                disabled={isEditing}
                className={cn(
                  "flex-1 px-3 sm:px-6 py-3 sm:py-4 font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none text-sm sm:text-base",
                  isEditing && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="block sm:hidden">Calendar</span>
                <span className="hidden sm:block">Bookings</span>
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
              "space-y-4 sm:space-y-6",
              isMobile ? "px-4 py-4" : isTablet ? "px-8 py-6" : "px-6 py-4"
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

                    {/* LINE Profile Section */}
                    {isEditing && (
                      <div className="md:col-span-2">
                        <label className={cn(
                          "font-medium text-gray-500 block mb-2",
                          isTablet ? "text-base" : "text-sm"
                        )}>
                          LINE Profile
                        </label>
                        {lineProfile ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                {lineProfile.picture_url ? (
                                  <img
                                    src={lineProfile.picture_url}
                                    alt={lineProfile.display_name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{lineProfile.display_name}</p>
                                  <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                                    {lineProfile.line_user_id}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                Linked
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLineProfile(null)}
                              className="w-full text-gray-600 hover:text-red-600 hover:bg-red-50"
                            >
                              Change LINE User
                            </Button>
                          </div>
                        ) : (
                          <LineUserSearchSelect
                            customerId={state.customerId || ''}
                            onLinkSuccess={handleLineLink}
                            disabled={!state.customerId}
                          />
                        )}
                      </div>
                    )}

                    {/* LINE Profile Display - Non-Edit Mode */}
                    {!isEditing && lineProfile && (
                      <div className="md:col-span-2">
                        <label className={cn(
                          "font-medium text-gray-500",
                          isTablet ? "text-base" : "text-sm"
                        )}>LINE Profile</label>
                        <div className="flex items-center gap-2 mt-1">
                          <MessageCircle className={cn(
                            "text-green-600",
                            isTablet ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          {lineProfile.picture_url && (
                            <img
                              src={lineProfile.picture_url}
                              alt={lineProfile.display_name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <span className={cn(
                            "font-medium",
                            isTablet ? "text-base" : "text-sm"
                          )}>
                            {lineProfile.display_name}
                          </span>
                          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-300">
                            Linked
                          </Badge>
                        </div>
                      </div>
                    )}

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
                    <div className="flex items-center justify-between">
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
                      size={isMobile ? "default" : "lg"}
                      onClick={handleEditStart}
                      className={cn(
                        "font-medium",
                        isMobile ? "px-4 h-10 text-sm w-full" : "px-6 h-12 text-sm"
                      )}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Edit Customer Information</span>
                      <span className="sm:hidden">Edit Customer</span>
                    </Button>
                  ) : (
                    <div className={cn(
                      "flex gap-3",
                      isMobile && "w-full"
                    )}>
                      <Button
                        variant="outline"
                        size={isMobile ? "default" : "lg"}
                        onClick={handleEditCancel}
                        disabled={saving}
                        className={cn(
                          isMobile ? "px-4 h-10 text-sm flex-1" : "px-6 h-12 text-sm"
                        )}
                      >
                        Cancel
                      </Button>
                      <Button
                        size={isMobile ? "default" : "lg"}
                        onClick={handleEditSave}
                        disabled={saving}
                        className={cn(
                          "bg-blue-600 hover:bg-blue-700",
                          isMobile ? "px-4 h-10 text-sm flex-1" : "px-6 h-12 text-sm"
                        )}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="h-full">
              <div className={cn(isMobile ? "p-2" : "p-0")}>
                <TransactionHistoryTable customerId={state.customerId || undefined} />
              </div>
            </TabsContent>

            {/* Packages Tab */}
            <TabsContent value="packages" className="h-full">
              <div className={cn(isMobile ? "p-2" : "p-0")}>
                <PackageHistoryTable customerId={state.customerId || undefined} />
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="h-full">
              <div className={cn(isMobile ? "p-2" : "p-0")}>
                <BookingHistoryTable customerId={state.customerId || undefined} />
              </div>
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