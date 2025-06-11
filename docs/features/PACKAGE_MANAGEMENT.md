# Package Management System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Package Creation](#package-creation)
4. [Package Monitoring](#package-monitoring)
5. [Package Usage](#package-usage)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Business Logic](#business-logic)
9. [Integration Points](#integration-points)
10. [User Interface](#user-interface)

## Overview

The Package Management System is a comprehensive module that handles customer packages, including creation, monitoring, usage tracking, and expiration management. The system supports both time-based packages (with hour limits) and unlimited packages (Diamond, Early Bird) with expiration dates.

### System Capabilities
- **Package Creation**: Create packages for customers with flexible configurations
- **Usage Tracking**: Automatic hour deduction when packages are used in bookings
- **Expiration Management**: Monitor and alert for expiring packages
- **Unlimited Packages**: Special handling for Diamond and Early Bird unlimited packages
- **Package Monitoring**: Real-time dashboard for package status and alerts
- **CRM Integration**: Seamless integration with customer management system

## Core Features

### 1. Package Creation (`/create-package`)
Comprehensive package creation with customer lookup and package type selection.

#### Features
- **Customer Search**: Find existing customers or create new ones
- **Package Type Selection**: Choose from predefined package types
- **Flexible Configuration**: Set custom hours, expiration dates, and pricing
- **Activation Control**: Packages can be created as inactive until first use
- **Batch Creation**: Create multiple packages for different customers
- **Validation**: Comprehensive validation for all package parameters

#### Package Types
```typescript
interface PackageType {
  id: number;
  name: string;                    // Package name
  duration_hours: number | null;   // Hours (null for unlimited)
  price: number;                   // Package price
  description: string;             // Package description
  is_active: boolean;              // Whether available for creation
}
```

### 2. Package Monitoring (`/package-monitor`)
Real-time monitoring dashboard for all package statuses.

#### Features
- **Unlimited Packages**: Diamond and Early Bird package tracking
- **Expiring Packages**: Packages expiring within 7 days
- **Usage Alerts**: Packages with low remaining hours
- **Status Indicators**: Visual indicators for package health
- **Quick Actions**: Direct links to package usage and customer details
- **Export Capabilities**: Export package data for reporting

#### Dashboard Sections
- **Diamond Packages**: Premium unlimited packages
- **Early Bird Packages**: Promotional unlimited packages
- **Expiring Soon**: Packages expiring within 7 days
- **Low Hours**: Packages with less than 2 hours remaining

### 3. Package Usage (`/update-package`)
Interface for recording package usage and hour deductions.

#### Features
- **Customer Lookup**: Search for customers with active packages
- **Package Selection**: Choose from available customer packages
- **Hour Deduction**: Record hours used with decimal precision
- **Usage Notes**: Add notes about package usage
- **Automatic Activation**: Packages are automatically activated on first use
- **Remaining Hours**: Real-time calculation of remaining hours

## Package Creation

### Multi-Step Process

#### Step 1: Customer Selection
```typescript
interface CustomerSelectionData {
  isNewCustomer: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}
```

#### Step 2: Package Configuration
```typescript
interface PackageConfigData {
  packageTypeId: number;
  customPackageName?: string;
  totalHours?: number;
  purchaseDate: Date;
  expirationDate: Date;
  price?: number;
  notes?: string;
  isUnlimited: boolean;
}
```

### Package Types

#### Standard Packages
- **10 Hour Package**: 10 hours, 30-day expiration
- **20 Hour Package**: 20 hours, 60-day expiration
- **Coaching Package**: Specialized coaching hours

#### Unlimited Packages
- **Diamond Package**: Unlimited hours, 1-year expiration
- **Early Bird Package**: Promotional unlimited package

#### Custom Packages
- **Flexible Configuration**: Custom hours and expiration
- **Special Pricing**: Negotiated rates for corporate clients
- **Event Packages**: Special event configurations

### Validation Rules
```typescript
const validatePackage = (data: PackageData) => {
  const errors: ValidationErrors = {};
  
  // Required fields
  if (!data.customerId) errors.customer = 'Customer is required';
  if (!data.packageTypeId) errors.packageType = 'Package type is required';
  if (!data.expirationDate) errors.expiration = 'Expiration date is required';
  
  // Business rules
  if (data.expirationDate <= new Date()) {
    errors.expiration = 'Expiration date must be in the future';
  }
  
  if (!data.isUnlimited && (!data.totalHours || data.totalHours <= 0)) {
    errors.hours = 'Hours must be greater than 0 for limited packages';
  }
  
  return errors;
};
```

## Package Monitoring

### Dashboard Components

#### Package Statistics
```typescript
interface PackageStats {
  unlimited: {
    active: number;
    packages: UnlimitedPackage[];
  };
  expiring: {
    count: number;
    packages: ExpiringPackage[];
  };
  diamond: {
    active: number;
    packages: DiamondPackage[];
  };
  earlyBird: {
    active: number;
    packages: EarlyBirdPackage[];
  };
}
```

#### Alert System
```typescript
interface PackageAlert {
  type: 'expiring' | 'low_hours' | 'expired';
  severity: 'low' | 'medium' | 'high';
  packageId: string;
  customerName: string;
  message: string;
  actionRequired: boolean;
}
```

### Monitoring Rules
1. **Expiring Soon**: Packages expiring within 7 days
2. **Low Hours**: Packages with less than 2 hours remaining
3. **Expired**: Packages past expiration date
4. **Inactive**: Packages purchased but never activated
5. **High Usage**: Packages with unusually high usage patterns

## Package Usage

### Usage Recording Process

#### Step 1: Customer Package Lookup
```typescript
interface CustomerPackageLookup {
  customerId: string;
  customerName: string;
  availablePackages: Package[];
}
```

#### Step 2: Usage Recording
```typescript
interface UsageRecord {
  packageId: string;
  hoursUsed: number;
  usageDate: Date;
  notes?: string;
  recordedBy: string;
}
```

### Usage Calculation
```typescript
const calculateRemainingHours = (package: Package, hoursUsed: number) => {
  if (package.is_unlimited) {
    return null; // Unlimited packages don't have hour limits
  }
  
  const newUsedHours = package.used_hours + hoursUsed;
  const remainingHours = package.total_hours - newUsedHours;
  
  return Math.max(0, remainingHours);
};
```

### Automatic Activation
```typescript
const activatePackage = async (packageId: string) => {
  const activationDate = new Date().toISOString().split('T')[0];
  
  await refacSupabaseAdmin
    .from('packages')
    .update({
      is_activated: true,
      activation_date: activationDate
    })
    .eq('id', packageId);
};
```

## Database Schema

### Package Types Table
```sql
CREATE TABLE backoffice.package_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  duration_hours INTEGER,
  price DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Packages Table
```sql
CREATE TABLE backoffice.packages (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES backoffice.customers(id),
  package_type_id INTEGER NOT NULL REFERENCES backoffice.package_types(id),
  purchase_date DATE NOT NULL,
  activation_date DATE,
  expiration_date DATE NOT NULL,
  total_hours INTEGER,
  used_hours DECIMAL(5,2) DEFAULT 0,
  remaining_hours DECIMAL(5,2),
  is_unlimited BOOLEAN DEFAULT false,
  is_activated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Package Usage History
```sql
CREATE TABLE backoffice.package_usage_history (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES backoffice.packages(id),
  booking_id TEXT REFERENCES public.bookings(id),
  hours_used DECIMAL(5,2) NOT NULL,
  usage_date DATE NOT NULL,
  recorded_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Package Creation
```
POST /api/packages/create
Content-Type: application/json

{
  "customer_id": 123,
  "package_type_id": 1,
  "purchase_date": "2025-06-15",
  "expiration_date": "2025-07-15",
  "total_hours": 10,
  "price": 2000,
  "notes": "Special promotion package"
}
```

### Package Monitoring
```
GET /api/packages/monitor

Response:
{
  "unlimited": {
    "active": 5,
    "packages": [...]
  },
  "expiring": {
    "count": 3,
    "packages": [...]
  },
  "diamond": {
    "active": 2,
    "packages": [...]
  }
}
```

### Package Usage
```
POST /api/packages/use
Content-Type: application/json

{
  "package_id": 456,
  "hours_used": 2.5,
  "usage_date": "2025-06-15",
  "booking_id": "booking_123",
  "notes": "Bay 1 session"
}
```

### Available Packages
```
GET /api/packages/available?customer_id=123

Response:
{
  "packages": [
    {
      "id": "456",
      "label": "John Doe - 10 Hour Package (7.5h remaining)",
      "customer_name": "John Doe",
      "package_type_name": "10 Hour Package",
      "remaining_hours": 7.5,
      "expiration_date": "2025-07-15",
      "is_activated": true
    }
  ]
}
```

## Business Logic

### Package Validation
```typescript
const validatePackageUsage = (package: Package, hoursToUse: number) => {
  // Check if package is expired
  if (new Date(package.expiration_date) < new Date()) {
    throw new Error('Package has expired');
  }
  
  // Check if package has sufficient hours (for non-unlimited packages)
  if (!package.is_unlimited && package.remaining_hours < hoursToUse) {
    throw new Error('Insufficient package hours');
  }
  
  return true;
};
```

### Expiration Calculation
```typescript
const calculateDaysToExpiration = (expirationDate: string) => {
  const today = new Date();
  const expiry = new Date(expirationDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
```

### Package Activation
```typescript
const shouldActivatePackage = (package: Package) => {
  return !package.is_activated && package.used_hours === 0;
};
```

## Integration Points

### Booking System Integration
When a booking is created with a package:
1. Validate package availability
2. Check remaining hours
3. Record package usage
4. Update package status
5. Activate package if first use

### Customer Management Integration
- Customer lookup and creation
- Package association with customer records
- CRM data synchronization

### Notification System
- Expiration alerts
- Low hour warnings
- Activation notifications

## User Interface

### Package Creation Form
```tsx
const PackageCreationForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  
  return (
    <div className="package-creation">
      {step === 1 && <CustomerSelection />}
      {step === 2 && <PackageConfiguration />}
      {step === 3 && <ConfirmationReview />}
    </div>
  );
};
```

### Package Monitor Dashboard
```tsx
const PackageMonitorDashboard = () => {
  const { data: packageData } = usePackageMonitor();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UnlimitedPackagesCard data={packageData.unlimited} />
      <ExpiringPackagesCard data={packageData.expiring} />
      <DiamondPackagesCard data={packageData.diamond} />
    </div>
  );
};
```

### Package Usage Interface
```tsx
const PackageUsageForm = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [hoursUsed, setHoursUsed] = useState(0);
  
  return (
    <form onSubmit={handleSubmit}>
      <PackageSelector onSelect={setSelectedPackage} />
      <HoursInput value={hoursUsed} onChange={setHoursUsed} />
      <UsageNotes />
      <SubmitButton />
    </form>
  );
};
```

---

For booking integration details, see [Booking System](./BOOKING_SYSTEM.md).  
For customer management, see [Customer Management](./CUSTOMER_MANAGEMENT.md).

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 