import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface CloudRunResponse {
  batch_id: string;
  records_processed: number;
  status: string;
  timestamp: string;
}

const CLOUD_RUN_URL = 'https://lengolf-crm-1071951248692.asia-southeast1.run.app/';

export async function GET() {
  try {
    // Create a new GoogleAuth instance
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    // Get an ID token and make the request
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    const response = await client.request<CloudRunResponse>({
      url: CLOUD_RUN_URL,
      method: 'GET',
      responseType: 'json'
    });

    console.log('Cloud Run response:', response.status, response.data);

    // Return the Cloud Run response data along with success flag
    return NextResponse.json({ 
      success: true,
      batch_id: response.data.batch_id,
      records_processed: response.data.records_processed,
      status: response.data.status,
      timestamp: response.data.timestamp
    });

  } catch (error) {
    const err = error as any;
    console.error('Failed to update customers:', {
      message: err.message,
      status: err.status,
      response: err.response?.data,
      config: {
        url: err.config?.url,
        method: err.config?.method
      }
    });
    
    return NextResponse.json({ 
      error: 'Failed to update customers',
      details: err.response?.data || err.message || 'Unknown error'
    }, { status: err.status || 500 });
  }
}