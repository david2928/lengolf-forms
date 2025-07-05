import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const CLOUD_RUN_URL = 'https://lengolf-crm-1071951248692.asia-southeast1.run.app/'

export async function GET() {
  try {
    // Create a new GoogleAuth instance with just the credentials
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    // Get an ID token for the Cloud Run service
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    const response = await client.getRequestHeaders();
    const token = response.Authorization?.split(' ')[1];

    if (!token) {
      throw new Error('No token received');
    }

    console.log('Successfully obtained token');
    return NextResponse.json({ token });

  } catch (error) {
    const err = error as Error;
    console.error('Failed to get identity token:', {
      message: err.message,
      stack: err.stack,
      credentials: {
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID
      }
    });
    
    return NextResponse.json({ 
      error: 'Failed to get authentication token',
      details: err.message 
    }, { status: 500 });
  }
}