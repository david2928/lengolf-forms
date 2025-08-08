# B2C Lead Feedback System

## Overview

The B2C Lead Feedback System enables staff to systematically record and track call outcomes for B2C leads, replacing the previous Google Form workflow with a fully integrated solution that stores data in Supabase with proper foreign key relationships.

## Features

### Core Functionality
- **Lead Selection**: Smart filtering to show new leads and those requiring follow-up
- **Call Outcome Recording**: Structured data collection for call results
- **Follow-up Tracking**: Automatic identification of leads needing additional contact
- **Mobile Optimization**: Tablet and mobile-friendly interface for field use
- **Data Integration**: Full integration with processed_leads table via foreign keys

### Smart Lead Filtering
- **Date-based Filtering**: Only shows leads from April 28th, 2025 onwards
- **Spam Prevention**: Automatically excludes emails containing "yandex"
- **Follow-up Logic**: Shows leads without feedback OR those requiring follow-up
- **B2C Focus**: Exclusively processes B2C leads (excludes B2B)

## Database Schema

### Primary Table: `lead_feedback`

```sql
CREATE TABLE lead_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES processed_leads(id),
    call_date DATE NOT NULL,
    was_reachable BOOLEAN NOT NULL,
    response_type response_type,
    visit_timeline visit_timeline,
    requires_followup BOOLEAN NOT NULL DEFAULT false,
    booking_submitted BOOLEAN NOT NULL DEFAULT false,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enum Types

```sql
CREATE TYPE response_type AS ENUM (
    'very_interested',
    'interested_need_time', 
    'not_interested',
    'no_clear_answer'
);

CREATE TYPE visit_timeline AS ENUM (
    'within_1_week',
    'within_month',
    'no_plan'
);
```

### Foreign Key Relationship
- **Strong relationship** with `processed_leads` table
- **Ensures data integrity** through foreign key constraints
- **Enables relational queries** for reporting and analytics

## API Endpoints

### GET `/api/leads/unfeedback`
Returns B2C leads that need attention (no feedback OR require follow-up).

**Response Structure:**
```typescript
{
  success: boolean;
  data: Lead[];
  count: number;
}

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  meta_submitted_at: string;
  display_name: string;
  needs_followup?: boolean;
  group_size?: string;
  preferred_time?: string;
  planned_visit?: string;
  additional_inquiries?: string;
}
```

**Filtering Logic:**
- Only B2C leads (`lead_type = 'b2c'`)
- Not likely spam (`is_likely_spam = false`)
- From April 28th onwards (`meta_submitted_at >= '2025-04-28'`)
- Exclude yandex emails (`email NOT LIKE '%yandex%'`)
- No existing feedback OR requires follow-up

### POST `/api/leads/feedback`
Records call outcome for a lead.

**Request Body:**
```typescript
interface FeedbackData {
  lead_id: string;
  call_date: string;
  was_reachable: boolean;
  response_type?: 'very_interested' | 'interested_need_time' | 'not_interested' | 'no_clear_answer';
  visit_timeline?: 'within_1_week' | 'within_month' | 'no_plan';
  requires_followup: boolean;
  booking_submitted: boolean;
  comments?: string;
}
```

**Smart Update Logic:**
- **New leads**: Creates new feedback record
- **Follow-up leads**: Updates existing record instead of creating duplicates
- **Duplicate prevention**: Prevents same-date feedback for new leads

### GET `/api/leads/feedback`
Retrieves feedback history (optional lead_id parameter for filtering).

## User Interface

### Page Structure
- **Statistics Panel**: Shows count of new calls vs follow-ups
- **Lead Selection**: Search and browse interface with follow-up badges
- **Call Outcome Form**: Conditional form based on reachability
- **Success/Error Handling**: Real-time feedback with form reset

### Mobile/Tablet Optimization
- **Responsive Design**: Tailored for field use on tablets and phones
- **Touch-Friendly**: Large touch targets and inputs
- **Readable Text**: Larger fonts on mobile devices
- **Efficient Layout**: Minimal scrolling required

### UI Components
- **Search Functionality**: Real-time filtering by name, phone, or email
- **Visual Indicators**: Orange badges for follow-up leads
- **Form Validation**: Required field enforcement
- **Modern Styling**: Consistent with application design system

## Data Migration

### Historical Data Import
- **Source**: Google Form CSV export with 107 records
- **Import Success**: 80 out of 107 records matched (75% success rate)
- **Matching Logic**: Phone number and name-based matching
- **Data Integrity**: All imported records maintain foreign key relationships

### Import Script Features
```bash
# Run import script
npm run ts-node scripts/import-lead-feedback.ts
```

**Matching Algorithm:**
1. Extract phone numbers from display names
2. Normalize phone formats for comparison
3. Match against processed_leads by phone and name
4. Skip records that cannot be matched

## Business Logic

### Follow-up Management
- **Initial Contact**: First feedback creates new record
- **Follow-up Calls**: Updates existing record instead of duplicating
- **Status Tracking**: Clear indication of leads requiring additional contact
- **Historical Cleanup**: Removed pre-existing follow-ups for fresh start

### Lead Lifecycle
1. **New Lead**: Appears in list without feedback
2. **First Contact**: Staff records initial call outcome
3. **Follow-up Required**: Lead remains in list with follow-up badge
4. **Follow-up Complete**: Staff updates record with final outcome
5. **Closed/Complete**: Lead removed from active list

### Data Quality Controls
- **Spam Filtering**: Automatic exclusion of known spam patterns
- **Date Boundaries**: Focus on recent leads only
- **Duplicate Prevention**: Smart update logic prevents data duplication
- **Required Fields**: Ensures essential data is captured

## Integration Features

### Menu Integration
- **Main Dashboard**: Added to Daily Operations section
- **Role Access**: Available to all authenticated users
- **Navigation**: Seamless integration with existing menu structure

### Authentication
- **Session-based**: Uses existing NextAuth.js authentication
- **Development Bypass**: Supports SKIP_AUTH for development testing
- **Authorization**: Requires valid user session

## Technical Implementation

### Frontend Architecture
- **Next.js 14**: App Router with server-side rendering
- **TypeScript**: Full type safety throughout
- **Tailwind CSS**: Responsive design with consistent styling
- **Radix UI**: Professional dropdown components

### State Management
- **React Hooks**: useState and useEffect for local state
- **Form Management**: Controlled components with validation
- **API Integration**: Fetch-based API calls with error handling

### Performance Optimizations
- **Efficient Queries**: Optimized database queries with proper indexing
- **Responsive Loading**: Loading states and error boundaries
- **Mobile Performance**: Optimized for mobile/tablet devices

## Development Setup

### Required Environment Variables
```bash
# Database access (already configured)
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Authentication (already configured)
NEXTAUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Development bypass (optional)
SKIP_AUTH=true
```

### Local Development
```bash
# Start development server
npm run dev

