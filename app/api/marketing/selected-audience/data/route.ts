/**
 * Selected Audience Data API
 * Returns customer data for the currently selected audience
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/marketing/selected-audience/data - Get customer data for selected audience
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the selected audience ID from database
    const { data: selectedData, error: selectedError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('selected_audience')
      .select('audience_id')
      .eq('user_email', session.user.email)
      .single();

    if (selectedError && selectedError.code !== 'PGRST116') {
      throw selectedError;
    }

    const selectedAudienceId = selectedData?.audience_id || null;
    console.log('GET selected audience data for user', session.user.email, 'ID:', selectedAudienceId);
    
    if (!selectedAudienceId) {
      console.log('No audience selected, returning empty array');
      return NextResponse.json({
        customers: [],
        message: "No audience selected"
      });
    }

    // Get audience details with filters
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select('*')
      .eq('id', selectedAudienceId)
      .single();

    if (audienceError) throw audienceError;
    if (!audience) {
      return NextResponse.json({ error: "Selected audience not found" }, { status: 404 });
    }

    // Extract sort preferences from audience definition
    const audienceFilters = audience.definition_json?.filters || {};
    const sortBy = audienceFilters.sortBy || 'lastVisit';
    const sortOrder = audienceFilters.sortOrder || 'desc';

    // Get audience members with customer details
    const { data: members, error: membersError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audience_members')
      .select(`
        customer_id,
        added_at
      `)
      .eq('audience_id', selectedAudienceId);

    if (membersError) throw membersError;

    // Get customer details from the analytics view
    // For OB Sales, we only need a manageable number of customers (limit to 100)
    let customers = [];
    if (members && members.length > 0) {
      const customerIds = members.map((m: any) => m.customer_id);
      console.log('Total audience members:', customerIds.length);
      console.log('Looking up customer IDs (first 3):', customerIds.slice(0, 3)); // Log first 3 IDs
      
      // Batch customer lookups to avoid URI too large errors
      const batchSize = 200; // Process in batches of 200 customer IDs
      const customerBatches = [];
      
      for (let i = 0; i < customerIds.length; i += batchSize) {
        customerBatches.push(customerIds.slice(i, i + batchSize));
      }
      
      console.log(`Processing ${customerIds.length} customers in ${customerBatches.length} batches of ${batchSize}`);
      
      // Map sortBy to database column names
      const sortColumnMap: Record<string, string> = {
        'lastVisit': 'last_visit_date',
        'lastContacted': 'last_contacted',
        'lifetimeValue': 'lifetime_spending',
        'totalBookings': 'total_bookings',
        'name': 'customer_name'
      };
      
      const dbSortColumn = sortColumnMap[sortBy] || 'last_visit_date';
      const ascending = sortOrder === 'asc';
      
      console.log('Applying sort:', { sortBy, sortOrder, dbSortColumn, ascending });
      
      // Fetch customers in batches
      let allCustomerData: any[] = [];
      
      for (const batch of customerBatches) {
        const { data: batchData, error: batchError } = await refacSupabaseAdmin
          .schema('public')
          .from('customer_marketing_analytics')
          .select('*')
          .in('id', batch);

        if (batchError) {
          console.error('Batch customer lookup error:', batchError);
          throw batchError;
        }
        
        if (batchData) {
          allCustomerData.push(...batchData);
        }
      }
      
      // Sort the combined results
      allCustomerData.sort((a, b) => {
        const aValue = a[dbSortColumn];
        const bValue = b[dbSortColumn];
        
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return ascending ? -1 : 1;
        if (bValue === null) return ascending ? 1 : -1;
        
        if (aValue < bValue) return ascending ? -1 : 1;
        if (aValue > bValue) return ascending ? 1 : -1;
        return 0;
      });
      
      const customerData = allCustomerData;
      
      if (customerData) {
        // Filter for Thai customers only (no enrichment needed - data comes from view)
        const thaiCustomers = customerData.filter((customer: any) => {
          if (!customer.contact_number) return false;
          const phone = customer.contact_number.toString().trim();
          const cleaned = phone.replace(/\D/g, ''); // Remove all non-digits
          
          // Thai phone number formats
          if (phone.startsWith('0') && cleaned.length === 10) return true; // Thai local format 0XXXXXXXXX
          if (phone.startsWith('+66') && cleaned.length === 11) return true; // Thai international +66XXXXXXXXX
          
          // Thai mobile numbers without leading 0 (most common in database)
          if (!phone.startsWith('+') && !phone.startsWith('0')) {
            const firstDigit = cleaned.charAt(0);
            // 9-digit numbers starting with 6, 8, 9 (Thai mobile without leading 0)
            if (cleaned.length === 9 && ['6', '8', '9'].includes(firstDigit)) return true;
            // 10-digit numbers starting with 6, 8, 9 (Thai mobile with country code removed)  
            if (cleaned.length === 10 && ['6', '8', '9'].includes(firstDigit)) return true;
          }
          
          return false;
        });

        customers = thaiCustomers;
        console.log('Found customers:', customers.length, 'Thai customers out of', customerData.length, 'total customers from', customerIds.length, 'audience members');
      } else {
        console.log('No customer data returned');
      }
    }

    return NextResponse.json({
      audienceId: selectedAudienceId,
      audienceName: audience.name,
      customers: customers,
      totalCustomers: customers.length,
      filters: audience.definition_json?.filters || {},
      sortBy: sortBy,
      sortOrder: sortOrder,
      createdAt: audience.created_at
    });

  } catch (error: any) {
    console.error('Error fetching selected audience data:', error);
    return NextResponse.json(
      { error: "Failed to fetch audience data", details: error.message },
      { status: 500 }
    );
  }
}