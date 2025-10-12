'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Mail, Hash, X, Check, AlertCircle, Edit, Calendar, Package, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  lifetimeValue: number;
  totalVisits: number;
  lastVisitDate?: string;
  profiles?: any;
}

interface Package {
  id: string;
  package_type_name: string;
  package_type: string;
  remaining_hours: string;
  used_hours: number;
  expiration_date: string;
  purchase_date: string;
}

interface Booking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string;
  number_of_people: number;
  status: string;
  booking_type?: string;
  package_name?: string;
}

interface Transaction {
  id: string;
  transaction_date: string;
  total_amount: number;
  payment_method: string;
  receipt_number: string;
}

interface CustomerDetailsResponse {
  customer: CustomerDetails;
  bookings: Booking[];
  packages: Package[];
  transactions: Transaction[];
  stats: {
    totalActivePackages: number;
    totalRemainingHours: number;
    recentTransactionAmount: number;
  };
}

interface CustomerConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  customer: Customer | null;
  lineUserName?: string;
  loading?: boolean;
}

export function CustomerConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  customer,
  lineUserName,
  loading = false
}: CustomerConfirmationModalProps) {
  const [customerDetails, setCustomerDetails] = useState<CustomerDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch customer details when modal opens
  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchCustomerDetails(customer.id);
    }
  }, [isOpen, customer?.id]);

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`/api/line/customers/${customerId}/details`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomerDetails(data);
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Prevent background scrolling on mobile when modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen, isMobile]);

  if (!customer) return null;

  // Mobile full-screen modal
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-white z-[70] flex flex-col">
            {/* Mobile Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={onClose}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">Confirm Customer Link</h3>
                  {lineUserName && (
                    <p className="text-sm text-gray-500 truncate">
                      Link &ldquo;{lineUserName}&rdquo; to this customer?
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
              {/* Customer Info Card */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate text-lg">
                        {customer.customer_name}
                      </h3>
                      <Badge variant="outline" className="mt-1">
                        {customer.customer_code}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  {customer.contact_number && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-white p-3 rounded-lg">
                      <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{customer.contact_number}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-white p-3 rounded-lg">
                      <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              {loadingDetails ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading customer details...</span>
                  </div>
                </div>
              ) : customerDetails && (
                <div className="space-y-4">
                  {/* Customer Stats - Using Card components */}
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold">{customerDetails.customer.totalVisits || 0}</p>
                          <p className="text-xs text-gray-500">Total Visits</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">฿{(customerDetails.customer.lifetimeValue || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Lifetime Value</p>
                        </div>
                      </div>
                      {customerDetails.customer.lastVisitDate && (
                        <div className="mt-3 text-center">
                          <p className="text-xs text-gray-500">
                            Last visit: {new Date(customerDetails.customer.lastVisitDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Upcoming Bookings - Using Card components */}
                  {customerDetails.bookings.length > 0 && (
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Upcoming Bookings
                          </div>
                          {customerDetails.bookings.length > 1 && (
                            <span className="text-xs text-gray-500 font-normal">
                              {customerDetails.bookings.length} bookings
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {customerDetails.bookings.slice(0, 2).map((booking) => {
                            const bookingDate = new Date(booking.date);
                            const bookingType = booking.booking_type || '';
                            const isCoaching = bookingType.toLowerCase().includes('coaching');

                            // Extract coach name if coaching booking
                            let coachName = '';
                            if (isCoaching) {
                              const match = bookingType.match(/\(([^)]+)\)/);
                              if (match && match[1]) {
                                coachName = match[1];
                              }
                            }

                            // Determine bay type display
                            let bayTypeDisplay = '';
                            const bayNum = booking.bay;
                            if (bayNum === 'Bay 1' || bayNum === 'Bay 2' || bayNum === 'Bay 3') {
                              bayTypeDisplay = 'Social Bay';
                            } else if (bayNum === 'Bay 4') {
                              bayTypeDisplay = 'AI Bay';
                            } else {
                              bayTypeDisplay = 'Sim';
                            }

                            return (
                              <div
                                key={booking.id}
                                className="relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                              >
                                {/* Header bar - matches CustomerSidebar style */}
                                <div className={`px-3 py-2.5 flex items-center justify-between ${
                                  isCoaching ? 'bg-[#7B68EE]' : 'bg-[#06C755]'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold text-sm">
                                      {isCoaching ? 'Coaching' : bayTypeDisplay}
                                    </span>
                                    {coachName && (
                                      <span className="text-white/90 text-xs">
                                        • {coachName}
                                      </span>
                                    )}
                                  </div>
                                  {/* Bay badge */}
                                  <div className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                                    <span className="text-white font-bold text-sm">
                                      {booking.bay}
                                    </span>
                                  </div>
                                </div>

                                {/* Primary info - Date & Time */}
                                <div className="px-3 pt-3 pb-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-base font-bold text-gray-900 whitespace-nowrap">
                                      {bookingDate.toLocaleDateString('en-GB', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short'
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span className="font-medium">{booking.start_time}</span>
                                      <span className="text-gray-400">•</span>
                                      <span>{booking.duration}h</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Booking type info */}
                                <div className="px-3 pb-3">
                                  <div className="text-sm">
                                    {booking.package_name ? (
                                      <span className="font-medium text-gray-900 truncate block" title={booking.package_name}>
                                        {booking.package_name}
                                      </span>
                                    ) : (
                                      <span className="font-medium text-gray-600">
                                        {isCoaching ? 'Coaching' : 'Normal Bay Rate'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {customerDetails.bookings.length > 2 && (
                            <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                              +{customerDetails.bookings.length - 2} more bookings
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Active Packages - Using Card components */}
                  {customerDetails.packages.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Active Packages ({customerDetails.packages.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {customerDetails.packages.slice(0, 2).map((pkg) => {
                            const isUnlimited = pkg.remaining_hours === 'Unlimited';
                            const hoursLeft = Number(pkg.remaining_hours) || 0;
                            const totalHours = hoursLeft + (pkg.used_hours || 0);
                            const usagePercentage = isUnlimited ? 0 : ((totalHours - hoursLeft) / totalHours) * 100;
                            const expiryDate = new Date(pkg.expiration_date);
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                            // Determine urgency level
                            const isExpiringSoon = daysUntilExpiry <= 7;
                            const isLowHours = !isUnlimited && hoursLeft <= 5;

                            return (
                              <div
                                key={pkg.id}
                                className={`relative p-4 rounded-xl border transition-all duration-200 ${
                                  isExpiringSoon || isLowHours
                                    ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white'
                                    : 'border-green-200 bg-gradient-to-br from-green-50 to-white'
                                } hover:shadow-md`}
                              >
                                {/* Package type header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    isUnlimited
                                      ? 'bg-purple-100 text-purple-800'
                                      : isExpiringSoon || isLowHours
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-green-100 text-green-800'
                                  }`}>
                                    {pkg.package_type_name}
                                  </div>

                                  {(isExpiringSoon || isLowHours) && (
                                    <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                      {isExpiringSoon ? 'EXPIRING SOON' : 'LOW HOURS'}
                                    </div>
                                  )}
                                </div>

                                {/* Hours remaining display */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold text-gray-900">
                                      {isUnlimited ? '∞ Unlimited' : `${hoursLeft}h remaining`}
                                    </span>
                                  </div>

                                  {/* Progress bar for limited packages */}
                                  {!isUnlimited && (
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          hoursLeft <= 2 ? 'bg-red-500' :
                                          hoursLeft <= 5 ? 'bg-orange-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.max(5, 100 - usagePercentage)}%` }}
                                      />
                                    </div>
                                  )}

                                  {/* Usage statistics */}
                                  {!isUnlimited && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>Used: {pkg.used_hours || 0}h</span>
                                      <span>Total: {totalHours}h</span>
                                    </div>
                                  )}
                                </div>

                                {/* Expiry information */}
                                <div className="pt-2 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">
                                      {expiryDate.toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                    <span className={`font-medium ${
                                      daysUntilExpiry <= 3 ? 'text-red-600' :
                                      daysUntilExpiry <= 7 ? 'text-orange-600' :
                                      'text-green-600'
                                    }`}>
                                      {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {customerDetails.packages.length > 2 && (
                            <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                              +{customerDetails.packages.length - 2} more packages
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

            </div>

            {/* Mobile Footer */}
            <div className="bg-white border-t p-4 flex-shrink-0 space-y-3">
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Linking Customer...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm & Link Customer
                  </>
                )}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onEdit}
                  disabled={loading}
                  className="flex-1 h-10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Choose Different
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop modal
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div>Confirm Customer Link</div>
              {lineUserName && (
                <div className="text-sm font-normal text-gray-500 mt-1">
                  Link &ldquo;{lineUserName}&rdquo; to this customer?
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info Card */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {customer.customer_name}
                  </h3>
                  <Badge variant="outline" className="mt-1">
                    {customer.customer_code}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              {customer.contact_number && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{customer.contact_number}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          {loadingDetails ? (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="ml-2 text-sm text-gray-500">Loading customer details...</span>
              </div>
            </div>
          ) : customerDetails && (
            <div className="space-y-4">
              {/* Customer Stats - Using Card components */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{customerDetails.customer.totalVisits || 0}</p>
                      <p className="text-xs text-gray-500">Total Visits</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">฿{(customerDetails.customer.lifetimeValue || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Lifetime Value</p>
                    </div>
                  </div>
                  {customerDetails.customer.lastVisitDate && (
                    <div className="mt-3 text-center">
                      <p className="text-xs text-gray-500">
                        Last visit: {new Date(customerDetails.customer.lastVisitDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Bookings - Using Card components */}
              {customerDetails.bookings.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Upcoming Bookings
                      </div>
                      {customerDetails.bookings.length > 1 && (
                        <span className="text-xs text-gray-500 font-normal">
                          {customerDetails.bookings.length} bookings
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {customerDetails.bookings.slice(0, 1).map((booking) => {
                        const bookingDate = new Date(booking.date);
                        const bookingType = booking.booking_type || '';
                        const isCoaching = bookingType.toLowerCase().includes('coaching');

                        // Extract coach name if coaching booking
                        let coachName = '';
                        if (isCoaching) {
                          const match = bookingType.match(/\(([^)]+)\)/);
                          if (match && match[1]) {
                            coachName = match[1];
                          }
                        }

                        // Determine bay type display
                        let bayTypeDisplay = '';
                        const bayNum = booking.bay;
                        if (bayNum === 'Bay 1' || bayNum === 'Bay 2' || bayNum === 'Bay 3') {
                          bayTypeDisplay = 'Social Bay';
                        } else if (bayNum === 'Bay 4') {
                          bayTypeDisplay = 'AI Bay';
                        } else {
                          bayTypeDisplay = 'Sim';
                        }

                        return (
                          <div
                            key={booking.id}
                            className="relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                          >
                            {/* Header bar - matches CustomerSidebar style */}
                            <div className={`px-3 py-2.5 flex items-center justify-between ${
                              isCoaching ? 'bg-[#7B68EE]' : 'bg-[#06C755]'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold text-sm">
                                  {isCoaching ? 'Coaching' : bayTypeDisplay}
                                </span>
                                {coachName && (
                                  <span className="text-white/90 text-xs">
                                    • {coachName}
                                  </span>
                                )}
                              </div>
                              {/* Bay badge */}
                              <div className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                                <span className="text-white font-bold text-sm">
                                  {booking.bay}
                                </span>
                              </div>
                            </div>

                            {/* Primary info - Date & Time */}
                            <div className="px-3 pt-3 pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-base font-bold text-gray-900 whitespace-nowrap">
                                  {bookingDate.toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span className="font-medium">{booking.start_time}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{booking.duration}h</span>
                                </div>
                              </div>
                            </div>

                            {/* Booking type info */}
                            <div className="px-3 pb-3">
                              <div className="text-sm">
                                {booking.package_name ? (
                                  <span className="font-medium text-gray-900 truncate block" title={booking.package_name}>
                                    {booking.package_name}
                                  </span>
                                ) : (
                                  <span className="font-medium text-gray-600">
                                    {isCoaching ? 'Coaching' : 'Normal Bay Rate'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {customerDetails.bookings.length > 1 && (
                        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                          +{customerDetails.bookings.length - 1} more bookings
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Packages - Using Card components */}
              {customerDetails.packages.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Active Packages ({customerDetails.packages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {customerDetails.packages.slice(0, 1).map((pkg) => {
                        const isUnlimited = pkg.remaining_hours === 'Unlimited';
                        const hoursLeft = Number(pkg.remaining_hours) || 0;
                        const totalHours = hoursLeft + (pkg.used_hours || 0);
                        const usagePercentage = isUnlimited ? 0 : ((totalHours - hoursLeft) / totalHours) * 100;
                        const expiryDate = new Date(pkg.expiration_date);
                        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        // Determine urgency level
                        const isExpiringSoon = daysUntilExpiry <= 7;
                        const isLowHours = !isUnlimited && hoursLeft <= 5;

                        return (
                          <div
                            key={pkg.id}
                            className={`relative p-4 rounded-xl border transition-all duration-200 ${
                              isExpiringSoon || isLowHours
                                ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white'
                                : 'border-green-200 bg-gradient-to-br from-green-50 to-white'
                            } hover:shadow-md`}
                          >
                            {/* Package type header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                isUnlimited
                                  ? 'bg-purple-100 text-purple-800'
                                  : isExpiringSoon || isLowHours
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {pkg.package_type_name}
                              </div>

                              {(isExpiringSoon || isLowHours) && (
                                <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                  {isExpiringSoon ? 'EXPIRING SOON' : 'LOW HOURS'}
                                </div>
                              )}
                            </div>

                            {/* Hours remaining display */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-lg font-bold text-gray-900">
                                  {isUnlimited ? '∞ Unlimited' : `${hoursLeft}h remaining`}
                                </span>
                              </div>

                              {/* Progress bar for limited packages */}
                              {!isUnlimited && (
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      hoursLeft <= 2 ? 'bg-red-500' :
                                      hoursLeft <= 5 ? 'bg-orange-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.max(5, 100 - usagePercentage)}%` }}
                                  />
                                </div>
                              )}

                              {/* Usage statistics */}
                              {!isUnlimited && (
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Used: {pkg.used_hours || 0}h</span>
                                  <span>Total: {totalHours}h</span>
                                </div>
                              )}
                            </div>

                            {/* Expiry information */}
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  {expiryDate.toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className={`font-medium ${
                                  daysUntilExpiry <= 3 ? 'text-red-600' :
                                  daysUntilExpiry <= 7 ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {customerDetails.packages.length > 1 && (
                        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                          +{customerDetails.packages.length - 1} more packages
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}


          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Linking Customer...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Link Customer
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onEdit}
                disabled={loading}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Choose Different
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}