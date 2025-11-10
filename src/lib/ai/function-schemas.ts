// OpenAI function calling schemas for Lengolf AI assistant
// Defines the 3 Priority 1 functions that AI can call

export interface FunctionSchema {
  name: string;
  description: string;
  strict?: boolean;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Function schemas for OpenAI function calling
 * These define what the AI can do to help customers
 */
export const AI_FUNCTION_SCHEMAS: FunctionSchema[] = [
  {
    name: 'check_bay_availability',
    description: `Check real-time bay availability for Social bays (up to 5 players) or AI bay (1-2 players with analytics).

⚠️ CRITICAL: ALWAYS call this function when customer asks about availability, slots, or free times.

Use this when:
- Customer asks "available?", "ว่างมั้ย", "do you have any slots?", "free tonight?", "open tomorrow?"
- Customer asks "availability for tonight", "any time available", "when are you free"
- Customer wants to know free time slots without booking yet
- NEVER respond conversationally without calling this function for availability questions

Do NOT use when:
- Customer already confirmed booking (e.g., "book it", "3pm please!" after availability shown)
- Customer is asking general questions about facilities ("Do you have gloves?")`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format. Use today\'s date if not specified.'
        },
        start_time: {
          type: 'string',
          description: 'Preferred start time in HH:00 or HH:30 format (e.g., "14:00", "14:30"). Use empty string "" for general availability. CRITICAL: "2-4pm available?" is asking about TIME RANGE (what slots exist between 2-4pm), NOT a 2-hour booking - use start_time="" to check that range.'
        },
        duration: {
          type: 'number',
          description: 'Booking duration in hours. Must be 0.5, 1, 1.5, 2, 2.5, or 3. Default: 1. ONLY use duration=2 if customer explicitly says "2 hours" or "2hr". For "2-4pm available?", use duration=1 (they want to see available slots in that time range, not book 2 hours).',
          enum: [0.5, 1, 1.5, 2, 2.5, 3]
        },
        bay_type: {
          type: 'string',
          enum: ['social', 'ai', 'all'],
          description: 'Bay type: "social" (up to 5 players), "ai" (1-2 players), or "all". Default: "all"'
        }
      },
      required: ['date', 'start_time', 'duration', 'bay_type'],
      additionalProperties: false
    }
  },

  {
    name: 'get_coaching_availability',
    description: `Get coach availability for golf lessons. Returns available time slots for coaches (Boss/Ratchavin, Noon, Min).

Use this when:
- Customer asks about coaching: "โปรว่างมั้ย", "is coach available", "lesson available?"
- Customer mentions coach names: "Boss", "Min", "Noon", "โค้ช"
- Customer has coaching pattern in RECENT BOOKINGS and asks about availability

Do NOT use when:
- Customer wants regular bay (no coaching mentioned)
- Customer is asking about pricing only`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format for checking coach availability'
        },
        coach_name: {
          type: 'string',
          enum: ['Boss', 'Ratchavin', 'Noon', 'Min', 'any'],
          description: 'Specific coach name or "any" to show all available coaches. Note: Boss and Ratchavin are the same person.'
        },
        preferred_time: {
          type: 'string',
          description: 'Preferred time in HH:00 format (e.g., "14:00"). Use empty string "" to show full day availability.'
        }
      },
      required: ['date', 'coach_name', 'preferred_time'],
      additionalProperties: false
    }
  },

  {
    name: 'create_booking',
    description: `Create a bay or coaching booking. Requires staff approval before execution.

🚨 CRITICAL: PHONE NUMBER IS MANDATORY - Check before calling this function! 🚨

Use this when:
- Customer confirms time after availability check: "3.30pm please!", "Confirm 19:00", "book it"
- Customer directly requests booking: "I want to book 2pm", "ขอจอง 14:00", "reserve tomorrow"
- Customer says booking words: "book", "จอง", "reserve", "reservation"

Do NOT use when:
- Customer only asks "available?" without confirming (use check_bay_availability first)
- Customer is asking general questions
- Phone number is missing or empty (ask for it first!)

Customer info handling - READ CAREFULLY:
1. Check CUSTOMER INFORMATION section for name AND phone
2. If BOTH name and phone are present (not "Unknown", not "Not provided", not empty):
   → Use exact name and phone from context
   → Call this function
3. If EITHER name OR phone is missing:
   → DO NOT call this function
   → Ask customer for the missing information first
   → Only call function after customer provides both name and phone

Validation before calling:
- customer_name must NOT be: "", "Unknown", or empty
- phone_number must NOT be: "", "Not provided", or empty
- If validation fails → Ask for missing info instead of calling function

Defaults if not specified: 1 hour duration, 1 player, social bay`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer full name. CRITICAL: Must be a real name (not "Unknown", not empty). If CUSTOMER INFORMATION shows a real name, USE IT. If name is missing, DO NOT call this function - ask customer for name first.'
        },
        phone_number: {
          type: 'string',
          description: 'Customer phone number (MANDATORY - never empty!). CRITICAL: Must be a real phone number (not "Not provided", not empty, not ""). If CUSTOMER INFORMATION shows a real phone, USE IT. If phone is missing or empty, DO NOT call this function - ask customer for phone number first.'
        },
        email: {
          type: 'string',
          description: 'Customer email address. Use "info@len.golf" if customer does not provide email.'
        },
        date: {
          type: 'string',
          description: 'Booking date in YYYY-MM-DD format'
        },
        start_time: {
          type: 'string',
          description: 'Start time in HH:00 format (must be between 09:00 and 23:00)'
        },
        duration: {
          type: 'number',
          description: 'Duration in hours. Must be 0.5, 1, 1.5, 2, 2.5, or 3. Default: 1',
          enum: [0.5, 1, 1.5, 2, 2.5, 3]
        },
        number_of_people: {
          type: 'number',
          description: 'Number of players: 1-5 for Social bay, 1-2 for AI bay. Default: 1'
        },
        bay_type: {
          type: 'string',
          enum: ['social', 'ai'],
          description: '"social" for Social bays (up to 5 players), "ai" for AI bay (1-2 players). Default: "social"'
        },
        booking_type: {
          type: 'string',
          description: 'Either "Bay Reservation" or "Coaching (CoachName)" (e.g., "Coaching (Min)"). Default: "Bay Reservation"'
        },
        coach_name: {
          type: 'string',
          description: 'Coach name if booking_type is coaching: Boss, Ratchavin, Noon, or Min. Use empty string "" if not coaching.'
        }
      },
      required: [
        'customer_name',
        'phone_number',
        'email',
        'date',
        'start_time',
        'duration',
        'number_of_people',
        'bay_type',
        'booking_type',
        'coach_name'
      ],
      additionalProperties: false
    }
  },

  {
    name: 'lookup_booking',
    description: `Find existing booking details for a customer.

Use this when:
- Customer asks "what's my booking?", "ที่จองไว้", "my reservation?"
- Customer asks about booking on specific date not shown in UPCOMING BOOKINGS
- Customer asks about past or cancelled bookings

Do NOT use when:
- Booking is already shown in UPCOMING BOOKINGS section in context
- Customer is making a NEW booking (use create_booking instead)`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'Specific booking ID if customer provides it. Use empty string "" if not provided.'
        },
        customer_name: {
          type: 'string',
          description: 'Customer name to search bookings. Use empty string "" if not provided.'
        },
        phone_number: {
          type: 'string',
          description: 'Phone number to search bookings. Use empty string "" if not provided.'
        },
        date: {
          type: 'string',
          description: 'Specific date to search in YYYY-MM-DD format. Use empty string "" if not provided.'
        },
        status: {
          type: 'string',
          enum: ['upcoming', 'past', 'cancelled', 'all'],
          description: 'Filter by booking status. Default "upcoming".'
        }
      },
      required: ['booking_id', 'customer_name', 'phone_number', 'date', 'status'],
      additionalProperties: false
    }
  },

  {
    name: 'lookup_customer',
    description: `Get detailed customer information including package balances, expiration dates, and booking history.

Use this when:
- Customer asks "how many hours left?", "เหลือกี่ชั่วโมง", "package balance?"
- Customer asks "what packages do I have?", "มีแพ็คเกจอะไรบ้าง"
- Customer asks about package expiration

Do NOT use when:
- Basic customer info already in context is sufficient
- Customer is asking about booking (not packages)`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        phone_number: {
          type: 'string',
          description: 'Customer phone number to lookup. Use empty string "" if customer is already identified in context.'
        }
      },
      required: ['phone_number'],
      additionalProperties: false
    }
  },

  {
    name: 'cancel_booking',
    description: `Cancel an existing booking. Requires staff approval before execution.

Use this when:
- Customer explicitly requests cancellation with keywords:
  * English: "cancel", "cancel my booking", "can't make it", "won't make it", "need to cancel", "have to cancel", "can't come"
  * Thai: "ยกเลิก", "ขอยกเลิก", "ยกเลิกการจอง", "ยกเลิกนะ", "ยกเลิกครับ", "ยกเลิกค่ะ"
- Customer says "cancel on [day/date]" - even if casual like "Bro gotta cancel on Wednesday"
- Message contains explicit cancellation intent regardless of politeness or extra words

Do NOT use when:
- Customer is asking IF they can cancel (just answer yes)
- Customer already said "thank you" after cancellation was confirmed
- Booking is already cancelled (check UPCOMING BOOKINGS context first)
- Customer mentions cancellation policy as a question (not requesting actual cancellation)

Workflow:
1. First check UPCOMING BOOKINGS in context above
2. If booking is listed there, you have enough info to cancel it
3. If booking NOT in UPCOMING BOOKINGS, use lookup_booking first to find it
4. Then call this function with the booking details

Required information:
- Booking must be identified either by:
  * booking_id (from UPCOMING BOOKINGS or lookup_booking result), OR
  * date + customer info (will search for booking automatically)
- Staff member name (for audit trail)
- Optional cancellation reason`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'Booking ID to cancel. Use empty string "" if not available (will search by date + customer info instead).'
        },
        date: {
          type: 'string',
          description: 'Booking date in YYYY-MM-DD format. Required if booking_id not provided. Use empty string "" if booking_id is provided.'
        },
        customer_name: {
          type: 'string',
          description: 'Customer name from context. Use empty string "" if not available or if booking_id is provided.'
        },
        phone_number: {
          type: 'string',
          description: 'Customer phone number from context. Use empty string "" if not available or if booking_id is provided.'
        },
        cancellation_reason: {
          type: 'string',
          description: 'Reason for cancellation if customer provided it. Use empty string "" if not provided. Examples: "Schedule conflict", "Customer requested", "Emergency"'
        },
        staff_name: {
          type: 'string',
          description: 'Name of staff member processing cancellation. Use "AI Assistant" as default.'
        }
      },
      required: ['booking_id', 'date', 'customer_name', 'phone_number', 'cancellation_reason', 'staff_name'],
      additionalProperties: false
    }
  },

  {
    name: 'modify_booking',
    description: `Modify an existing booking (reschedule time/date, change duration, or update details). Requires staff approval before execution.

Use this when:
- Customer wants to reschedule/change booking time:
  * English: "change my booking to 3pm", "can I move it to tomorrow?", "reschedule to Friday"
  * Thai: "ขอเปลี่ยนเวลา", "ย้ายไปวันศุกร์", "เลื่อนไปบ่าย 3"
- Customer wants to change booking duration: "can I extend to 2 hours?", "make it 1.5 hours instead"
- Customer wants to change bay type: "switch to AI bay", "change to social bay"
- Message contains modification intent with specific new details

Do NOT use when:
- Customer is just asking IF they can modify (answer yes, don't call function)
- Customer wants to cancel entirely (use cancel_booking instead)
- Booking doesn't exist in UPCOMING BOOKINGS (use lookup_booking first)
- Customer hasn't specified what to change to

Workflow:
1. First check UPCOMING BOOKINGS in context to find the booking
2. Identify what customer wants to change (date, time, duration, bay_type)
3. Call this function with booking_id and ONLY the fields that need to change
4. Function will check availability before requesting staff approval

Required information:
- booking_id from UPCOMING BOOKINGS context
- At least ONE field to modify (date, start_time, duration, or bay_type)
- modification_reason helps staff understand why`,
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'Booking ID to modify (e.g., "BK123456"). Get this from UPCOMING BOOKINGS in context. Cannot be empty.'
        },
        date: {
          type: 'string',
          description: 'New booking date in YYYY-MM-DD format. Use empty string "" if not changing date.'
        },
        start_time: {
          type: 'string',
          description: 'New start time in HH:00 or HH:30 format (e.g., "14:00", "14:30"). Use empty string "" if not changing time.'
        },
        duration: {
          type: 'number',
          description: 'New duration in hours. Must be 0.5, 1, 1.5, 2, 2.5, or 3. Use 0 if not changing duration.',
          enum: [0, 0.5, 1, 1.5, 2, 2.5, 3]
        },
        bay_type: {
          type: 'string',
          enum: ['', 'social', 'ai'],
          description: 'Change to different bay type: "social" (up to 5 players) or "ai" (1-2 players). Use empty string "" if not changing bay type.'
        },
        modification_reason: {
          type: 'string',
          description: 'Brief reason for modification. Use empty string "" if not provided. Examples: "Time conflict", "Customer requested earlier time", "Duration change"'
        }
      },
      required: ['booking_id', 'date', 'start_time', 'duration', 'bay_type', 'modification_reason'],
      additionalProperties: false
    }
  }
];

