import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';
import { TestStaffs, TestProducts } from '../helpers/test-data';

/**
 * Database Integrity Tests
 * Tests core database constraints and transaction integrity
 */

test.describe('Database Integrity', () => {
  let apiClient: any;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
  });

  test.afterEach(async () => {
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should maintain transaction atomicity during payment failure', async () => {
    // Create table session
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available table for testing');
    }

    const openResponse = await apiClient.openTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2
    });

    expect(openResponse.ok()).toBeTruthy();
    const openData = await openResponse.json();
    const sessionId = openData.tableSession.id;

    // Create order
    const orderItems = [
      {
        productId: TestProducts.BEER.id,
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    const orderResponse = await apiClient.confirmOrder(sessionId, {
      orderItems: orderItems
    });

    expect(orderResponse.ok()).toBeTruthy();
    const orderData = await orderResponse.json();

    // Attempt payment with invalid amount (should fail)
    const paymentResponse = await apiClient.processPayment({
      tableSessionId: sessionId,
      paymentMethods: [
        { method: 'Cash', amount: orderData.order.total_amount - 100 } // Insufficient
      ],
      staffPin: TestStaffs.MANAGER.pin
    });

    expect(paymentResponse.ok()).toBeFalsy();

    // Verify table session still exists and order is intact
    const tablesAfterResponse = await apiClient.getTables();
    const tablesAfterData = await tablesAfterResponse.json();
    const tableAfter = tablesAfterData.tables.find((t: any) => 
      t.session && t.session.id === sessionId
    );

    expect(tableAfter).toBeDefined();
    expect(tableAfter.session.total_amount).toBe(orderData.order.total_amount);

    // Cleanup
    await apiClient.closeTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      forceClose: true
    });
  });

  test('should enforce foreign key constraints for invalid product IDs', async () => {
    // Create table session
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available table for testing');
    }

    const openResponse = await apiClient.openTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2
    });

    expect(openResponse.ok()).toBeTruthy();
    const openData = await openResponse.json();
    const sessionId = openData.tableSession.id;

    // Attempt to create order with invalid product ID
    const orderItems = [
      {
        productId: 'invalid-uuid-12345', // Invalid product ID
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    const orderResponse = await apiClient.confirmOrder(sessionId, {
      orderItems: orderItems
    });

    // Should fail due to foreign key constraint
    expect(orderResponse.ok()).toBeFalsy();
    expect([400, 404, 422]).toContain(orderResponse.status());

    // Cleanup
    await apiClient.closeTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      forceClose: true
    });
  });

  test('should maintain data consistency across order and payment tables', async () => {
    // Create complete transaction flow
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available table for testing');
    }

    // Open table
    const openResponse = await apiClient.openTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2
    });

    expect(openResponse.ok()).toBeTruthy();
    const openData = await openResponse.json();
    const sessionId = openData.tableSession.id;

    // Create order
    const orderItems = [
      {
        productId: TestProducts.BEER.id,
        quantity: 2,
        modifiers: [],
        notes: null
      },
      {
        productId: TestProducts.BURGER.id,
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    const orderResponse = await apiClient.confirmOrder(sessionId, {
      orderItems: orderItems
    });

    expect(orderResponse.ok()).toBeTruthy();
    const orderData = await orderResponse.json();
    const expectedTotal = orderData.order.total_amount;

    // Process payment
    const paymentResponse = await apiClient.processPayment({
      tableSessionId: sessionId,
      paymentMethods: [
        { method: 'Cash', amount: expectedTotal }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      closeTableSession: true
    });

    expect(paymentResponse.ok()).toBeTruthy();
    const paymentData = await paymentResponse.json();

    // Verify data consistency
    expect(paymentData.transaction.total_amount).toBe(expectedTotal);
    
    // Get receipt to verify order items match
    const receiptResponse = await apiClient.getReceipt(paymentData.receiptNumber);
    expect(receiptResponse.ok()).toBeTruthy();
    const receiptData = await receiptResponse.json();
    
    expect(receiptData.orderItems.length).toBe(2);
    expect(receiptData.transaction.total_amount).toBe(expectedTotal);
    
    // Calculate total from line items
    const lineItemsTotal = receiptData.orderItems.reduce((sum: number, item: any) => 
      sum + (item.unit_price_incl_vat * item.item_cnt), 0
    );
    expect(lineItemsTotal).toBe(expectedTotal);
  });

  test('should enforce staff PIN validation for sensitive operations', async () => {
    // Create table session
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (!availableTable) {
      test.skip(true, 'No available table for testing');
    }

    // Try to open table with invalid PIN
    const invalidOpenResponse = await apiClient.openTable(availableTable.id, {
      staffPin: '000000', // Invalid PIN
      paxCount: 2
    });

    expect(invalidOpenResponse.ok()).toBeFalsy();
    expect(invalidOpenResponse.status()).toBe(401);

    // Open table with valid PIN
    const validOpenResponse = await apiClient.openTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2
    });

    expect(validOpenResponse.ok()).toBeTruthy();
    const openData = await validOpenResponse.json();
    const sessionId = openData.tableSession.id;

    // Create order
    const orderItems = [
      {
        productId: TestProducts.BEER.id,
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    const orderResponse = await apiClient.confirmOrder(sessionId, {
      orderItems: orderItems
    });

    expect(orderResponse.ok()).toBeTruthy();
    const orderData = await orderResponse.json();

    // Try payment with invalid PIN
    const invalidPaymentResponse = await apiClient.processPayment({
      tableSessionId: sessionId,
      paymentMethods: [
        { method: 'Cash', amount: orderData.order.total_amount }
      ],
      staffPin: '000000' // Invalid PIN
    });

    expect(invalidPaymentResponse.ok()).toBeFalsy();
    expect(invalidPaymentResponse.status()).toBe(401);

    // Cleanup with valid PIN
    await apiClient.closeTable(availableTable.id, {
      staffPin: TestStaffs.MANAGER.pin,
      forceClose: true
    });
  });

  test('should handle concurrent table operations correctly', async () => {
    // Get multiple available tables
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTables = tablesData.tables.filter((t: any) => t.status === 'available').slice(0, 2);
    
    if (availableTables.length < 2) {
      test.skip(true, 'Need at least 2 available tables for concurrency test');
    }

    // Attempt to open both tables simultaneously
    const openPromise1 = apiClient.openTable(availableTables[0].id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 2
    });

    const openPromise2 = apiClient.openTable(availableTables[1].id, {
      staffPin: TestStaffs.MANAGER.pin,
      paxCount: 3
    });

    const [response1, response2] = await Promise.all([openPromise1, openPromise2]);
    
    expect(response1.ok()).toBeTruthy();
    expect(response2.ok()).toBeTruthy();

    const data1 = await response1.json();
    const data2 = await response2.json();

    // Verify both sessions are distinct
    expect(data1.tableSession.id).not.toBe(data2.tableSession.id);
    expect(data1.tableSession.pax_count).toBe(2);
    expect(data2.tableSession.pax_count).toBe(3);

    // Cleanup both tables
    await Promise.all([
      apiClient.closeTable(availableTables[0].id, {
        staffPin: TestStaffs.MANAGER.pin,
        forceClose: true
      }),
      apiClient.closeTable(availableTables[1].id, {
        staffPin: TestStaffs.MANAGER.pin,
        forceClose: true
      })
    ]);
  });
});