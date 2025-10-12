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
            senderName: 'Admin'
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

  // Refresh bookings when page becomes visible (e.g., returning from booking creation)
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedConversation?.customerId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedConversation?.customerId) {
        fetchCustomerDetails(selectedConversation.customerId);
      }
    };

    const handleFocus = () => {
      if (selectedConversation?.customerId) {
        fetchCustomerDetails(selectedConversation.customerId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedConversation?.customerId, fetchCustomerDetails]);

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
    setCurrentBookingIndex: setCurrentBookingIndexSafe,
    linkingCustomer,
    sendingConfirmation,
    sendingCancellation,
    updateCustomerNotes,
    updatingNotes
  };
};