/**
 * Convert our schemas to OpenAI's tool format
 */
export function getOpenAITools() {
  return AI_FUNCTION_SCHEMAS.map(schema => ({
    type: 'function' as const,
    function: {
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      ...(schema.strict !== undefined && { strict: schema.strict })
    }
  }));
}

/**
 * Validate function call parameters
 */
export function validateFunctionCall(name: string, parameters: Record<string, any>): {
  valid: boolean;
  error?: string;
} {
  const schema = AI_FUNCTION_SCHEMAS.find(s => s.name === name);

  if (!schema) {
    return { valid: false, error: `Unknown function: ${name}` };
  }

  // Check required parameters
  for (const required of schema.parameters.required) {
    if (!(required in parameters)) {
      return { valid: false, error: `Missing required parameter: ${required}` };
    }
  }

  // Validate specific rules
  if (name === 'check_bay_availability' || name === 'create_booking') {
    // Validate duration
    const validDurations = [0.5, 1, 1.5, 2, 2.5, 3];
    if (parameters.duration && !validDurations.includes(parameters.duration)) {
      return { valid: false, error: `Invalid duration: ${parameters.duration}. Must be one of: ${validDurations.join(', ')}` };
    }
  }

  if (name === 'create_booking') {
    // Validate time range
    if (parameters.start_time) {
      const hour = parseInt(parameters.start_time.split(':')[0]);
      if (hour < 9 || hour >= 24) {
        return { valid: false, error: `Invalid start_time: ${parameters.start_time}. Must be between 09:00 and 23:00` };
      }
    }

    // Validate number of people based on bay type
    if (parameters.bay_type === 'ai' && parameters.number_of_people > 2) {
      return { valid: false, error: 'AI bay supports maximum 2 players' };
    }
    if (parameters.bay_type === 'social' && parameters.number_of_people > 5) {
      return { valid: false, error: 'Social bay supports maximum 5 players' };
    }
  }

  if (name === 'modify_booking') {
    // Validate booking_id is not empty
    if (!parameters.booking_id || parameters.booking_id === '') {
      return { valid: false, error: 'booking_id is required and cannot be empty' };
    }

    // Validate at least one field is being modified
    const hasDateChange = parameters.date && parameters.date !== '';
    const hasTimeChange = parameters.start_time && parameters.start_time !== '';
    const hasDurationChange = parameters.duration && parameters.duration > 0;
    const hasBayTypeChange = parameters.bay_type && parameters.bay_type !== '';

    if (!hasDateChange && !hasTimeChange && !hasDurationChange && !hasBayTypeChange) {
      return { valid: false, error: 'At least one field must be modified (date, start_time, duration, or bay_type)' };
    }

    // Validate time range if provided
    if (hasTimeChange) {
      const hour = parseInt(parameters.start_time.split(':')[0]);
      if (hour < 9 || hour >= 24) {
        return { valid: false, error: `Invalid start_time: ${parameters.start_time}. Must be between 09:00 and 23:00` };
      }
    }

    // Validate duration if provided
    if (hasDurationChange) {
      const validDurations = [0.5, 1, 1.5, 2, 2.5, 3];
      if (!validDurations.includes(parameters.duration)) {
        return { valid: false, error: `Invalid duration: ${parameters.duration}. Must be one of: ${validDurations.join(', ')}` };
      }
    }
  }

  return { valid: true };
}
