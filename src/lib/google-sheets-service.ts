import { google } from 'googleapis';

export class GoogleSheetsService {
  private auth;
  private sheets;

  constructor() {
    // Initialize with service account credentials
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async getCustomers() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
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
        }));

      // Sort alphabetically by name
      return customers.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();