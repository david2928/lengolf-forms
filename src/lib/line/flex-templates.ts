/**
 * LINE Flex Message templates for rich interactive messages
 */

interface BookingDetails {
  bookingId: string;
  customerName: string;
  date: string;
  time: string;
  bay: string;
  duration: string;
  packageName?: string;
  totalAmount?: number;
  isCoaching?: boolean;
  coachName?: string;
  bookingType?: string;
}

/**
 * Creates a booking confirmation Flex Message with interactive buttons
 */
export function createBookingConfirmationMessage(booking: BookingDetails) {
  // Determine header text and color based on booking type
  const headerText = booking.isCoaching ? 'COACHING SESSION CONFIRMED' : 'BOOKING CONFIRMED';
  const headerColor = booking.isCoaching ? '#7B68EE' : '#06C755'; // Purple for coaching, green for regular
  const altTextType = booking.isCoaching ? 'Coaching Session' : 'Booking';

  return {
    type: 'flex',
    altText: `${altTextType} Confirmed - ${booking.date} ${booking.time}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: headerText,
            weight: 'bold',
            color: '#ffffff',
            size: 'sm',
            align: 'center'
          }
        ],
        backgroundColor: headerColor,
        paddingAll: '16px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: booking.customerName,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true
          },
          {
            type: 'text',
            text: `ID: ${booking.bookingId}`,
            size: 'xs',
            color: '#999999'
          },
          ...(booking.isCoaching && booking.coachName ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '🏌️',
                size: 'sm',
                flex: 0
              },
              {
                type: 'text',
                text: `Coach: ${booking.coachName}`,
                size: 'md',
                weight: 'bold',
                color: '#7B68EE',
                flex: 1,
                wrap: true
              }
            ]
          }] : []),
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: booking.date,
                size: 'md',
                weight: 'bold',
                color: '#333333',
                wrap: true
              },
              {
                type: 'text',
                text: booking.time,
                size: 'sm',
                color: '#666666'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'text',
                    text: 'Bay',
                    size: 'xs',
                    color: '#999999'
                  },
                  {
                    type: 'text',
                    text: booking.bay,
                    size: 'sm',
                    weight: 'bold',
                    color: '#333333'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'text',
                    text: 'Duration',
                    size: 'xs',
                    color: '#999999'
                  },
                  {
                    type: 'text',
                    text: booking.duration,
                    size: 'sm',
                    weight: 'bold',
                    color: '#333333'
                  }
                ]
              }
            ]
          },
          ...(booking.totalAmount ? [{
            type: 'separator',
            margin: 'md'
          }, {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'Total',
                size: 'sm',
                color: '#666666',
                flex: 1
              },
              {
                type: 'text',
                text: `฿${booking.totalAmount.toLocaleString()}`,
                size: 'lg',
                weight: 'bold',
                color: '#06C755',
                flex: 1,
                align: 'end'
              }
            ]
          }] : [])
        ],
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'postback',
              label: 'Confirm',
              data: `action=confirm_booking&booking_id=${booking.bookingId}`,
              displayText: 'Booking confirmed!'
            }
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'xs',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                flex: 1,
                action: {
                  type: 'postback',
                  label: 'Changes',
                  data: `action=request_changes&booking_id=${booking.bookingId}`,
                  displayText: 'Request changes'
                }
              },
              {
                type: 'button',
                style: 'secondary',
                flex: 1,
                action: {
                  type: 'postback',
                  label: 'Cancel',
                  data: `action=cancel_booking&booking_id=${booking.bookingId}`,
                  displayText: 'Cancel booking'
                }
              }
            ]
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

/**
 * Creates a booking reminder Flex Message
 */
export function createBookingReminderMessage(booking: BookingDetails & { hoursUntil: number }) {
  return {
    type: 'flex',
    altText: `Reminder: ${booking.hoursUntil}h until your booking`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'BOOKING REMINDER',
            weight: 'bold',
            color: '#ffffff',
            size: 'sm',
            align: 'center'
          },
          {
            type: 'text',
            text: `${booking.hoursUntil} hours until booking`,
            size: 'xs',
            color: '#ffffff',
            align: 'center',
            margin: 'xs'
          }
        ],
        backgroundColor: '#FF9500',
        paddingAll: '14px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: `Hi ${booking.customerName}!`,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true
          },
          {
            type: 'text',
            text: 'Your booking is coming up soon',
            size: 'sm',
            color: '#666666',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: booking.date,
                size: 'md',
                weight: 'bold',
                color: '#333333',
                wrap: true
              },
              {
                type: 'text',
                text: `${booking.time} • Bay ${booking.bay}`,
                size: 'sm',
                color: '#666666',
                wrap: true
              }
            ]
          }
        ],
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'postback',
              label: 'I\'ll be there',
              data: `action=confirm_attendance&booking_id=${booking.bookingId}`,
              displayText: 'Confirmed attendance'
            }
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'xs',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                flex: 1,
                action: {
                  type: 'postback',
                  label: 'Reschedule',
                  data: `action=reschedule&booking_id=${booking.bookingId}`,
                  displayText: 'Need to reschedule'
                }
              },
              {
                type: 'button',
                style: 'secondary',
                flex: 1,
                action: {
                  type: 'postback',
                  label: 'Cancel',
                  data: `action=cancel_booking&booking_id=${booking.bookingId}`,
                  displayText: 'Cancel booking'
                }
              }
            ]
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

/**
 * Creates a booking cancellation confirmation Flex Message
 */
export function createBookingCancellationMessage(booking: BookingDetails) {
  // Determine header text and color based on booking type
  const headerText = booking.isCoaching ? 'COACHING SESSION CANCELLED' : 'BOOKING CANCELLED';
  const altTextType = booking.isCoaching ? 'Coaching Session' : 'Booking';

  return {
    type: 'flex',
    altText: `${altTextType} Cancellation - ${booking.date} ${booking.time}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: headerText,
            weight: 'bold',
            color: '#ffffff',
            size: 'sm',
            align: 'center'
          }
        ],
        backgroundColor: '#FF3B30', // Red for cancellation
        paddingAll: '16px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: booking.customerName,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true
          },
          {
            type: 'text',
            text: `ID: ${booking.bookingId}`,
            size: 'xs',
            color: '#999999'
          },
          {
            type: 'text',
            text: 'This booking has been cancelled.',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true
          },
          ...(booking.isCoaching && booking.coachName ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '🏌️',
                size: 'sm',
                flex: 0
              },
              {
                type: 'text',
                text: `Coach: ${booking.coachName}`,
                size: 'md',
                weight: 'bold',
                color: '#7B68EE',
                flex: 1,
                wrap: true
              }
            ]
          }] : []),
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: booking.date,
                size: 'md',
                weight: 'bold',
                color: '#333333',
                wrap: true
              },
              {
                type: 'text',
                text: booking.time,
                size: 'sm',
                color: '#666666'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'text',
                    text: 'Bay',
                    size: 'xs',
                    color: '#999999'
                  },
                  {
                    type: 'text',
                    text: booking.bay,
                    size: 'sm',
                    weight: 'bold',
                    color: '#333333'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  {
                    type: 'text',
                    text: 'Duration',
                    size: 'xs',
                    color: '#999999'
                  },
                  {
                    type: 'text',
                    text: booking.duration,
                    size: 'sm',
                    weight: 'bold',
                    color: '#333333'
                  }
                ]
              }
            ]
          }
        ],
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: 'If you have any questions, please contact us.',
            size: 'xs',
            color: '#999999',
            align: 'center',
            wrap: true
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

/**
 * Quick Reply buttons for common booking actions
 */
export function createBookingQuickReplies() {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '📅 Check Schedule',
          data: 'action=check_schedule'
        }
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '💰 Check Package Balance',
          data: 'action=check_balance'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📞 Contact Support',
          text: 'I need help with my booking'
        }
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '🌐 Visit Website',
          uri: 'https://lengolf.com'
        }
      }
    ]
  };
}