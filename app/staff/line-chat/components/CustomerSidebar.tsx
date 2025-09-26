'use client';

// CustomerSidebar component extracted from main LINE chat component
// This ELIMINATES the mobile/desktop duplication by using responsive design
// Handles customer information, bookings, packages in a single implementation

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Package,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import type { CustomerSidebarProps, Conversation, UnifiedConversation, ChannelType } from '../utils/chatTypes';
import { formatBookingDate, calculateDaysUntilExpiry, isBookingUpcoming } from '../utils/formatters';

// Platform logo badge component - ChatCone style with actual company logos
const PlatformLogoBadge = ({ channelType }: { channelType: ChannelType }) => {
  const getIcon = () => {
    switch (channelType) {
      case 'facebook':
        return <FaFacebook className="w-3 h-3" style={{ color: '#1877F2' }} />;
      case 'instagram':
        return <FaInstagram className="w-3 h-3" style={{ color: '#E4405F' }} />;
      case 'whatsapp':
        return <FaWhatsapp className="w-3 h-3" style={{ color: '#25D366' }} />;
      case 'line':
        return <FaLine className="w-3 h-3" style={{ color: '#00B900' }} />;
      case 'website':
        return <Globe className="w-3 h-3" style={{ color: '#3B82F6' }} />;
      default:
        return null;
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm border-0 flex items-center justify-center"
      style={{ padding: '1px' }}
      title={channelType.toUpperCase()}
    >
      {icon}
    </div>
  );
};

// Helper function to get platform display name
const getPlatformDisplayName = (conversation: any): string => {
  const channelType = conversation?.channelType || conversation?.channel_type;

  switch (channelType) {
    case 'facebook':
      return 'Facebook User';
    case 'instagram':
      return 'Instagram User';
    case 'whatsapp':
      return 'WhatsApp User';
    case 'line':
      return 'LINE User';
    case 'website':
      return 'Website User';
    default:
      return 'LINE User'; // fallback
  }
};

// Helper function to check if it's a unified conversation
const isUnifiedConversation = (conversation: any): conversation is UnifiedConversation => {
  return conversation && 'channel_type' in conversation;
};

// Safe Image component with error handling
const SafeImage = ({ src, alt, width, height, className }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className={`${className} bg-gray-300 flex items-center justify-center`}>
        <Users className="h-5 w-5 text-gray-600" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  selectedConversation,
  selectedConversationObj,
  customerOperations,
  onShowLinkModal
}) => {
  const {
    customerDetails,
    customerBookings,
    customerPackages,
    currentBookingIndex,
    setCurrentBookingIndex,
    sendBookingConfirmation,
    sendingConfirmation,
    linkingCustomer
  } = customerOperations;

  // Use the real conversation object passed from parent
  const selectedConv = selectedConversationObj;

  if (!selectedConv) {
    return (
      <div className="w-full md:w-80 bg-white border-l transition-all duration-300 ease-in-out flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select a conversation to view customer information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 bg-white border-l transition-all duration-300 ease-in-out flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Customer Information</h3>
        </div>

        {/* User Profile */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <SafeImage
                  src={selectedConv.user.pictureUrl || ''}
                  alt={selectedConv.user.displayName}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {/* Platform logo badge overlaid on profile picture */}
                {selectedConv && (
                  (isUnifiedConversation(selectedConv) && selectedConv.channel_type) ? (
                    <PlatformLogoBadge channelType={selectedConv.channel_type} />
                  ) : (
                    selectedConv.channelType && <PlatformLogoBadge channelType={selectedConv.channelType} />
                  )
                )}
              </div>
              <div>
                <h4 className="font-medium">
                  {customerDetails ? customerDetails.name : selectedConv.user.displayName}
                </h4>
                <p className="text-sm text-gray-500">
                  {customerDetails ? (
                    <>User: {selectedConv.user.displayName}</>
                  ) : (
                    getPlatformDisplayName(selectedConv)
                  )}
                </p>
              </div>
            </div>

            {customerDetails ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{customerDetails.name}</span>
                  </div>
                  {customerDetails.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{customerDetails.phone}</span>
                    </div>
                  )}
                  {customerDetails.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{customerDetails.email}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={onShowLinkModal}
                  disabled={linkingCustomer}
                >
                  Edit Customer Link
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">Not linked to customer</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onShowLinkModal}
                  disabled={linkingCustomer}
                >
                  Link to Customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details (if linked) */}
        {customerDetails && (
          <>
            {/* Customer Stats */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold">{customerDetails.totalVisits || 0}</p>
                    <p className="text-xs text-gray-500">Total Visits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">฿{(customerDetails.lifetimeValue || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Lifetime Value</p>
                  </div>
                </div>
                {customerDetails.lastVisitDate && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500">
                      Last visit: {new Date(customerDetails.lastVisitDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Bookings Carousel */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Upcoming Bookings
                  </div>
                  {customerBookings.length > 1 && (
                    <span className="text-xs text-gray-500 font-normal">
                      {customerBookings.length} bookings
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {customerBookings.length > 0 ? (
                  <div className="space-y-3">
                    {/* Current Booking Display */}
                    {(() => {
                      const booking = customerBookings[currentBookingIndex];
                      if (!booking) return null;

                      const isConfirmed = booking.status === 'confirmed';
                      const isUpcoming = isBookingUpcoming(booking);
                      const dateDisplay = formatBookingDate(booking.date);

                      return (
                        <div key={booking.id} className={`relative p-4 rounded-xl border transition-all duration-200 ${
                          isUpcoming
                            ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md hover:border-blue-300'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}>
                          {/* Status indicator line */}
                          <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${
                            isUpcoming && isConfirmed ? 'bg-green-500' :
                            isUpcoming ? 'bg-yellow-500' : 'bg-gray-300'
                          }`} />

                          {/* Header with Bay and Status */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {booking.bay}
                              </div>
                            </div>

                            <Badge
                              variant={isConfirmed ? 'default' : 'secondary'}
                              className={`text-xs font-medium ${
                                isConfirmed ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''
                              }`}
                            >
                              {booking.status}
                            </Badge>
                          </div>

                          {/* Date and Time - Primary info */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-semibold text-gray-900">
                                {dateDisplay}
                              </div>
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {booking.start_time}
                                </div>
                                <div>
                                  {booking.duration}h
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          {isUpcoming && isConfirmed && (
                            <div className="pt-2 border-t border-gray-100">
                              <Button
                                size="sm"
                                className={`w-full h-9 font-medium transition-all duration-200 ${
                                  sendingConfirmation === booking.id
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                }`}
                                onClick={() => sendBookingConfirmation(booking.id)}
                                disabled={sendingConfirmation === booking.id}
                              >
                                {sendingConfirmation === booking.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Confirmation
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Booking Navigation */}
                    {customerBookings.length > 1 && (
                      <div className="flex items-center justify-center space-x-3 pt-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setCurrentBookingIndex(Math.max(0, currentBookingIndex - 1))}
                          disabled={currentBookingIndex === 0}
                          title="Previous booking"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-sm text-gray-600 font-medium">
                          {currentBookingIndex + 1}/{customerBookings.length}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setCurrentBookingIndex(Math.min(customerBookings.length - 1, currentBookingIndex + 1))}
                          disabled={currentBookingIndex === customerBookings.length - 1}
                          title="Next booking"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No upcoming bookings</p>
                )}
              </CardContent>
            </Card>

            {/* Active Packages */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Active Packages ({customerPackages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {customerPackages.length > 0 ? (
                  <div className="space-y-3">
                    {customerPackages.map((pkg) => {
                      const isUnlimited = pkg.remaining_hours === 'Unlimited';
                      const hoursLeft = Number(pkg.remaining_hours) || 0;
                      const totalHours = hoursLeft + (pkg.used_hours || 0);
                      const usagePercentage = isUnlimited ? 0 : ((totalHours - hoursLeft) / totalHours) * 100;
                      const daysUntilExpiry = calculateDaysUntilExpiry(pkg.expiration_date);

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
                                {new Date(pkg.expiration_date).toLocaleDateString('en-GB', {
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
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No active packages</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};