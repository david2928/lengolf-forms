# Discount Management System - Implementation Tasks

## Phase 1: Database and Core API (Week 1)

### Database Schema Implementation

#### Task 1.1: Create Discount Management Tables
**File**: New migration file
**Estimated Time**: 2 hours

```sql
-- Create migration: create_discount_management_tables.sql
CREATE TABLE pos.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10,2) NOT NULL,
    application_scope VARCHAR(20) NOT NULL CHECK (application_scope IN ('item', 'receipt')),
    
    -- Availability settings
    is_active BOOLEAN DEFAULT true,
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('always', 'date_range')),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (
        (availability_type = 'always') OR 
        (availability_type = 'date_range' AND valid_from IS NOT NULL AND valid_until IS NOT NULL)
    )
);

CREATE TABLE pos.discount_product_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID NOT NULL REFERENCES pos.discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES pos.dim_product(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add discount references to existing tables
ALTER TABLE pos.orders ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);
ALTER TABLE pos.order_items ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);
ALTER TABLE pos.transactions ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);
ALTER TABLE pos.transaction_items ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);

-- Indexes
CREATE INDEX idx_discounts_active_scope ON pos.discounts(is_active, application_scope);
CREATE INDEX idx_discounts_validity ON pos.discounts(availability_type, valid_from, valid_until);
CREATE INDEX idx_discount_product_eligibility ON pos.discount_product_eligibility(discount_id, product_id);
```

#### Task 1.2: Create Discount Validation Function
**File**: Same migration file
**Estimated Time**: 1 hour

