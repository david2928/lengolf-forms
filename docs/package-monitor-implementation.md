# Package Monitor Feature Implementation Guide

## Overview
The package monitor feature provides employees with a dedicated interface to track active packages, with special focus on Diamond packages and soon-to-expire packages. This guide outlines the implementation details across all components.

## Understanding the Current Structure

The application currently handles packages through:
1. Package creation during booking process
2. Available packages lookup for booking
3. Package type management in package_types table

## Database Schema Integration

### Relevant Tables
1. packages
   - id: UUID
   - created_at: timestamp
   - customer_name: text
   - package_type_id: int
   - purchase_date: date
   - first_use_date: date
   - employee_name: text
   - expiration_date: date

2. package_types
   - id: int
   - name: varchar
   - display_order: int12
   - validity_period: interval
   - hours: numeric

## Required Database Functions

### 1. Package Monitor Data Function
```sql
CREATE OR REPLACE FUNCTION get_package_monitor_data()
RETURNS TABLE (
  diamond_active bigint,
  diamond_packages json,
  expiring_count bigint,
  expiring_packages json
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH diamond_data AS (
    SELECT 
      count(*) as diamond_active,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name
        )
      ) as diamond_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE pt.id IN (7, 11)  -- Diamond package IDs
    AND p.expiration_date > CURRENT_DATE
  ),
  expiring_data AS (
    SELECT 
      count(*) as expiring_count,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name,
          'remaining_hours', COALESCE(
            (SELECT pt.hours - COALESCE(SUM(pu.used_hours), 0)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            pt.hours
          ),
          'used_hours', COALESCE(
            (SELECT SUM(pu.used_hours)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            0
          )
        )
      ) as expiring_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  )
  SELECT 
    d.diamond_active,
    d.diamond_packages,
    e.expiring_count,
    e.expiring_packages
  FROM diamond_data d, expiring_data e;
END;
$$;
```

### 2. Customer Packages Function
```sql
CREATE OR REPLACE FUNCTION get_customer_packages(customer_id text, active boolean)
RETURNS TABLE (
  id uuid,
  customer_name text,
  package_type_name text,
  purchase_date date,
  first_use_date date,
  expiration_date date,
  employee_name text,
  remaining_hours numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.customer_name,
    pt.name as package_type_name,
    p.purchase_date::date,
    p.first_use_date::date,
    p.expiration_date::date,
    p.employee_name,
    CASE 
      WHEN p.expiration_date < CURRENT_DATE THEN 0
      ELSE pt.hours
    END as remaining_hours
  FROM packages p
  JOIN package_types pt ON p.package_type_id = pt.id
  WHERE p.customer_name = customer_id
  AND CASE 
    WHEN active THEN p.expiration_date > CURRENT_DATE
    ELSE p.expiration_date <= CURRENT_DATE
  END
  ORDER BY p.purchase_date DESC;
END;
$$;
```

## Required Source Files

### 1. API Routes

#### Monitor Data (`app/api/packages/monitor/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .rpc('get_package_monitor_data');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching package monitor data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package data' },
      { status: 500 }
    );
  }
}
```

#### Customer Packages (`app/api/packages/customer/[id]/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active') === 'true';

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .rpc('get_customer_packages', {
        customer_id: params.id,
        active
      });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customer packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer packages' },
      { status: 500 }
    );
  }
}
```

### 2. React Components

#### Navigation Button (`components/package-monitor/nav-button.tsx`)
```typescript
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface NavButtonProps {
  diamondCount: number;
  expiringCount: number;
}

export function PackageMonitorNavButton({
  diamondCount,
  expiringCount
}: NavButtonProps) {
  return (
    <Button variant="ghost" asChild>
      <Link href="/package-monitor">
        <div className="flex items-center space-x-2">
          <span>💎 {diamondCount}</span>
          <span>⏰ {expiringCount}</span>
        </div>
      </Link>
    </Button>
  );
}
```

#### Package Grid (`components/package-monitor/package-grid.tsx`)
```typescript
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package } from '@/types';

interface PackageGridProps {
  packages: Package[];
  title: string;
  emptyMessage: string;
}

export function PackageGrid({
  packages,
  title,
  emptyMessage
}: PackageGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} />
            ))}
          </div>
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </CardContent>
    </Card>
  );
}
```

#### Customer Package Selector (`components/package-monitor/customer-selector.tsx`)
```typescript
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ComboBox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { CustomerPackages } from './customer-packages';
import type { Customer } from '@/types';

interface CustomerSelectorProps {
  onCustomerSelect: (customerId: string) => void;
}

export function CustomerPackageSelector({
  onCustomerSelect
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Package History</CardTitle>
        <div className="flex items-center space-x-4">
          <ComboBox
            options={customers}
            onValueChange={(value) => {
              setSelectedCustomer(value);
              onCustomerSelect(value);
            }}
          />
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            label="Show Active Packages"
          />
        </div>
      </CardHeader>
      <CardContent>
        {selectedCustomer && (
          <CustomerPackages
            customerId={selectedCustomer}
            showActive={isActive}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Page Component (`app/package-monitor/page.tsx`)
```typescript
import React from 'react';
import { PackageGrid } from '@/components/package-monitor/package-grid';
import { CustomerPackageSelector } from '@/components/package-monitor/customer-selector';
import { usePackageMonitor } from '@/hooks/use-package-monitor';

export default function PackageMonitorPage() {
  const { data, isLoading, error } = usePackageMonitor();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error.message} />;
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Package Monitor</h1>
      </header>
      
      <PackageGrid
        title="Active Diamond Packages"
        packages={data?.diamond.packages ?? []}
        emptyMessage="No active diamond packages"
      />
      
      <PackageGrid
        title="Packages Expiring Soon"
        packages={data?.expiring.packages ?? []}
        emptyMessage="No packages expiring soon"
      />
      
      <CustomerPackageSelector
        onCustomerSelect={handleCustomerSelect}
      />
    </div>
  );
}
```

## Implementation Steps

1. **Database Setup**
   - Create new database functions
   - Test queries for performance
   - Add appropriate indexes

2. **API Routes**
   - Implement monitor data endpoint
   - Implement customer packages endpoint
   - Add error handling and validation

3. **Frontend Components**
   - Create reusable components
   - Implement data fetching hooks
   - Add loading and error states

4. **Testing**
   - Test database functions
   - Verify API responses
   - Test UI components
   - End-to-end testing

## UI/UX Considerations

1. **Navigation**
   - Clear package counts
   - Easily accessible from main navigation
   - Intuitive emoji usage

2. **Package Display**
   - Grid layout for easy scanning
   - Clear expiration warnings
   - Consistent information display

3. **Customer History**
   - Easy customer search
   - Clear active/expired toggle
   - Comprehensive package details

## Common Issues and Solutions

1. **Data Loading**
   - Implement proper loading states
   - Handle empty states gracefully
   - Cache frequent queries

2. **Date Handling**
   - Use date-fns consistently
   - Handle timezone differences
   - Clear date formatting

3. **State Management**
   - Proper error boundaries
   - Loading state indicators
   - Clean data fetching patterns