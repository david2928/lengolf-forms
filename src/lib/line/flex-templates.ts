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
              displayText: `✅ Confirmed - ${booking.date} ${booking.time} (${booking.bookingId})`
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

interface PackageDetails {
  packageId: string;
  customerName: string;
  packageName: string;
  isCoaching: boolean;
  hoursLeft: string; // Can be 'Unlimited' or a number as string
  usedHours: number;
  totalHours?: number;
  expirationDate: string;
  daysUntilExpiry: number;
  purchaseDate?: string;
}

/**
 * Creates a package information Flex Message
 */
export function createPackageInfoMessage(pkg: PackageDetails) {
  // Determine header color based on package type
  const headerColor = pkg.isCoaching ? '#7B68EE' : '#6366F1'; // Purple for coaching, indigo for regular
  const isUnlimited = pkg.hoursLeft === 'Unlimited';

  // Determine urgency color for hours
  const hoursColor = isUnlimited ? '#9333EA' : // Purple for unlimited
    Number(pkg.hoursLeft) <= 2 ? '#DC2626' : // Red for critical
    Number(pkg.hoursLeft) <= 5 ? '#F59E0B' : // Orange for warning
    '#059669'; // Green for good

  // Determine urgency color for expiration
  const expiryColor = pkg.daysUntilExpiry <= 3 ? '#DC2626' :
    pkg.daysUntilExpiry <= 7 ? '#F59E0B' :
    '#059669';

  return {
    type: 'flex',
    altText: `Package Info - ${pkg.packageName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'PACKAGE INFORMATION',
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
            text: pkg.customerName,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true
          },
          {
            type: 'text',
            text: pkg.packageName,
            size: 'md',
            weight: 'bold',
            color: headerColor,
            wrap: true,
            margin: 'xs'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          // Usage Information
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'Usage',
                size: 'xs',
                color: '#999999',
                weight: 'bold'
              },
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: isUnlimited ? '∞ hours' : `${pkg.hoursLeft}h left`,
                    size: 'xl',
                    weight: 'bold',
                    color: hoursColor,
                    flex: 1
                  },
                  ...(!isUnlimited && pkg.totalHours ? [{
                    type: 'text',
                    text: `(${pkg.usedHours}h / ${pkg.totalHours}h)`,
                    size: 'sm',
                    color: '#666666',
                    flex: 0,
                    align: 'end' as const
                  }] : [])
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'md'
          },
          // Expiration Information
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'Expiration',
                size: 'xs',
                color: '#999999',
                weight: 'bold'
              },
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: pkg.expirationDate,
                    size: 'md',
                    color: '#333333',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: pkg.daysUntilExpiry > 0 ? `${pkg.daysUntilExpiry} days` : 'Expired',
                    size: 'md',
                    weight: 'bold',
                    color: expiryColor,
                    flex: 0,
                    align: 'end'
                  }
                ]
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

/**
 * Groups consecutive time slots into ranges
 * Example: ["12:00", "13:00", "14:00", "16:00", "17:00"] → ["12.00–15.00", "16.00–18.00"]
 */
function groupConsecutiveSlots(timeSlots: string[]): string[] {
  if (timeSlots.length === 0) return [];

  // Sort slots and convert to numbers for easier comparison
  const sortedSlots = timeSlots.map(time => {
    const [hour] = time.split(':').map(Number);
    return hour;
  }).sort((a, b) => a - b);

  const grouped: string[] = [];
  let currentStart = sortedSlots[0];
  let currentEnd = sortedSlots[0] + 1; // End time is start + 1 hour

  for (let i = 1; i < sortedSlots.length; i++) {
    const hour = sortedSlots[i];

    // Check if current slot is consecutive (starts where previous ends)
    if (hour === currentEnd) {
      // Extend the current group
      currentEnd = hour + 1;
    } else {
      // End current group and start new one
      grouped.push(`${currentStart.toString().padStart(2, '0')}.00–${currentEnd.toString().padStart(2, '0')}.00`);
      currentStart = hour;
      currentEnd = hour + 1;
    }
  }

  // Add the last group
  grouped.push(`${currentStart.toString().padStart(2, '0')}.00–${currentEnd.toString().padStart(2, '0')}.00`);

  return grouped;
}

/**
 * Helper function to create a single coach card bubble for carousel
 */
function createCoachCard(coach: any, coachIndex: number): any {
  if (!coach.dates || coach.dates.length === 0) return null;

  // Coach-specific colors
  const coachColors: Record<string, string> = {
    'Ratchavin': '#7B68EE',
    'Boss': '#FF6B6B',
    'Min': '#4ECDC4',
    'Noon': '#FF69B4'  // Hot pink - more feminine
  };

  const coachColor = coachColors[coach.coach_name] || '#17C964';

  // Group dates by month
  const monthGroups: { [month: string]: any[] } = {};
  coach.dates.forEach((dateInfo: any) => {
    const date = new Date(dateInfo.date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'long' });

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = [];
    }

    monthGroups[monthKey].push(dateInfo);
  });

  // Build availability content by month
  const availabilityContent: any[] = [];

  Object.entries(monthGroups).forEach(([month, dates], monthIndex) => {
    // Month header
    if (monthIndex > 0) {
      availabilityContent.push({
        type: 'separator',
        margin: 'md'
      });
    }

    availabilityContent.push({
      type: 'text',
      text: month,
      weight: 'bold',
      size: 'sm',
      color: '#666666',
      margin: monthIndex === 0 ? 'md' : 'lg'
    });

    // Dates for this month
    dates.forEach((dateInfo: any) => {
      const groupedRanges = groupConsecutiveSlots(dateInfo.slots);
      const timeSlotsText = groupedRanges.join(' / ');

      const date = new Date(dateInfo.date);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      const day = date.getDate();

      availabilityContent.push({
        type: 'text',
        text: `• ${weekday} ${day}: ${timeSlotsText}`,
        size: 'sm',
        color: '#333333',
        margin: 'sm',
        wrap: true
      });
    });
  });

  return {
    type: 'bubble',
    hero: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'text',
        text: `Pro ${coach.coach_name}`,
        weight: 'bold',
        size: 'xl',
        color: '#FFFFFF'
      }],
      backgroundColor: coachColor,
      paddingAll: '20px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'Available Slots',
          size: 'sm',
          color: '#999999',
          margin: 'none'
        },
        ...availabilityContent
      ],
      paddingAll: '16px'
    }
  };
}

/**
 * Create an unsubscribe action card
 */
function createUnsubscribeCard(campaignId: string, audienceId: string): any {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '⚙️',
          size: 'xxl',
          align: 'center',
          margin: 'md'
        },
        {
          type: 'text',
          text: 'Manage Subscription',
          weight: 'bold',
          size: 'lg',
          align: 'center',
          margin: 'md'
        },
        {
          type: 'text',
          text: 'Not interested in coaching availability updates?',
          size: 'sm',
          color: '#666666',
          align: 'center',
          wrap: true,
          margin: 'md'
        },
        {
          type: 'button',
          style: 'primary',
          color: '#999999',
          margin: 'lg',
          action: {
            type: 'postback',
            label: 'Unsubscribe',
            data: `action=opt_out&campaign_id=${campaignId}&audience_id=${audienceId}`,
            displayText: 'Unsubscribe from coaching updates'
          }
        }
      ],
      paddingAll: '20px'
    }
  };
}

/**
 * Creates a coaching availability Flex Message as a carousel
 * Used for both unified chat and broadcast campaigns
 * Each coach gets their own card, plus an optional unsubscribe card at the end
 */
export function createCoachingAvailabilityMessage(coaches: any[], options?: { includeUnsubscribe?: boolean; campaignId?: string; audienceId?: string }) {
  if (!coaches || coaches.length === 0) {
    // Fallback single bubble for empty state
    return {
      type: 'flex',
      altText: 'No coaching availability',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [{
            type: 'text',
            text: 'No coaching availability for the next 14 days.',
            wrap: true,
            color: '#666666',
            align: 'center'
          }]
        }
      }
    };
  }

  // Create a card for each coach (sorted alphabetically)
  const coachCards: any[] = [];

  // Sort coaches alphabetically by coach name
  const sortedCoaches = [...coaches].sort((a, b) =>
    a.coach_name.localeCompare(b.coach_name)
  );

  sortedCoaches.forEach((coach: any, index: number) => {
    const card = createCoachCard(coach, index);
    if (card) {
      coachCards.push(card);
    }
  });

  // Add unsubscribe card if requested (for campaigns)
  if (options?.includeUnsubscribe && options?.campaignId && options?.audienceId) {
    coachCards.push(createUnsubscribeCard(options.campaignId, options.audienceId));
  }

  // Return carousel if we have multiple cards, otherwise single bubble
  if (coachCards.length === 1) {
    return {
      type: 'flex',
      altText: 'Coaching Availability',
      contents: coachCards[0]
    };
  }

  return {
    type: 'flex',
    altText: 'Coaching Availability - Swipe to view all coaches',
    contents: {
      type: 'carousel',
      contents: coachCards
    }
  };
}

/**
 * Formats coaching availability as plain text for all channels
 * Matches the coaching assist format exactly with month grouping
 */
export function formatCoachingAvailabilityAsText(coaches: any[]): string {
  if (!coaches || coaches.length === 0) {
    return 'No coaching availability for the next 14 days.';
  }

  let text = 'Coaching Availability Overview\n\n';

  coaches.forEach((coach: any, coachIndex: number) => {
    if (!coach.dates || coach.dates.length === 0) return;

    if (coachIndex > 0) {
      text += '\n';
    }

    text += `Pro ${coach.coach_name}'s Coaching Availability:\n`;

    // Group dates by month
    const monthGroups: { [month: string]: any[] } = {};
    coach.dates.forEach((dateInfo: any) => {
      const date = new Date(dateInfo.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long' });

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }

      monthGroups[monthKey].push(dateInfo);
    });

    // Output by month
    Object.entries(monthGroups).forEach(([month, dates]) => {
      text += `${month}\n`;

      dates.forEach((dateInfo: any) => {
        // Group consecutive time slots into ranges
        const groupedRanges = groupConsecutiveSlots(dateInfo.slots);
        const timeSlotsText = groupedRanges.join(' / ');

        // Format date - just weekday and day number
        const date = new Date(dateInfo.date);
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const day = date.getDate();

        text += `• ${weekday} ${day}: ${timeSlotsText}\n`;
      });
    });
  });

  return text.trim();
}