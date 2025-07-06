# Booking Enhancement Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the booking system with improved functionality for updating booking information, package integration, new customer highlighting, and referral source tracking.

## Current System Analysis

### Existing Strengths
✅ **Package Integration**: BookingFormData already includes `packageId` and `packageName` fields  
✅ **Customer Management**: Robust customer database with stable ID linking  
✅ **Form Architecture**: Well-structured 3-step booking process  
✅ **Calendar Integration**: Full Google Calendar sync  
✅ **Notification System**: LINE notifications with booking details  
✅ **Management Interface**: Complete CRUD operations for bookings  

### Identified Gaps
❌ **Database Schema**: Missing `package_id` foreign key in bookings table  
❌ **Phone Number Updates**: Cannot edit phone numbers for existing customers  
❌ **New Customer Highlighting**: No visual indicators in calendar/manage views  
❌ **Referral Source Mapping**: `customerContactedVia` not properly stored as referral source  

## Implementation Plan

### Phase 1: Database Schema & Core Types (High Priority)

#### 1.1 Database Schema Updates
```sql
-- Add package_id foreign key to bookings table
ALTER TABLE public.bookings 
ADD COLUMN package_id uuid REFERENCES backoffice.packages(id);

-- Add referral_source field for tracking
ALTER TABLE public.bookings 
ADD COLUMN referral_source text;

-- Add index for performance
CREATE INDEX idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX idx_bookings_referral_source ON public.bookings(referral_source);
```

#### 1.2 TypeScript Type Updates
- Update `BookingFormData` interface to ensure all fields are properly typed
- Add referral source enum/constants
- Update booking database types

#### 1.3 API Route Updates
- **File**: `/app/api/bookings/create/route.ts`
- **Changes**: 
  - Map `customerContactedVia` to `referral_source`
  - Ensure `package_id` is properly saved from form data
  - Add package usage tracking logic

### Phase 2: Form Enhancements (High Priority)

#### 2.1 Booking Type Enhancement
- **File**: `/src/components/booking-form/selectors/booking-type-selector.tsx`
- **Changes**:
  - Ensure all booking types are properly captured
  - Add new booking type categories if needed
  - Improve booking type display in management interface

#### 2.3 Package Integration
- **File**: `/src/components/booking-form/selectors/package-selector.tsx`
- **Changes**:
  - Ensure package_id is properly linked to booking
  - Add package usage tracking
  - Update package display in booking summaries

#### 2.4 Referral Source Enhancement
- **File**: `/src/components/booking-form/steps/customer-step.tsx`
- **Changes**:
  - Map existing contact methods to referral sources:
    - Instagram/Facebook → Social Media
    - Website/ResOS → Online
    - Walk-in → Physical Location
    - Phone/WhatsApp → Direct Contact
  - Add new referral source options:
    - Instagram (separate from Facebook)
    - TikTok
    - Friends/Word of Mouth
    - Mall Advertisement
    - Other

### Phase 3: Display & Management (Medium Priority)

#### 3.1 Phone Number & Booking Information Updates
- **File**: `/app/manage-bookings/page.tsx` - Management interface
- **Changes**:
  - Add edit functionality for phone numbers in booking details
  - Allow updating package_id and booking_type for existing bookings
  - Add validation for phone number format
  - Update customer record when phone number changes
  - Add API endpoints for updating booking information

#### 3.2 New Customer Highlighting
- **Files**: 
  - `/app/bookings-calendar/page.tsx` - Calendar view
  - `/app/manage-bookings/page.tsx` - Management interface
- **Changes**:
  - Add visual indicators (badges, colors) for new customers
  - Update booking cards to show new customer status
  - Add filtering by new/returning customers

#### 3.3 Enhanced Booking Information Display
- **Files**: 
  - `/app/manage-bookings/page.tsx`
  - `/src/components/booking-card/` (if exists)
- **Changes**:
  - Show package information in booking details
  - Display referral source in booking summaries
  - Add package usage status indicators

