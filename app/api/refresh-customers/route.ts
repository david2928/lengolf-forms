import { NextResponse } from 'next/server';
import cache from '@/lib/cache';

export async function POST() {
  try {
    // Clear the customers cache
    cache.del('customers_list');
    return NextResponse.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}