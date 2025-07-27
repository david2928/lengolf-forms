import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';
import { TestStaffs } from '../helpers/test-data';

/**
 * Staff API Tests
 * Tests staff authentication functionality
 */

test.describe('Staff API', () => {
  let apiClient: any;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
  });

  test.afterEach(async () => {
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should verify valid staff PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: TestStaffs.MANAGER.pin
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('staff');
    expect(data.staff).toHaveProperty('id');
    expect(data.staff).toHaveProperty('name');
    expect(data.staff.name).toContain('Test'); // Should be a test staff member
  });

  test('should reject invalid staff PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: '000000' // Invalid PIN
    });

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty('success', false);
  });

  test('should reject empty PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: ''
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 401]).toContain(response.status());
  });

  test('should reject malformed PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: 'abc123' // Non-numeric PIN
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 401]).toContain(response.status());
  });

  test('should handle too short PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: '123' // Too short
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 401]).toContain(response.status());
  });

  test('should handle too long PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: '1234567890' // Too long
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 401]).toContain(response.status());
  });

  test('should verify second valid staff PIN', async () => {
    const response = await apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: TestStaffs.STAFF1.pin
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('staff');
    expect(data.staff).toHaveProperty('id');
    expect(data.staff).toHaveProperty('name');
  });

  test('should handle concurrent PIN verifications', async () => {
    // Test multiple simultaneous PIN verifications
    const pin1Promise = apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: TestStaffs.MANAGER.pin
    });
    
    const pin2Promise = apiClient.request('POST', '/api/pos/staff/verify-pin', {
      pin: TestStaffs.STAFF1.pin
    });

    const [response1, response2] = await Promise.all([pin1Promise, pin2Promise]);
    
    expect(response1.ok()).toBeTruthy();
    expect(response2.ok()).toBeTruthy();
    
    const data1 = await response1.json();
    const data2 = await response2.json();
    
    expect(data1.success).toBe(true);
    expect(data2.success).toBe(true);
  });
});