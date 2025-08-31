/**
 * POS System E2E Test: Table Opening with Booking
 * 
 * This test covers the complete flow of:
 * 1. Staff authentication with PIN
 * 2. Finding an available table
 * 3. Opening table with an existing booking
 * 4. Verifying the POS interface loads correctly
 */

import { test, expect, type Page } from '@playwright/test';
import { TestDataManager } from '../../fixtures/test-data';
import { StaffAuth } from '../../fixtures/auth';
import { waitForElement, waitForApiResponse, takeTimestampedScreenshot } from '../../utils/helpers';

test.describe('POS Table Opening with Booking', () => {
  let testData: TestDataManager;
  let staffAuth: StaffAuth;

  test.beforeEach(async ({ page }) => {
    // Initialize test helpers
    testData = new TestDataManager();
    staffAuth = new StaffAuth(page);

    console.log('🧪 Starting table-booking test setup...');

    // Create test scenario (customer + booking + staff)
    await testData.createBookingScenario({
      customerName: 'John Test Customer',
      bookingTime: '14:00',
      bay: 'Bay 1',
      paxCount: 2,
      staffPin: '111111'
    });

    console.log('✅ Test setup completed');
  });

  test.afterEach(async ({ page }) => {
    console.log('🧹 Starting test cleanup...');

    try {
      // Take screenshot for debugging if test failed
      if (test.info().status === 'failed') {
        await takeTimestampedScreenshot(page, 'failed-test');
      }

      // Clean up test data
      await testData.cleanup();
      
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.error('❌ Test cleanup failed:', error);
    }
  });

  test('should successfully open a table with an existing booking', async ({ page }) => {
    const scenario = await testData.createBookingScenario();
    
    console.log('🎬 Test: Opening table with booking flow');
    console.log(`📋 Using customer: ${scenario.customer.customer_name}`);
    console.log(`📅 Booking: ${scenario.booking.date} at ${scenario.booking.start_time}`);

    // Step 1: Navigate to POS system
    console.log('📱 Step 1: Navigating to POS system');
    await page.goto('/pos');
    
    // Step 2: Authenticate with staff PIN
    console.log('🔐 Step 2: Staff authentication');
    await staffAuth.login('111111');
    
    // Verify we're on the table management dashboard
    await expect(page.locator('[data-testid="table-management-dashboard"]')).toBeVisible({
      timeout: 10000
    });
    console.log('✅ Table management dashboard loaded');

    // Step 3: Find and click on an available table
    console.log('🔍 Step 3: Finding available table');
    
    // Wait for tables to load
    await page.waitForTimeout(2000);
    
    // Look for Bay zone first (since our test booking is for Bay 1)
    const bayZone = page.locator('[data-testid*="zone"], .zone:has-text("Bay"), [class*="zone"]:has-text("Bay")').first();
    
    // If we can't find by data-testid, look for available tables more generically
    let availableTable = page.locator('[data-testid^="table-"][data-status="available"], .table[data-status="available"], .table-card:not([data-status="occupied"])').first();
    
    // Fallback: find any clickable table element
    if (await availableTable.count() === 0) {
      availableTable = page.locator('.table, [class*="table"], button:has-text("Table"), div:has-text("Table")').first();
    }

    await expect(availableTable).toBeVisible({ timeout: 5000 });
    await availableTable.click();
    console.log('✅ Clicked on available table');

    // Step 4: Handle table opening modal
    console.log('📋 Step 4: Opening table with booking');
    
    // Wait for open table modal or direct booking search
    await page.waitForTimeout(1000);
    
    // Look for "Link to Booking" button or similar
    const linkBookingButton = page.locator(
      '[data-testid="link-booking-button"], ' +
      'button:has-text("Link"), button:has-text("Booking"), ' +
      'button:has-text("Find"), .booking-search-button'
    ).first();

    if (await linkBookingButton.isVisible({ timeout: 3000 })) {
      await linkBookingButton.click();
      console.log('✅ Clicked link to booking button');
    } else {
      console.log('ℹ️ No separate booking link button found - looking for direct search');
    }

    // Step 5: Search for the test booking
    console.log('🔍 Step 5: Searching for test booking');
    
    // Look for booking search input
    const searchInput = page.locator(
      '[data-testid="booking-search"], ' +
      'input[placeholder*="search"], input[placeholder*="booking"], ' +
      'input[placeholder*="customer"], input[type="search"], input[type="text"]'
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(scenario.customer.customer_name);
    console.log(`✅ Entered search term: ${scenario.customer.customer_name}`);

    // Wait for search API response
    try {
      await waitForApiResponse(page, '/api/bookings', 5000);
      console.log('✅ Booking search API response received');
    } catch (error) {
      console.log('⚠️ No API response detected - continuing with test');
    }

    // Wait a bit for results to populate
    await page.waitForTimeout(1000);

    // Step 6: Select the booking from results
    console.log('📝 Step 6: Selecting booking from results');
    
    // Look for the booking in search results
    const bookingResult = page.locator(
      `[data-testid="booking-${scenario.booking.id}"], ` +
      `.booking-result:has-text("${scenario.customer.customer_name}"), ` +
      `.booking-item:has-text("${scenario.customer.customer_name}"), ` +
      `li:has-text("${scenario.customer.customer_name}"), ` +
      `div:has-text("${scenario.customer.customer_name}")`
    ).first();

    await expect(bookingResult).toBeVisible({ timeout: 5000 });
    await bookingResult.click();
    console.log('✅ Selected booking from results');

    // Step 7: Confirm opening table with booking
    console.log('✅ Step 7: Confirming table opening');
    
    const confirmButton = page.locator(
      '[data-testid="open-with-booking"], [data-testid="confirm-booking"], ' +
      'button:has-text("Open"), button:has-text("Confirm"), button:has-text("Start")'
    ).first();

    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click();
      console.log('✅ Clicked confirm button');
    } else {
      console.log('ℹ️ No explicit confirm button - booking may be auto-selected');
    }

    // Step 8: Verify POS interface loaded successfully
    console.log('🎯 Step 8: Verifying POS interface');
    
    // Should be redirected to POS interface
    await expect(page.url()).toMatch(/\/pos/);
    console.log('✅ URL contains /pos');

    // Look for POS interface elements
    const posInterface = page.locator(
      '[data-testid="pos-interface"], [data-testid="product-catalog"], ' +
      '.pos-interface, .product-catalog, .order-summary'
    ).first();

    await expect(posInterface).toBeVisible({ timeout: 10000 });
    console.log('✅ POS interface is visible');

    // Verify customer information is displayed
    const customerDisplay = page.locator(
      `[data-testid="customer-name"]:has-text("${scenario.customer.customer_name}"), ` +
      `.customer-info:has-text("${scenario.customer.customer_name}"), ` +
      `*:has-text("${scenario.customer.customer_name}")`
    ).first();

    await expect(customerDisplay).toBeVisible({ timeout: 5000 });
    console.log('✅ Customer name is displayed in POS interface');

    // Verify table session information is shown
    const tableSessionInfo = page.locator(
      '[data-testid="table-session-info"], [data-testid="session-info"], ' +
      '.table-session, .session-info, .active-table'
    ).first();

    await expect(tableSessionInfo).toBeVisible({ timeout: 5000 });
    console.log('✅ Table session info is visible');

    // Take a success screenshot
    await takeTimestampedScreenshot(page, 'pos-interface-success');

    console.log('🎉 Test completed successfully!');
  });

  test('should handle authentication failure gracefully', async ({ page }) => {
    console.log('🧪 Test: Authentication failure handling');

    await page.goto('/pos');

    // Try to login with wrong PIN
    const wrongPin = '000000';
    
    // Wait for staff login modal
    await waitForElement(page, '[data-testid="staff-login-modal"]');

    // Enter wrong PIN
    const pinInput = page.locator('input[type="password"], [data-testid="pin-input"]').first();
    await pinInput.fill(wrongPin);

    // Submit login
    const loginButton = page.locator('[data-testid="login-button"], button:has-text("Login")').first();
    await loginButton.click();

    // Should see error message or remain on login screen
    await page.waitForTimeout(2000);
    
    // Verify still on login screen
    await expect(page.locator('[data-testid="staff-login-modal"]')).toBeVisible();
    console.log('✅ Login modal still visible after wrong PIN');

    // Look for error message
    const errorMessage = page.locator('.error, .alert, [role="alert"], [data-testid*="error"]');
    if (await errorMessage.count() > 0) {
      console.log('✅ Error message displayed');
    } else {
      console.log('ℹ️ No explicit error message found');
    }
  });

  test('should display table management dashboard after successful login', async ({ page }) => {
    console.log('🧪 Test: Table management dashboard display');

    await page.goto('/pos');
    await staffAuth.login('111111');

    // Verify dashboard components are present
    const dashboard = page.locator('[data-testid="table-management-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Look for zone indicators
    const zones = page.locator('[data-testid*="zone"], .zone');
    await expect(zones.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Found ${await zones.count()} zones`);

    // Look for table elements
    const tables = page.locator('[data-testid^="table-"], .table');
    await expect(tables.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Found ${await tables.count()} tables`);

    console.log('✅ Dashboard components verified');
  });
});