# Dual Booking Form Interfaces

## Table of Contents
1. [Overview](#overview)
2. [Feature Comparison](#feature-comparison)
3. [User Experience Guidelines](#user-experience-guidelines)
4. [Technical Architecture](#technical-architecture)
5. [Component Documentation](#component-documentation)
6. [Enhanced Selector Components](#enhanced-selector-components)
7. [API Integration](#api-integration)
8. [Migration Guide](#migration-guide)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

## Overview

The Lengolf Forms system provides two distinct booking creation interfaces to cater to different user preferences and operational needs:

### **Original Multi-Step Form** (`/create-booking`)
A guided, 3-step process familiar to existing staff members with clear navigation and progressive disclosure of information.

### **New Single-Page Form** (`/create-booking-new`)
A modern, streamlined interface that displays all sections on one page with progressive revelation and enhanced visual design.

Both interfaces share the same:
- Backend API endpoints
- Validation logic
- Submission handlers
- Database integration
- Calendar synchronization
- LINE notifications

This dual approach ensures backward compatibility while offering improved user experience for staff who prefer a more modern interface.

## Feature Comparison

| Feature | Original Multi-Step | New Single-Page |
|---------|-------------------|-----------------|
| **Navigation** | 3 discrete steps with navigation controls | Single scrollable page with progressive sections |
| **Visual Design** | Classic form layout | Enhanced cards with gradients and icons |
| **Header Display** | "Book bays and manage appointments" | Clean interface without header |
| **Package Auto-Selection** | Manual selection only | Auto-detects booking type and coach from packages |
| **Form Validation** | Step-by-step validation | Real-time validation across all visible sections |
| **Coach Selection** | Separate process | Integrated with booking type display |
| **Promotions** | Not available | Promotion and premium rental options |
| **Auto-Scroll** | Manual navigation between steps | Automatic scrolling to next relevant section |
| **Bay Blocking** | Not available | Quick bay blocking for maintenance/events |
| **Mobile Experience** | Standard responsive design | Enhanced touch-friendly interface |
| **Staff Learning Curve** | Familiar interface | Modern interface may require brief orientation |

## User Experience Guidelines

### When to Use Original Multi-Step Form
- **New staff training**: Easier to understand the booking process step-by-step
- **Complex bookings**: When staff need to focus on one aspect at a time
- **Slower-paced environments**: When taking time with each step is preferred
- **Existing staff comfort**: When users are already familiar with the interface

### When to Use New Single-Page Form
- **High-volume booking periods**: Faster completion for experienced staff
- **Package-heavy operations**: Auto-detection saves significant time
- **Mobile/tablet usage**: Better touch interface and visual feedback
- **Modern workflow preferences**: Staff who prefer seeing all information at once
- **Premium services**: Enhanced promotion and extras selection

### Access Methods
Both forms are accessible through:
1. **Main Dashboard**: Card-based navigation with clear descriptions
2. **Navigation Menu**: Dropdown under "Bookings" section
3. **Direct URLs**: `/create-booking` and `/create-booking-new`

## Technical Architecture

### Shared Foundation
Both interfaces leverage identical backend infrastructure:

```typescript
// Shared components and utilities
├── context/
│   ├── booking-context.tsx     // Shared booking state
│   └── form-provider.tsx       // Validation and form state
├── types/
│   └── index.ts               // Common TypeScript interfaces
├── submit/
│   └── submit-handler.ts      // Unified submission logic
└── validation/
    └── validators.ts          // Shared validation rules
```

### Interface-Specific Components

#### Original Multi-Step Form Structure
```typescript
// app/create-booking/page.tsx
└── src/components/booking-form/
    ├── index.tsx              // Main form wrapper
    ├── step-header.tsx        // Step progress indicator
    ├── navigation/
    │   ├── step-context.tsx   // Step navigation state
    │   └── step-navigation.tsx // Previous/Next buttons
    ├── steps/
    │   ├── step-content.tsx   // Content switcher
    │   ├── step-1.tsx         // Employee & booking type
    │   ├── step-2.tsx         // Customer selection
    │   └── step-3.tsx         // Time & bay selection
    └── selectors/             // Standard form controls
```

#### New Single-Page Form Structure
```typescript
// app/create-booking-new/page.tsx
└── src/components/booking-form-new/
    ├── index.tsx              // Main single-page form
    ├── customer-details.tsx   // Customer info management
    ├── package-selector.tsx   // Enhanced package selection
    ├── steps/
    │   └── time-slot-step.tsx // Time selection component
    └── selectors/             // Enhanced visual selectors
        ├── enhanced-booking-type-selector.tsx
        ├── enhanced-coach-selector.tsx
        ├── enhanced-employee-selector.tsx
        ├── enhanced-customer-type-selector.tsx
        ├── enhanced-contact-method-selector.tsx
        └── enhanced-promotion-selector.tsx
```

### Data Flow Architecture
```
User Input → Enhanced Selectors → Form Context → Validation → API Submission
    ↓              ↓                 ↓            ↓           ↓
Progressive   Auto-Detection   Real-time    Package      Database
Disclosure    Logic           Validation   Integration    Update
    ↓              ↓                 ↓            ↓           ↓
Auto-Scroll   Coach/Type      Error        Usage        Calendar
Behavior      Selection       Display      Tracking      Sync
```

## Component Documentation

### Shared Components

#### BookingProvider Context
Provides form state management and validation across both interfaces:

```typescript
interface BookingContextType {
  formData: FormData;
  errors: FormErrors;
  setFormValue: (field: string, value: any) => void;
  handleCustomerSelect: (customer: NewCustomer) => void;
  handlePackageSelection: (id: string | null, name: string) => void;
  isSubmitting: boolean;
  customers: NewCustomer[];
  mutateCustomers: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCustomerCache: NewCustomer | null;
  onPhoneError: (error: string) => void;
}
```

#### Submit Handler
Unified submission logic handling booking creation, calendar events, and notifications:

```typescript
export const handleFormSubmit = async (formData: FormData) => {
  // 1. Validate form data
  // 2. Create booking in database
  // 3. Trigger calendar synchronization
  // 4. Send LINE notifications
  // 5. Update package usage if applicable
  return { success: boolean, error?: string };
};
```

### Original Multi-Step Form Components

#### StepNavigation
Handles step transitions with validation:

```typescript
interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  canProgress: boolean;
  isSubmitting: boolean;
}
```

#### StepHeader
Displays current step and progress indicator:

```typescript
interface StepHeaderProps {
  currentStep: number;
}
// Renders: "Step 1 of 3: Employee & Booking Details"
```

### New Single-Page Form Components

#### Progressive Disclosure Logic
Controls when sections become visible based on form completion:

```typescript
const showCustomerInfo = formData.employeeName;
const showCustomerDetails = showCustomerInfo && formData.isNewCustomer !== null;
const showBookingType = showCustomerDetails && (
  (formData.isNewCustomer && formData.customerName && formData.customerPhone) ||
  (!formData.isNewCustomer && formData.customerId)
);
const showTimeSlot = showContactMethod && formData.customerContactedVia;
```

#### Auto-Scroll Behavior
Smoothly guides users to the next relevant section:

```typescript
const scrollToNextSection = (selector: string) => {
  setTimeout(() => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300);
};
```

#### Package Auto-Detection
Intelligently detects booking type and coach from package selections:

```typescript
const analyzePackageForAutoDetection = (pkg: Package): {bookingType: string, coach: string | null} => {
  const packageName = pkg.name?.toLowerCase() || '';
  const packageType = pkg.type?.toLowerCase() || '';
  
  // Auto-detect booking type
  let detectedBookingType = 'Package';
  if (packageType === 'coaching' || packageName.includes('coaching')) {
    detectedBookingType = 'Coaching';
  }
  
  // Auto-detect coach from package name
  let detectedCoach = null;
  if (packageName.includes('boss') && !packageName.includes('ratchavin')) {
    detectedCoach = 'Boss';
  } else if (packageName.includes('ratchavin') || packageName.includes('boss - ratchavin')) {
    detectedCoach = 'Boss - Ratchavin';
  } else if (packageName.includes('noon')) {
    detectedCoach = 'Noon';
  }
  
  return { bookingType: detectedBookingType, coach: detectedCoach };
};
```

## Enhanced Selector Components

The new single-page form introduces visually enhanced selector components with improved UX:

### EnhancedBookingTypeSelector
**Features:**
- **Visual Card Design**: Large, colorful cards for primary booking types
- **Auto-Selection Display**: Special styling when auto-detected from packages
- **Badge-Style Secondary Options**: Compact display for less common types
- **Deselection Support**: Click selected option to deselect
- **Gradient Backgrounds**: Different colors for each booking type
- **Interactive States**: Hover, selected, and disabled visual feedback

**Auto-Selection Behavior:**
```typescript
// Shows special auto-selected card when detected from package
if (autoSelected && value && hasSelectedPackage) {
  return (
    <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Sparkles className="h-8 w-8 text-white" />
          <div>
            <span className="font-semibold text-xl">{selectedType.label}</span>
            <Badge>Auto-selected</Badge>
            <p className="text-sm">Auto-selected from package: {packageName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### EnhancedCoachSelector
**Features:**
- **Coach Initials Display**: Visual representation with colored backgrounds
- **Auto-Selection Highlighting**: Special styling for package-detected coaches
- **Booking Type Integration**: Updates booking type to include coach name

**Coach Display Logic:**
```typescript
const coaches = [
  { value: 'Boss', label: 'Boss', initials: 'B', color: 'bg-blue-500' },
  { value: 'Boss - Ratchavin', label: 'Boss - Ratchavin', initials: 'R', color: 'bg-purple-500' },
  { value: 'Noon', label: 'Noon', initials: 'N', color: 'bg-green-500' }
];
```

### EnhancedEmployeeSelector
**Features:**
- **Staff Member Cards**: Visual cards with hover effects
- **Alphabetical Organization**: Clear sorting of staff options
- **Manual Entry Option**: Fallback for unlisted staff members

### EnhancedCustomerTypeSelector
**Features:**
- **Large Visual Cards**: Clear distinction between new and existing customers
- **Icon-Based Design**: User and Plus icons for visual clarity
- **Customer Count Display**: Shows existing customer database size

### EnhancedContactMethodSelector
**Features:**
- **Method-Specific Icons**: Phone, walk-in, LINE, and email icons
- **Color-Coded Options**: Different colors for each contact method
- **Quick Selection**: Single-click selection with visual feedback

### EnhancedPromotionSelector
**Features:**
- **Promotion Categories**: New customer welcome, premium rentals, special events
- **Auto-Populate Notes**: Selected promotions automatically added to booking notes
- **Conditional Display**: Different options for new vs. existing customers

## Bay Blocking Feature (New Single-Page Form Only)

### Overview
The new single-page form includes an integrated bay blocking feature that allows staff to quickly block single or multiple bays for maintenance, events, or other operational needs. This feature is accessible via a subtle "Block Bays" button in the form header.

### Access & UI
- **Entry Point**: Ghost button with Shield icon in top-left of form header
- **Modal Interface**: Clean dialog with multi-bay selection and time range inputs
- **Staff Integration**: Uses same staff list as main form (Eak, Dolly, Net, May, Winnie, Other)

### Core Features
**Multi-Bay Selection:**
```tsx
// Visual checkbox grid for bay selection
<Checkbox checked={selectedBays.includes(bay.id)} />
<MapPin className="h-5 w-5" />
<span>{bay.name}</span>
```

**Quick Reason Templates:**
- Maintenance - Equipment repair
- Private Event  
- Deep Cleaning
- Staff Training
- System Update

**Time Range Management:**
- Date picker with default to today
- Start/end time inputs with duration auto-calculation
- Validation for logical time ranges

### Database Integration
**Booking Records Created:**
```typescript
{
  booking_type: 'Bay Block',
  name: 'BLOCKED - [Reason]',
  customer_id: null,
  phone_number: 'BLOCKED',
  customer_notes: 'Bay blocked by [Employee]: [Reason]'
}
```

**Key Characteristics:**
- No LINE notifications sent
- NULL customer data as expected
- Standard booking duration and bay assignment
- Immediate visibility in bay availability checks

### Visual Feedback
**Blocked Bay Display:**
- Red destructive styling with striped background
- Shield icon with "Blocked" label
- Tooltip showing blocking reason and time
- Automatic disabling in bay selector

**Success Confirmation:**
- Green checkmark with blocked bay count
- Time range confirmation
- Reason display for verification

### API Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `POST /api/bookings/block-bays` | Create blocking records | Modal submission |
| `GET /api/bookings/blocked-bays?date={date}` | Fetch blocked bays | Bay selector display |

### Usage Workflow
1. **Access**: Click "Block Bays" button in form header
2. **Select**: Choose one or more bays via checkboxes  
3. **Configure**: Set date, time range, and reason
4. **Staff**: Select staff member (if not from main form)
5. **Submit**: Click "Block X Bay(s)" to create records
6. **Feedback**: View success confirmation and blocked bay status

### Integration Benefits
- **No Customer Required**: Works independently of booking workflow
- **Real-time Updates**: Blocked bays immediately show in availability
- **Audit Trail**: Staff member and reason recorded for accountability
- **Flexible Duration**: Support for any time range from hours to full days
- **Multiple Bays**: Block entire sections for large maintenance/events

## API Integration

### Endpoint Usage
Both forms use identical API endpoints, with additional bay blocking endpoints for the new form:

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `POST /api/bookings/create` | Create new booking | Final submission |
| `GET /api/customers` | Search/list customers | Customer selection |
| `GET /api/packages/by-customer/{id}` | Fetch customer packages | Package selection |
| `GET /api/bookings/availability` | Check bay availability | Time slot validation |
| `POST /api/bookings/{id}/update` | Update existing booking | Edit functionality |
| `POST /api/bookings/{id}/cancel` | Cancel booking | Cancellation handling |
| `POST /api/bookings/block-bays` | Block multiple bays | Bay blocking modal (new form only) |
| `GET /api/bookings/blocked-bays` | Fetch blocked bays by date | Bay selector display (new form only) |

### Data Validation
Shared validation rules ensure consistency:

```typescript
// Validation functions used by both forms
export const validateStep1 = (data: FormData): FormErrors => {
  const errors: FormErrors = {};
  if (!data.employeeName) errors.employeeName = 'Employee name is required';
  if (!data.customerContactedVia) errors.customerContactedVia = 'Contact method is required';
  if (!data.bookingType) errors.bookingType = 'Booking type is required';
  return errors;
};

export const validateStep2 = (data: FormData, phoneError?: string): FormErrors => {
  const errors: FormErrors = {};
  if (!data.isNewCustomer && !data.customerId) {
    errors.customerId = 'Please select a customer';
  }
  if (data.isNewCustomer && !data.customerName?.trim()) {
    errors.customerName = 'Customer name is required';
  }
  if (data.isNewCustomer && !data.customerPhone?.trim()) {
    errors.customerPhone = 'Phone number is required';
  }
  if (phoneError) {
    errors.customerPhone = phoneError;
  }
  return errors;
};
```

### Package Integration
Enhanced package handling in the new form:

```typescript
// Package selection with auto-detection
const handlePackageSelection = (pkg: Package | null) => {
  if (pkg) {
    setSelectedPackage(pkg);
    
    // Analyze package for auto-detection
    const autoDetected = analyzePackageForAutoDetection(pkg);
    
    setFormData(prev => {
      const newBookingType = prev.bookingType || autoDetected.bookingType;
      const newCoach = prev.coach || autoDetected.coach;
      
      // For coaching bookings, include coach name in booking type
      let finalBookingType = newBookingType;
      if (newBookingType === 'Coaching' && newCoach) {
        finalBookingType = `Coaching (${newCoach})`;
      }
      
      return {
        ...prev,
        packageId: pkg.id,
        packageName: pkg.name,
        bookingType: finalBookingType,
        coach: newCoach
      };
    });
  }
};
```

## Migration Guide

### Converting from Multi-Step to Single-Page

The new single-page form was created as an enhanced version of the original multi-step form. Here's how the migration was approached:

#### 1. **Preserve Core Logic**
- Maintained identical form data structure
- Kept same validation rules
- Preserved submission handling
- Maintained API endpoints

#### 2. **Enhance Visual Components**
```typescript
// Original selector (simple)
<Select>
  <SelectItem value="Package">Package</SelectItem>
  <SelectItem value="Coaching">Coaching</SelectItem>
</Select>

// Enhanced selector (visual cards)
<Card className="bg-gradient-to-br from-blue-500 to-blue-600">
  <CardContent>
    <Package className="h-6 w-6" />
    <span>Package</span>
  </CardContent>
</Card>
```

#### 3. **Add Progressive Disclosure**
```typescript
// Original: Step-based navigation
const [currentStep, setCurrentStep] = useState(1);

// New: Section-based visibility
const showCustomerInfo = formData.employeeName;
const showBookingType = showCustomerDetails && formData.customerId;
```

#### 4. **Implement Auto-Detection**
```typescript
// New feature: Auto-detect from packages
const analyzePackageForAutoDetection = (pkg: Package) => {
  // Logic to determine booking type and coach from package
};
```

#### 5. **Add Auto-Scroll Behavior**
```typescript
// Smooth navigation between sections
const scrollToNextSection = (selector: string) => {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
```

### Development Process

#### Phase 1: Foundation Setup
1. Created `/create-booking-new` route
2. Copied core form logic and types
3. Set up shared context providers

#### Phase 2: Enhanced Components
1. Developed enhanced selector components
2. Implemented visual card designs
3. Added auto-detection logic

#### Phase 3: Progressive Disclosure
1. Implemented section visibility logic
2. Added auto-scroll behavior
3. Enhanced form validation

#### Phase 4: Polish & Integration
1. Added promotion selector
2. Refined visual feedback
3. Integrated with navigation menu

## Configuration

### Navigation Menu Configuration
Both forms are configured in `src/config/menu-items.ts`:

```typescript
export const menuItems: MenuItem[] = [
  {
    icon: CalendarRange,
    title: "Create Booking",
    path: '/create-booking',
    description: "Create new customer bookings (multi-step)"
  },
  {
    icon: CalendarRange,
    title: "Create Booking (New)",
    path: '/create-booking-new',
    description: "Create new customer bookings (single-page)"
  },
  // ... other menu items
];
```

### Feature Flags
Environment variables can control form availability:

```typescript
// .env.local
ENABLE_DUAL_BOOKING_FORMS=true
NEW_BOOKING_FORM_DEFAULT=false  // false = redirect to original
```

### Form Customization Options

#### Auto-Detection Sensitivity
```typescript
// Adjust package name matching
const COACH_DETECTION_KEYWORDS = {
  'boss': ['boss', 'boss coaching'],
  'ratchavin': ['ratchavin', 'boss - ratchavin'],
  'noon': ['noon', 'noon coaching']
};
```

#### Visual Themes
```typescript
// Customize selector colors and gradients
const BOOKING_TYPE_THEMES = {
  'Package': { gradient: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
  'Coaching': { gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
  'Normal Bay Rate': { gradient: 'from-green-500 to-green-600', bgColor: 'bg-green-50' }
};
```

## Troubleshooting

### Common Issues

#### 1. Package Auto-Detection Not Working
**Symptoms:**
- Package selection doesn't auto-select booking type
- Coach selection not automatically populated

**Solutions:**
```typescript
// Check package name matching logic
const analyzePackageForAutoDetection = (pkg: Package) => {
  console.log('Analyzing package:', pkg.name, pkg.type); // Add debug logging
  // Ensure package name/type contains expected keywords
};

// Verify package data structure
console.log('Package object:', JSON.stringify(pkg, null, 2));
```

#### 2. Auto-Scroll Not Working
**Symptoms:**
- Form doesn't scroll to next section after selection
- Smooth scrolling behavior missing

**Solutions:**
```typescript
// Check for element existence
const scrollToNextSection = (selector: string) => {
  const element = document.querySelector(selector);
  console.log('Scrolling to:', selector, 'Found element:', !!element);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Verify data-scroll-target attributes are present
<Card data-scroll-target="customer-info">
```

#### 3. Form Validation Issues
**Symptoms:**
- Progressive sections not showing despite valid inputs
- Validation errors not clearing

**Solutions:**
```typescript
// Debug validation state
useEffect(() => {
  console.log('Form validation state:', {
    errors: Object.keys(errors),
    showCustomerInfo,
    showBookingType,
    formData
  });
}, [errors, showCustomerInfo, showBookingType, formData]);

// Check progressive disclosure logic
const showBookingType = showCustomerDetails && (
  (formData.isNewCustomer && formData.customerName && formData.customerPhone) ||
  (!formData.isNewCustomer && formData.customerId)
);
```

#### 4. Package Deselection Issues
**Symptoms:**
- Selected package doesn't clear properly
- Auto-selected values persist after package removal

**Solutions:**
```typescript
// Ensure proper state clearing with flushSync
import { flushSync } from 'react-dom';

const handlePackageDeselection = () => {
  flushSync(() => {
    setSelectedPackage(null);
    setAutoSelectedCoach(null);
    setAutoSelectedBookingType(null);
  });
  
  flushSync(() => {
    setFormData(prev => ({
      ...prev,
      packageId: undefined,
      packageName: '',
      bookingType: null,
      coach: null
    }));
  });
};
```

#### 5. Mobile Interface Issues
**Symptoms:**
- Cards not responsive on mobile
- Touch interactions not working properly

**Solutions:**
```typescript
// Ensure responsive grid classes
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// Add proper touch handling
className={cn(
  "cursor-pointer transition-all duration-200",
  "hover:cursor-pointer touch-manipulation" // Add touch-manipulation
)}
```

### Development Authentication Bypass
Both forms work with the development authentication bypass system:

```bash
# Enable bypass in .env.local
SKIP_AUTH=true

# Test both forms
curl http://localhost:3000/create-booking      # Original form
curl http://localhost:3000/create-booking-new  # New form
```

### Performance Monitoring

#### Form Load Performance
```typescript
// Add performance monitoring
useEffect(() => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    console.log(`Form component rendered in ${endTime - startTime} ms`);
  };
}, []);
```

#### Auto-Detection Performance
```typescript
// Monitor package analysis performance
const analyzePackageForAutoDetection = (pkg: Package) => {
  const start = performance.now();
  
  // Analysis logic here...
  
  const end = performance.now();
  console.log(`Package analysis took ${end - start} ms`);
};
```

### Browser Compatibility
Both forms are tested and compatible with:
- **Chrome/Edge**: Full functionality including auto-scroll
- **Safari**: Full functionality with minor visual differences
- **Firefox**: Full functionality with smooth scrolling
- **Mobile browsers**: Touch-optimized interface works on all major mobile browsers

### Bay Blocking Implementation Files

**New Files Created:**
- `src/components/booking-form-new/bay-blocking-modal.tsx` - Bay blocking modal component
- `app/api/bookings/block-bays/route.ts` - API endpoint for creating bay blocks  
- `app/api/bookings/blocked-bays/route.ts` - API endpoint for fetching blocked bays

**Modified Files:**
- `src/types/booking-form.ts` - Added bay blocking TypeScript interfaces
- `src/components/booking-form-new/index.tsx` - Integrated bay blocking button and modal
- `src/components/booking-form/bay-selector.tsx` - Enhanced to display blocked bays with visual indicators

**Key Implementation Details:**
- **Component Integration**: Modal accessed via ghost button in form header
- **Staff Consistency**: Uses same staff list as main form (Eak, Dolly, Net, May, Winnie, Other)
- **Database Records**: Creates standard booking records with `booking_type: 'Bay Block'`
- **Visual Feedback**: Blocked bays show with destructive styling and shield icons
- **API Design**: RESTful endpoints for creating and retrieving bay blocks
- **No Notifications**: Bay blocking bypasses LINE notification system
- **Type Safety**: Full TypeScript coverage with proper interfaces

---

## Related Documentation

- **[Booking System](./BOOKING_SYSTEM.md)** - Core booking system architecture
- **[Booking Management](./BOOKING_MANAGEMENT.md)** - Managing existing bookings
- **[Calendar Integration](./CALENDAR_INTEGRATION.md)** - Google Calendar synchronization
- **[Package Management](../customer-packages/PACKAGE_MANAGEMENT.md)** - Customer package system

**Last Updated**: January 2025  
**Version**: 1.1 - Added Bay Blocking Feature  
**Maintainer**: Lengolf Development Team