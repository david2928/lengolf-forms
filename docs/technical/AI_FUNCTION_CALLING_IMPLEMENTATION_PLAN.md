# AI Function Calling - Implementation Plan

**Date:** October 19, 2025
**Scope:** Priority 1 Functions (Essential - High Impact)
**Approach:** Leverage existing APIs and UI components

---

## Current System Understanding

### Existing Bay Availability UI (`BayAvailabilitySection.tsx`)
**Current Capabilities:**
- ✅ Filters by bay type: "All Bays", "Social Bay" (1-3), "AI Bay" (4)
- ✅ Fetches availability from `/api/bookings/available-slots`
- ✅ Groups consecutive time slots into ranges
- ✅ Sends formatted availability messages directly to customer
- ✅ Opens booking form with pre-filled data

**Bay Organization:**
- **Social Bays:** Bay 1, Bay 2, Bay 3 (up to 5 players)
- **AI Bay:** Bay 4 (1-2 players, advanced analytics)

**Customer Communication Pattern:**
- Customers ask for "Social bay" or "AI bay" (NOT specific bay numbers)
- Exception cases:
  - "Bay 1" or "bay next to the bar" → Bay 1 (Social)
  - "Connected bays" → Bay 2 + Bay 3 (Social, side-by-side)
- Staff never mention bay numbers unless customer specifically requests

### Existing Coaching Availability API
**Endpoint:** `GET /api/coaching-assist/availability?date=YYYY-MM-DD`
**Returns:**
- Coach availability slots
- Weekly schedules
- Date overrides
- Booking status (available/partially_booked/fully_booked)

**Coaches:**
- Boss (Ratchavin)
- Noon
- Min

### Existing Booking Creation API
**Endpoint:** `POST /api/bookings/create`
**Capabilities:**
- Creates new customers automatically
- Validates phone number duplicates
- Creates bookings with all required fields
- Validates time slots (9am-midnight)

---

## Implementation Plan

### Phase 1: AI Function Definitions

#### Create: `src/lib/ai/function-schemas.ts`

```typescript
export const AI_FUNCTION_SCHEMAS = [
  {
    name: "check_bay_availability",
    description: "Check real-time bay availability for Social bays (1-3) or AI bay (4). Use when customer asks about availability.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Use today's date if not specified."
        },
        start_time: {
          type: "string",
          description: "Preferred start time in HH:00 or HH:30 format (e.g., '14:00', '14:30'). If customer says 'afternoon', use '14:00'. If 'evening', use '18:00'."
        },
        duration: {
          type: "number",
          description: "Duration in hours (0.5, 1, 1.5, 2, 2.5, 3). Default to 1 hour if not specified."
        },
        bay_type: {
          type: "string",
          enum: ["social", "ai", "all"],
          description: "Bay type: 'social' for Social bays (1-3, up to 5 players), 'ai' for AI bay (4, 1-2 players with analytics), 'all' for any available bay. Default 'all'."
        }
      },
      required: ["date", "duration"]
    }
  },

  {
    name: "get_coaching_availability",
    description: "Get coach availability for golf lessons. Use when customer asks about coaching or lessons.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format for checking coach availability"
        },
        coach_name: {
          type: "string",
          enum: ["Boss", "Ratchavin", "Noon", "Min", "any"],
          description: "Specific coach name or 'any' to show all coaches. Boss and Ratchavin are the same person."
        },
        preferred_time: {
          type: "string",
          description: "Optional preferred time in HH:00 format (e.g., '14:00')"
        }
      },
      required: ["date"]
    }
  },

  {
    name: "create_booking",
    description: "Create a new booking. REQUIRES staff approval before execution. Only use after confirming all required information with customer.",
    parameters: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer full name in English"
        },
        phone_number: {
          type: "string",
          description: "Customer phone number (10 digits)"
        },
        email: {
          type: "string",
          description: "Customer email (optional, use 'info@len.golf' if not provided)"
        },
        date: {
          type: "string",
          description: "Booking date in YYYY-MM-DD format"
        },
        start_time: {
          type: "string",
          description: "Start time in HH:00 format (09:00-23:00)"
        },
        duration: {
          type: "number",
          description: "Duration in hours (0.5, 1, 1.5, 2, 2.5, 3)"
        },
        number_of_people: {
          type: "number",
          description: "Number of players (1-5 for Social bay, 1-2 for AI bay)"
        },
        bay_type: {
          type: "string",
          enum: ["social", "ai"],
          description: "'social' for Social bays (1-3), 'ai' for AI bay (4)"
        },
        booking_type: {
          type: "string",
          description: "Either 'Bay Reservation' or 'Coaching (CoachName)' for lessons"
        },
        coach_name: {
          type: "string",
          description: "Coach name if booking_type is coaching (Boss, Ratchavin, Noon, Min)"
        }
      },
      required: ["customer_name", "phone_number", "date", "start_time", "duration", "number_of_people", "bay_type", "booking_type"]
    }
  }
];
```

