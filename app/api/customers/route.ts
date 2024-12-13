import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function GET() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'B2:G', // Get columns B through G
    });

    const rows = response.data.values || [];
    
    // Filter and format the data
    const customers = rows
      .filter(row => 
        row[0] && // Customer Name (B)
        row[1] && // Contact Number (C)
        row[5] && // Date Joined (G)
        row[1].toString().length > 6 // Contact number validation
      )
      .map(row => ({
        name: row[0],
        contactNumber: row[1],
        dateJoined: row[5]
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error in customers API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}