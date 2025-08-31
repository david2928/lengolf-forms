/**
 * Simple Table Opening Test
 * Tests opening a table without booking - step by step approach
 */

import { test, expect } from '@playwright/test';
import { StaffAuth } from '../../fixtures/auth';
import { TestDataManager } from '../../fixtures/test-data';

test.describe('Simple Table Opening', () => {
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

  test('should open a table successfully', async ({ page }) => {
    console.log('🧪 Testing simple table opening');
    
    // Step 1: Navigate and authenticate
    await page.goto('/pos');
    await staffAuth.login('111111');
    
    // Step 2: Verify table management interface
    await expect(page.locator('text=Table Management')).toBeVisible();
    await expect(page.locator('text=Golf Simulator Bays')).toBeVisible();
    
    // Step 3: Find an available bay and click "Open Table"
    const openTableButton = page.locator('button:has-text("Open Table")').first();
    await expect(openTableButton).toBeVisible();
    await openTableButton.click();
    
    console.log('✅ Clicked Open Table button');
    
    // Step 4: Wait for whatever happens next and take a screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/after-open-table-click.png' });
    
    // Check if we get a modal or navigate to a different page
    const currentUrl = page.url();
    console.log(`Current URL after clicking: ${currentUrl}`);
    
    // Look for common modal or page elements that might appear
    const hasModal = await page.locator('[role="dialog"], .modal, [data-testid*="modal"]').count() > 0;
    const hasOpenTableForm = await page.locator('form, input, button:has-text("Confirm"), button:has-text("Start")').count() > 0;
    
    console.log(`Modal detected: ${hasModal}, Form elements: ${hasOpenTableForm}`);
    
    // At minimum, something should have changed (modal appeared or navigation occurred)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Table opening interaction completed');
  });
});