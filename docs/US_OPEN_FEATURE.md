# US Open Feature Documentation

## Overview

The US Open feature has been successfully added to the LENGOLF backoffice system. This feature allows staff to record customer US Open scores along with screenshot uploads to the Supabase storage system.

## Features Implemented

### 1. New Menu Section
- Added "Special Events" section to the main menu
- Positioned at the bottom of the menu (after Daily Operations)
- Includes US Open form accessible via `/special-events/us-open`
- Trophy icon for visual representation

### 2. US Open Score Submission Form
- **Employee Selection**: Reuses the existing employee selector component from booking forms
- **Date Selection**: Calendar picker for selecting the tournament date
- **Customer Selection**: Reuses the customer search component with real-time filtering
- **Score Input**: 
  - Stableford Score (number input)
  - Stroke Score (number input)
- **File Uploads**: 
  - Screenshot Stableford (image upload)
  - Screenshot Stroke (image upload)
  - Files are uploaded to Supabase storage bucket "scores"

### 3. Mobile-Optimized Layout
- Responsive design that works on both mobile and desktop
- Mobile-first approach with stacked layout for smaller screens
- Desktop view uses grid layout for scores and file uploads
- Enhanced file upload UI with visual feedback
- Better spacing and typography for mobile devices

### 4. Backend Implementation
- **API Route**: `/api/special-events/us-open` for form submission
- **Upload Route**: `/api/special-events/us-open/upload` for file uploads
- **Database**: Uses the refac Supabase instance
- **Storage**: Files stored in "scores" bucket with organized naming

## File Structure

```
src/
├── components/
│   └── us-open-form/
│       └── index.tsx              # Main US Open form component
├── types/
│   └── us-open.ts                 # TypeScript interfaces
└── config/
    └── menu-items.ts              # Updated with US Open menu item

app/
├── special-events/
│   └── us-open/
│       └── page.tsx               # US Open page component
└── api/
    └── special-events/
        └── us-open/
            ├── route.ts           # Main submission API
            └── upload/
                └── route.ts       # File upload API

docs/
└── US_OPEN_FEATURE.md            # This documentation

DATABASE_SETUP.md                 # Database requirements
```

## Database Requirements

The feature requires:

1. **Table**: `us_open_scores` 
   - Fields: employee, date, customer_id, stableford_score, stroke_score, screenshot URLs
   - Indexes for performance
   - RLS policies for security

2. **Storage Bucket**: `scores`
   - Public bucket for storing screenshot images
   - Proper access policies

## Key Components Reused

- `EmployeeSelector` from booking forms
- `CustomerSearch` from package forms
- Standard UI components (Card, Button, Input, etc.)
- Existing customer data hooks

## Form Validation

- All fields are required
- Scores must be positive numbers
- Both screenshot files must be uploaded
- Customer must be selected from the database
- Employee must be selected
- Date must be provided

## Error Handling

- Comprehensive client-side validation
- Server-side error handling for uploads and submissions
- User-friendly error messages via toast notifications
- Loading states during submission

## Success Flow

1. User fills out all form fields
2. Screenshots are uploaded to Supabase storage
3. Form data is submitted to database
4. Success notification is shown
5. Form is reset and user is redirected to main page

## Technical Notes

- Uses `react-hook-form` for form management
- Implements proper TypeScript typing
- Mobile-responsive design with Tailwind CSS
- File uploads handled via FormData
- Integrates with existing authentication system
- Uses the refac Supabase instance (second database)

## Future Enhancements

Potential improvements that could be added:
- View/edit submitted scores
- Export scores to spreadsheet
- Filtering and searching submitted scores
- Photo preview before upload
- Bulk upload functionality
- Different score types for other tournaments 