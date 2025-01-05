import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, customer_name, contact_number')
      .order('customer_name');

    if (error) throw error;

    if (!customers) {
      return NextResponse.json([]);
    }

    const formattedCustomers = customers.map(customer => ({
      id: customer.id.toString(),
      customer_name: customer.customer_name,
      contact_number: customer.contact_number
    }));

    console.log('API Response:', formattedCustomers);

    return NextResponse.json(formattedCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}