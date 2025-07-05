import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    
    return NextResponse.json({
      session,
      authHeader: request.headers.get('Authorization'),
      hasSession: !!session,
      userEmail: session?.user?.email,
      isAdmin: session?.user?.isAdmin,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}