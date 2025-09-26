# AI Function Calling Implementation Guide

**Enable AI assistant to perform real actions through API integrations**
*Status: Future Implementation*

## Overview

This document outlines how to enhance the existing AI Chat Suggestions system to perform actual operations through function calling, allowing the AI to check availability, look up customers, and perform other staff functions automatically.

## Current State

The AI Chat Suggestions system currently:
- Generates text responses using GPT-4o-mini
- Uses RAG (Retrieval Augmented Generation) with past conversations
- Provides suggestions to staff but cannot access real-time data
- Returns generic responses for availability queries

## Proposed Enhancement

Transform the AI from a suggestion-only system to an action-capable assistant that can:
- Check real-time bay availability
- Look up customer information
- Check package status
- Retrieve pricing information
- Eventually: Create bookings, process transactions

## Implementation Approach (MVP)

### Phase 1: Foundation (Week 1)

#### 1. Create Tool Definitions
**File:** `src/lib/ai/tools/index.ts`
```typescript
export const aiTools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check if a bay is available at a specific date and time",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format"
          },
          time: {
            type: "string",
            description: "Time in HH:MM format"
          },
          bay: {
            type: "string",
            enum: ["Bay 1", "Bay 2", "Bay 3", "Bay 4"],
            description: "Bay number to check"
          },
          duration: {
            type: "number",
            description: "Duration in hours (default: 1)"
          }
        },
        required: ["date", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_customer",
      description: "Search for a customer by name or phone number",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Customer name or phone number"
          }
        },
        required: ["search"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_package_hours",
      description: "Check remaining hours in a customer's package",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "Customer ID"
          }
        },
        required: ["customerId"]
      }
    }
  }
];
```

#### 2. Create Tool Executor
**File:** `src/lib/ai/tool-executor.ts`
```typescript
import { availabilityService } from '@/lib/availability-subscription';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export class ToolExecutor {
  async execute(toolName: string, args: any) {
    try {
      switch (toolName) {
        case 'check_availability':
          return await this.checkAvailability(args);
        case 'find_customer':
          return await this.findCustomer(args);
        case 'check_package_hours':
          return await this.checkPackageHours(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Tool execution error (${toolName}):`, error);
      return {
        error: true,
        message: error.message
      };
    }
  }

  private async checkAvailability(args: {
    date: string;
    time: string;
    bay?: string;
    duration?: number;
  }) {
    const duration = args.duration || 1.0;

    if (args.bay) {
      // Check specific bay
      const available = await availabilityService.checkAvailability(
        args.date,
        args.bay,
        args.time,
        duration
      );
      return {
        available,
        bay: args.bay,
        date: args.date,
        time: args.time,
        duration
      };
    } else {
      // Check all bays
      const availability = await availabilityService.checkAllBaysAvailability(
        args.date,
        args.time,
        duration
      );
      return {
        allBays: availability,
        date: args.date,
        time: args.time,
        duration
      };
    }
  }

  private async findCustomer(args: { search: string }) {
    const { data: customers } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, contact_number, email')
      .or(`customer_name.ilike.%${args.search}%,contact_number.ilike.%${args.search}%`)
      .limit(5);

    return {
      customers: customers || [],
      searchTerm: args.search
    };
  }

  private async checkPackageHours(args: { customerId: string }) {
    const { data: packages } = await refacSupabaseAdmin
      .from('customer_packages')
      .select('*, package_types(*)')
      .eq('customer_id', args.customerId)
      .eq('status', 'active')
      .single();

    if (!packages) {
      return {
        hasPackage: false,
        customerId: args.customerId
      };
    }

    return {
      hasPackage: true,
      hoursRemaining: packages.hours_remaining,
      packageType: packages.package_types.name,
      expiresAt: packages.expires_at
    };
  }
}
```

#### 3. Enhance Suggestion Service
**Modify:** `src/lib/ai/suggestion-service.ts`

Add function calling to the existing `generateAISuggestion` function:

```typescript
import { aiTools } from './tools';
import { ToolExecutor } from './tool-executor';

