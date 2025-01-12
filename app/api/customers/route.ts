import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Using range instead of limit to get all records
    const { data: customers, error, count } = await supabase
      .from('customers')
      .select('id, customer_name, contact_number', { count: 'exact' })
      .order('customer_name')
      .range(0, 2999);  // This will get up to 3000 records (0 to 2999 inclusive)

    if (error) throw error;

    if (!customers) {
      return NextResponse.json([]);
    }

    const formattedCustomers = customers.map(customer => ({
      id: customer.id.toString(),
      customer_name: customer.customer_name,
      contact_number: customer.contact_number
    }));

    // Only log the counts
    console.log(`Customers: ${formattedCustomers.length} of ${count} total`);

    return NextResponse.json(formattedCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}