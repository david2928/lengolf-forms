/**
 * Customer Management API - Individual Customer Operations
 * CMS-007: Core Customer API Endpoints - Individual Customer CRUD
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface UpdateCustomerRequest {
  fullName?: string;
  primaryPhone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  linkedProfileIds?: string[];
  updateReason?: string;
}

interface DeactivateCustomerRequest {
  reason: string;
}

// GET /api/customers/[id] - Get customer details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = params.id;

    // Get customer details from customer_analytics view first, then full details from customers table
    const { data: customer, error } = await refacSupabaseAdmin
      .from('customers')
      .select(`
        id, customer_code, customer_name, contact_number, email,
        date_of_birth, address, notes, preferred_contact_method,
        customer_profiles, total_lifetime_value, total_visits,
        last_visit_date, customer_create_date, created_at, updated_at,
        is_active, normalized_phone, current_pos_customer_id, stable_hash_id
      `)
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get full profile data for this customer
    const { data: profilesData } = await refacSupabaseAdmin
      .from('profiles')
      .select(`
        id, email, display_name, phone_number, provider, provider_id,
        picture_url, updated_at, marketing_preference
      `)
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false });

    // Replace customer_profiles with full profile data
    customer.customer_profiles = profilesData || [];

    // Get transaction summary
    const { data: transactionSummary } = await refacSupabaseAdmin
      .schema('pos')
      .from('lengolf_sales')
      .select('sales_net, date, receipt_number')
      .eq('customer_id', customerId)
      .eq('is_voided', false);

    const transactions = transactionSummary || [];
    const totalTransactions = transactions.length;
    const totalSpent = transactions.reduce((sum: any, t: any) => sum + (t.sales_net || 0), 0);
    const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    const lastTransaction = transactions.length > 0 
      ? Math.max(...transactions.map((t: any) => new Date(t.date).getTime()))
      : null;

    // Get package summary using the enhanced packages API
    let packageSummary: { activePackages: number; totalPackages: number; lastPackagePurchase: number | null } = { 
      activePackages: 0, 
      totalPackages: 0, 
      lastPackagePurchase: null 
    };
    try {
      const packagesResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/packages`);
      if (packagesResponse.ok) {
        const packagesData = await packagesResponse.json();
        packageSummary = {
          activePackages: packagesData.summary?.active || 0,
          totalPackages: packagesData.summary?.total || 0,
          lastPackagePurchase: packagesData.packages && packagesData.packages.length > 0
            ? Math.max(...packagesData.packages.map((p: any) => new Date(p.purchase_date).getTime()))
            : null
        };
      }
    } catch (error) {
      console.log('Could not fetch package summary, using fallback');
      // Fallback to direct database query
      const { data: dbPackages } = await refacSupabaseAdmin
        .from('packages')
        .select('id, purchase_date, expiration_date, first_use_date')
        .eq('customer_id', customerId);

      const packages = dbPackages || [];
      packageSummary = {
        activePackages: packages.filter((p: any) => 
          !p.expiration_date || new Date(p.expiration_date) > new Date()
        ).length,
        totalPackages: packages.length,
        lastPackagePurchase: packages.length > 0
          ? Math.max(...packages.map((p: any) => new Date(p.purchase_date).getTime()))
          : null
      };
    }

    // Get booking summary
    const { data: bookingSummary } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, date, status')
      .eq('customer_id', customerId);

    const bookings = bookingSummary || [];
    const totalBookings = bookings.length;
    const upcomingBookings = bookings.filter((b: any) => 
      new Date(b.date) > new Date() && b.status !== 'cancelled'
    ).length;
    const lastBooking = bookings.length > 0
      ? Math.max(...bookings.map((b: any) => new Date(b.date).getTime()))
      : null;

    return NextResponse.json({
      customer: customer,
      transactionSummary: {
        totalTransactions,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
        lastTransaction: lastTransaction ? new Date(lastTransaction).toISOString().split('T')[0] : null
      },
      packageSummary: {
        activePackages: packageSummary.activePackages,
        totalPackages: packageSummary.totalPackages,
        lastPackagePurchase: packageSummary.lastPackagePurchase ? new Date(packageSummary.lastPackagePurchase).toISOString().split('T')[0] : null
      },
      bookingSummary: {
        totalBookings,
        upcomingBookings,
        lastBooking: lastBooking ? new Date(lastBooking).toISOString().split('T')[0] : null
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      { error: "Failed to fetch customer details", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = params.id;
    const body: UpdateCustomerRequest = await request.json();

    // Build update object
    const updateData: any = {};
    
    if (body.fullName !== undefined) updateData.customer_name = body.fullName;
    if (body.primaryPhone !== undefined) updateData.contact_number = body.primaryPhone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.dateOfBirth !== undefined) {
      updateData.date_of_birth = body.dateOfBirth 
        ? new Date(body.dateOfBirth).toISOString().split('T')[0] 
        : null;
    }
    if (body.address !== undefined) updateData.address = body.address;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.preferredContactMethod !== undefined) {
      updateData.preferred_contact_method = body.preferredContactMethod;
    }
    if (body.linkedProfileIds !== undefined) {
      updateData.customer_profiles = JSON.stringify(body.linkedProfileIds);
    }

    // Add update reason to notes if provided
    if (body.updateReason) {
      const currentNotes = updateData.notes || '';
      updateData.notes = currentNotes 
        ? `${currentNotes}\n\nUpdated ${new Date().toLocaleDateString()}: ${body.updateReason}`
        : `Updated ${new Date().toLocaleDateString()}: ${body.updateReason}`;
    }

    // Update the customer
    const { data: customer, error } = await refacSupabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select(`
        id, customer_code, customer_name, contact_number, email,
        date_of_birth, address, notes, preferred_contact_method,
        customer_profiles, created_at, updated_at
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      customer: customer,
      message: "Customer updated successfully"
    });

  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: "Failed to update customer", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Deactivate customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = params.id;
    const body: DeactivateCustomerRequest = await request.json();

    if (!body.reason) {
      return NextResponse.json(
        { error: "Deactivation reason is required" },
        { status: 400 }
      );
    }

    // Soft delete - set is_active to false and add reason to notes
    const { data: customer, error } = await refacSupabaseAdmin
      .from('customers')
      .update({
        is_active: false,
        notes: `DEACTIVATED ${new Date().toLocaleDateString()}: ${body.reason}`
      })
      .eq('id', customerId)
      .select('id, customer_code, customer_name')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      customer: customer,
      message: "Customer deactivated successfully"
    });

  } catch (error: any) {
    console.error('Error deactivating customer:', error);
    return NextResponse.json(
      { error: "Failed to deactivate customer", details: error.message },
      { status: 500 }
    );
  }
}