import { NextRequest, NextResponse } from 'next/server';
import { getDisplayPackageName } from '@/lib/package-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');
    const storedPackageName = searchParams.get('storedPackageName');
    
    if (!packageId && !storedPackageName) {
      return NextResponse.json({ error: 'Package ID or stored package name is required' }, { status: 400 });
    }

    const packageName = await getDisplayPackageName(packageId, storedPackageName);
    
    return NextResponse.json({ packageName });
  } catch (error) {
    console.error('Error fetching package name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}