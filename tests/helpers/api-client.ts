import { request, APIRequestContext } from '@playwright/test';

/**
 * Simplified API Client for POS System Testing
 * Focuses on core POS endpoints only
 */
export class POSAPIClient {
  private baseURL: string;
  public apiContext: APIRequestContext | null = null;
  private authToken: string | null = null;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * Initialize the API client with authentication
   */
  async init(request: APIRequestContext) {
    this.apiContext = request;

    // Get authentication token for API requests
    this.authToken = process.env.TEST_API_TOKEN || null;
    
    if (!this.authToken) {
      try {
        const tokenResponse = await this.apiContext!.get('/api/dev-token');
        if (tokenResponse.ok()) {
          const tokenData = await tokenResponse.json();
          this.authToken = tokenData.token;
        }
      } catch (error) {
        console.warn('Could not obtain API token, requests may fail:', error);
      }
    }

    return this;
  }

  /**
   * Get authenticated headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      baseHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return baseHeaders;
  }

  /**
   * Make authenticated API request
   */
  async request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) {
    if (!this.apiContext) {
      throw new Error('API client not initialized. Call init() first.');
    }

    const headers = this.getAuthHeaders();

    switch (method) {
      case 'GET':
        return this.apiContext.get(endpoint, { headers });
      case 'POST':
        return this.apiContext.post(endpoint, { headers, data });
      case 'PUT':
        return this.apiContext.put(endpoint, { headers, data });
      case 'DELETE':
        return this.apiContext.delete(endpoint, { headers });
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // Core Table Management APIs
  async getTables() {
    return this.request('GET', '/api/pos/tables');
  }

  async getTable(tableId: string) {
    return this.request('GET', `/api/pos/tables/${tableId}`);
  }

  async openTable(tableId: string, data: { bookingId?: string; staffPin: string; paxCount?: number; notes?: string }) {
    return this.request('POST', `/api/pos/tables/${tableId}/open`, data);
  }

  async closeTable(tableId: string, data: { staffPin: string; forceClose?: boolean }) {
    return this.request('POST', `/api/pos/tables/${tableId}/close`, data);
  }

  // Core Product APIs
  async getProducts(params?: { category?: string; search?: string; page?: number; limit?: number; all?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/api/pos/products${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request('GET', endpoint);
  }

  async getCategoryHierarchy() {
    return this.request('GET', '/api/pos/products/categories/hierarchy');
  }

  // Core Order Management APIs
  async confirmOrder(sessionId: string, data: { orderItems: any[]; notes?: string }) {
    return this.request('POST', `/api/pos/table-sessions/${sessionId}/confirm-order`, data);
  }

  async removeOrderItem(sessionId: string, data: { itemId: string; quantity?: number; reason?: string; staffPin: string }) {
    return this.request('POST', `/api/pos/table-sessions/${sessionId}/remove-item`, data);
  }

  // Core Payment APIs
  async processPayment(data: {
    tableSessionId: string;
    paymentMethods: Array<{ method: string; amount: number }>;
    staffPin: string;
    staffId?: number;
    customerName?: string;
    tableNumber?: string;
    closeTableSession?: boolean;
  }) {
    return this.request('POST', '/api/pos/payments/process', data);
  }

  async getReceipt(receiptNumber: string, format: 'json' | 'html' | 'thermal' = 'json') {
    return this.request('GET', `/api/pos/receipts/${receiptNumber}?format=${format}`);
  }

  /**
   * Clean up resources
   */
  async dispose() {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }
}

/**
 * Helper function to create and initialize API client
 */
export async function createPOSAPIClient(request?: APIRequestContext, baseURL?: string): Promise<POSAPIClient> {
  const client = new POSAPIClient(baseURL);
  if (request) {
    await client.init(request);
  } else {
    const { request: playwright } = require('@playwright/test');
    const apiContext = await playwright.newContext({
      baseURL: baseURL || 'http://localhost:3000',
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    await client.init(apiContext);
  }
  return client;
}