**Key Customer Communication Rules:**
1. **Never mention specific bay numbers** unless customer explicitly asks
2. **Use bay types only:** "Social bay" or "AI bay"
3. **Exception handling:**
   - If customer says "Bay 1" or "next to bar" → Map to Social bay type
   - If customer says "connected bays" → Map to Social bay type (staff will assign Bay 2+3)
4. **When presenting availability:** Say "Social bay available" not "Bay 1 and Bay 3 available"

---

### Phase 2: Function Executor

#### Create: `src/lib/ai/function-executor.ts`

```typescript
import { AI_FUNCTION_SCHEMAS } from './function-schemas';

interface FunctionCall {
  name: string;
  parameters: Record<string, any>;
}

interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresApproval?: boolean;
  approvalMessage?: string;
}

export class AIFunctionExecutor {
  /**
   * Execute a function call from OpenAI
   */
  async execute(functionCall: FunctionCall): Promise<FunctionResult> {
    switch (functionCall.name) {
      case 'check_bay_availability':
        return await this.checkBayAvailability(functionCall.parameters);

      case 'get_coaching_availability':
        return await this.getCoachingAvailability(functionCall.parameters);

      case 'create_booking':
        return this.prepareBookingForApproval(functionCall.parameters);

      default:
        return {
          success: false,
          error: `Unknown function: ${functionCall.name}`
        };
    }
  }

  /**
   * Check bay availability using existing API
   */
  private async checkBayAvailability(params: any): Promise<FunctionResult> {
    try {
      const { date, start_time, duration, bay_type = 'all' } = params;

      // Determine which bays to check
      const bays = bay_type === 'social' ? ['Bay 1', 'Bay 2', 'Bay 3'] :
                   bay_type === 'ai' ? ['Bay 4'] :
                   ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'];

      // Fetch availability for each bay
      const promises = bays.map(async (bay) => {
        const response = await fetch(
          `/api/bookings/available-slots?date=${date}&bay=${encodeURIComponent(bay)}&duration=${duration}&startHour=10&endHour=22`
        );
        const data = await response.json();
        return { bay, slots: data.slots || [] };
      });

      const results = await Promise.all(promises);

      // Find slots matching requested time (if specified)
      const availableBays = start_time
        ? results.filter(r => r.slots.some((s: any) => s.time === start_time)).map(r => r.bay)
        : results.filter(r => r.slots.length > 0).map(r => r.bay);

      // Group by bay type for customer-friendly response
      const socialBays = availableBays.filter(b => ['Bay 1', 'Bay 2', 'Bay 3'].includes(b));
      const aiBays = availableBays.filter(b => b === 'Bay 4');

      return {
        success: true,
        data: {
          date,
          start_time,
          duration,
          bay_type,
          social_bays_available: socialBays.length > 0,
          ai_bay_available: aiBays.length > 0,
          // Internal use only - don't expose to customer
          _available_bays: availableBays,
          // All time slots for alternative suggestions
          all_slots: results.flatMap(r => r.slots.map((s: any) => ({ ...s, bay_type: ['Bay 1', 'Bay 2', 'Bay 3'].includes(r.bay) ? 'social' : 'ai' })))
        }
      };
    } catch (error) {
      console.error('Error checking bay availability:', error);
      return {
        success: false,
        error: 'Failed to check availability'
      };
    }
  }

  /**
   * Get coaching availability using existing API
   */
  private async getCoachingAvailability(params: any): Promise<FunctionResult> {
    try {
      const { date, coach_name, preferred_time } = params;

      const response = await fetch(`/api/coaching-assist/availability?date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch coaching availability');
      }

      // Filter by coach if specified
      let coaches = data.availability_slots || [];
      if (coach_name && coach_name !== 'any') {
        // Handle Boss/Ratchavin alias
        const searchName = (coach_name === 'Boss' || coach_name === 'Ratchavin') ?
          ['Boss', 'Ratchavin', 'Boss - Ratchavin'] : [coach_name];
        coaches = coaches.filter((c: any) =>
          searchName.some(name => c.coach_name.includes(name))
        );
      }

      return {
        success: true,
        data: {
          date,
          coaches: coaches.map((c: any) => ({
            coach_name: c.coach_name,
            is_available: c.is_available_today,
            next_available: c.next_available,
            duration_available: c.duration_available
          })),
          preferred_time
        }
      };
    } catch (error) {
      console.error('Error fetching coaching availability:', error);
      return {
        success: false,
        error: 'Failed to check coaching availability'
      };
    }
  }

  /**
   * Prepare booking for staff approval (doesn't create yet)
   */
  private prepareBookingForApproval(params: any): FunctionResult {
    // Format booking summary for staff approval
    const summary = `
📋 Booking Request:
• Customer: ${params.customer_name}
• Phone: ${params.phone_number}
• Email: ${params.email || 'Not provided'}
• Date: ${params.date}
• Time: ${params.start_time} (${params.duration}h)
• Players: ${params.number_of_people}
• Type: ${params.bay_type === 'social' ? 'Social Bay' : 'AI Bay'}
${params.booking_type.includes('Coaching') ? `• Coach: ${params.coach_name}` : ''}
    `.trim();

    return {
      success: true,
      requiresApproval: true,
      approvalMessage: summary,
      data: params
    };
  }

  /**
   * Execute approved booking
   */
  async executeApprovedBooking(params: any): Promise<FunctionResult> {
    try {
      // Map to booking API format
      const bookingData = {
        id: crypto.randomUUID(),
        user_id: 'system', // Will be set by API
        name: params.customer_name,
        email: params.email || 'info@len.golf',
        phone_number: params.phone_number,
        date: params.date,
        start_time: params.start_time,
        duration: params.duration,
        number_of_people: params.number_of_people,
        status: 'confirmed',
        bay: null, // Will be assigned by staff or system
        booking_type: params.booking_type,
        isNewCustomer: true, // API will check for duplicates
        customer_notes: 'Created via AI assistant'
      };

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create booking'
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: 'Failed to create booking'
      };
    }
  }
}

