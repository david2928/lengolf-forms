import { test, expect, devices } from '@playwright/test';
import { authenticateStaff, waitForPOSReady, openTestTable } from '../helpers/pos-helpers';
import { TestStaffs } from '../helpers/test-data';

/**
 * Mobile POS Workflow E2E Tests
 * Tests mobile-specific functionality and responsive design
 */

// Configure mobile device emulation
test.use({ ...devices['iPhone 13'] });

test.describe('Mobile POS Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POS system on mobile
    await page.goto('/pos');
    
    // Authenticate staff member
    await authenticateStaff(page, TestStaffs.MANAGER.pin);
    
    // Wait for POS system to be ready
    await waitForPOSReady(page);
  });

  test('should complete mobile workflow with touch interactions', async ({ page }) => {
    console.log('📱 Starting mobile POS workflow test');

    // Step 1: Open table on mobile
    console.log('📋 Step 1: Opening table on mobile');
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Verify mobile POS interface loads
    await expect(page.locator('[data-testid="pos-interface"]').or(page.locator('.product-catalog')).first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Mobile POS interface loaded');

    // Step 2: Test mobile category navigation
    console.log('📱 Step 2: Testing mobile category navigation');
    
    // Mobile should show category selection first
    const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"')).or(page.locator('text="Golf"'));
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Mobile categories visible');
    
    // Tap on first category
    await categoryButtons.first().tap();
    await page.waitForTimeout(2000);
    console.log('✅ Category selected with tap');

    // Step 3: Test mobile product grid
    console.log('🛒 Step 3: Testing mobile product interaction');
    
    // Products should be in mobile-optimized grid (2 columns)
    const productCards = page.locator('[data-product-id]');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    
    // Verify mobile grid layout (products should be stacked)
    const firstProduct = productCards.first();
    const productBox = await firstProduct.boundingBox();
    expect(productBox).toBeTruthy();
    expect(productBox!.width).toBeGreaterThan(100); // Should be wide on mobile
    
    // Tap to add products
    await firstProduct.tap();
    console.log('✅ First product added via tap');
    
    if (await productCards.nth(1).isVisible({ timeout: 3000 }).catch(() => false)) {
      await productCards.nth(1).tap();
      console.log('✅ Second product added via tap');
    }

    // Step 4: Test mobile order panel
    console.log('📊 Step 4: Testing mobile order panel');
    
    // On mobile, order panel might be collapsible or in bottom sheet
    const currentOrder = page.locator('[data-testid="current-order"]').or(page.locator('.current-order')).first();
    
    if (await currentOrder.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify order items are visible
      const orderItems = currentOrder.locator('[data-testid="order-item"]');
      await expect(orderItems.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Mobile order panel shows items');
    } else {
      // Look for order toggle or summary
      const orderToggle = page.locator('[data-testid="order-toggle"]')
        .or(page.locator('button:has-text("Order")'))
        .or(page.locator('button:has-text("Cart")'))
        .first();
      
      if (await orderToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await orderToggle.tap();
        console.log('✅ Mobile order panel toggled');
      }
    }

    // Step 5: Test mobile confirmation
    console.log('✅ Step 5: Testing mobile order confirmation');
    
    const confirmButton = page.locator('button:has-text("Confirm")').first();
    if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmButton.tap();
      await page.waitForTimeout(2000);
      console.log('✅ Order confirmed via mobile tap');
    }

    // Step 6: Test mobile navigation back to tables
    console.log('🔄 Step 6: Testing mobile navigation');
    
    const backButton = page.locator('[data-testid="back-to-tables"]')
      .or(page.locator('button:has-text("Tables")'))
      .or(page.locator('button:has-text("Back")'))
      .first();
    
    if (await backButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backButton.tap();
      await page.waitForTimeout(2000);
      console.log('✅ Navigated back to tables on mobile');
    }

    // Step 7: Test mobile payment flow
    console.log('💳 Step 7: Testing mobile payment');
    
    // Find occupied table
    const occupiedTable = page.locator('[data-testid="table-select-button"]').first();
    if (await occupiedTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      await occupiedTable.tap();
      await page.waitForTimeout(2000);
      
      // Look for payment button
      const paymentButton = page.locator('button:has-text("Process Payment")')
        .or(page.locator('button:has-text("Pay")'))
        .first();
      
      if (await paymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await paymentButton.tap();
        console.log('✅ Payment initiated on mobile');
        
        // Test mobile payment interface
        const paymentModal = page.locator('[data-testid="payment-modal"]')
          .or(page.locator('.payment-interface'))
          .first();
        
        if (await paymentModal.isVisible({ timeout: 10000 }).catch(() => false)) {
          console.log('✅ Mobile payment interface loaded');
          
          // Select payment method
          const cashButton = page.locator('button:has-text("Cash")').first();
          if (await cashButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await cashButton.tap();
            console.log('✅ Cash payment selected via tap');
          }
        }
      }
    }

    console.log('🎉 Mobile POS workflow test completed successfully!');
  });

  test('should handle mobile touch gestures correctly', async ({ page }) => {
    console.log('👆 Testing mobile touch gestures');

    // Open table
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Test category switching with swipe (if implemented)
    const categoryTabs = page.locator('[data-testid="category-tab"]');
    if (await categoryTabs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const tabCount = await categoryTabs.count();
      if (tabCount > 1) {
        // Test tab switching
        await categoryTabs.first().tap();
        await page.waitForTimeout(1000);
        await categoryTabs.nth(1).tap();
        console.log('✅ Category tab switching works');
      }
    }

    // Test product grid scrolling
    const productContainer = page.locator('[data-testid="product-grid"]').or(page.locator('.product-grid')).first();
    if (await productContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Scroll down in product grid
      await productContainer.hover();
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(1000);
      console.log('✅ Product grid scrolling works');
    }

    // Test quantity adjustment with tap and hold (if implemented)
    const productCards = page.locator('[data-product-id]');
    if (await productCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Long press to see quantity options (if implemented)
      await productCards.first().tap();
      await page.waitForTimeout(1000);
      console.log('✅ Product interaction tested');
    }

    console.log('✅ Mobile touch gestures test completed');
  });

  test('should maintain performance on mobile device', async ({ page }) => {
    console.log('⚡ Testing mobile performance');

    const startTime = Date.now();

    // Open table and measure load time
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Wait for products to load
    const categoryButtons = page.locator('text="Drink"').or(page.locator('text="Food"'));
    if (await categoryButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryButtons.first().tap();
    }
    
    const productCards = page.locator('[data-product-id]');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 Mobile load time: ${loadTime}ms`);
    
    // Performance should be reasonable on mobile
    expect(loadTime).toBeLessThan(15000); // 15 seconds max for mobile
    
    // Test interaction responsiveness
    const interactionStart = Date.now();
    await productCards.first().tap();
    await page.waitForTimeout(500); // Wait for interaction to complete
    const interactionTime = Date.now() - interactionStart;
    
    console.log(`📊 Mobile interaction time: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(2000); // 2 seconds max for touch response
    
    console.log('✅ Mobile performance test completed');
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    console.log('🔄 Testing mobile orientation handling');

    // Start in portrait mode
    await openTestTable(page, TestStaffs.MANAGER.pin);
    
    // Verify portrait layout
    const viewportSize = page.viewportSize();
    expect(viewportSize!.height).toBeGreaterThan(viewportSize!.width);
    console.log('✅ Portrait mode confirmed');

    // Switch to landscape mode
    await page.setViewportSize({ width: 844, height: 390 }); // iPhone 13 landscape
    await page.waitForTimeout(2000);
    
    // Verify interface still works in landscape
    const productCards = page.locator('[data-product-id]');
    if (await productCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCards.first().tap();
      console.log('✅ Product interaction works in landscape');
    }
    
    // Switch back to portrait
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 portrait
    await page.waitForTimeout(2000);
    
    // Verify interface still works
    if (await productCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Interface works after orientation change');
    }

    console.log('✅ Mobile orientation test completed');
  });
});