#### 3.4 Calendar Integration
- **File**: `/app/bookings-calendar/page.tsx`
- **Changes**:
  - Add package type indicators on calendar events
  - Show new customer badges on calendar
  - Add referral source filtering

### Phase 4: Notifications & Analytics (Low Priority)

#### 4.1 LINE Notification Enhancement
- **File**: `/app/api/bookings/create/route.ts` (notification section)
- **Changes**:
  - Highlight new customer bookings in notifications
  - Include package information in notifications
  - Add referral source to notification details

#### 4.2 Analytics & Reporting
- **New Files**: Consider adding analytics dashboard
- **Changes**:
  - Track referral source effectiveness
  - Monitor new customer acquisition
  - Package usage analytics

## Referral Source Mapping Strategy

### Current `customerContactedVia` Options
- LINE → Direct Contact
- Walk-in → Physical Location  
- Phone → Direct Contact
- Whatsapp → Direct Contact
- Instagram/Facebook → Social Media
- Website/ResOS → Online
- ClassPass → Third Party

### New Referral Source Options
- Instagram (separate option)
- Facebook (separate option)
- Google
- TikTok
- Friends/Word of Mouth
- Mall Advertisement
- Other

## Technical Implementation Notes

### Database Considerations
- Use migration scripts for schema changes
- Ensure backward compatibility during transition
- Add proper indexing for performance

### Form Validation
- Maintain existing validation while adding new fields
- Ensure required fields are properly enforced
- Add client-side validation for new fields
- Add validation for booking information updates in manage bookings

### Performance Considerations
- Minimize additional database queries
- Use efficient joins when fetching booking data
- Consider caching for frequently accessed data

## Risk Assessment

### Low Risk
- Adding new database columns (non-breaking)
- Enhancing form fields (additive changes)
- Updating display components (UI only)

### Medium Risk
- Modifying booking creation flow (requires testing)
- Updating customer phone numbers (data integrity)
- Package integration changes (business logic)

### High Risk
- None identified with current approach

## Testing Strategy

### Unit Tests
- Test new form validation logic
- Test referral source mapping
- Test package integration

### Integration Tests
- Test booking creation with new fields
- Test booking information updates in manage bookings
- Test customer updates
- Test calendar/management interface updates

### Manual Testing
- Complete booking flow with all new features
- Verify data persistence
- Test highlighting and display features

## Deployment Strategy

### Phase 1: Backend Changes
1. Deploy database schema changes
2. Deploy API route updates
3. Deploy type definitions

### Phase 2: Frontend Changes
1. Deploy form enhancements
2. Deploy display updates
3. Deploy notification changes

### Phase 3: Validation & Monitoring
1. Monitor booking creation success rates
2. Validate data integrity
3. User acceptance testing

## Timeline Estimate

- **Phase 1**: 2-3 days (database + API)
- **Phase 2**: 3-4 days (form enhancements)
- **Phase 3**: 2-3 days (display updates)
- **Phase 4**: 1-2 days (notifications + analytics)

**Total**: 8-12 days of development time

## Success Criteria

✅ **Package Integration**: Bookings properly linked to packages with usage tracking  
✅ **Phone Number Updates**: Existing customers can update phone numbers  
✅ **New Customer Highlighting**: Visual indicators in calendar and management views  
✅ **Referral Source Tracking**: All referral sources properly captured and displayed  
✅ **Data Integrity**: All new fields properly validated and stored  
✅ **Performance**: No degradation in booking creation or display performance  

## Next Steps

1. **Review Plan**: Stakeholder approval of implementation approach
2. **Environment Setup**: Ensure development environment is ready
3. **Database Migration**: Create and test schema changes
4. **Implementation**: Execute phases in order
5. **Testing**: Comprehensive testing at each phase
6. **Deployment**: Coordinated deployment with monitoring

---

*This plan provides a comprehensive roadmap for enhancing the booking system while maintaining system stability and user experience.*