export const functionExecutor = new AIFunctionExecutor();
```

---

### Phase 3: Update AI Suggestion Service

#### Modify: `src/lib/ai/suggestion-service.ts`

**Changes:**
1. Import function schemas
2. Add `tools` parameter to GPT-4o-mini call
3. Handle function call responses
4. Format results into natural language

**Key Addition:**
```typescript
import { AI_FUNCTION_SCHEMAS } from './function-schemas';
import { functionExecutor } from './function-executor';

// In generateSuggestion function:
const response = await openai.chat.completions.create({
  model: AI_CONFIG.model,
  messages: [
    { role: 'system', content: LENGOLF_SYSTEM_PROMPT },
    { role: 'user', content: enhancedPrompt }
  ],
  tools: AI_FUNCTION_SCHEMAS.map(schema => ({
    type: 'function',
    function: schema
  })),
  tool_choice: 'auto', // Let AI decide when to use functions
  temperature: 0.7
});

// Handle function calls
if (response.choices[0].message.tool_calls) {
  const functionCall = response.choices[0].message.tool_calls[0];
  const result = await functionExecutor.execute({
    name: functionCall.function.name,
    parameters: JSON.parse(functionCall.function.arguments)
  });

  // If requires approval, return to UI for confirmation
  if (result.requiresApproval) {
    return {
      ...suggestion,
      requiresApproval: true,
      approvalData: result.data,
      approvalMessage: result.approvalMessage
    };
  }

  // Otherwise, format result into natural response
  const formattedResponse = await formatFunctionResult(result, customerMessage);
  return {
    ...suggestion,
    suggestedResponse: formattedResponse,
    functionCallUsed: functionCall.function.name,
    functionResult: result.data
  };
}
```

---

### Phase 4: Update UI Components

#### Modify: `src/components/ai/AISuggestionCard.tsx`

**Add:**
- Display for function call results
- Approval button for booking creation
- Formatted availability display

**Example UI for Availability:**
```tsx
{suggestion.functionCallUsed === 'check_bay_availability' && (
  <div className="bg-blue-50 p-3 rounded-lg mb-2">
    <div className="font-medium text-sm">Availability Check:</div>
    {suggestion.functionResult.social_bays_available && (
      <div className="text-green-600">✓ Social bay available</div>
    )}
    {suggestion.functionResult.ai_bay_available && (
      <div className="text-green-600">✓ AI bay available</div>
    )}
    {!suggestion.functionResult.social_bays_available && !suggestion.functionResult.ai_bay_available && (
      <div className="text-red-600">✗ No bays available at requested time</div>
    )}
  </div>
)}
```

**Example UI for Booking Approval:**
```tsx
{suggestion.requiresApproval && (
  <div className="border-t pt-3 mt-3">
    <div className="bg-yellow-50 p-3 rounded-lg mb-3">
      <div className="font-medium text-sm mb-2">⚠️ Requires Approval</div>
      <pre className="text-xs whitespace-pre-wrap">{suggestion.approvalMessage}</pre>
    </div>
    <div className="flex space-x-2">
      <Button onClick={() => handleApproveBooking(suggestion.approvalData)}>
        Approve & Create Booking
      </Button>
      <Button variant="outline" onClick={onDecline}>
        Cancel
      </Button>
    </div>
  </div>
)}
```

---

## Customer Communication Guidelines

### Bay Availability Responses

**DO:**
- ✅ "Social bay available from 2pm-5pm"
- ✅ "AI bay is fully booked today, but Social bay is available"
- ✅ "Both Social and AI bays available at 3pm"

**DON'T:**
- ❌ "Bay 1 and Bay 3 are available"
- ❌ "We have openings on Bay 2"
- ❌ "Bay 4 is free"

### Exception Handling

**Customer says "Bay 1" or "next to bar":**
```
AI Response: "สวัสดีค่ะ Social bay ว่างค่ะ"
(Hello, Social bay is available)
```

**Customer says "connected bays":**
```
AI Response: "Social bay มีให้ค่ะ"
(Social bay available)
```
*Note: Staff will manually assign Bay 2+3 when creating booking*

---

## Testing Plan

### Test Case 1: Bay Availability (Social Bay)
**Customer:** "Do you have available bay at 13:00-14:00?"
**Expected:**
1. AI calls `check_bay_availability` with `{date: "2025-10-20", start_time: "13:00", duration: 1, bay_type: "all"}`
2. Returns: `{social_bays_available: true, ai_bay_available: false}`
3. AI suggests: "Yes! Social bay available at 1pm 😊"

### Test Case 2: Coaching Availability
**Customer:** "I would like to book a class with coach"
**Expected:**
1. AI calls `get_coaching_availability` with `{date: "2025-10-20", coach_name: "any"}`
2. Returns list of available coaches
3. AI suggests: "Which coach would you like? Pro Min is available 9am-5pm, Pro Ratchavin is available 10am-6pm"

### Test Case 3: Booking Creation
**Customer:** "I want to book Social bay for 2pm, 2 hours, for 3 people. Name: John Smith, Phone: 0812345678"
**Expected:**
1. AI calls `create_booking` with all parameters
2. Returns: `{requiresApproval: true, approvalMessage: "📋 Booking Request: ..."}`
3. UI shows approval button
4. Staff clicks "Approve"
5. Booking created via API
6. AI suggests confirmation message

---

## Implementation Timeline

**Phase 1:** Function schemas (2 hours)
**Phase 2:** Function executor (4 hours)
**Phase 3:** AI service integration (4 hours)
**Phase 4:** UI updates (4 hours)
**Testing:** (4 hours)

**Total: 18 hours (~2-3 days)**

---

## Next Steps After Priority 1

Once the 3 essential functions are working:
1. Implement Priority 2 functions (cancel, modify, package info)
2. Add analytics tracking for function usage
3. Monitor staff feedback and iterate
4. Enable AI suggestions in production

---

## Success Metrics

- **Function Call Accuracy:** >90% correct function selection
- **Parameter Extraction:** >85% accurate parameter extraction
- **Staff Approval Rate:** >80% of booking suggestions approved
- **Response Time:** <3 seconds end-to-end
- **Customer Satisfaction:** Faster responses, more accurate information
