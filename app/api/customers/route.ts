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

    // Check for exact phone number duplicates first (strongest validation)
    const normalizedPhone = customerMappingService.normalizePhoneNumber(body.primaryPhone);
    
    if (normalizedPhone) {
      const { data: exactPhoneMatch, error } = await refacSupabaseAdmin
        .from('customers')
        .select('id, customer_code, customer_name, contact_number, email')
        .eq('normalized_phone', normalizedPhone)
        .eq('is_active', true)
        .limit(1);

      if (!error && exactPhoneMatch && exactPhoneMatch.length > 0) {
        return NextResponse.json({
          error: "A customer with this phone number already exists",
          duplicate_customer: exactPhoneMatch[0],
          phone_number: body.primaryPhone,
          normalized_phone: normalizedPhone,
          suggestion: "Please check if this is the same customer or use a different phone number"
        }, { status: 409 });
      }
    }

    // Check for potential duplicates (name/email similarity)
    const duplicates = await customerMappingService.findPotentialDuplicates({
      phone: body.primaryPhone,
      customerName: body.fullName,
      email: body.email
    });

    // Warning-level duplicates (don't block creation, but warn user)
    const warningDuplicates = duplicates.filter(duplicate => {
      // Exact email match (warning level)
      if (body.email && duplicate.email && 
          body.email.toLowerCase() === duplicate.email.toLowerCase()) {
        return true;
      }
      
      // High name similarity (>85% but <95%)
      if (duplicate.similarity && duplicate.similarity > 0.85) {
        return true;
      }
      
      return false;
    });

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

    if (error) {
      // Handle unique constraint violation for phone numbers
      if (error.code === '23505' && error.message.includes('normalized_phone')) {
        return NextResponse.json({
          error: "A customer with this phone number already exists",
          phone_number: body.primaryPhone,
          suggestion: "Please check if this is the same customer or use a different phone number",
          error_code: "DUPLICATE_PHONE"
        }, { status: 409 });
      }
      throw error;
    }

    const response: any = {
      customer: customer,
      message: "Customer created successfully"
    };

    // Include warnings if any similar customers were found
    if (warningDuplicates.length > 0) {
      response.warnings = {
        message: "Similar customers found - please verify this is not a duplicate",
        similar_customers: warningDuplicates.map(dup => ({
          customer_code: dup.customer_code,
          customer_name: dup.customer_name,
          contact_number: dup.contact_number,
          email: dup.email,
          similarity_score: dup.similarity
        }))
      };
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: "Failed to create customer", details: error.message },
      { status: 500 }
    );
  }
}