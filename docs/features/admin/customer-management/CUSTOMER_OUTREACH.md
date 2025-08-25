# Customer Outreach System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Audience Builder](#audience-builder)
4. [Saved Audiences](#saved-audiences)
5. [OB Sales Integration](#ob-sales-integration)
6. [LINE Blast (Future)](#line-blast-future)
7. [Technical Implementation](#technical-implementation)
8. [API Integration](#api-integration)
9. [User Interface](#user-interface)
10. [Best Practices](#best-practices)

## Overview

The Customer Outreach system is a comprehensive tool for building targeted customer audiences and managing outbound sales call lists. Located at `/admin/customer-outreach`, it provides sophisticated filtering, audience management, and integration with the Lead Feedback system for OB (Outbound) sales operations.

### Primary Purpose
- **Audience Building**: Create targeted customer segments based on booking history, packages, and demographics
- **OB Sales Management**: Generate and manage call lists for outbound sales operations
- **Campaign Management**: Save and reuse audience configurations for consistent outreach campaigns
- **Integration**: Seamless connection with Lead Feedback system for tracking call outcomes

## Key Features

### 1. Advanced Customer Filtering
- **Date Range Filters**: Last booking from/to dates with flexible date selection
- **Quick Period Buttons**: Pre-configured periods (30d, 90d, 180d not visited)
- **LINE Status**: Filter customers with/without LINE user IDs
- **Package History**: Target customers with or without previous packages
- **Sorting Options**: Multiple sorting criteria (last visit, lifetime value, total bookings, name)

### 2. Live Preview System
- **Real-time Results**: Instant customer matching as filters are applied
- **Pagination**: Configurable results per page (10, 25, 50, 75)
- **Detailed Customer Data**: Name, phone, LINE status, lifetime value, package status, booking history
- **Ranking System**: Numbered ranking based on selected sort criteria

### 3. Audience Management
- **Snapshot Saving**: Save filtered audiences with custom names for reuse
- **Audience Loading**: Reload saved audiences to recreate filters
- **OB Sales Selection**: Designate specific audiences for outbound sales workflow
- **Delete Management**: Remove outdated or unused audience snapshots

### 4. OB Sales Integration
- **Lead Feedback Connection**: Selected audiences become available in Lead Feedback system
- **Call List Generation**: Transform audiences into structured call lists
- **Progress Tracking**: Monitor outreach campaign progress through Lead Feedback
- **Outcome Recording**: Track call results and follow-up requirements

## Audience Builder

### Filter Configuration

#### Date-Based Filtering
```typescript
// Last booking date range
lastVisitFrom: string (YYYY-MM-DD)
lastVisitTo: string (YYYY-MM-DD)

// Quick period shortcuts
notVisitedDays: number (30, 90, 180)
```

#### Customer Characteristics
```typescript
// Contact preferences
hasLine: boolean (LINE user ID availability)

// Package ownership history
hasPackage: boolean (previous package purchases)

// Sorting and ranking
sortBy: 'lastVisit' | 'lastContacted' | 'lifetimeValue' | 'totalBookings' | 'fullName'
sortOrder: 'desc' | 'asc'
```

### Preview System

The live preview shows:
- **Customer ranking** based on sort criteria
- **Contact information** (name, phone)
- **LINE availability** (checkmark/X indicator)
- **Financial metrics** (lifetime spending)
- **Package status** (current active packages)
- **Booking history** (total bookings, last visit date)

### Size Estimation

Before saving or proceeding, users can:
1. **Estimate Size**: Get real-time count of matching customers
2. **Preview Sample**: View first 10-75 customers with full pagination
3. **Validate Criteria**: Ensure filters capture intended audience

## Saved Audiences

### Management Features
- **Custom Naming**: Descriptive names for audience identification
- **Metadata Display**: Creation date, customer count, filter summary
- **Selection State**: Visual indication of OB Sales selection status
- **Load/Delete Actions**: Quick audience recreation or removal

### OB Sales Selection
- **Radio Button Selection**: Choose one audience for OB Sales workflow
- **Clear Selection**: Option to deselect all audiences
- **Status Indicators**: Visual feedback for selected audiences
- **Integration Message**: Clear indication of OB Sales connection

### Audience Persistence
```typescript
interface SavedAudience {
  id: number;
  name: string;
  customer_count: number;
  created_at: string;
  filters: AudienceFilters;
  customers: Customer[]; // Full customer list stored
}
```

## OB Sales Integration

### Workflow Connection
1. **Audience Creation**: Build and save targeted customer audience in Customer Outreach (`/admin/customer-outreach`)
2. **OB Selection**: Designate specific audience for outbound sales campaigns using radio button selection
3. **Lead Feedback Access**: Selected audience automatically loads in Lead Feedback system (`/lead-feedback`)
4. **Call Execution**: Staff access OB Sales tab with full customer profiles and call interface
5. **Outcome Tracking**: Comprehensive call documentation with automatic follow-up scheduling

### Lead Feedback System Integration
```typescript
// API endpoint used by Lead Feedback to load selected audience
GET /api/marketing/selected-audience/data

// Returns selected audience with full customer data
{
  customers: Customer[],
  audienceId: number,
  audienceName: string,
  customerCount: number
}
```

### Call Management Features
- **Customer Profiles**: Complete customer data including lifetime value, package history, and booking patterns
- **Mobile-Optimized Interface**: Touch-friendly calling interface with direct phone dialing
- **Progress Tracking**: Visual progress bars and customer indexing (e.g., "Customer 5 of 23")
- **Call Documentation**: Structured forms for reachability, response type, timeline, and follow-up requirements
- **Auto-Advancement**: Automatic progression to next customer after successful call documentation
- **Follow-up Management**: Automatic scheduling and tracking of customers requiring additional contact

### Call Form Structure
```typescript
interface OBNotesFormData {
  reachable: 'yes' | 'no' | '';           // Customer contact success
  response: 'positive' | 'neutral' | 'negative' | ''; // Customer response when reached
  timeline: string;                        // Visit timeline (this_week, next_week, etc.)
  followUp: 'yes' | 'no' | '';            // Requires follow-up contact
  notes: string;                          // Detailed call notes (required)
}
```

### Integration Benefits
- **Seamless Workflow**: No manual data transfer between systems
- **Data Consistency**: Customer ranking and filtering preserved from audience builder
- **Real-time Updates**: Call outcomes immediately available for follow-up management
- **Performance Tracking**: Integration with dashboard metrics for conversion analysis

## LINE Blast (Future)

### Planned Functionality
- **Audience Preservation**: Current audience maintained for LINE campaigns
- **Message Composition**: Rich text and media message creation
- **Delivery Scheduling**: Timed campaign deployment
- **Response Tracking**: Message engagement and response monitoring

### Phase 2 Features
- **Template Management**: Reusable message templates
- **A/B Testing**: Message variation performance comparison
- **Compliance Tracking**: Customer consent and preference management
- **Integration**: Connection with LINE messaging API

## Technical Implementation

### Frontend Architecture
```typescript
// Main component
export default function CustomerOutreachPage() {
  // State management for filters, audiences, and UI
  // Real-time customer fetching
  // Audience save/load functionality
  // OB Sales integration
}
```

### API Endpoints
```typescript
// Audience management
GET    /api/marketing/audiences           // List saved audiences
POST   /api/marketing/audiences          // Save new audience
DELETE /api/marketing/audiences/[id]     // Delete audience

// OB Sales integration
GET    /api/marketing/selected-audience  // Get current selection
POST   /api/marketing/selected-audience  // Update selection

// Customer data
GET    /api/customers                    // Filtered customer search
```

### Data Flow
1. **Filter Application**: Real-time customer query with filters
2. **Preview Generation**: Paginated results with ranking
3. **Audience Saving**: Full customer list storage with metadata
4. **OB Selection**: Audience designation for outbound sales
5. **Integration**: Selected audience availability in Lead Feedback

## User Interface

### Layout Structure
- **Tabbed Interface**: Audience Builder and LINE Blast tabs
- **Responsive Design**: Mobile and desktop optimized layouts
- **Grid Layout**: Filters, preview, and saved audiences organized
- **Action Bar**: Consistent header with navigation and status

### Interactive Elements
- **Date Pickers**: Intuitive date range selection
- **Quick Buttons**: One-click period selections
- **Live Preview**: Real-time filtering results
- **Pagination**: Smooth navigation through large result sets

### Visual Indicators
- **Customer Status**: LINE availability, package ownership
- **Selection State**: OB Sales audience selection
- **Loading States**: Progress indicators during operations
- **Notifications**: Success/error feedback for user actions

## Best Practices

### Audience Building
1. **Start Broad**: Begin with date ranges, then narrow with specific criteria
2. **Preview First**: Always review sample results before saving
3. **Descriptive Names**: Use clear, date-specific audience names
4. **Regular Cleanup**: Remove outdated audiences to maintain organization

### OB Sales Management
1. **Single Selection**: Only select one audience at a time for focused campaigns
2. **Customer Context**: Review lifetime value and package history before calls
3. **Follow-up Tracking**: Use Lead Feedback system to monitor outcomes
4. **Regular Updates**: Refresh audiences periodically for current data

### Data Quality
1. **Filter Validation**: Ensure date ranges capture intended periods
2. **Customer Verification**: Spot-check preview results for accuracy
3. **Contact Preferences**: Respect LINE vs. phone call preferences
4. **Compliance**: Consider marketing consent in audience selection

### Performance Optimization
1. **Pagination**: Use appropriate page sizes for preview performance
2. **Filter Efficiency**: Apply most selective filters first
3. **Regular Cleanup**: Remove unused saved audiences
4. **Caching**: Leverage browser caching for repeat audience access

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Lengolf Development Team  
**Related Systems**: Lead Feedback, Customer Management, LINE Integration