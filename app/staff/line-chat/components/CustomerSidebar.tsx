'use client';

// CustomerSidebar component extracted from main LINE chat component
// This ELIMINATES the mobile/desktop duplication by using responsive design
// Handles customer information, bookings, packages in a single implementation

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Users,
  Phone,
  Mail,
  Calendar,
  Package,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  FileText,
  Save,
  X,
  Pencil,
  XCircle
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import type { CustomerSidebarProps, Conversation, UnifiedConversation, ChannelType } from '../utils/chatTypes';
import { formatBookingDate, calculateDaysUntilExpiry, isBookingUpcoming } from '../utils/formatters';
import { EditBookingModal } from '@/components/manage-bookings/EditBookingModal';
import { CancelBookingModal } from '@/components/manage-bookings/CancelBookingModal';

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

// Helper function to get platform display name (including customer_name)
const resolveChannelDisplayName = (metadata: any, fallback: string): string => {
  if (!metadata) return fallback;

  const candidates = [
    metadata.customer_name,
    metadata.display_name,
    metadata.displayName,
    metadata.full_name,
    metadata.username,
    metadata.ig_username,
    metadata.profile_name,
    metadata.profileName,
    metadata.name,
    metadata.sender_name
  ];

  const resolved = candidates.find(name => typeof name === 'string' && name.trim().length > 0);
  return resolved || fallback;
};

// Get the channel/platform display name (excluding customer_name)
const getChannelDisplayName = (metadata: any, fallback: string): string => {
  if (!metadata) return fallback;

  const candidates = [
    metadata.display_name,     // LINE display_name
    metadata.displayName,
    metadata.full_name,        // Facebook/Instagram full_name
    metadata.username,         // Instagram/Facebook username
    metadata.ig_username,
    metadata.profile_name,
    metadata.profileName,
    metadata.name,
    metadata.sender_name
  ];

  const resolved = candidates.find(name => typeof name === 'string' && name.trim().length > 0);
  return resolved || fallback;
};

