/**
 * Basic POS Navigation Test
 * Tests authentication and basic interface after login
 */

import { test, expect } from '@playwright/test';
import { StaffAuth } from '../../fixtures/auth';
import { TestDataManager } from '../../fixtures/test-data';

test.describe('Basic POS Navigation', () => {
  let staffAuth: StaffAuth;
  let testData: TestDataManager;

  test.beforeEach(async ({ page }) => {
    staffAuth = new StaffAuth(page);
    testData = new TestDataManager();
    
    // Ensure test staff exists
    await testData.getStaff('111111');
  });

  test.afterEach(async () => {
    await testData.cleanup();
  });

  test('should authenticate and show POS interface', async ({ page }) => {
    console.log('🧪 Testing authentication and basic interface');
    
    // Navigate to POS
    await page.goto('/pos');
    
    // Login
    await staffAuth.login('111111');
    
    // Verify we're past login screen
    await expect(page.locator('text=POS Staff Login')).not.toBeVisible();
    
    // Take a screenshot to see what the interface looks like
    await page.screenshot({ path: 'test-results/pos-interface-after-login.png' });
    
    // Wait a moment to let the interface load
    await page.waitForTimeout(3000);
    
    // Check for common POS interface elements (we'll see what's actually there)
    const hasTableElements = await page.locator('*:has-text("Table"), *:has-text("Bay"), *:has-text("Zone")').count() > 0;
    const hasPosElements = await page.locator('*:has-text("POS"), *:has-text("Order"), *:has-text("Menu")').count() > 0;
    
    console.log(`Interface elements - Tables: ${hasTableElements}, POS: ${hasPosElements}`);
    
    // At minimum, we should not be on a blank page
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
    
    console.log('✅ Successfully authenticated and interface loaded');
  });
});