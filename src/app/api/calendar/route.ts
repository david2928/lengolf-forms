import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ message: 'Please use /api/bookings/calendar instead' }, { status: 301 });
}