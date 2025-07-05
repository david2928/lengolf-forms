import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    
    return NextResponse.json({
      success: true,
      message: 'Coaching test endpoint working',
      hasSession: !!session,
      userEmail: session?.user?.email,
      authHeader: request.headers.get('Authorization') ? 'Present' : 'Not present',
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}