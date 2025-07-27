import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';
import { TestStaffs } from '../helpers/test-data';

/**
 * Tables API Tests
 * Tests core table management functionality
 */

test.describe('Tables API', () => {
  let apiClient: any;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
  });

  test.afterEach(async () => {
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should get tables list with zones and summary', async () => {
    const response = await apiClient.getTables();
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('tables');
    expect(data).toHaveProperty('zones');
    expect(data).toHaveProperty('summary');
    expect(Array.isArray(data.tables)).toBeTruthy();
    expect(Array.isArray(data.zones)).toBeTruthy();
    
    // Verify summary structure
    expect(data.summary).toHaveProperty('totalTables');
    expect(data.summary).toHaveProperty('occupiedTables');
    expect(data.summary).toHaveProperty('availableTables');
  });

  test('should open table with valid staff PIN', async () => {
    // First get available table
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available tables for testing');
    }

    const response = await apiClient.openTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2,
      notes: 'Test table opening'
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('tableSession');
    expect(data.tableSession).toHaveProperty('id');
    expect(data.tableSession).toHaveProperty('pax_count', 2);
  });

  test('should reject table opening with invalid staff PIN', async () => {
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available tables for testing');
    }

    const response = await apiClient.openTable(availableTable.id, {
      staffPin: '000000', // Invalid PIN
      paxCount: 2
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should close table with valid staff PIN', async () => {
    // First get occupied table or create one
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    let occupiedTable = tablesData.tables.find((t: any) => t.status === 'occupied');
    
    if (!occupiedTable) {
      // Create an occupied table first
      const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
      if (!availableTable) {
        test.skip(true, 'No tables available for testing');
      }
      
      await apiClient.openTable(availableTable.id, {
        staffPin: TestStaffs.MANAGER.pin,
        paxCount: 2
      });
      occupiedTable = availableTable;
    }

    const response = await apiClient.closeTable(occupiedTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      forceClose: true // Force close for testing
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message');
  });

  test('should get individual table details', async () => {
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const firstTable = tablesData.tables[0];

    const response = await apiClient.getTable(firstTable.id);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('id', firstTable.id);
    expect(data).toHaveProperty('zoneId'); // API returns camelCase
    expect(data).toHaveProperty('tableNumber'); // API returns camelCase
    expect(data).toHaveProperty('currentSession'); // Check for session instead of status
  });
});