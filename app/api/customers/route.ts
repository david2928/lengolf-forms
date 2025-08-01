/**
 * Customer Management API - Main CRUD Operations
 * CMS-007: Core Customer API Endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { customerMappingService } from '@/lib/customer-mapping-service';

// Types
interface CreateCustomerRequest {
  fullName: string;
  primaryPhone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  linkedProfileIds?: string[];
}

interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email' | 'all';
  sortBy?: 'fullName' | 'customerCode' | 'registrationDate' | 'lastVisit' | 'lifetimeValue';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// GET /api/customers - List customers with filtering and pagination
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: CustomerFilters = {
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      registrationDateFrom: searchParams.get('registrationDateFrom') || undefined,
      registrationDateTo: searchParams.get('registrationDateTo') || undefined,
      lastVisitFrom: searchParams.get('lastVisitFrom') || undefined,
      lastVisitTo: searchParams.get('lastVisitTo') || undefined,
      preferredContactMethod: (searchParams.get('preferredContactMethod') as any) || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'fullName',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Use hybrid search for better partial matching
    if (filters.search) {
      let searchQuery = refacSupabaseAdmin
        .from('customer_analytics')
        .select('*');

      // Apply search filter using ILIKE for partial matching
      const searchTerm = filters.search.toLowerCase();
      searchQuery = searchQuery.or(
        `customer_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );

      // Apply other filters
      if (filters.registrationDateFrom) {
        searchQuery = searchQuery.gte('customer_create_date', filters.registrationDateFrom);
      }
      if (filters.registrationDateTo) {
        searchQuery = searchQuery.lte('customer_create_date', filters.registrationDateTo);
      }
      if (filters.preferredContactMethod && filters.preferredContactMethod !== 'all') {
        searchQuery = searchQuery.eq('preferred_contact_method', filters.preferredContactMethod);
      }

      // Only active customers
      searchQuery = searchQuery.eq('is_active', true);

      // Order by relevance (exact matches first, then alphabetical)
      searchQuery = searchQuery.order('customer_name', { ascending: true });

      // Apply pagination
      const offset = (filters.page! - 1) * filters.limit!;
      searchQuery = searchQuery.range(offset, offset + filters.limit! - 1);

      const { data: searchResults, error } = await searchQuery;

      if (error) throw error;

      // Get KPIs
      const { data: kpis, error: kpisError } = await refacSupabaseAdmin
        .rpc('get_customer_kpis_cached');

      if (kpisError) console.warn('KPIs fetch failed:', kpisError);

      return NextResponse.json({
        customers: searchResults || [],
        pagination: {
          total: searchResults?.length || 0,
          pages: Math.ceil((searchResults?.length || 0) / filters.limit!),
          current: filters.page!,
          limit: filters.limit!
        },
        kpis: kpis || {}
      });
    }

    // Direct query for non-search requests - Get count for pagination
    let countQuery = refacSupabaseAdmin
      .from('customer_analytics')
      .select('*', { count: 'exact', head: true });
    
    let query = refacSupabaseAdmin
      .from('customer_analytics')
      .select('*');

    // Apply filters to both queries
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
      countQuery = countQuery.eq('is_active', filters.isActive);
    }

    if (filters.registrationDateFrom) {
      query = query.gte('customer_create_date', filters.registrationDateFrom);
      countQuery = countQuery.gte('customer_create_date', filters.registrationDateFrom);
    }

    if (filters.registrationDateTo) {
      query = query.lte('customer_create_date', filters.registrationDateTo);
      countQuery = countQuery.lte('customer_create_date', filters.registrationDateTo);
    }

    if (filters.lastVisitFrom) {
      query = query.gte('last_visit_date', filters.lastVisitFrom);
      countQuery = countQuery.gte('last_visit_date', filters.lastVisitFrom);
    }

    if (filters.lastVisitTo) {
      query = query.lte('last_visit_date', filters.lastVisitTo);
      countQuery = countQuery.lte('last_visit_date', filters.lastVisitTo);
    }

    if (filters.preferredContactMethod && filters.preferredContactMethod !== 'all') {
      query = query.eq('preferred_contact_method', filters.preferredContactMethod);
      countQuery = countQuery.eq('preferred_contact_method', filters.preferredContactMethod);
    }

    // Apply sorting
    const sortColumn = filters.sortBy === 'fullName' ? 'customer_name' : 
                      filters.sortBy === 'customerCode' ? 'customer_code' :
                      filters.sortBy === 'registrationDate' ? 'customer_create_date' :
                      filters.sortBy === 'lastVisit' ? 'last_visit_date' :
                      filters.sortBy === 'lifetimeValue' ? 'lifetime_spending' : 'customer_name';

    query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });

    // Apply pagination
    const offset = (filters.page! - 1) * filters.limit!;
    query = query.range(offset, offset + filters.limit! - 1);

    // Execute both queries
    const [{ data: customers, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const totalCount = count || 0;

    // Get cached KPIs only if no filters applied (first page load)
    let kpis = {};
    if (!filters.search && filters.page === 1) {
      const { data: kpisData, error: kpisError } = await refacSupabaseAdmin
        .rpc('get_customer_kpis_cached');
      
      if (!kpisError) {
        kpis = kpisData || {};
      }
    }

    return NextResponse.json({
      customers: customers || [],
      pagination: {
        total: totalCount, // Use actual count from database
        pages: Math.ceil(totalCount / filters.limit!),
        current: filters.page!,
        limit: filters.limit!
      },
      kpis: kpis || {}
    });

  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: "Failed to fetch customers", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreateCustomerRequest = await request.json();

    // Validate required fields
    if (!body.fullName || !body.primaryPhone) {
      return NextResponse.json(
        { error: "Full name and primary phone are required" },
        { status: 400 }
      );
    }

    // Check for potential duplicates
    const duplicates = await customerMappingService.findPotentialDuplicates({
      phone: body.primaryPhone,
      customerName: body.fullName,
      email: body.email
    });

    // Only block creation for high-confidence matches:
    // 1. Exact phone number match, OR
    // 2. Exact email match, OR 
    // 3. Name similarity > 95% AND same normalized phone
    const blockingDuplicates = duplicates.filter(duplicate => {
      // Exact phone match
      if (body.primaryPhone && duplicate.normalized_phone) {
        const normalizedInput = customerMappingService.normalizePhoneNumber(body.primaryPhone);
        if (normalizedInput === duplicate.normalized_phone) {
          return true;
        }
      }
      
      // Exact email match
      if (body.email && duplicate.email && 
          body.email.toLowerCase() === duplicate.email.toLowerCase()) {
        return true;
      }
      
      // Very high name similarity (>95%) only if no phone provided or phones match
      if (duplicate.similarity && duplicate.similarity > 0.95) {
        if (!body.primaryPhone || !duplicate.normalized_phone) {
          return true; // No phone to compare, rely on name similarity
        }
        const normalizedInput = customerMappingService.normalizePhoneNumber(body.primaryPhone);
        return normalizedInput === duplicate.normalized_phone;
      }
      
      return false;
    });

    if (blockingDuplicates.length > 0) {
      return NextResponse.json({
        error: "Potential duplicates found",
        duplicates: blockingDuplicates,
        suggestion: "Please review potential duplicates before creating"
      }, { status: 409 });
    }

    // Create the customer (customer_code will be auto-generated by trigger)
    const { data: customer, error } = await refacSupabaseAdmin
      .from('customers')
      .insert({
        customer_name: body.fullName,
        contact_number: body.primaryPhone,
        email: body.email,
        date_of_birth: body.dateOfBirth ? new Date(body.dateOfBirth).toISOString().split('T')[0] : null,
        address: body.address,
        notes: body.notes,
        preferred_contact_method: body.preferredContactMethod || 'Phone',
        customer_profiles: body.linkedProfileIds ? JSON.stringify(body.linkedProfileIds) : '[]'
      })
      .select(`
        id, customer_code, customer_name, contact_number, email, 
        date_of_birth, address, notes, preferred_contact_method,
        customer_profiles, created_at, updated_at
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      customer: customer,
      message: "Customer created successfully"
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: "Failed to create customer", details: error.message },
      { status: 500 }
    );
  }
}