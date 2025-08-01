import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { email = 'admin@lengolf.dev', isAdmin = true } = await request.json().catch(() => ({}));
    
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    if (!secret) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET not configured' }, { status: 500 });
    }

    // Create NextAuth-compatible JWT token
    const token = await new SignJWT({
      email,
      isAdmin,
      // NextAuth JWT structure
      name: email.split('@')[0],
      picture: null,
      sub: email, // subject (user ID)
      iat: Math.floor(Date.now() / 1000), // issued at
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // expires in 30 days
      jti: Math.random().toString(36) // JWT ID
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    return NextResponse.json({
      success: true,
      token,
      user: {
        email,
        isAdmin,
        name: email.split('@')[0]
      },
      usage: {
        cookie: `next-auth.session-token=${token}`,
        header: `Authorization: Bearer ${token}`,
        expires: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
      }
    });
  } catch (error: any) {
    console.error('Dev token generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to generate token'
    }, { status: 500 });
  }
}

// GET endpoint to generate a quick admin token
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    if (!secret) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET not configured' }, { status: 500 });
    }

    const email = 'admin@lengolf.dev';
    const isAdmin = true;

    // Create NextAuth-compatible JWT token
    const token = await new SignJWT({
      email,
      isAdmin,
      name: 'Admin',
      picture: null,
      sub: email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      jti: Math.random().toString(36)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    return NextResponse.json({
      success: true,
      token,
      user: {
        email,
        isAdmin: true,
        name: 'Admin'
      },
      instructions: {
        cookie: `Set as cookie: next-auth.session-token=${token}`,
        header: `Or use as header: Authorization: Bearer ${token}`,
        curl: `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/customers`
      }
    });
  } catch (error: any) {
    console.error('Dev token generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to generate token'
    }, { status: 500 });
  }
}