// Customer data management hook extracted from main LINE chat component
// Handles customer details, bookings, packages, and customer operations

import { useState, useCallback, useEffect } from 'react';
import type { CustomerOperations, CustomerDetails, Booking, Package, Transaction, Conversation } from '../utils/chatTypes';
import { generateMessages } from '@/components/booking-form/submit/booking-messages';
import type { BookingFormData } from '@/types/booking-form';
import { useToast } from '@/components/ui/use-toast';

/**
 * Custom hook for customer data operations
 * Extracted from main component to centralize customer-related state and logic
 */
export const useCustomerData = (conversationId: string | null, selectedConversation?: Conversation | null): CustomerOperations => {
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [customerPastBookings, setCustomerPastBookings] = useState<Booking[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Package[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState<string | null>(null);
  const [sendingCancellation, setSendingCancellation] = useState<string | null>(null);
  const [sendingPackageInfo, setSendingPackageInfo] = useState<string | null>(null);
  const [updatingNotes, setUpdatingNotes] = useState(false);
  const { toast } = useToast();

  // Fetch customer details function extracted from main component
  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`/api/line/customers/${customerId}/details`);
      const data = await response.json();

      if (data.success) {
        setCustomerDetails(data.customer);
        setCustomerBookings(data.bookings);
        setCustomerPastBookings(data.pastBookings || []);
        setCustomerPackages(data.packages);
        setCustomerTransactions(data.transactions);
        setCurrentBookingIndex(0); // Reset to first booking
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  }, []);

  // Link customer function extracted from main component
  const linkCustomer = useCallback(async (customerId: string, customer: any) => {
    if (!conversationId) return;

    try {
      setLinkingCustomer(true);

      // Use the unified customer linking API endpoint that works for all platforms
      const response = await fetch(`/api/conversations/${conversationId}/link-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Customer linked successfully');
        // Fetch detailed customer information
        await fetchCustomerDetails(customerId);
        toast({
          title: "Customer linked successfully",
          description: "Customer information has been loaded"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to link customer",
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error linking customer:', error);
      toast({
        variant: "destructive",
        title: "Failed to link customer",
        description: "Please try again"
      });
    } finally {
      setLinkingCustomer(false);
    }
  }, [conversationId, fetchCustomerDetails, toast]);

  // Send booking confirmation function extracted from main component
  const sendBookingConfirmation = useCallback(async (bookingId: string) => {
    if (!conversationId) return;

    try {
      setSendingConfirmation(bookingId);

      // Get booking details first (shared for all platforms)
      const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
      const bookingData = await bookingResponse.json();

      if (!bookingData.booking) {
        toast({
          variant: "destructive",
          title: "Failed to fetch booking details",
          description: bookingData.error || 'Unknown error'
        });
        return;
      }

      const booking = bookingData.booking;

      // Transform booking data to match the format expected by generateMessages
      const bookingFormData: BookingFormData = {
        employeeName: null,
        customerContactedVia: null,
        bookingDate: new Date(booking.date),
        startTime: booking.start_time,
        endTime: (() => {
          const [hours, minutes] = booking.start_time.split(':').map(Number);
          return `${String(hours + booking.duration).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        })(),
        customerName: booking.name,
        customerPhone: booking.phone_number,
        bookingType: booking.booking_type || 'Golf',
        bayNumber: booking.bay,
        numberOfPax: booking.number_of_people,
        notes: booking.customer_notes || '',
        isNewCustomer: false,
        duration: booking.duration * 60, // Convert hours to minutes
        isManualMode: false
      };

      // Generate the booking confirmation message
      const messages = generateMessages(bookingFormData);
      if (!messages) {
        toast({
          variant: "destructive",
          title: "Failed to generate booking confirmation message",
          description: "Unable to create confirmation text"
        });
        return;
      }

      const confirmationMessage = messages.enShort;

      // Handle different channel types
      const channelType = selectedConversation?.channelType;

      if (channelType === 'website') {
        // Send message to website chat
        const messageResponse = await fetch('/api/conversations/website/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            sessionId: selectedConversation?.lineUserId, // Session ID for website
            messageText: confirmationMessage,
            senderType: 'staff',
            senderName: 'Admin'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log('Booking confirmation sent successfully to website chat');
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            title: userName,
            description: "Booking confirmation sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            variant: "destructive",
            title: userName,
            description: `Failed to send booking confirmation: ${messageData.error}`
          });
        }
      } else if (channelType && ['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
        // Send message to META platforms (Facebook, Instagram, WhatsApp)
        const platformUserId = selectedConversation?.lineUserId;

        if (!platformUserId) {
          toast({
            variant: "destructive",
            title: "Unable to send booking confirmation",
            description: "Platform user ID not found"
          });
          return;
        }

        const messageResponse = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUserId: platformUserId,
            message: confirmationMessage,
            platform: channelType,
            messageType: 'text'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log(`Booking confirmation sent successfully to ${channelType}`);
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          toast({
            title: userName,
            description: "Booking confirmation sent successfully"
          });
        } else {
          // Handle Facebook's 24-hour messaging window limitation
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          if (messageData.error && messageData.error.includes('sent outside of allowed window')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "Message cannot be sent - customer must message first to reopen 24-hour window"
            });
          } else {
            toast({
              variant: "destructive",
              title: userName,
              description: `Failed to send booking confirmation: ${messageData.error}`
            });
          }
        }
      } else {
        // For LINE conversations, use rich flex message format
        const response = await fetch(`/api/line/bookings/${bookingId}/send-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageFormat: 'flex', // Send interactive flex message for LINE
            senderName: 'Admin'
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Booking confirmation sent successfully to LINE');
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          toast({
            title: userName,
            description: "Booking confirmation sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          if (data.error.includes('does not have a linked LINE account')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "LINE account not linked - please link account first"
            });
          } else if (data.error.includes('Cannot send confirmation for booking with status')) {
            toast({
              variant: "destructive",
              title: userName,
              description: `Cannot send confirmation - booking status: ${data.bookingStatus || 'unknown'}`
            });
          } else if (data.error.includes('Booking not found')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "Booking not found or has been deleted"
            });
          } else {
            toast({
              variant: "destructive",
              title: userName,
              description: `Failed to send booking confirmation: ${data.error}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      const userName = selectedConversation?.user?.displayName || 'User';
      toast({
        variant: "destructive",
        title: userName,
        description: "Failed to send booking confirmation - please try again"
      });
    } finally {
      setSendingConfirmation(null);
    }
  }, [conversationId, selectedConversation?.channelType, selectedConversation?.lineUserId, selectedConversation?.user?.displayName, toast]);

  // Send cancellation confirmation function for past/cancelled bookings
  const sendCancellationConfirmation = useCallback(async (bookingId: string) => {
    if (!conversationId) return;

    try {
      setSendingCancellation(bookingId);

      // Get booking details first (shared for all platforms)
      const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
      const bookingData = await bookingResponse.json();

      if (!bookingData.booking) {
        toast({
          variant: "destructive",
          title: "Failed to fetch booking details",
          description: bookingData.error || 'Unknown error'
        });
        return;
      }

      const booking = bookingData.booking;

      // Only allow sending cancellation confirmations for cancelled bookings
      if (booking.status !== 'cancelled') {
        toast({
          variant: "destructive",
          title: "Invalid booking status",
          description: "Cancellation confirmations can only be sent for cancelled bookings"
        });
        return;
      }

      // Generate simple cancellation message for non-LINE channels
      const cancellationMessage = `Your booking has been cancelled.\n\nBooking ID: ${bookingId}\nDate: ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${booking.start_time}\nBay: ${booking.bay}\n\nIf you have any questions, please contact us.`;

      // Handle different channel types
      const channelType = selectedConversation?.channelType;

      if (channelType === 'website') {
        // Send message to website chat
        const messageResponse = await fetch('/api/conversations/website/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            sessionId: selectedConversation?.lineUserId, // Session ID for website
            messageText: cancellationMessage,
            senderType: 'staff',
            senderName: 'Admin'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log('Cancellation confirmation sent successfully to website chat');
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            title: userName,
            description: "Cancellation confirmation sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            variant: "destructive",
            title: userName,
            description: `Failed to send cancellation confirmation: ${messageData.error}`
          });
        }
      } else if (channelType && ['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
        // Send message to META platforms (Facebook, Instagram, WhatsApp)
        const platformUserId = selectedConversation?.lineUserId;

        if (!platformUserId) {
          toast({
            variant: "destructive",
            title: "Unable to send cancellation confirmation",
            description: "Platform user ID not found"
          });
          return;
        }

        const messageResponse = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUserId: platformUserId,
            message: cancellationMessage,
            platform: channelType,
            messageType: 'text'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log(`Cancellation confirmation sent successfully to ${channelType}`);
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          toast({
            title: userName,
            description: "Cancellation confirmation sent successfully"
          });
        } else {
          // Handle Facebook's 24-hour messaging window limitation
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          if (messageData.error && messageData.error.includes('sent outside of allowed window')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "Message cannot be sent - customer must message first to reopen 24-hour window"
            });
          } else {
            toast({
              variant: "destructive",
              title: userName,
              description: `Failed to send cancellation confirmation: ${messageData.error}`
            });
          }
        }
      } else {
        // For LINE conversations, use the dedicated API endpoint (same pattern as booking confirmation)
        const response = await fetch(`/api/line/bookings/${bookingId}/send-cancellation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageFormat: 'flex', // Send interactive flex message for LINE
            senderName: 'Admin',
            lineUserId: selectedConversation?.lineUserId // Pass the LINE user ID from current conversation
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Cancellation confirmation sent successfully to LINE');
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          toast({
            title: userName,
            description: "Cancellation confirmation sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          if (data.error.includes('does not have a linked LINE account')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "LINE account not linked - please link account first"
            });
          } else if (data.error.includes('Cannot send cancellation confirmation for booking with status')) {
            toast({
              variant: "destructive",
              title: userName,
              description: `Cannot send cancellation - booking status: ${data.bookingStatus || 'unknown'}`
            });
          } else if (data.error.includes('Booking not found')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "Booking not found or has been deleted"
            });
          } else {
            toast({
              variant: "destructive",
              title: userName,
              description: `Failed to send cancellation confirmation: ${data.error}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending cancellation confirmation:', error);
      const userName = selectedConversation?.user?.displayName || 'User';
      toast({
        variant: "destructive",
        title: userName,
        description: "Failed to send cancellation confirmation - please try again"
      });
    } finally {
      setSendingCancellation(null);
    }
  }, [conversationId, selectedConversation?.channelType, selectedConversation?.lineUserId, selectedConversation?.user?.displayName, toast]);

  // Send package information function
  const sendPackageInfo = useCallback(async (packageId: string) => {
    if (!conversationId) return;

    try {
      setSendingPackageInfo(packageId);

      // Get package details from customerPackages array
      const pkg = customerPackages.find(p => p.id === packageId);
      if (!pkg) {
        toast({
          variant: "destructive",
          title: "Package not found",
          description: "Unable to find package details"
        });
        return;
      }

      // Calculate days until expiry
      const expiryDate = new Date(pkg.expiration_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine if this is a coaching package
      const isCoaching = pkg.package_type_name.toLowerCase().includes('coaching') ||
                        pkg.package_type_name.toLowerCase().includes('coach');

      // Format package data for flex template
      const packageDetails = {
        packageId: pkg.id,
        customerName: customerDetails?.name || 'Customer',
        packageName: pkg.package_type_name,
        isCoaching: isCoaching,
        hoursLeft: pkg.remaining_hours.toString(),
        usedHours: pkg.used_hours || 0,
        totalHours: pkg.hours_remaining !== null ? Number(pkg.remaining_hours) + (pkg.used_hours || 0) : undefined,
        expirationDate: expiryDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        daysUntilExpiry: daysUntilExpiry
      };

      // Generate plain text message for non-LINE channels
      const plainTextMessage = `Package Information\n\n` +
        `Customer: ${packageDetails.customerName}\n` +
        `Package: ${packageDetails.packageName}\n\n` +
        `Usage:\n` +
        `${packageDetails.hoursLeft === 'Unlimited' ? '∞ hours remaining' : `${packageDetails.hoursLeft}h remaining`}` +
        (packageDetails.totalHours ? ` (${packageDetails.usedHours}h / ${packageDetails.totalHours}h used)` : '') + `\n\n` +
        `Expiration:\n` +
        `${packageDetails.expirationDate}` +
        (daysUntilExpiry > 0 ? ` (${daysUntilExpiry} days remaining)` : ' (Expired)') + `\n\n` +
        `For bookings or questions, please contact us.`;

      // Handle different channel types
      const channelType = selectedConversation?.channelType;

      if (channelType === 'website') {
        // Send message to website chat
        const messageResponse = await fetch('/api/conversations/website/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            sessionId: selectedConversation?.lineUserId, // Session ID for website
            messageText: plainTextMessage,
            senderType: 'staff',
            senderName: 'Admin'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log('Package information sent successfully to website chat');
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            title: userName,
            description: "Package information sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'Website User';
          toast({
            variant: "destructive",
            title: userName,
            description: `Failed to send package information: ${messageData.error}`
          });
        }
      } else if (channelType && ['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
        // Send message to META platforms (Facebook, Instagram, WhatsApp)
        const platformUserId = selectedConversation?.lineUserId;

        if (!platformUserId) {
          toast({
            variant: "destructive",
            title: "Unable to send package information",
            description: "Platform user ID not found"
          });
          return;
        }

        const messageResponse = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUserId: platformUserId,
            message: plainTextMessage,
            platform: channelType,
            messageType: 'text'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log(`Package information sent successfully to ${channelType}`);
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          toast({
            title: userName,
            description: "Package information sent successfully"
          });
        } else {
          // Handle Facebook's 24-hour messaging window limitation
          const userName = selectedConversation?.user?.displayName || `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} User`;
          if (messageData.error && messageData.error.includes('sent outside of allowed window')) {
            toast({
              variant: "destructive",
              title: userName,
              description: "Message cannot be sent - customer must message first to reopen 24-hour window"
            });
          } else {
            toast({
              variant: "destructive",
              title: userName,
              description: `Failed to send package information: ${messageData.error}`
            });
          }
        }
      } else {
        // For LINE conversations, use the dedicated API endpoint (same pattern as booking confirmation)
        const response = await fetch(`/api/line/packages/${packageId}/send-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageFormat: 'flex',
            senderName: 'Admin'
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Package information sent successfully to LINE');
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          toast({
            title: userName,
            description: "Package information sent successfully"
          });
        } else {
          const userName = selectedConversation?.user?.displayName || 'LINE User';
          toast({
            variant: "destructive",
            title: userName,
            description: `Failed to send package information: ${data.error}`
          });
        }
      }
    } catch (error) {
      console.error('Error sending package information:', error);
      const userName = selectedConversation?.user?.displayName || 'User';
      toast({
        variant: "destructive",
        title: userName,
        description: "Failed to send package information - please try again"
      });
    } finally {
      setSendingPackageInfo(null);
    }
  }, [conversationId, customerPackages, customerDetails?.name, selectedConversation?.channelType, selectedConversation?.lineUserId, selectedConversation?.user?.displayName, toast]);

  // Enhanced setCurrentBookingIndex with bounds checking
  const setCurrentBookingIndexSafe = useCallback((index: number) => {
    if (customerBookings.length > 0 && index >= 0 && index < customerBookings.length) {
      setCurrentBookingIndex(index);
    }
  }, [customerBookings.length]);

  // Update customer notes function
  const updateCustomerNotes = useCallback(async (customerId: string, notes: string) => {
    try {
      setUpdatingNotes(true);

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes
        }),
      });

      const data = await response.json();

      if (response.ok && data.customer) {
        console.log('Customer notes updated successfully');
        // Refresh customer details to get updated notes
        await fetchCustomerDetails(customerId);
        toast({
          title: "Notes updated",
          description: "Customer notes have been saved successfully"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update notes",
          description: data.error || "Please try again"
        });
      }
    } catch (error) {
      console.error('Error updating customer notes:', error);
      toast({
        variant: "destructive",
        title: "Failed to update notes",
        description: "An error occurred while saving notes"
      });
    } finally {
      setUpdatingNotes(false);
    }
  }, [fetchCustomerDetails, toast]);

  // Send coaching availability function
  const [sendingAvailability, setSendingAvailability] = useState(false);

  const sendCoachingAvailability = useCallback(async () => {
    if (!conversationId) return;

    try {
      setSendingAvailability(true);

      const channelType = selectedConversation?.channelType || 'line';
      const channelUserId = selectedConversation?.lineUserId;

      if (!channelUserId) {
        toast({
          variant: "destructive",
          title: "Unable to send availability",
          description: "Channel user ID not found"
        });
        return;
      }

      const response = await fetch('/api/coaching/send-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          channelType,
          channelUserId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Coaching availability sent successfully');
        const userName = selectedConversation?.user?.displayName || 'User';
        toast({
          title: userName,
          description: "Coaching availability sent successfully"
        });
      } else {
        const userName = selectedConversation?.user?.displayName || 'User';
        if (data.error?.includes('sent outside of allowed window')) {
          toast({
            variant: "destructive",
            title: userName,
            description: "Message cannot be sent - customer must message first to reopen 24-hour window"
          });
        } else {
          toast({
            variant: "destructive",
            title: userName,
            description: `Failed to send availability: ${data.error}`
          });
        }
      }
    } catch (error) {
      console.error('Error sending coaching availability:', error);
      const userName = selectedConversation?.user?.displayName || 'User';
      toast({
        variant: "destructive",
        title: userName,
        description: "Failed to send coaching availability - please try again"
      });
    } finally {
      setSendingAvailability(false);
    }
  }, [conversationId, selectedConversation?.channelType, selectedConversation?.lineUserId, selectedConversation?.user?.displayName, toast]);

  // Auto-fetch customer data when conversation changes and has a linked customer
  useEffect(() => {
    if (selectedConversation?.customerId) {
      fetchCustomerDetails(selectedConversation.customerId);
    } else {
      // Clear customer data if no customer is linked
      setCustomerDetails(null);
      setCustomerBookings([]);
      setCustomerPastBookings([]);
      setCustomerPackages([]);
      setCustomerTransactions([]);
      setCurrentBookingIndex(0);
    }
  }, [selectedConversation?.customerId, fetchCustomerDetails]);

  // Note: Removed visibilitychange and focus listeners as they were too aggressive
  // and caused excessive API calls. Customer data is already refreshed via:
  // 1. Realtime subscription on booking changes (below)
  // 2. Manual refresh after linking/unlinking customers
  // 3. Initial fetch when conversation changes

  // Real-time subscription for bookings updates
  useEffect(() => {
    if (!selectedConversation?.customerId) return;

    let channel: any = null;

    const setupSubscription = async () => {
      try {
        // Use the shared realtime client
        const { supabaseRealtime } = await import('@/lib/supabase-realtime');

        if (!supabaseRealtime) {
          console.warn('Realtime client not available for bookings subscription');
          return;
        }

        // Subscribe to bookings table changes for this customer
        channel = supabaseRealtime
          .channel(`bookings:customer_id=eq.${selectedConversation.customerId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'bookings',
              filter: `customer_id=eq.${selectedConversation.customerId}`
            },
            (payload) => {
              console.log('🔔 Booking change detected:', payload);
              // Refresh customer details to get updated bookings
              if (selectedConversation?.customerId) {
                fetchCustomerDetails(selectedConversation.customerId);
              }
            }
          )
          .subscribe((status) => {
            console.log(`📡 Bookings subscription status: ${status} for customer ${selectedConversation.customerId}`);
          });
      } catch (error) {
        console.error('Error setting up bookings subscription:', error);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount or when customer changes
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [selectedConversation?.customerId, fetchCustomerDetails]);

  return {
    customerDetails,
    customerBookings,
    customerPastBookings,
    customerPackages,
    customerTransactions,
    currentBookingIndex,
    fetchCustomerDetails,
    linkCustomer,
    sendBookingConfirmation,
    sendCancellationConfirmation,
    sendPackageInfo,
    sendCoachingAvailability,
    setCurrentBookingIndex: setCurrentBookingIndexSafe,
    linkingCustomer,
    sendingConfirmation,
    sendingCancellation,
    sendingPackageInfo,
    sendingAvailability,
    updateCustomerNotes,
    updatingNotes
  };
};