export async function generateAISuggestion(params: GenerateSuggestionParams): Promise<AISuggestion> {
  const startTime = Date.now();
  const toolExecutor = new ToolExecutor();

  try {
    // ... existing code for embeddings and context ...

    // First call to GPT with tools
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: contextualPrompt },
        { role: 'user', content: params.customerMessage }
      ],
      tools: aiTools,  // Add tools
      tool_choice: 'auto', // Let AI decide
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const message = completion.choices[0]?.message;

    // Check if AI wants to use tools
    if (message?.tool_calls) {
      const toolResults = [];

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await toolExecutor.execute(
          toolCall.function.name,
          args
        );

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: JSON.stringify(result)
        });
      }

      // Second call to GPT with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: contextualPrompt },
          { role: 'user', content: params.customerMessage },
          message,
          ...toolResults
        ],
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      });

      const suggestedResponse = finalCompletion.choices[0]?.message?.content || '';

      // Include tool usage in context summary
      const toolsUsed = message.tool_calls.map(tc => tc.function.name).join(', ');
      const contextSummary = `Used tools: ${toolsUsed}. ${existingContextSummary}`;

      // ... rest of existing code ...
    } else {
      // No tools needed, use existing response
      const suggestedResponse = message?.content || '';
      // ... existing code ...
    }
  } catch (error) {
    // ... existing error handling ...
  }
}
```

#### 4. Update API Response Handler
**Modify:** `app/api/ai/suggest-response/route.ts`

Add tool execution tracking to the response:

```typescript
// In the response, include tool usage information
return NextResponse.json({
  success: true,
  suggestion: {
    id: suggestion.id,
    suggestedResponse: suggestion.suggestedResponse,
    suggestedResponseThai: suggestion.suggestedResponseThai,
    confidenceScore: suggestion.confidenceScore,
    responseTime: suggestion.responseTimeMs,
    contextSummary: suggestion.contextSummary,
    templateUsed: suggestion.templateUsed,
    similarMessagesCount: suggestion.similarMessagesUsed.length,
    toolsUsed: suggestion.toolsUsed || []  // Add this
  }
});
```

### Phase 2: Natural Language Processing (Week 2)

#### Date/Time Parser
**File:** `src/lib/ai/nlp/date-parser.ts`
```typescript
export function parseNaturalDate(input: string): { date: string; time?: string } {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const text = input.toLowerCase();

  // Parse relative dates
  if (text.includes('today')) {
    return { date: formatDate(today) };
  }
  if (text.includes('tomorrow') || text.includes('พรุ่งนี้')) {
    return { date: formatDate(tomorrow) };
  }

  // Parse times
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|น\.|โมง)/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] || '00';
    const period = timeMatch[3];

    if (period?.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (period?.toLowerCase() === 'am' && hour === 12) hour = 0;

    return {
      date: formatDate(today),
      time: `${hour.toString().padStart(2, '0')}:${minute}`
    };
  }

  return { date: formatDate(today) };
}
```

### Phase 3: Testing & Monitoring

#### Test Scenarios
1. **Availability Check**
   - Input: "Is Bay 2 available tomorrow at 3pm?"
   - Expected: AI calls `check_availability` tool and returns accurate result

2. **Customer Lookup**
   - Input: "Check if John Smith has any packages"
   - Expected: AI calls `find_customer` then `check_package_hours`

3. **Multi-tool Usage**
   - Input: "Can John Smith book Bay 3 tomorrow at 2pm?"
   - Expected: AI calls multiple tools in sequence

#### Monitoring Metrics
- Tool call success rate
- Average response time with tools
- Most frequently used tools
- Error rates by tool type

## Database Schema Updates

### Add Tool Usage Tracking
```sql
CREATE TABLE ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID REFERENCES ai_suggestions(id),
  tool_name TEXT NOT NULL,
  tool_parameters JSONB,
  tool_result JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX idx_ai_tool_executions_tool_name ON ai_tool_executions(tool_name);
CREATE INDEX idx_ai_tool_executions_created_at ON ai_tool_executions(created_at);
```

## Security Considerations

### 1. Permission Management
- Tools should respect staff permissions
- Read-only operations first, write operations later
- Audit all tool executions

### 2. Rate Limiting
```typescript
const rateLimiter = new Map();

