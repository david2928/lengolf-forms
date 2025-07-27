import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';
import { TestStaffs, TestProducts, TestPaymentMethods } from '../helpers/test-data';

/**
 * Payments API Tests
 * Tests payment processing functionality
 */

test.describe('Payments API', () => {
  let apiClient: any;
  let testTableSessionId: string;
  let testOrderTotal: number;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
    
    // Create a test table session with orders for payment testing
    const tablesResponse = await apiClient.getTables();
    const tablesData = await tablesResponse.json();
    const availableTable = tablesData.tables.find((t: any) => t.status === 'available');
    
    if (availableTable) {
      // Open table
      const openResponse = await apiClient.openTable(availableTable.id, {
        staffPin: TestStaffs.MANAGER.pin,
        paxCount: 2,
        notes: 'Test session for payments'
      });
      
      if (openResponse.ok()) {
        const openData = await openResponse.json();
        testTableSessionId = openData.tableSession.id;
        
        // Create an order
        const orderItems = [
          {
            productId: TestProducts.BEER.id,
            quantity: 1,
            modifiers: [],
            notes: null
          }
        ];

        const orderResponse = await apiClient.confirmOrder(testTableSessionId, {
          orderItems: orderItems
        });

        if (orderResponse.ok()) {
          const orderData = await orderResponse.json();
          testOrderTotal = orderData.order.total_amount;
        }
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
        console.log('Payment test cleanup failed:', error);
      }
    }
    
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should process cash payment successfully', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    const response = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: testOrderTotal }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer',
      closeTableSession: true
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('transaction');
    expect(data).toHaveProperty('receiptNumber');
    expect(data.transaction).toHaveProperty('id');
    expect(data.transaction).toHaveProperty('total_amount', testOrderTotal);
    expect(data.transaction.status).toBe('completed');
  });

  test('should process card payment successfully', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    const response = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Visa', amount: testOrderTotal }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer',
      closeTableSession: true
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('transaction');
    expect(data).toHaveProperty('receiptNumber');
    expect(data.transaction.status).toBe('completed');
  });

  test('should process split payment successfully', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    const splitAmount1 = Math.floor(testOrderTotal / 2);
    const splitAmount2 = testOrderTotal - splitAmount1;

    const response = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: splitAmount1 },
        { method: 'PromptPay', amount: splitAmount2 }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer',
      closeTableSession: true
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('transaction');
    expect(data.transaction.total_amount).toBe(testOrderTotal);
  });

  test('should reject payment with invalid staff PIN', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    const response = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: testOrderTotal }
      ],
      staffPin: '000000', // Invalid PIN
      customerName: 'Test Customer'
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should reject payment with insufficient amount', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    const response = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: testOrderTotal - 100 } // Insufficient amount
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer'
    });

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('should generate receipt after payment', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    // Process payment first
    const paymentResponse = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: testOrderTotal }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer',
      closeTableSession: true
    });

    expect(paymentResponse.ok()).toBeTruthy();
    const paymentData = await paymentResponse.json();
    const receiptNumber = paymentData.receiptNumber;

    // Get receipt
    const receiptResponse = await apiClient.getReceipt(receiptNumber, 'json');
    
    expect(receiptResponse.ok()).toBeTruthy();
    const receiptData = await receiptResponse.json();
    
    expect(receiptData).toHaveProperty('receiptNumber', receiptNumber);
    expect(receiptData).toHaveProperty('transaction');
    expect(receiptData).toHaveProperty('orderItems');
    expect(receiptData).toHaveProperty('paymentMethods');
    expect(receiptData.transaction.total_amount).toBe(testOrderTotal);
  });

  test('should generate thermal receipt format', async () => {
    if (!testTableSessionId || !testOrderTotal) {
      test.skip(true, 'No test table session or order available');
    }

    // Process payment first
    const paymentResponse = await apiClient.processPayment({
      tableSessionId: testTableSessionId,
      paymentMethods: [
        { method: 'Cash', amount: testOrderTotal }
      ],
      staffPin: TestStaffs.MANAGER.pin,
      customerName: 'Test Customer',
      closeTableSession: true
    });

    expect(paymentResponse.ok()).toBeTruthy();
    const paymentData = await paymentResponse.json();
    const receiptNumber = paymentData.receiptNumber;

    // Get thermal receipt
    const receiptResponse = await apiClient.getReceipt(receiptNumber, 'thermal');
    
    expect(receiptResponse.ok()).toBeTruthy();
    const receiptText = await receiptResponse.text();
    
    // Thermal receipt should be plain text format
    expect(typeof receiptText).toBe('string');
    expect(receiptText).toContain('LENGOLF');
    expect(receiptText).toContain(receiptNumber);
    expect(receiptText).toContain('TOTAL');
  });
});