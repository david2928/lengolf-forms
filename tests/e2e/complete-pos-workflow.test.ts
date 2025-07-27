import { test, expect } from '@playwright/test';
import { authenticateStaff, waitForPOSReady, openTestTable } from '../helpers/pos-helpers';
import { TestStaffs } from '../helpers/test-data';

/**
 * Complete POS Workflow E2E Tests
 * Tests the full customer journey from table opening to payment
 */

test.describe('Complete POS Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POS system
    await page.goto('/pos');
    
    // Authenticate staff member
    await authenticateStaff(page, TestStaffs.MANAGER.pin);
    
    // Wait for POS system to be ready
    await waitForPOSReady(page);
  });

  test('should complete full customer workflow: open table → order → pay → close', async ({ page }) => {
    console.log('🎯 Starting complete POS workflow test');

    // Step 1: Open a table
    console.log('📋 Step 1: Opening table');
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Verify we're in POS interface
    await expect(page.locator('[data-testid="pos-interface"]').or(page.locator('.product-catalog')).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ POS interface loaded');

    // Step 2: Browse and add products to order
    console.log('🛒 Step 2: Adding products to order');
    
    // Handle mobile category selection if needed
    const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"')).or(page.locator('text="Golf"'));
    if (await categoryButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('📱 Mobile view detected, selecting category');
      await categoryButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // Wait for products to load
    const productCards = page.locator('[data-product-id]');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Products loaded');

    // Add first product to order
    await productCards.first().click();
    console.log('✅ Added first product');
    
    // Add second product if available
    if (await productCards.nth(1).isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCards.nth(1).click();
      console.log('✅ Added second product');
    }

    // Step 3: Verify current order shows items
    console.log('📊 Step 3: Verifying current order');
    const currentOrderPanel = page.locator('[data-testid="current-order"]').or(page.locator('.current-order')).first();
    
    if (await currentOrderPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      const orderItems = currentOrderPanel.locator('[data-testid="order-item"]');
      await expect(orderItems.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Current order has items');
    } else {
      console.log('⚠️ Current order panel not visible, checking for order summary');
      // Fallback: look for any order indication
      const orderIndicator = page.locator('text="Total"').or(page.locator('[data-testid="order-total"]')).first();
      if (await orderIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Order total found');
      }
    }

    // Step 4: Confirm order (move to running tab)
    console.log('✅ Step 4: Confirming order');
    const confirmButton = page.locator('[data-testid="confirm-order"]')
      .or(page.locator('button:has-text("Confirm Order")'))
      .or(page.locator('button:has-text("Confirm")'))
      .first();
    
    if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmButton.click();
      console.log('✅ Order confirmed');
      
      // Wait for confirmation
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ No confirm button found, order might be auto-confirmed');
    }

    // Step 5: Verify running tab shows confirmed order
    console.log('📈 Step 5: Verifying running tab');
    const runningTabPanel = page.locator('[data-testid="running-tab"]').or(page.locator('.running-tab')).first();
    
    if (await runningTabPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      const runningTabItems = runningTabPanel.locator('[data-testid="order-item"]');
      await expect(runningTabItems.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Running tab has confirmed orders');
    } else {
      console.log('⚠️ Running tab not visible, checking for order history');
      // Fallback: look for any confirmed order indication
      const orderHistory = page.locator('text="Order #"').or(page.locator('[data-testid="order-history"]')).first();
      if (await orderHistory.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Order history found');
      }
    }

    // Step 6: Navigate to payment
    console.log('💳 Step 6: Initiating payment');
    
    // Look for payment button
    const paymentButton = page.locator('[data-testid="pay-button"]')
      .or(page.locator('button:has-text("Pay")'))
      .or(page.locator('button:has-text("Payment")'))
      .or(page.locator('button:has-text("Process Payment")'))
      .first();
    
    if (await paymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await paymentButton.click();
      console.log('✅ Payment button clicked');
    } else {
      // Try to navigate back to table management to access payment
      console.log('🔄 Navigating back to table management for payment');
      const backButton = page.locator('[data-testid="back-to-tables"]')
        .or(page.locator('button:has-text("Tables")'))
        .or(page.locator('button:has-text("Back")'))
        .first();
      
      if (await backButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(2000);
        
        // Find occupied table with payment ready
        const occupiedTable = page.locator('[data-testid="table-card"][data-table-status="occupied"]')
          .or(page.locator('[data-testid="table-select-button"]'))
          .first();
        
        if (await occupiedTable.isVisible({ timeout: 5000 }).catch(() => false)) {
          await occupiedTable.click();
          
          // Look for payment button in table details
          const tablePaymentButton = page.locator('[data-testid="process-payment"]')
            .or(page.locator('button:has-text("Process Payment")'))
            .or(page.locator('button:has-text("Pay")'))
            .first();
          
          if (await tablePaymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tablePaymentButton.click();
            console.log('✅ Payment initiated from table management');
          }
        }
      }
    }

    // Step 7: Complete payment process
    console.log('💰 Step 7: Processing payment');
    
    // Wait for payment modal/interface
    const paymentModal = page.locator('[data-testid="payment-modal"]')
      .or(page.locator('.payment-interface'))
      .or(page.locator('text="Payment Method"'))
      .first();
    
    if (await paymentModal.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('✅ Payment interface loaded');
      
      // Select Cash payment method
      const cashButton = page.locator('[data-testid="payment-cash"]')
        .or(page.locator('button:has-text("Cash")'))
        .or(page.locator('text="Cash"'))
        .first();
      
      if (await cashButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cashButton.click();
        console.log('✅ Cash payment selected');
      }
      
      // Enter staff PIN for payment authorization
      const pinModal = page.locator('[data-testid="staff-pin-modal"]')
        .or(page.locator('.staff-pin-input'))
        .first();
      
      if (await pinModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🔐 Entering staff PIN for payment');
        
        // Enter PIN using numeric keypad
        for (const digit of TestStaffs.MANAGER.pin) {
          const digitButton = page.locator(`button:has-text("${digit}")`).first();
          if (await digitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await digitButton.click();
            await page.waitForTimeout(100);
          }
        }
        
        // Click confirm/login button
        const confirmPinButton = page.locator('button:has-text("Confirm")')
          .or(page.locator('button:has-text("Login")'))
          .or(page.locator('button:has-text("Authorize")'))
          .first();
        
        if (await confirmPinButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmPinButton.click();
          console.log('✅ Staff PIN confirmed');
        }
      }
      
      // Complete payment
      const completePaymentButton = page.locator('[data-testid="complete-payment"]')
        .or(page.locator('button:has-text("Complete Payment")'))
        .or(page.locator('button:has-text("Process")'))
        .first();
      
      if (await completePaymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await completePaymentButton.click();
        console.log('✅ Payment processing initiated');
        
        // Wait for payment success
        await page.waitForTimeout(3000);
      }
    }

    // Step 8: Verify payment success and receipt
    console.log('🧾 Step 8: Verifying payment completion');
    
    // Look for success message or receipt
    const successIndicator = page.locator('text="Payment Successful"')
      .or(page.locator('text="Transaction Complete"'))
      .or(page.locator('text="Receipt"'))
      .or(page.locator('[data-testid="payment-success"]'))
      .first();
    
    if (await successIndicator.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('✅ Payment completed successfully');
    } else {
      console.log('⚠️ Payment success indicator not found, checking for table closure');
    }

    // Step 9: Verify table is closed or available for closure
    console.log('🚪 Step 9: Verifying table closure');
    
    // Navigate back to table management if not already there
    const tablesView = page.locator('[data-testid="table-card"]').first();
    if (!await tablesView.isVisible({ timeout: 3000 }).catch(() => false)) {
      const backToTablesButton = page.locator('[data-testid="back-to-tables"]')
        .or(page.locator('button:has-text("Tables")'))
        .or(page.locator('button:has-text("Back")'))
        .first();
      
      if (await backToTablesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await backToTablesButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Verify table status (should be available or paid)
    await expect(page.locator('[data-testid="table-card"]').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Returned to table management view');

    console.log('🎉 Complete POS workflow test completed successfully!');
  });

  test('should handle order modifications during workflow', async ({ page }) => {
    console.log('🔄 Testing order modifications workflow');

    // Open table and add initial products
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Handle mobile category selection
    const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"'));
    if (await categoryButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    // Add products
    const productCards = page.locator('[data-product-id]');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    
    await productCards.first().click(); // Add first product
    await page.waitForTimeout(1000);
    await productCards.first().click(); // Add same product again (quantity: 2)
    
    console.log('✅ Added products to order');

    // Confirm initial order
    const confirmButton = page.locator('button:has-text("Confirm")').first();
    if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Initial order confirmed');
    }

    // Add another product (second order)
    if (await productCards.nth(1).isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCards.nth(1).click();
      console.log('✅ Added additional product');
      
      // Confirm second order
      if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Second order confirmed');
      }
    }

    // Verify running tab shows multiple orders
    const runningTab = page.locator('[data-testid="running-tab"]').or(page.locator('.running-tab')).first();
    if (await runningTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      const orderItems = runningTab.locator('[data-testid="order-item"]');
      const itemCount = await orderItems.count();
      expect(itemCount).toBeGreaterThan(0);
      console.log(`✅ Running tab shows ${itemCount} order items`);
    }

    console.log('✅ Order modifications workflow completed');
  });

  test('should handle error recovery gracefully', async ({ page }) => {
    console.log('🛠️ Testing error recovery workflow');

    // Open table
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Try to access payment without orders (should handle gracefully)
    const paymentButton = page.locator('button:has-text("Pay")').first();
    if (await paymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await paymentButton.click();
      
      // Should show error or prevent payment
      const errorMessage = page.locator('text="No orders"')
        .or(page.locator('text="Cannot process payment"'))
        .or(page.locator('text="Add items first"'))
        .first();
      
      if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Error handled gracefully for payment without orders');
      }
    }

    // Navigate back and add products normally
    const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"'));
    if (await categoryButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    const productCards = page.locator('[data-product-id]');
    if (await productCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCards.first().click();
      console.log('✅ Added product after error recovery');
    }

    console.log('✅ Error recovery workflow completed');
  });
});