```sql
-- Add to migration
CREATE OR REPLACE FUNCTION validate_discount_application(
    p_discount_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_discount RECORD;
BEGIN
    SELECT * INTO v_discount FROM pos.discounts WHERE id = p_discount_id;
    
    IF NOT FOUND OR NOT v_discount.is_active THEN
        RETURN '{"valid": false, "reason": "Discount not found or inactive"}'::JSONB;
    END IF;
    
    IF v_discount.availability_type = 'date_range' THEN
        IF NOW() < v_discount.valid_from OR NOW() > v_discount.valid_until THEN
            RETURN '{"valid": false, "reason": "Discount not valid for current date"}'::JSONB;
        END IF;
    END IF;
    
    IF v_discount.application_scope = 'item' AND p_product_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pos.discount_product_eligibility 
            WHERE discount_id = p_discount_id AND product_id = p_product_id
        ) THEN
            RETURN '{"valid": false, "reason": "Product not eligible for this discount"}'::JSONB;
        END IF;
    END IF;
    
    RETURN '{"valid": true}'::JSONB;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints Implementation

#### Task 1.3: Admin Discount CRUD API
**File**: `app/api/admin/discounts/route.ts`
**Estimated Time**: 3 hours

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: discounts, error } = await supabase
    .from('discounts')
    .select(`
      *,
      discount_product_eligibility (
        product_id,
        dim_product (
          id,
          name,
          sku
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discounts });
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, discount_type, discount_value, application_scope, 
          availability_type, valid_from, valid_until, eligible_product_ids } = body;

  // Validate required fields
  if (!title || !discount_type || !discount_value || !application_scope || !availability_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create discount
  const { data: discount, error: discountError } = await supabase
    .from('discounts')
    .insert({
      title,
      description,
      discount_type,
      discount_value,
      application_scope,
      availability_type,
      valid_from: availability_type === 'date_range' ? valid_from : null,
      valid_until: availability_type === 'date_range' ? valid_until : null,
    })
    .select()
    .single();

  if (discountError) {
    return NextResponse.json({ error: discountError.message }, { status: 500 });
  }

  // Add product eligibility if item-level discount
  if (application_scope === 'item' && eligible_product_ids?.length > 0) {
    const eligibilityRecords = eligible_product_ids.map((productId: string) => ({
      discount_id: discount.id,
      product_id: productId
    }));

    const { error: eligibilityError } = await supabase
      .from('discount_product_eligibility')
      .insert(eligibilityRecords);

    if (eligibilityError) {
      // Rollback discount creation
      await supabase.from('discounts').delete().eq('id', discount.id);
      return NextResponse.json({ error: eligibilityError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ discount }, { status: 201 });
}
```

#### Task 1.4: Individual Discount API
**File**: `app/api/admin/discounts/[id]/route.ts`
**Estimated Time**: 2 hours

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: discount, error } = await supabase
    .from('discounts')
    .select(`
      *,
      discount_product_eligibility (
        product_id,
        dim_product (
          id,
          name,
          sku
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discount });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, discount_type, discount_value, application_scope,
          availability_type, valid_from, valid_until, eligible_product_ids } = body;

  // Update discount
  const { data: discount, error: discountError } = await supabase
    .from('discounts')
    .update({
      title,
      description,
      discount_type,
      discount_value,
      application_scope,
      availability_type,
      valid_from: availability_type === 'date_range' ? valid_from : null,
      valid_until: availability_type === 'date_range' ? valid_until : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();

  if (discountError) {
    return NextResponse.json({ error: discountError.message }, { status: 500 });
  }

  // Update product eligibility
  if (application_scope === 'item') {
    // Remove existing eligibility
    await supabase
      .from('discount_product_eligibility')
      .delete()
      .eq('discount_id', params.id);

    // Add new eligibility
    if (eligible_product_ids?.length > 0) {
      const eligibilityRecords = eligible_product_ids.map((productId: string) => ({
        discount_id: params.id,
        product_id: productId
      }));

      const { error: eligibilityError } = await supabase
        .from('discount_product_eligibility')
        .insert(eligibilityRecords);

      if (eligibilityError) {
        return NextResponse.json({ error: eligibilityError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ discount });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

#### Task 1.5: POS Discount API
**File**: `app/api/pos/discounts/available/route.ts`
**Estimated Time**: 2 hours

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope'); // 'item' | 'receipt'
  const productId = searchParams.get('product_id');

  let query = supabase
    .from('discounts')
    .select(`
      *,
      discount_product_eligibility (
        product_id
      )
    `)
    .eq('is_active', true);

  if (scope) {
    query = query.eq('application_scope', scope);
  }

  // Filter by current date for date_range discounts
  const now = new Date().toISOString();
  query = query.or(`availability_type.eq.always,and(availability_type.eq.date_range,valid_from.lte.${now},valid_until.gte.${now})`);

  const { data: discounts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter item-level discounts by product eligibility
  let filteredDiscounts = discounts;
  if (scope === 'item' && productId) {
    filteredDiscounts = discounts.filter(discount => 
      discount.discount_product_eligibility.some((eligibility: any) => 
        eligibility.product_id === productId
      )
    );
  }

  return NextResponse.json({ discounts: filteredDiscounts });
}
```

#### Task 1.6: Discount Application API
**File**: `app/api/pos/discounts/apply/route.ts`
**Estimated Time**: 3 hours

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { discount_id, order_id, order_item_id, application_scope } = body;

  // Validate discount
  const productId = order_item_id ? 
    (await supabase.from('order_items').select('product_id').eq('id', order_item_id).single()).data?.product_id 
    : null;

  const { data: validation } = await supabase
    .rpc('validate_discount_application', {
      p_discount_id: discount_id,
      p_product_id: productId
    });

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // Get discount details
  const { data: discount, error: discountError } = await supabase
    .from('discounts')
    .select('*')
    .eq('id', discount_id)
    .single();

  if (discountError) {
    return NextResponse.json({ error: discountError.message }, { status: 500 });
  }

  if (application_scope === 'item' && order_item_id) {
    // Apply discount to specific item
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', order_item_id)
      .single();

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // Calculate discount amount
    const originalAmount = orderItem.total_price;
    let discountAmount = 0;
    
    if (discount.discount_type === 'percentage') {
      discountAmount = originalAmount * (discount.discount_value / 100);
    } else {
      discountAmount = Math.min(discount.discount_value, originalAmount);
    }

    const newTotal = originalAmount - discountAmount;

    // Update order item
    const { error: updateError } = await supabase
      .from('order_items')
      .update({
        applied_discount_id: discount_id,
        total_price: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_item_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Recalculate order totals
    await recalculateOrderTotals(order_id);

    return NextResponse.json({ 
      success: true, 
      discount_amount: discountAmount,
      new_total: newTotal 
    });

  } else if (application_scope === 'receipt' && order_id) {
    // Apply discount to entire order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Calculate discount amount
    const originalAmount = order.subtotal_amount;
    let discountAmount = 0;
    
    if (discount.discount_type === 'percentage') {
      discountAmount = originalAmount * (discount.discount_value / 100);
    } else {
      discountAmount = Math.min(discount.discount_value, originalAmount);
    }

    const newTotal = originalAmount - discountAmount;

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        applied_discount_id: discount_id,
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      discount_amount: discountAmount,
      new_total: newTotal 
    });
  }

  return NextResponse.json({ error: "Invalid application scope" }, { status: 400 });
}

async function recalculateOrderTotals(orderId: string) {
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('total_price')
    .eq('order_id', orderId);

  const subtotal = orderItems?.reduce((sum, item) => sum + parseFloat(item.total_price), 0) || 0;
  const taxAmount = subtotal * 0.07; // 7% VAT

  await supabase
    .from('orders')
    .update({
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount
    })
    .eq('id', orderId);
}
```

#### Task 1.7: TypeScript Types
**File**: `src/types/discount.ts`
**Estimated Time**: 30 minutes

```typescript
export interface Discount {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  application_scope: 'item' | 'receipt';
  is_active: boolean;
  availability_type: 'always' | 'date_range';
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  discount_product_eligibility?: DiscountProductEligibility[];
}

export interface DiscountProductEligibility {
  id: string;
  discount_id: string;
  product_id: string;
  created_at: string;
  dim_product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface DiscountApplication {
  discount_id: string;
  order_id?: string;
  order_item_id?: string;
  application_scope: 'item' | 'receipt';
}

export interface DiscountValidation {
  valid: boolean;
  reason?: string;
}
```

---

## Phase 2: Admin Interface (Week 2)

### Admin Components Implementation

#### Task 2.1: Admin Discount List Page
**File**: `app/admin/discounts/page.tsx`
**Estimated Time**: 4 hours

```typescript
import React from 'react';
import { AdminDiscountList } from '@/components/admin/discounts/AdminDiscountList';

export default function DiscountsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Discount Management</h1>
        <a 
          href="/admin/discounts/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Discount
        </a>
      </div>
      <AdminDiscountList />
    </div>
  );
}
```

#### Task 2.2: Admin Discount List Component
**File**: `src/components/admin/discounts/AdminDiscountList.tsx`
**Estimated Time**: 5 hours

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Discount } from '@/types/discount';

export function AdminDiscountList() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/admin/discounts');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscountStatus = async (discountId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        fetchDiscounts(); // Refresh list
      }
    } catch (error) {
      console.error('Error toggling discount status:', error);
    }
  };

  const deleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchDiscounts(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };

  const filteredDiscounts = discounts.filter(discount => {
    if (filter === 'active') return discount.is_active;
    if (filter === 'inactive') return !discount.is_active;
    return true;
  });

  const isExpired = (discount: Discount) => {
    if (discount.availability_type === 'always') return false;
    return discount.valid_until && new Date(discount.valid_until) < new Date();
  };

  if (loading) {
    return <div className="text-center py-4">Loading discounts...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Discounts</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Validity</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiscounts.map((discount) => (
              <tr key={discount.id} className="border-t">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{discount.title}</div>
                    {discount.description && (
                      <div className="text-sm text-gray-500">{discount.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize">{discount.discount_type.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `$${discount.discount_value}`}
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize">{discount.application_scope}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    discount.is_active && !isExpired(discount)
                      ? 'bg-green-100 text-green-800' 
                      : isExpired(discount)
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isExpired(discount) ? 'Expired' : discount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {discount.availability_type === 'always' ? (
                    'Always'
                  ) : (
                    <div className="text-sm">
                      <div>From: {new Date(discount.valid_from!).toLocaleDateString()}</div>
                      <div>Until: {new Date(discount.valid_until!).toLocaleDateString()}</div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <a 
                      href={`/admin/discounts/${discount.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => toggleDiscountStatus(discount.id, discount.is_active)}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      {discount.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteDiscount(discount.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredDiscounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No discounts found
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Task 2.3: Discount Creation Page
**File**: `app/admin/discounts/create/page.tsx`
**Estimated Time**: 2 hours

```typescript
import React from 'react';
import { AdminDiscountForm } from '@/components/admin/discounts/AdminDiscountForm';

export default function CreateDiscountPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Discount</h1>
        <a href="/admin/discounts" className="text-blue-600 hover:text-blue-800">
          ← Back to Discounts
        </a>
      </div>
      <AdminDiscountForm />
    </div>
  );
}
```

#### Task 2.4: Discount Edit Page
**File**: `app/admin/discounts/[id]/edit/page.tsx`
**Estimated Time**: 2 hours

```typescript
import React from 'react';
import { AdminDiscountForm } from '@/components/admin/discounts/AdminDiscountForm';

export default function EditDiscountPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Discount</h1>
        <a href="/admin/discounts" className="text-blue-600 hover:text-blue-800">
          ← Back to Discounts
        </a>
      </div>
      <AdminDiscountForm discountId={params.id} />
    </div>
  );
}
```

#### Task 2.5: Discount Form Component
**File**: `src/components/admin/discounts/AdminDiscountForm.tsx`
**Estimated Time**: 6 hours

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Discount } from '@/types/discount';
import { ProductEligibilitySelector } from './ProductEligibilitySelector';

interface AdminDiscountFormProps {
  discountId?: string;
}

export function AdminDiscountForm({ discountId }: AdminDiscountFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    application_scope: 'receipt' as 'item' | 'receipt',
    availability_type: 'always' as 'always' | 'date_range',
    valid_from: '',
    valid_until: '',
    eligible_product_ids: [] as string[]
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (discountId) {
      fetchDiscount();
    }
  }, [discountId]);

  const fetchDiscount = async () => {
    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`);
      const data = await response.json();
      const discount = data.discount;
      
      setFormData({
        title: discount.title,
        description: discount.description || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value.toString(),
        application_scope: discount.application_scope,
        availability_type: discount.availability_type,
        valid_from: discount.valid_from ? discount.valid_from.split('T')[0] : '',
        valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : '',
        eligible_product_ids: discount.discount_product_eligibility?.map((e: any) => e.product_id) || []
      });
    } catch (error) {
      console.error('Error fetching discount:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      newErrors.discount_value = 'Discount value must be greater than 0';
    }
    if (formData.discount_type === 'percentage' && parseFloat(formData.discount_value) > 100) {
      newErrors.discount_value = 'Percentage cannot exceed 100%';
    }
    if (formData.availability_type === 'date_range') {
      if (!formData.valid_from) newErrors.valid_from = 'Start date is required';
      if (!formData.valid_until) newErrors.valid_until = 'End date is required';
      if (formData.valid_from && formData.valid_until && formData.valid_from >= formData.valid_until) {
        newErrors.valid_until = 'End date must be after start date';
      }
    }
    if (formData.application_scope === 'item' && formData.eligible_product_ids.length === 0) {
      newErrors.eligible_products = 'At least one product must be selected for item-level discounts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const url = discountId ? `/api/admin/discounts/${discountId}` : '/api/admin/discounts';
      const method = discountId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value)
        })
      });

      if (response.ok) {
        window.location.href = '/admin/discounts';
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'Failed to save discount' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-lg shadow p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Staff Discount, Birthday Special"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Optional description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Discount Type *</label>
            <select
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={formData.discount_type === 'percentage' ? '100' : undefined}
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.discount_value && <p className="text-red-500 text-sm mt-1">{errors.discount_value}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Application Scope *</label>
          <select
            value={formData.application_scope}
            onChange={(e) => setFormData({ ...formData, application_scope: e.target.value as any })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="receipt">Receipt Level (apply to total)</option>
            <option value="item">Item Level (apply to specific products)</option>
          </select>
        </div>

        {formData.application_scope === 'item' && (
          <div>
            <label className="block text-sm font-medium mb-2">Eligible Products *</label>
            <ProductEligibilitySelector
              selectedProductIds={formData.eligible_product_ids}
              onChange={(productIds) => setFormData({ ...formData, eligible_product_ids: productIds })}
            />
            {errors.eligible_products && <p className="text-red-500 text-sm mt-1">{errors.eligible_products}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Availability *</label>
          <select
            value={formData.availability_type}
            onChange={(e) => setFormData({ ...formData, availability_type: e.target.value as any })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="always">Always Available</option>
            <option value="date_range">Date Range</option>
          </select>
        </div>

        {formData.availability_type === 'date_range' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              {errors.valid_from && <p className="text-red-500 text-sm mt-1">{errors.valid_from}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date *</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              {errors.valid_until && <p className="text-red-500 text-sm mt-1">{errors.valid_until}</p>}
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : discountId ? 'Update Discount' : 'Create Discount'}
          </button>
          
          <a
            href="/admin/discounts"
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </a>
        </div>
      </div>
    </form>
  );
}
```

#### Task 2.6: Product Eligibility Selector Component
**File**: `src/components/admin/discounts/ProductEligibilitySelector.tsx`
**Estimated Time**: 3 hours

```typescript
'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
}

interface ProductEligibilitySelectorProps {
  selectedProductIds: string[];
  onChange: (productIds: string[]) => void;
}

export function ProductEligibilitySelector({ selectedProductIds, onChange }: ProductEligibilitySelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/pos/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))].sort();

  const toggleProduct = (productId: string) => {
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    onChange(newSelection);
  };

  const selectAll = () => {
    onChange(filteredProducts.map(p => p.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  if (loading) {
    return <div className="text-center py-4">Loading products...</div>;
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="mb-4 space-y-3">
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-3 text-sm">
          <button
            type="button"
            onClick={selectAll}
            className="text-blue-600 hover:text-blue-800"
          >
            Select All ({filteredProducts.length})
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
          <span className="text-gray-500">
            {selectedProductIds.length} selected
          </span>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded">
        {filteredProducts.map(product => (
          <label key={product.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedProductIds.includes(product.id)}
              onChange={() => toggleProduct(product.id)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-500">{product.sku} • {product.category}</div>
            </div>
          </label>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Task 2.7: Update Admin Navigation
**File**: Update admin navigation to include discounts
**Estimated Time**: 30 minutes

Update the admin navigation menu to include a link to `/admin/discounts`.

---

## Phase 3: POS Integration (Week 3)

### POS Components Implementation

#### Task 3.1: Item Discount Button Component
**File**: `src/components/pos/discounts/ItemDiscountButton.tsx`
**Estimated Time**: 2 hours

```typescript
'use client';

import React, { useState } from 'react';
import { DiscountSelectionModal } from './DiscountSelectionModal';

interface ItemDiscountButtonProps {
  orderItemId: string;
  productId: string;
  currentTotal: number;
  appliedDiscountId?: string;
  onDiscountApplied: () => void;
}

export function ItemDiscountButton({ 
  orderItemId, 
  productId, 
  currentTotal, 
  appliedDiscountId, 
  onDiscountApplied 
}: ItemDiscountButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-3 py-1 text-sm rounded ${
          appliedDiscountId 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
        }`}
      >
        {appliedDiscountId ? '✓ Discount' : 'Add Discount'}
      </button>

      {showModal && (
        <DiscountSelectionModal
          scope="item"
          productId={productId}
          orderItemId={orderItemId}
          currentAmount={currentTotal}
          onClose={() => setShowModal(false)}
          onDiscountApplied={() => {
            setShowModal(false);
            onDiscountApplied();
          }}
        />
      )}
    </>
  );
}
```

#### Task 3.2: Receipt Discount Button Component
**File**: `src/components/pos/discounts/ReceiptDiscountButton.tsx`
**Estimated Time**: 2 hours

```typescript
'use client';

import React, { useState } from 'react';
import { DiscountSelectionModal } from './DiscountSelectionModal';

interface ReceiptDiscountButtonProps {
  orderId: string;
  currentTotal: number;
  appliedDiscountId?: string;
  onDiscountApplied: () => void;
}

export function ReceiptDiscountButton({ 
  orderId, 
  currentTotal, 
  appliedDiscountId, 
  onDiscountApplied 
}: ReceiptDiscountButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-full px-4 py-2 text-sm rounded ${
          appliedDiscountId 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
        }`}
      >
        {appliedDiscountId ? '✓ Receipt Discount Applied' : 'Apply Receipt Discount'}
      </button>

      {showModal && (
        <DiscountSelectionModal
          scope="receipt"
          orderId={orderId}
          currentAmount={currentTotal}
          onClose={() => setShowModal(false)}
          onDiscountApplied={() => {
            setShowModal(false);
            onDiscountApplied();
          }}
        />
      )}
    </>
  );
}
```

#### Task 3.3: Discount Selection Modal Component
**File**: `src/components/pos/discounts/DiscountSelectionModal.tsx`
**Estimated Time**: 4 hours

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Discount } from '@/types/discount';

interface DiscountSelectionModalProps {
  scope: 'item' | 'receipt';
  productId?: string;
  orderId?: string;
  orderItemId?: string;
  currentAmount: number;
  onClose: () => void;
  onDiscountApplied: () => void;
}

export function DiscountSelectionModal({
  scope,
  productId,
  orderId,
  orderItemId,
  currentAmount,
  onClose,
  onDiscountApplied
}: DiscountSelectionModalProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    fetchAvailableDiscounts();
  }, []);

  const fetchAvailableDiscounts = async () => {
    try {
      const params = new URLSearchParams({
        scope,
        ...(productId && { product_id: productId })
      });

      const response = await fetch(`/api/pos/discounts/available?${params}`);
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountAmount = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return currentAmount * (discount.discount_value / 100);
    } else {
      return Math.min(discount.discount_value, currentAmount);
    }
  };

  const applyDiscount = async (discount: Discount) => {
    setApplying(true);
    
    try {
      const response = await fetch('/api/pos/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discount.id,
          order_id: orderId,
          order_item_id: orderItemId,
          application_scope: scope
        })
      });

      if (response.ok) {
        onDiscountApplied();
      } else {
        const error = await response.json();
        alert(`Failed to apply discount: ${error.error}`);
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Select {scope === 'item' ? 'Item' : 'Receipt'} Discount
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading discounts...</div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No applicable discounts available
          </div>
        ) : (
          <div className="space-y-3">
            {discounts.map(discount => {
              const discountAmount = calculateDiscountAmount(discount);
              const finalAmount = currentAmount - discountAmount;

              return (
                <div key={discount.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{discount.title}</h4>
                      {discount.description && (
                        <p className="text-sm text-gray-600">{discount.description}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-red-600">
                        -{discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `$${discount.discount_value}`}
                      </div>
                      <div className="text-gray-500">
                        -${discountAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-500">Current: ${currentAmount.toFixed(2)}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">Final: ${finalAmount.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => applyDiscount(discount)}
                      disabled={applying}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {applying ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Task 3.4: Update Order Item Component
**File**: Update existing order item components to include discount button
**Estimated Time**: 3 hours

Find and update the existing order item display components to include the `ItemDiscountButton`. This will likely be in files like:
- `src/components/pos/order/OrderItemDisplay.tsx`
- `src/components/pos/cart/CartItem.tsx`

Add the discount button and handle the refresh logic when discounts are applied.

#### Task 3.5: Update Order Summary Component
**File**: Update existing order summary components to include receipt discount button
**Estimated Time**: 3 hours

Find and update the existing order summary/totals components to include the `ReceiptDiscountButton`. This will likely be in files like:
- `src/components/pos/order/OrderSummary.tsx`
- `src/components/pos/cart/CartSummary.tsx`

Add the receipt discount button and handle the refresh logic when discounts are applied.

#### Task 3.6: Discount Display in Order
**File**: `src/components/pos/discounts/DiscountDisplay.tsx`
**Estimated Time**: 2 hours

```typescript
'use client';

import React from 'react';

interface DiscountDisplayProps {
  discountTitle?: string;
  discountAmount: number;
  className?: string;
}

export function DiscountDisplay({ discountTitle, discountAmount, className = '' }: DiscountDisplayProps) {
  if (discountAmount <= 0) return null;

  return (
    <div className={`text-green-600 text-sm ${className}`}>
      <span className="mr-2">🎯</span>
      <span>{discountTitle || 'Discount'}: -${discountAmount.toFixed(2)}</span>
    </div>
  );
}
```

---

## Phase 4: Display Integration (Week 4)

### Order Detail View Updates

#### Task 4.1: Update Order Item Display with Discounts
**File**: Update order item components throughout the app
**Estimated Time**: 4 hours

Update all order item display components to show applied discounts:
- `src/components/pos/order/OrderItemRow.tsx`
- `src/components/booking-form/order/OrderItemDisplay.tsx`
- `app/manage-bookings/components/OrderItemsList.tsx`

Include discount name and amount in the display.

#### Task 4.2: Update Order Summary with Discounts
**File**: Update order summary components
**Estimated Time**: 3 hours

Update order summary components to show receipt-level discounts:
- `src/components/pos/order/OrderTotals.tsx`
- `src/components/booking-form/order/OrderSummary.tsx`
- `app/manage-bookings/components/OrderSummary.tsx`

### Transaction View Updates

#### Task 4.3: Update Transaction History Display
**File**: Find and update transaction display components
**Estimated Time**: 3 hours

Update transaction history views to show applied discounts:
- Find transaction display components
- Add discount information to transaction items
- Include discount totals in transaction summaries

#### Task 4.4: Update Receipt Recreation Logic
**File**: Update receipt display/recreation components
**Estimated Time**: 2 hours

Update any receipt display or recreation logic to include discount information when viewing past transactions.

### Receipt Printing Integration

#### Task 4.5: Update Receipt Template for Line Item Discounts
**File**: `src/services/BluetoothThermalPrinter.ts` or related receipt service
**Estimated Time**: 4 hours

Update the receipt formatting to include line item discounts:

```typescript
// Example receipt line item with discount
const formatOrderItemWithDiscount = (item: any) => {
  let lines = [];
  
  // Main item line
  lines.push(`${item.name} x${item.quantity}`.padEnd(20) + `${item.total_price.toFixed(2)}`.padStart(10));
  
  // Discount line (if applicable)
  if (item.applied_discount_id && item.discount_amount > 0) {
    lines.push(`  ${item.discount_title} Discount`.padEnd(20) + `-${item.discount_amount.toFixed(2)}`.padStart(10));
    lines.push(`  Item Total`.padEnd(20) + `${(item.total_price - item.discount_amount).toFixed(2)}`.padStart(10));
  }
  
  return lines;
};
```

#### Task 4.6: Update Receipt Template for Receipt-Level Discounts
**File**: Same receipt service file
**Estimated Time**: 3 hours

Update the receipt totals section to include receipt-level discounts:

```typescript
// Example receipt totals with discount
const formatReceiptTotals = (order: any) => {
  let lines = [];
  
  lines.push(''.padEnd(30, '-'));
  lines.push(`Subtotal:`.padEnd(20) + `${order.subtotal_amount.toFixed(2)}`.padStart(10));
  
  // Receipt-level discount
  if (order.applied_discount_id && order.discount_amount > 0) {
    lines.push(`${order.discount_title} Discount:`.padEnd(20) + `-${order.discount_amount.toFixed(2)}`.padStart(10));
    lines.push(`Net Total:`.padEnd(20) + `${(order.subtotal_amount - order.discount_amount).toFixed(2)}`.padStart(10));
  }
  
  lines.push(`VAT (7%):`.padEnd(20) + `${order.tax_amount.toFixed(2)}`.padStart(10));
  lines.push(''.padEnd(30, '-'));
  lines.push(`TOTAL:`.padEnd(20) + `${order.total_amount.toFixed(2)}`.padStart(10));
  
  return lines;
};
```

#### Task 4.7: Update Database Queries for Receipt Data
**File**: Update receipt data fetching to include discount information
**Estimated Time**: 2 hours

Update any database queries that fetch order/transaction data for receipts to include discount information:
- Join with discount tables to get discount titles
- Include discount amounts in calculations
- Ensure all receipt-related queries have discount data

#### Task 4.8: Update Tax Invoice Integration
**File**: Update tax invoice generation if applicable
**Estimated Time**: 2 hours

If the system generates tax invoices, update them to include discount information in compliance with local tax requirements.

---

## Phase 5: Testing and Deployment (Week 5)

### Testing Tasks

#### Task 5.1: Unit Tests for Discount Validation
**File**: `tests/api/discounts.test.ts`
**Estimated Time**: 3 hours

Create unit tests for discount validation logic:

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Discount Validation', () => {
  it('should validate active discounts', async () => {
    // Test discount validation logic
  });

  it('should validate date ranges', async () => {
    // Test date range validation
  });

  it('should validate product eligibility', async () => {
    // Test product eligibility validation
  });

  it('should calculate percentage discounts correctly', async () => {
    // Test percentage discount calculations
  });

  it('should calculate fixed amount discounts correctly', async () => {
    // Test fixed amount discount calculations
  });
});
```

#### Task 5.2: Integration Tests for POS Workflow
**File**: `tests/e2e/discount-workflow.test.ts`
**Estimated Time**: 4 hours

Create end-to-end tests for the complete discount workflow:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Discount Management Workflow', () => {
  test('Admin can create and manage discounts', async ({ page }) => {
    // Test admin discount creation workflow
  });

  test('POS staff can apply item-level discounts', async ({ page }) => {
    // Test item discount application
  });

  test('POS staff can apply receipt-level discounts', async ({ page }) => {
    // Test receipt discount application
  });

  test('Discounts appear correctly in receipts', async ({ page }) => {
    // Test receipt printing with discounts
  });
});
```

#### Task 5.3: Database Migration Testing
**File**: Test database migrations
**Estimated Time**: 2 hours

Test the database migrations in a staging environment:
- Verify tables are created correctly
- Test constraints and indexes
- Verify existing data integrity

### Deployment Tasks

#### Task 5.4: Production Database Migration
**File**: Apply migrations to production
**Estimated Time**: 1 hour

Apply the database migrations to production:
- Schedule maintenance window if needed
- Run migrations
- Verify data integrity

#### Task 5.5: Deploy Application Updates
**File**: Deploy updated application
**Estimated Time**: 1 hour

Deploy the updated application with discount functionality:
- Deploy via standard deployment process
- Monitor for errors
- Verify functionality in production

#### Task 5.6: User Acceptance Testing
**File**: Coordinate UAT with stakeholders
**Estimated Time**: 4 hours

Coordinate user acceptance testing:
- Train admin staff on discount management
- Train POS staff on discount application
- Gather feedback and fix any issues

#### Task 5.7: Documentation and Training
**File**: Create user documentation
**Estimated Time**: 3 hours

Create user-facing documentation:
- Admin guide for discount management
- POS staff guide for applying discounts
- Troubleshooting guide

#### Task 5.8: Monitoring and Bug Fixes
**File**: Monitor production and fix issues
**Estimated Time**: Ongoing

Monitor the production system and fix any issues that arise:
- Set up monitoring for discount-related errors
- Monitor performance impact
- Fix bugs as they are discovered

---

## Summary

**Total Estimated Time**: 5 weeks (25 working days)

**Key Deliverables**:
- Complete discount management database schema
- Admin interface for creating and managing discounts
- POS integration for applying discounts
- Updated order and transaction displays
- Updated receipt printing with discount information
- Comprehensive testing suite
- Production deployment

**Critical Success Factors**:
- Database migration executes without data loss
- POS workflow remains smooth and fast
- Receipt printing includes all discount information
- Admin interface is intuitive and complete
- All discount calculations are accurate