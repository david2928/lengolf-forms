/**
 * POS Authentication Test
 * Tests the staff PIN login functionality
 */

import { test, expect } from '@playwright/test';
import { StaffAuth } from '../../fixtures/auth';
import { TestDataManager } from '../../fixtures/test-data';

test.describe('POS Authentication', () => {
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

  test('should login successfully with correct PIN', async ({ page }) => {
    console.log('🧪 Testing staff login with correct PIN');
    
    await page.goto('/pos');
    
    // Verify login screen is displayed
    await expect(page.locator('text=POS Staff Login')).toBeVisible();
    await expect(page.locator('text=Enter your 6-digit PIN')).toBeVisible();
    
    // Login with correct PIN
    await staffAuth.login('111111');
    
    // Verify we're past the login screen
    await expect(page.locator('text=POS Staff Login')).not.toBeVisible();
    
    console.log('✅ Login successful');
  });

  test('should remain on login screen with wrong PIN', async ({ page }) => {
    console.log('🧪 Testing staff login with wrong PIN');
    
    await page.goto('/pos');
    
    // Enter wrong PIN
    const wrongPin = '999999';
    await expect(page.locator('text=POS Staff Login')).toBeVisible();
    
    // Enter PIN digit by digit
    for (let i = 0; i < wrongPin.length; i++) {
      const digit = wrongPin[i];
      await page.locator(`button:has-text("${digit}")`).first().click();
      await page.waitForTimeout(100);
    }
    
    // Wait a moment to see if anything happens
    await page.waitForTimeout(2000);
    
    // Should still be on login screen (PIN doesn't exist)
    await expect(page.locator('text=POS Staff Login')).toBeVisible();
    
    console.log('✅ Wrong PIN handled correctly');
  });
});