import { NextResponse } from 'next/server';

interface SyncResponse {
  batch_id: string;
  records_processed: number;
  status: string;
  timestamp: string;
}

export async function GET() {
  try {
    console.log('Triggering local customer sync...');

    // Call our new local sync endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/crm/sync-customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Local sync response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to sync customers');
    }

    // Return the sync response data along with success flag
    return NextResponse.json({ 
      success: true,
      batch_id: data.batch_id,
      records_processed: data.records_processed,
      status: data.status,
      timestamp: data.timestamp
    });

  } catch (error) {
    const err = error as any;
    console.error('Failed to update customers:', {
      message: err.message,
      status: err.status,
      response: err.response?.data,
    });
    
    return NextResponse.json({ 
      error: 'Failed to update customers',
      details: err.message || 'Unknown error'
    }, { status: 500 });
  }
}