// Customer data management hook extracted from main LINE chat component
// Handles customer details, bookings, packages, and customer operations

import { useState, useCallback, useEffect } from 'react';
import type { CustomerOperations, CustomerDetails, Booking, Package, Transaction, Conversation } from '../utils/chatTypes';
import { generateMessages } from '@/components/booking-form/submit/booking-messages';
import type { BookingFormData } from '@/types/booking-form';

/**
 * Custom hook for customer data operations
 * Extracted from main component to centralize customer-related state and logic
 */
export const useCustomerData = (conversationId: string | null, selectedConversation?: Conversation | null): CustomerOperations => {
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Package[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState<string | null>(null);

  // Fetch customer details function extracted from main component
  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    try {
      const response = await fetch(`/api/line/customers/${customerId}/details`);
      const data = await response.json();

      if (data.success) {
        setCustomerDetails(data.customer);
        setCustomerBookings(data.bookings);
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

      // This would need the selectedConv.user.lineUserId from the parent component
      // For now, we'll structure it to receive the lineUserId as a parameter
      const response = await fetch(`/api/line/users/link-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          conversationId: conversationId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Customer linked successfully');
        // Fetch detailed customer information
        await fetchCustomerDetails(customerId);
      } else {
        alert('Failed to link customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error linking customer:', error);
      alert('Failed to link customer');
    } finally {
      setLinkingCustomer(false);
    }
  }, [conversationId, fetchCustomerDetails]);

  // Send booking confirmation function extracted from main component
  const sendBookingConfirmation = useCallback(async (bookingId: string) => {
    if (!conversationId) return;

    try {
      setSendingConfirmation(bookingId);

      // For website conversations, create a simple text confirmation and send via website chat
      if (selectedConversation?.channelType === 'website') {
        // First get booking details
        const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
        const bookingData = await bookingResponse.json();

        if (!bookingData.booking) {
          alert('Failed to fetch booking details: ' + (bookingData.error || 'Unknown error'));
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

        // Generate the existing short confirmation message
        const messages = generateMessages(bookingFormData);
        if (!messages) {
          alert('Failed to generate booking confirmation message');
          return;
        }

        const confirmationMessage = messages.enShort;

        // Send message to website chat
        const messageResponse = await fetch('/api/conversations/website/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            sessionId: selectedConversation.lineUserId, // Session ID for website
            messageText: confirmationMessage,
            senderType: 'staff',
            senderName: 'Admin'
          }),
        });

        const messageData = await messageResponse.json();

        if (messageData.success) {
          console.log('Booking confirmation sent successfully to website chat');
        } else {
          alert('Failed to send booking confirmation to website chat: ' + messageData.error);
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
        } else {
          if (data.error.includes('does not have a linked LINE account')) {
            alert('This customer does not have a linked LINE account. Please link their LINE account first.');
          } else if (data.error.includes('Cannot send confirmation for booking with status')) {
            alert(`Cannot send confirmation: ${data.error}\n\nBooking Status: ${data.bookingStatus || 'unknown'}`);
          } else if (data.error.includes('Booking not found')) {
            alert('Booking not found. It may have been deleted or the ID is incorrect.');
          } else {
            alert('Failed to send booking confirmation: ' + data.error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      alert('Failed to send booking confirmation. Please try again.');
    } finally {
      setSendingConfirmation(null);
    }
  }, [conversationId, selectedConversation?.channelType, selectedConversation?.lineUserId]);

  // Enhanced setCurrentBookingIndex with bounds checking
  const setCurrentBookingIndexSafe = useCallback((index: number) => {
    if (customerBookings.length > 0 && index >= 0 && index < customerBookings.length) {
      setCurrentBookingIndex(index);
    }
  }, [customerBookings.length]);

  // Auto-fetch customer data when conversation changes and has a linked customer
  useEffect(() => {
    if (selectedConversation?.customerId) {
      fetchCustomerDetails(selectedConversation.customerId);
    } else {
      // Clear customer data if no customer is linked
      setCustomerDetails(null);
      setCustomerBookings([]);
      setCustomerPackages([]);
      setCustomerTransactions([]);
      setCurrentBookingIndex(0);
    }
  }, [selectedConversation?.customerId, fetchCustomerDetails]);

  return {
    customerDetails,
    customerBookings,
    customerPackages,
    customerTransactions,
    currentBookingIndex,
    fetchCustomerDetails,
    linkCustomer,
    sendBookingConfirmation,
    setCurrentBookingIndex: setCurrentBookingIndexSafe,
    linkingCustomer,
    sendingConfirmation
  };
};