const getPlatformDisplayName = (conversation: any): string => {
  const channelType = conversation?.channelType || conversation?.channel_type;
  const metadata = conversation?.channel_metadata || conversation?.channelMetadata;

  switch (channelType) {
    case 'facebook':
      return resolveChannelDisplayName(metadata, 'Facebook User');
    case 'instagram':
      return resolveChannelDisplayName(metadata, 'Instagram User');
    case 'whatsapp':
      return resolveChannelDisplayName(metadata, 'WhatsApp User');
    case 'line':
      return resolveChannelDisplayName(metadata, 'LINE User');
    case 'website':
      return resolveChannelDisplayName(metadata, 'Website User');
    default:
      return resolveChannelDisplayName(metadata, 'LINE User');
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
    customerPastBookings,
    customerPackages,
    currentBookingIndex,
    setCurrentBookingIndex,
    sendBookingConfirmation,
    sendCancellationConfirmation,
    sendPackageInfo,
    sendingConfirmation,
    sendingCancellation,
    sendingPackageInfo,
    linkingCustomer,
    updateCustomerNotes,
    updatingNotes
  } = customerOperations;

  // Local state for notes editing
  const [notesText, setNotesText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesModified, setNotesModified] = useState(false);

  // Local state for past bookings carousel
  const [currentPastBookingIndex, setCurrentPastBookingIndex] = useState(0);

  // Local state for confirmation dialogs
  const [confirmingSend, setConfirmingSend] = useState<{
    type: 'confirmation' | 'cancellation' | 'package';
    id?: string;
    displayName?: string;
  } | null>(null);

  // Modal state management for Edit and Cancel
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // Sync notes text with customer details
  useEffect(() => {
    if (customerDetails?.notes) {
      setNotesText(customerDetails.notes);
    } else {
      setNotesText('');
    }
    setIsEditingNotes(false);
    setNotesModified(false);
  }, [customerDetails?.id, customerDetails?.notes]);

  // Handle notes text change
  const handleNotesChange = (value: string) => {
    setNotesText(value);
    setNotesModified(value !== (customerDetails?.notes || ''));
  };

  // Handle save notes
  const handleSaveNotes = async () => {
    if (!customerDetails?.id || !notesModified) return;
    await updateCustomerNotes(customerDetails.id, notesText);
    setIsEditingNotes(false);
    setNotesModified(false);
  };

  // Handle cancel editing
  const handleCancelNotes = () => {
    setNotesText(customerDetails?.notes || '');
    setIsEditingNotes(false);
    setNotesModified(false);
  };

  // Handle confirmation dialog actions
  const handleConfirmSend = async () => {
    if (!confirmingSend) return;

    const { type, id } = confirmingSend;

    // Close dialog first
    setConfirmingSend(null);

    // Call the appropriate send function
    if (type === 'confirmation' && id) {
      await sendBookingConfirmation(id);
    } else if (type === 'cancellation' && id) {
      await sendCancellationConfirmation(id);
    } else if (type === 'package' && id) {
      await sendPackageInfo(id);
    }
  };

  const handleCancelSend = () => {
    setConfirmingSend(null);
  };

  // Handle Edit booking
  const handleEdit = (booking: any) => {
    setSelectedBooking(booking);
    setShowEditModal(true);
  };

  // Handle Cancel booking
  const handleCancelBooking = (booking: any) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  // Use the real conversation object passed from parent
  const selectedConv = selectedConversationObj;

  if (!selectedConv) {
    return (
      <div className="w-full md:w-96 bg-white border-l transition-all duration-300 ease-in-out flex flex-col">
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
    <div className="w-full md:w-96 bg-white border-l transition-all duration-300 ease-in-out flex flex-col">
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
                  {customerDetails ? customerDetails.name : getPlatformDisplayName(selectedConv)}
                </h4>
                {/* Show channel/platform name below customer name */}
                {(() => {
                  // Support both unified (channel_metadata) and legacy (channelMetadata) formats
                  const metadata = isUnifiedConversation(selectedConv)
                    ? selectedConv.channel_metadata
                    : selectedConv?.channelMetadata;
                  const channelType = isUnifiedConversation(selectedConv)
                    ? selectedConv.channel_type
                    : selectedConv?.channelType;

                  if (!metadata || !channelType) return null;

                  return (
                    <p className="text-sm text-gray-500">
                      {channelType === 'line' && 'LINE: '}
                      {channelType === 'facebook' && 'Facebook: '}
                      {channelType === 'instagram' && 'Instagram: '}
                      {channelType === 'whatsapp' && 'WhatsApp: '}
                      {channelType === 'website' && 'Website: '}
                      {getChannelDisplayName(metadata, 'User')}
                    </p>
                  );
                })()}
              </div>
            </div>

            {customerDetails ? (
              <div className="space-y-3">
                <div className="space-y-2">
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
            {/* Customer Notes */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Customer Notes
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!isEditingNotes && !notesText ? (
                  // Compact view when no notes and not editing
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-2 px-3 rounded border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    Click to add notes...
                  </button>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={notesText}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      onFocus={() => setIsEditingNotes(true)}
                      placeholder="Add notes about this customer..."
                      className={`min-h-[80px] resize-y text-sm ${
                        notesModified ? 'border-blue-500 ring-1 ring-blue-500' : ''
                      }`}
                      disabled={updatingNotes}
                    />

                    {/* Character count */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{notesText.length} characters</span>
                      {notesModified && (
                        <span className="text-blue-600 font-medium">Unsaved changes</span>
                      )}
                    </div>

                    {/* Action buttons - show when editing or modified */}
                    {(isEditingNotes || notesModified) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={!notesModified || updatingNotes}
                          className="flex-1"
                        >
                          {updatingNotes ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-1.5" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelNotes}
                          disabled={updatingNotes}
                          className="flex-1"
                        >
                          <X className="h-3 w-3 mr-1.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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

                      const dateDisplay = formatBookingDate(booking.date);

                      // Check if it's a coaching booking and extract coach name
                      const bookingType = booking.booking_type || '';
                      const isCoaching = bookingType.toLowerCase().includes('coaching');
                      let coachName = '';

                      if (isCoaching) {
                        // Extract coach name from booking type - get text within parentheses
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
                        bayTypeDisplay = 'Sim'; // Default for other bays
                      }

                      return (
                        <div
                          key={booking.id}
                          className="relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                          {/* Header bar - matches LINE interactive message pattern */}
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
                            {/* Bay badge - high contrast on colored background */}
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
                                {dateDisplay}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="font-medium">{booking.start_time}</span>
                                <span className="text-gray-400">•</span>
                                <span>{booking.duration}h</span>
                              </div>
                            </div>
                          </div>

                          {/* Booking type info - Package name or default rate type */}
                          <div className="px-3 pb-3">
                            <div className="text-sm">
                              {booking.package_name ? (
                                <span
                                  className="font-medium text-gray-900 truncate block"
                                  title={booking.package_name}
                                >
                                  {booking.package_name}
                                </span>
                              ) : (
                                <span className="font-medium text-gray-600">
                                  {isCoaching ? 'Coaching' : 'Normal Bay Rate'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="px-3 pb-3">
                            {/* Desktop: Horizontal buttons */}
                            <div className="hidden md:flex md:flex-row md:gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1 h-9 font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setConfirmingSend({
                                  type: 'confirmation',
                                  id: booking.id,
                                  displayName: formatBookingDate(booking.date) + ' at ' + booking.start_time
                                })}
                                disabled={sendingConfirmation === booking.id || booking.status === 'cancelled'}
                              >
                                {sendingConfirmation === booking.id ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    <span className="text-xs">Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="text-xs">Send</span>
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-9 font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
                                onClick={() => handleEdit(booking)}
                                disabled={booking.status === 'cancelled'}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                <span className="text-xs">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-9 font-medium bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                onClick={() => handleCancelBooking(booking)}
                                disabled={booking.status === 'cancelled'}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                <span className="text-xs">Cancel</span>
                              </Button>
                            </div>

                            {/* Mobile: Stacked buttons */}
                            <div className="flex flex-col gap-2 md:hidden">
                              <Button
                                size="sm"
                                variant="default"
                                className="w-full h-9 font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setConfirmingSend({
                                  type: 'confirmation',
                                  id: booking.id,
                                  displayName: formatBookingDate(booking.date) + ' at ' + booking.start_time
                                })}
                                disabled={sendingConfirmation === booking.id || booking.status === 'cancelled'}
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
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-9 font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
                                  onClick={() => handleEdit(booking)}
                                  disabled={booking.status === 'cancelled'}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-9 font-medium bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                  onClick={() => handleCancelBooking(booking)}
                                  disabled={booking.status === 'cancelled'}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
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
            <Card className="mb-4">
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

                      return (
                        <div
                          key={pkg.id}
                          className="relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                          {/* Header bar with package name */}
                          <div className={`px-3 py-2.5 border-b border-gray-100 ${
                            pkg.package_type_name.toLowerCase().includes('coaching')
                              ? 'bg-[#7B68EE]'
                              : 'bg-[#06C755]'
                          }`}>
                            <span
                              className="text-white font-semibold text-sm truncate block"
                              title={pkg.package_type_name}
                            >
                              {pkg.package_type_name}
                            </span>
                          </div>

                          {/* Package details */}
                          <div className="px-3 py-2.5 space-y-2">
                            {/* Usage */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Usage:</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${
                                  isUnlimited ? 'text-purple-600' :
                                  hoursLeft <= 2 ? 'text-red-600' :
                                  hoursLeft <= 5 ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  {isUnlimited ? '∞ hours' : `${hoursLeft}h left`}
                                </span>
                                {!isUnlimited && (
                                  <span className="text-gray-500">
                                    ({pkg.used_hours || 0}h/{totalHours}h)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expiration date */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Expires:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-900">
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
                                  ({daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : 'Expired'})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action button */}
                          <div className="px-3 pb-3">
                            <Button
                              size="sm"
                              variant="default"
                              className={`w-full h-9 font-medium transition-all duration-200 ${
                                pkg.package_type_name.toLowerCase().includes('coaching')
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white md:bg-transparent md:text-purple-600 md:border-purple-600 md:hover:bg-purple-50'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white md:bg-transparent md:text-indigo-600 md:border-indigo-600 md:hover:bg-indigo-50'
                              }`}
                              onClick={() => setConfirmingSend({
                                type: 'package',
                                id: pkg.id,
                                displayName: pkg.package_type_name
                              })}
                              disabled={sendingPackageInfo === pkg.id}
                            >
                              {sendingPackageInfo === pkg.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Package Info
                                </>
                              )}
                            </Button>
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

            {/* Past/Cancelled Bookings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Past/Cancelled Bookings
                  </div>
                  {customerPastBookings.length > 1 && (
                    <span className="text-xs text-gray-500 font-normal">
                      {customerPastBookings.length} bookings
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {customerPastBookings && customerPastBookings.length > 0 ? (
                  <div className="space-y-3">
                    {/* Current Past Booking Display */}
                    {(() => {
                      const booking = customerPastBookings[currentPastBookingIndex];
                      if (!booking) return null;

                      const dateDisplay = formatBookingDate(booking.date);

                      // Check if it's a coaching booking and extract coach name
                      const bookingType = booking.booking_type || '';
                      const isCoaching = bookingType.toLowerCase().includes('coaching');
                      let coachName = '';

                      if (isCoaching) {
                        // Extract coach name from booking type - get text within parentheses
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
                        bayTypeDisplay = 'Sim'; // Default for other bays
                      }

                      return (
                        <div
                          key={booking.id}
                          className="relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                          {/* Header bar - matches LINE interactive message pattern */}
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
                            {/* Bay badge - high contrast on colored background */}
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
                                {dateDisplay}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="font-medium">{booking.start_time}</span>
                                <span className="text-gray-400">•</span>
                                <span>{booking.duration}h</span>
                              </div>
                            </div>
                          </div>

                          {/* Booking type info - Package name or default rate type */}
                          <div className="px-3 pb-2">
                            <div className="text-sm">
                              {booking.package_name ? (
                                <span
                                  className="font-medium text-gray-900 truncate block"
                                  title={booking.package_name}
                                >
                                  {booking.package_name}
                                </span>
                              ) : (
                                <span className="font-medium text-gray-600">
                                  {isCoaching ? 'Coaching' : 'Normal Bay Rate'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="px-3 pb-2">
                            <Badge
                              variant={booking.status === 'cancelled' ? 'destructive' : 'secondary'}
                              className={`text-xs ${
                                booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-green-100 text-green-700 border-green-300'
                              }`}
                            >
                              {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                            </Badge>
                          </div>

                          {/* Cancellation Confirmation Button - Only for cancelled bookings */}
                          {booking.status === 'cancelled' && (
                            <div className="px-3 pb-3">
                              <Button
                                size="sm"
                                variant="default"
                                className="w-full h-9 font-medium transition-all duration-200
                                  bg-red-600 hover:bg-red-700 text-white
                                  md:bg-transparent md:text-red-600 md:border-red-600 md:hover:bg-red-50
                                "
                                onClick={() => setConfirmingSend({
                                  type: 'cancellation',
                                  id: booking.id,
                                  displayName: formatBookingDate(booking.date) + ' at ' + booking.start_time
                                })}
                                disabled={sendingCancellation === booking.id}
                              >
                                {sendingCancellation === booking.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Cancellation Notice
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Past Booking Navigation */}
                    {customerPastBookings.length > 1 && (
                      <div className="flex items-center justify-center space-x-3 pt-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setCurrentPastBookingIndex(Math.max(0, currentPastBookingIndex - 1))}
                          disabled={currentPastBookingIndex === 0}
                          title="Previous booking"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-sm text-gray-600 font-medium">
                          {currentPastBookingIndex + 1}/{customerPastBookings.length}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setCurrentPastBookingIndex(Math.min(customerPastBookings.length - 1, currentPastBookingIndex + 1))}
                          disabled={currentPastBookingIndex === customerPastBookings.length - 1}
                          title="Next booking"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No past bookings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmingSend} onOpenChange={(open) => !open && handleCancelSend()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmingSend?.type === 'confirmation' && 'Send Booking Confirmation'}
              {confirmingSend?.type === 'cancellation' && 'Send Cancellation Notice'}
              {confirmingSend?.type === 'package' && 'Send Package Information'}
            </DialogTitle>
            <DialogDescription>
              {confirmingSend?.type === 'confirmation' && (
                <>
                  Send booking confirmation to <strong>{customerDetails?.name}</strong> for:
                  <br />
                  <span className="text-blue-600 font-medium">{confirmingSend.displayName}</span>
                </>
              )}
              {confirmingSend?.type === 'cancellation' && (
                <>
                  Send cancellation notice to <strong>{customerDetails?.name}</strong> for:
                  <br />
                  <span className="text-red-600 font-medium">{confirmingSend.displayName}</span>
                </>
              )}
              {confirmingSend?.type === 'package' && (
                <>
                  Send package information to <strong>{customerDetails?.name}</strong> for:
                  <br />
                  <span className="text-purple-600 font-medium">{confirmingSend.displayName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSend}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSend}
              className={`flex-1 sm:flex-none ${
                confirmingSend?.type === 'confirmation'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : confirmingSend?.type === 'cancellation'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Management Modals */}
      {selectedBooking && (
        <>
          <EditBookingModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
            onSuccess={(updatedBooking) => {
              // Modal will close automatically
              setShowEditModal(false);
              setSelectedBooking(null);
              // Force page reload to refresh booking data
              // TODO: Replace with refetch function when available
              window.location.reload();
            }}
          />

          <CancelBookingModal
            isOpen={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
            onSuccess={(bookingId) => {
              // Modal will close automatically
              setShowCancelModal(false);
              setSelectedBooking(null);
              // Force page reload to refresh booking data
              // TODO: Replace with refetch function when available
              window.location.reload();
            }}
          />
        </>
      )}
    </div>
  );
};
