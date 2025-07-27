import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';
import { TestStaffs, TestProducts, calculateOrderTotal } from '../helpers/test-data';

/**
 * Orders API Tests
 * Tests order management functionality
 */

test.describe('Orders API', () => {
  let apiClient: any;
  let testTableSessionId: string;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
    
    // Create a test table session for order testing
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (availableTable) {
      const openResponse = await apiClient.openTable(availableTable.id, {
        staffPin: TestStaffs.MANAGER.pin,
        paxCount: 2,
        notes: 'Test session for orders'
      });
      
      if (openResponse.ok()) {
        const openData = await openResponse.json();
        testTableSessionId = openData.tableSession.id;
      }
    }
  });

  test.afterEach(async () => {
    // Clean up test table session
    if (testTableSessionId) {
      try {
        const tablesResponse = await apiClient.getTables();
        const tablesData = await tablesResponse.json();
        const testTable = tablesData.tables.find((t: any) => 
          t.session && t.session.id === testTableSessionId
        );
        
        if (testTable) {
          await apiClient.closeTable(testTable.id, {
            staffPin: TestStaffs.MANAGER.pin,
            forceClose: true
          });
        }
      } catch (error) {
        console.log('Cleanup failed:', error);
      }
    }
    
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should confirm order with valid items', async () => {
    if (!testTableSessionId) {
      test.skip(true, 'No test table session available');
    }

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
        notes: 'No pickles'
      }
    ];

    const response = await apiClient.confirmOrder(testTableSessionId, {
      orderItems: orderItems,
      notes: 'Test order confirmation'
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('order');
    expect(data.order).toHaveProperty('id');
    expect(data.order).toHaveProperty('order_number');
    expect(data.order).toHaveProperty('total_amount');
    expect(data.order.status).toBe('confirmed');
  });

  test('should reject order with invalid product ID', async () => {
    if (!testTableSessionId) {
      test.skip(true, 'No test table session available');
    }

    const orderItems = [
      {
        productId: 'invalid-product-id',
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    const response = await apiClient.confirmOrder(testTableSessionId, {
      orderItems: orderItems
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 404]).toContain(response.status());
  });

  test('should remove order item with staff authorization', async () => {
    if (!testTableSessionId) {
      test.skip(true, 'No test table session available');
    }

    // First create an order
    const orderItems = [
      {
        productId: TestProducts.BEER.id,
        quantity: 2,
        modifiers: [],
        notes: null
      }
    ];

    const orderResponse = await apiClient.confirmOrder(testTableSessionId, {
      orderItems: orderItems
    });

    expect(orderResponse.ok()).toBeTruthy();
    const orderData = await orderResponse.json();
    const orderId = orderData.order.id;

    // Get the table session to find order items
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const testTable = tablesData.tables.find((t: any) => 
      t.session && t.session.id === testTableSessionId
    );

    if (testTable && testTable.session.current_order_items && testTable.session.current_order_items.length > 0) {
      const itemToRemove = testTable.session.current_order_items[0];
      
      const removeResponse = await apiClient.removeOrderItem(testTableSessionId, {
        itemId: itemToRemove.id,
        reason: 'Customer changed mind',
        staffPin: TestStaffs.MANAGER.pin,
        quantityToRemove: 1
      });

      expect(removeResponse.ok()).toBeTruthy();
      const removeData = await removeResponse.json();
      
      expect(removeData).toHaveProperty('success', true);
      expect(removeData).toHaveProperty('message');
    }
  });

  test('should reject item removal with invalid staff PIN', async () => {
    if (!testTableSessionId) {
      test.skip(true, 'No test table session available');
    }

    // First create an order
    const orderItems = [
      {
        productId: TestProducts.BEER.id,
        quantity: 1,
        modifiers: [],
        notes: null
      }
    ];

    await apiClient.confirmOrder(testTableSessionId, {
      orderItems: orderItems
    });

    const response = await apiClient.removeOrderItem(testTableSessionId, {
      itemId: 'some-item-id',
      reason: 'Test removal',
      staffPin: '000000' // Invalid PIN
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should calculate order totals correctly', async () => {
    if (!testTableSessionId) {
      test.skip(true, 'No test table session available');
    }

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

    const response = await apiClient.confirmOrder(testTableSessionId, {
      orderItems: orderItems
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Calculate expected total
    const expectedTotal = (TestProducts.BEER.price * 2) + TestProducts.BURGER.price;
    
    expect(data.order.total_amount).toBe(expectedTotal);
    expect(data.order.tax_amount).toBeGreaterThan(0); // Should have VAT
    expect(data.order.subtotal_amount).toBeLessThan(data.order.total_amount);
  });
});