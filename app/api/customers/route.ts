import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import cache from '@/lib/cache';

const CACHE_KEY = 'customers_list';

async function fetchCustomers() {
  const { data: customers, error, count } = await supabase
    .from('customers')
    .select('id, customer_name, contact_number, stable_hash_id', { count: 'exact' })
    .order('customer_name')
    .range(0, 2999);

  if (error) throw error;

  if (!customers) return [];

  const formattedCustomers = customers.map(customer => ({
    id: customer.id.toString(),
    customer_name: customer.customer_name,
    contact_number: customer.contact_number,
    stable_hash_id: customer.stable_hash_id
  }));

  console.log(`Customers: ${formattedCustomers.length} of ${count} total`);
  return formattedCustomers;
}

export async function GET(request: Request) {
  try {
    // Check if forceRefresh query parameter is present
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Try to get data from cache first
    let customers = cache.get(CACHE_KEY);

    // If no cache or force refresh, fetch new data
    if (!customers || forceRefresh) {
      customers = await fetchCustomers();
      cache.set(CACHE_KEY, customers);
    }

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// Add a route to clear the cache
export async function POST() {
  try {
    cache.del(CACHE_KEY);
    const newCustomers = await fetchCustomers();
    cache.set(CACHE_KEY, newCustomers);
    return NextResponse.json({ message: 'Cache refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}