function checkRateLimit(conversationId: string): boolean {
  const key = `${conversationId}`;
  const now = Date.now();
  const limit = 10; // 10 tool calls per minute

  const calls = rateLimiter.get(key) || [];
  const recentCalls = calls.filter(t => now - t < 60000);

  if (recentCalls.length >= limit) {
    return false;
  }

  rateLimiter.set(key, [...recentCalls, now]);
  return true;
}
```

### 3. Input Validation
- Sanitize all tool parameters
- Validate dates, times, customer IDs
- Prevent SQL injection through parameterized queries

## Progressive Enhancement Plan

### MVP Tools (Phase 1)
- ✅ `check_availability`
- ✅ `find_customer`
- ✅ `check_package_hours`

### Enhanced Tools (Phase 2)
- `get_available_slots` - Show multiple available times
- `get_pricing` - Return current bay rates
- `check_coach_availability` - Coach schedules
- `get_booking_history` - Customer's past bookings

### Advanced Tools (Phase 3)
- `create_booking` - Actually create bookings (with confirmation)
- `modify_booking` - Change existing bookings
- `sell_package` - Process package sales
- `process_payment` - Handle POS transactions

## Example Conversations

### Simple Availability Check
```
Customer: "Is Bay 2 free tomorrow at 2pm?"

AI Processing:
1. Parse: tomorrow = 2025-09-25, time = 14:00
2. Call: check_availability({ date: "2025-09-25", time: "14:00", bay: "Bay 2" })
3. Result: { available: true }

AI Response: "Yes, Bay 2 is available tomorrow (September 25) at 2:00 PM. Would you like me to help you make a booking?"
```

### Complex Multi-Tool Query
```
Customer: "Does John Smith have enough hours for a 2-hour session tomorrow?"

AI Processing:
1. Call: find_customer({ search: "John Smith" })
2. Result: { customers: [{ id: "123", name: "John Smith" }] }
3. Call: check_package_hours({ customerId: "123" })
4. Result: { hoursRemaining: 3.5 }

AI Response: "Yes, John Smith has 3.5 hours remaining in his package, which is enough for a 2-hour session tomorrow."
```

## Performance Considerations

### Caching Strategy
- Cache tool results for 60 seconds
- Cache customer lookups for 5 minutes
- Invalidate cache on data changes

### Async Execution
- Execute independent tools in parallel
- Use Promise.all() for multiple tool calls
- Implement timeout handling (5 seconds max)

## Rollout Strategy

1. **Internal Testing** (Week 1)
   - Test with staff accounts only
   - Monitor all tool executions
   - Collect feedback

2. **Limited Release** (Week 2)
   - Enable for 10% of conversations
   - A/B test against non-tool responses
   - Measure customer satisfaction

3. **Full Deployment** (Week 3-4)
   - Enable for all conversations
   - Monitor performance metrics
   - Iterate based on usage patterns

## Success Metrics

### Technical Metrics
- Tool execution success rate: >95%
- Average response time: <3 seconds
- Error rate: <2%

### Business Metrics
- Automation rate: 30-40% of queries
- Staff time saved: 20-30%
- Customer satisfaction: >4.5/5

### Usage Analytics
- Most used tools
- Peak usage times
- Common query patterns

## Troubleshooting Guide

### Common Issues

1. **"Tool execution timeout"**
   - Check API endpoint availability
   - Review network connectivity
   - Implement retry logic

2. **"No tools matched query"**
   - Improve intent detection
   - Add more tool variations
   - Enhance prompts

3. **"Incorrect tool parameters"**
   - Improve NLP parsing
   - Add parameter validation
   - Provide clearer descriptions

## Future Enhancements

### Advanced Capabilities
- Multi-turn conversations with context
- Proactive suggestions based on patterns
- Voice input processing
- Image-based queries (photos of scorecards)

### Integration Possibilities
- Calendar blocking for maintenance
- Automated follow-up messages
- Loyalty program integration
- Dynamic pricing adjustments

## Related Documentation

- [AI Chat Suggestions](./AI_CHAT_SUGGESTIONS.md) - Current implementation
- [Unified Chat System](./UNIFIED_CHAT_SYSTEM.md) - Chat infrastructure
- [Availability System](../booking-scheduling/NATIVE_AVAILABILITY_SYSTEM.md) - Availability checking

---

*This implementation guide provides a practical, phased approach to adding function calling capabilities to the Lengolf AI assistant, transforming it from a suggestion system to an action-capable agent.*