# Access the system
http://localhost:3000/lead-feedback

# Run import script (if needed)
npm run ts-node scripts/import-lead-feedback.ts
```

## Testing & Quality Assurance

### Functional Testing
- **Lead Filtering**: Verify correct leads appear based on criteria
- **Form Submission**: Test all form fields and validation
- **Follow-up Logic**: Ensure updates work correctly for follow-up leads
- **Mobile Experience**: Test on actual tablets and phones

### Data Validation
- **Foreign Key Integrity**: All feedback records properly linked
- **Enum Constraints**: Response types and timelines properly validated
- **Date Handling**: Proper timezone and date format handling

### Quality Checklist
- [ ] `npm run lint` passes without errors
- [ ] `npm run typecheck` validates TypeScript
- [ ] Manual testing on desktop, tablet, and mobile
- [ ] Database constraints properly enforced
- [ ] API endpoints handle errors gracefully

## Security Considerations

### Data Protection
- **Authentication Required**: All endpoints require valid session
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Prevention**: Parameterized queries only
- **RLS Policies**: Row Level Security enforced in Supabase

### Access Control
- **Role-based**: Currently open to all authenticated users
- **Session Management**: Proper session handling and timeouts
- **CORS Protection**: API endpoints properly secured

## Future Enhancements

### Potential Improvements
- **Analytics Dashboard**: Reporting on call success rates and outcomes
- **LINE Integration**: Automated notifications for high-priority follow-ups
- **Advanced Filtering**: Additional search and filter options
- **Bulk Operations**: Mass updates for multiple leads
- **Call Scheduling**: Integration with calendar for follow-up reminders

### Scalability Considerations
- **Database Indexing**: Optimize for larger lead volumes
- **Caching Strategy**: Implement caching for frequently accessed data
- **API Rate Limiting**: Protect against excessive API usage
- **Performance Monitoring**: Track system performance metrics

## Troubleshooting

### Common Issues

**No leads showing:**
- Check date filter (only shows leads from April 28th onwards)
- Verify authentication (ensure user is logged in)
- Check for database connectivity issues

**Form submission errors:**
- Verify all required fields are filled
- Check network connectivity
- Review browser console for JavaScript errors

**Import script failures:**
- Ensure CSV file format matches expected structure
- Check phone number formats in source data
- Verify database connectivity and permissions

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API endpoints are responding
3. Check Supabase logs for database errors
4. Test with development authentication bypass

## Maintenance

### Regular Tasks
- **Data Cleanup**: Periodic review of old feedback records
- **Performance Review**: Monitor query performance as data grows
- **Spam Pattern Updates**: Update spam detection criteria as needed

### Monitoring
- **API Performance**: Track response times and error rates
- **Database Growth**: Monitor table sizes and query performance
- **User Adoption**: Track usage patterns and identify issues

---

## Summary

The B2C Lead Feedback System successfully replaces the Google Form workflow with a fully integrated solution that:

- ✅ **Maintains data integrity** through proper foreign key relationships
- ✅ **Optimizes user experience** with mobile/tablet-friendly design
- ✅ **Implements smart filtering** to show only relevant leads
- ✅ **Provides follow-up tracking** with visual indicators
- ✅ **Ensures data quality** through validation and spam filtering
- ✅ **Integrates seamlessly** with existing application architecture

The system is ready for production use and can be extended with additional features as business needs evolve.